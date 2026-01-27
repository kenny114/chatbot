/**
 * Visitor Profile Service
 * Manages cross-session visitor identification and memory
 */

import pool from '../config/database';
import crypto from 'crypto';
import {
  VisitorProfile,
  VisitorIdentifierType,
  CreateVisitorProfileInput,
  UpdateVisitorProfileInput,
} from '../types/agent';

class VisitorProfileService {
  /**
   * Get or create visitor profile
   * Priority: email (most reliable) > fingerprint > IP
   */
  async getOrCreateProfile(
    chatbotId: string,
    identifiers: {
      email?: string;
      sessionId: string;
      userAgent?: string;
      userIp?: string;
    }
  ): Promise<VisitorProfile | null> {
    try {
      // 1. Try email first (most reliable)
      if (identifiers.email) {
        const emailHash = this.hashIdentifier(identifiers.email);
        let profile = await this.findByIdentifier(chatbotId, emailHash, 'email');

        if (profile) {
          await this.updateLastSeen(profile.id);
          return profile;
        }

        // Create new profile with email
        return this.createProfile(chatbotId, emailHash, 'email', {
          email: identifiers.email,
        });
      }

      // 2. Try device fingerprint (session + user agent)
      const fingerprint = this.generateFingerprint(
        identifiers.sessionId,
        identifiers.userAgent || ''
      );

      let profile = await this.findByIdentifier(chatbotId, fingerprint, 'fingerprint');

      if (profile) {
        await this.updateLastSeen(profile.id);
        return profile;
      }

      // 3. Fallback to IP (least reliable)
      if (identifiers.userIp) {
        const ipHash = this.hashIdentifier(identifiers.userIp);
        profile = await this.findByIdentifier(chatbotId, ipHash, 'ip');

        if (profile) {
          await this.updateLastSeen(profile.id);
          return profile;
        }
      }

      // 4. Create new profile with fingerprint
      return this.createProfile(chatbotId, fingerprint, 'fingerprint');

    } catch (error) {
      console.error('[VisitorProfileService] Error getting/creating profile:', error);
      return null;
    }
  }

  /**
   * Find profile by identifier
   */
  async findByIdentifier(
    chatbotId: string,
    identifier: string,
    identifierType: VisitorIdentifierType
  ): Promise<VisitorProfile | null> {
    const result = await pool.query(
      `SELECT * FROM visitor_profiles
       WHERE chatbot_id = $1
         AND visitor_identifier = $2
         AND identifier_type = $3
       LIMIT 1`,
      [chatbotId, identifier, identifierType]
    );

    return result.rows[0] || null;
  }

