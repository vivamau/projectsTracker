-- 033_proprietary_models.sql
-- Add settings for proprietary AI provider (Claude, Gemini, GPT)

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_provider', 'ollama', CAST(strftime('%s', 'now') * 1000 AS INTEGER));

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_claude_api_key', '', CAST(strftime('%s', 'now') * 1000 AS INTEGER));

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_claude_model', 'claude-sonnet-4-6', CAST(strftime('%s', 'now') * 1000 AS INTEGER));

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_gemini_api_key', '', CAST(strftime('%s', 'now') * 1000 AS INTEGER));

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_gemini_model', 'gemini-2.0-flash', CAST(strftime('%s', 'now') * 1000 AS INTEGER));

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_gpt_api_key', '', CAST(strftime('%s', 'now') * 1000 AS INTEGER));

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_gpt_model', 'gpt-4o', CAST(strftime('%s', 'now') * 1000 AS INTEGER));
