import React, { createContext, useContext, useCallback } from 'react';

const envApiBaseUrl = process.env.REACT_APP_API_BASE_URL?.trim();

export const defaultConfig = {
  apiBaseUrl: envApiBaseUrl || 'http://localhost:5000',
};

const ConfigContext = createContext(defaultConfig);

export const ConfigProvider = ({ config = {}, children }) => {
  const mergedConfig = { ...defaultConfig, ...config };
  return (
    <ConfigContext.Provider value={mergedConfig}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);

export const buildApiUrl = (config, path = '') => {
  const base = (config?.apiBaseUrl ?? defaultConfig.apiBaseUrl).replace(/\/+$/, '');
  if (!path) {
    return base;
  }
  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalisedPath}`;
};

export const useApiUrl = () => {
  const config = useConfig();
  return useCallback((path = '') => buildApiUrl(config, path), [config]);
};
