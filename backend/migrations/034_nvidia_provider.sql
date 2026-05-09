-- 034_nvidia_provider.sql
-- Add settings for NVIDIA NIM provider

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_nvidia_api_key', '', CAST(strftime('%s', 'now') * 1000 AS INTEGER));

INSERT OR IGNORE INTO app_settings (setting_key, setting_value, updated_at)
VALUES ('agent_nvidia_model', 'minimaxai/minimax-m2.7', CAST(strftime('%s', 'now') * 1000 AS INTEGER));