  /**
   * Get profile by ID
   */
  async getProfileById(profileId: string): Promise<VisitorProfile | null> {
    const result = await pool.query(
      'SELECT * FROM visitor_profiles WHERE id = $1',
      [profileId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create new visitor profile
   */
  async createProfile(
    chatbotId: string,
    identifier: string,
    identifierType: VisitorIdentifierType,
    additionalData?: {
      email?: string;
      name?: string;
    }
  ): Promise<VisitorProfile> {
    const result = await pool.query(
      `INSERT INTO visitor_profiles (
        chatbot_id,
        visitor_identifier,
        identifier_type,
        email,
        name,
        profile_data,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
      RETURNING *`,
      [
        chatbotId,
        identifier,
        identifierType,
        additionalData?.email || null,
        additionalData?.name || null,
        JSON.stringify({
          interests: [],
          preferences: {},
          engagement_score: 0,
          last_topics: [],
          behavioral_signals: [],
        }),
      ]
    );

    console.log(`[VisitorProfileService] Created new profile: ${result.rows[0].id} (${identifierType})`);

    return result.rows[0];
  }

  /**
   * Update visitor profile
   */
  async updateProfile(
    profileId: string,
    updates: UpdateVisitorProfileInput & {
      email?: string;
      name?: string;
      lead_id?: string;
    }
  ): Promise<VisitorProfile | null> {
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.lead_id !== undefined) {
      updateFields.push(`lead_id = $${paramIndex++}`);
      values.push(updates.lead_id);
    }

    if (updates.interests || updates.notes || updates.engagement_score !== undefined) {
      // Get current profile to merge data
      const current = await this.getProfileById(profileId);
      if (current) {
        const currentData = current.profile_data;

        const updatedData = {
          ...currentData,
          interests: updates.interests
            ? [...new Set([...currentData.interests, ...updates.interests])]
            : currentData.interests,
          engagement_score: updates.engagement_score !== undefined
            ? updates.engagement_score
            : currentData.engagement_score,
        };

        updateFields.push(`profile_data = $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(updatedData));
      }
    }

    if (updates.last_interaction) {
      updateFields.push(`last_interaction = $${paramIndex++}`);
      values.push(updates.last_interaction);
    }

    // Always update timestamp
    updateFields.push('updated_at = NOW()');

    // Add profile ID as final parameter
    values.push(profileId);

    const query = `
      UPDATE visitor_profiles
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    return result.rows[0] || null;
  }

  /**
   * Update last_seen timestamp
   */
  async updateLastSeen(profileId: string): Promise<void> {
    await pool.query(
      `UPDATE visitor_profiles
       SET last_seen_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [profileId]
    );
  }

  /**
   * Merge profiles when anonymous visitor becomes known
   * (e.g., when email is captured)
   */
  async mergeProfiles(
    anonymousProfileId: string,
    email: string
  ): Promise<VisitorProfile | null> {
    const emailHash = this.hashIdentifier(email);

    // Get anonymous profile
    const anonymousProfile = await this.getProfileById(anonymousProfileId);
    if (!anonymousProfile) {
      throw new Error('Anonymous profile not found');
    }

    // Check if email profile already exists
    const emailProfile = await this.findByIdentifier(
      anonymousProfile.chatbot_id,
      emailHash,
      'email'
    );

    if (emailProfile) {
      // Merge anonymous data into existing email profile
      console.log(`[VisitorProfileService] Merging profiles: ${anonymousProfileId} -> ${emailProfile.id}`);

      // Use database function for atomic merge
      await pool.query(
        'SELECT merge_visitor_profiles($1, $2)',
        [anonymousProfileId, emailProfile.id]
      );

      return this.getProfileById(emailProfile.id);
    }

    // Convert anonymous profile to email profile
    const result = await pool.query(
      `UPDATE visitor_profiles
       SET visitor_identifier = $1,
           identifier_type = 'email',
           email = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [emailHash, email, anonymousProfileId]
    );

    console.log(`[VisitorProfileService] Converted anonymous profile to email profile: ${anonymousProfileId}`);

    return result.rows[0] || null;
  }

  /**
   * Add conversation summary to profile
   */
  async addConversationSummary(
    profileId: string,
    summary: string
  ): Promise<void> {
    await pool.query(
      `UPDATE visitor_profiles
       SET conversation_summaries = array_append(conversation_summaries, $1),
           updated_at = NOW()
       WHERE id = $2`,
      [summary, profileId]
    );

    console.log(`[VisitorProfileService] Added conversation summary to profile: ${profileId}`);
  }

  /**
   * Get recent profiles for chatbot (for analytics)
   */
  async getRecentProfiles(
    chatbotId: string,
    limit: number = 50
  ): Promise<VisitorProfile[]> {
    const result = await pool.query(
      `SELECT * FROM visitor_profiles
       WHERE chatbot_id = $1
       ORDER BY last_seen_at DESC
       LIMIT $2`,
      [chatbotId, limit]
    );

    return result.rows;
  }

  /**
   * Hash identifier for privacy
   */
  private hashIdentifier(identifier: string): string {
    return crypto
      .createHash('sha256')
      .update(identifier.toLowerCase())
      .digest('hex');
  }

  /**
   * Generate device fingerprint from session + user agent
   */
  private generateFingerprint(sessionId: string, userAgent: string): string {
    const salt = process.env.VISITOR_FINGERPRINT_SALT || 'default-salt-change-me';
    return crypto
      .createHash('sha256')
      .update(`${sessionId}:${userAgent}:${salt}`)
      .digest('hex');
  }

  /**
   * Build visitor context string for agent prompt
   */
  buildVisitorContext(profile: VisitorProfile): string {
    const parts: string[] = [];

    if (profile.total_sessions > 1) {
      parts.push(`This is a returning visitor (visit #${profile.total_sessions})`);
    }

    if (profile.profile_data.interests.length > 0) {
      parts.push(`Interested in: ${profile.profile_data.interests.slice(0, 5).join(', ')}`);
    }

    if (profile.conversation_summaries.length > 0) {
      const recentSummaries = profile.conversation_summaries.slice(-2);
      parts.push(`Previous conversations: ${recentSummaries.join(' | ')}`);
    }

    if (profile.last_interaction) {
      parts.push(`Last asked about: ${profile.last_interaction}`);
    }

    return parts.join('\n');
  }
}

export const visitorProfileService = new VisitorProfileService();
