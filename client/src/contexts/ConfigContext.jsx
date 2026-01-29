import { useState, useEffect, createContext, useContext } from 'react';

// Default fallback config
const DEFAULT_CONFIG = {
  api_url: import.meta.env.PROD ? '/api' : `http://${window.location.hostname}:8000`
};

const ConfigContext = createContext(DEFAULT_CONFIG);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const baseUrl = import.meta.env.PROD ? '/api' : `http://${window.location.hostname}:8000`;
        const response = await fetch(`${baseUrl}/config`, {
          signal: controller.signal
        });
        if (response.ok) {
          const data = await response.json();
          setConfig(prev => ({ ...prev, ...data }));
        }
      } catch (e) {
        console.error("Failed to load config, using default", e);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={config}>
      {!loading && children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
