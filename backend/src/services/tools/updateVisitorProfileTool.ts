/**
 * Update Visitor Profile Tool
 * Tracks visitor interests and context for future sessions (cross-session memory)
 */

import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';
import { sessionService } from '../sessionService';
import { VisitorProfileToolResult } from '../../types/agent';

// This will be implemented when we create visitorProfileService
// For now, we'll create a placeholder that stores in session state

export function createUpdateVisitorProfileTool(sessionId: string) {
  return new DynamicStructuredTool({
    name: 'update_visitor_profile',
    description: `Update the visitor's profile with interests, preferences, or important context.

    Use this tool to REMEMBER key information about the visitor for future sessions.
    This enables "remember me from last time" conversations - a major differentiat

or.

    When to use:
    - Visitor mentions specific interests or needs ("looking for CRM", "need API integration")
    - Visitor shares important context about their business or use case
    - After meaningful interactions that reveal preferences

    DO NOT use for:
    - Generic conversation ("how are you")
    - Information already captured in lead data
    - Obvious facts that don't need remembering

    The profile persists across sessions. When the visitor returns (same email or device),
    their previous interests and context will be loaded automatically.

    Examples:
    - interests: ["CRM integration", "API access", "team of 50"]
    - notes: "Mentioned migrating from Salesforce, finds it too complex"`,

    schema: z.object({
      interests: z.array(z.string()).optional().describe('Topics or features the visitor is interested in'),
      notes: z.string().optional().describe('Important context to remember about this visitor'),
    }),

    func: async ({ interests, notes }) => {
      try {
        console.log(`[UpdateVisitorProfileTool] Updating profile for session: ${sessionId}`);

        // Get session to find visitor profile
        const session = await sessionService.getSessionById(sessionId);

        if (!session) {
          throw new Error('Session not found');
        }

        // For now, store in session agent_state (will be moved to visitor profile service)
        const currentProfile = session.agent_state?.visitor_profile || {
          interests: [],
          notes: [],
        };

        // Merge new interests (deduplicate)
        const updatedInterests = interests
          ? [...new Set([...currentProfile.interests, ...interests])]
          : currentProfile.interests;

        // Append notes
        const updatedNotes = notes
          ? [...currentProfile.notes, notes]
          : currentProfile.notes;

        await sessionService.updateSession(sessionId, {
          agent_state: {
            ...(session.agent_state || {}),
            visitor_profile: {
              interests: updatedInterests,
              notes: updatedNotes,
              last_updated: new Date(),
            },
          },
        });

        const result: VisitorProfileToolResult = {
          success: true,
          message: 'Visitor profile updated successfully',
        };

        console.log(`[UpdateVisitorProfileTool] Profile updated: ${updatedInterests.length} interests, ${updatedNotes.length} notes`);

        return JSON.stringify(result);

      } catch (error) {
        console.error('[UpdateVisitorProfileTool] Error:', error);

        const errorResult: VisitorProfileToolResult = {
          success: false,
          message: 'Unable to update visitor profile',
        };

        return JSON.stringify(errorResult);
      }
    },
  });
}
