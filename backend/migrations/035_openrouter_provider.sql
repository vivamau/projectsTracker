-- 035_openrouter_provider.sql
-- Add settings for OpenRouter provider

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_openrouter_api_key', '', CAST(strftime('%s', 'now') * 1000 AS INTEGER));

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_openrouter_model', 'meta-llama/llama-3.3-70b-instruct', CAST(strftime('%s', 'now') * 1000 AS INTEGER));
