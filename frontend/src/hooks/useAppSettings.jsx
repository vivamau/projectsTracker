import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';

const AppSettingsContext = createContext(null);

const DEFAULTS = {
  avatar_style: 'fun-emoji',
};

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    client.get('/settings/public/avatar_style')
      .then(res => {
        const val = res.data?.data?.value;
        if (val) setSettings(prev => ({ ...prev, avatar_style: val }));
      })
      .catch(() => {});
  }, []);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <AppSettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
