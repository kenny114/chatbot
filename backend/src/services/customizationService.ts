import pool from '../config/database';

interface CustomizationSettings {
  widgetPosition?: string;
  primaryColor?: string;
  accentColor?: string;
  widgetTitle?: string;
  welcomeMessage?: string;
  avatarUrl?: string;
  autoOpen?: boolean;
  autoOpenDelay?: number;
  showTimestamp?: boolean;
  enableSound?: boolean;
  collectEmail?: boolean;
  customCss?: string;
  customJs?: string;
  responseTone?: string;
  responseLength?: string;
  language?: string;
}

export const customizationService = {
  /**
   * Get chatbot customization settings
   */
  async getCustomization(chatbotId: string): Promise<CustomizationSettings | null> {
    const query = `
      SELECT
        widget_position,
        primary_color,
        accent_color,
        widget_title,
        welcome_message,
        avatar_url,
        auto_open,
        auto_open_delay,
        show_timestamp,
        enable_sound,
        collect_email,
        custom_css,
        custom_js,
        response_tone,
        response_length,
        language
      FROM chatbot_customization
      WHERE chatbot_id = $1
    `;

    const result = await pool.query(query, [chatbotId]);

    if (result.rows.length === 0) {
      // Create default customization if it doesn't exist
      await this.createDefaultCustomization(chatbotId);
      return this.getDefaultSettings();
    }

    const row = result.rows[0];
    return {
      widgetPosition: row.widget_position,
      primaryColor: row.primary_color,
      accentColor: row.accent_color,
      widgetTitle: row.widget_title,
      welcomeMessage: row.welcome_message,
      avatarUrl: row.avatar_url,
      autoOpen: row.auto_open,
      autoOpenDelay: row.auto_open_delay,
      showTimestamp: row.show_timestamp,
      enableSound: row.enable_sound,
      collectEmail: row.collect_email,
      customCss: row.custom_css,
      customJs: row.custom_js,
      responseTone: row.response_tone,
      responseLength: row.response_length,
      language: row.language,
    };
  },

  /**
   * Update chatbot customization settings
   */
  async updateCustomization(
    chatbotId: string,
    settings: CustomizationSettings
  ): Promise<CustomizationSettings> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic UPDATE query
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(chatbotId);

    const query = `
      UPDATE chatbot_customization
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE chatbot_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      // If no rows updated, create customization first
      await this.createDefaultCustomization(chatbotId);
      return this.updateCustomization(chatbotId, settings);
    }

    return this.getCustomization(chatbotId) as Promise<CustomizationSettings>;
  },

  /**
   * Create default customization for a chatbot
   */
  async createDefaultCustomization(chatbotId: string): Promise<void> {
    const query = `
      INSERT INTO chatbot_customization (chatbot_id)
      VALUES ($1)
      ON CONFLICT (chatbot_id) DO NOTHING
    `;

    await pool.query(query, [chatbotId]);
  },

  /**
   * Delete chatbot customization
   */
  async deleteCustomization(chatbotId: string): Promise<void> {
    const query = `
      DELETE FROM chatbot_customization
      WHERE chatbot_id = $1
    `;

    await pool.query(query, [chatbotId]);
  },

  /**
   * Get default settings
   */
  getDefaultSettings(): CustomizationSettings {
    return {
      widgetPosition: 'bottom-right',
      primaryColor: '#6366f1',
      accentColor: '#10b981',
      widgetTitle: 'Chat with us',
      welcomeMessage: 'Hello! How can I help you today?',
      avatarUrl: undefined,
      autoOpen: false,
      autoOpenDelay: 5000,
      showTimestamp: true,
      enableSound: true,
      collectEmail: false,
      customCss: undefined,
      customJs: undefined,
      responseTone: 'professional',
      responseLength: 'concise',
      language: 'English',
    };
  },
};
