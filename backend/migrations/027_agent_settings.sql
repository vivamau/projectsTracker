-- 027_agent_settings.sql
-- Seed default AI agent settings into app_settings

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_ollama_url', 'http://localhost:11434', CAST(strftime('%s', 'now') * 1000 AS INTEGER));

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_ollama_model', 'llama3.2', CAST(strftime('%s', 'now') * 1000 AS INTEGER));

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_ollama_api_key', '', CAST(strftime('%s', 'now') * 1000 AS INTEGER));
