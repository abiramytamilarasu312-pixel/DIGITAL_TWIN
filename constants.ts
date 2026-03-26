
export const MACHINE_CONFIG = {
  MAX_RPM: 5000,
  MAX_FEED: 1000,
  SAFE_VIBRATION_THRESHOLD: 3.5,
  POLLING_INTERVAL_MS: 1000,
  ESP32_WIFI_URL: 'http://192.168.4.1/telemetry', // Default ESP32 AP IP
};

export const COLORS = {
  HEALTHY: '#10b981',
  WARNING: '#f59e0b',
  CRITICAL: '#ef4444',
  ACCENT: '#4f46e5',
  BG_LIGHT: '#f8fafc',
  CARD_LIGHT: '#ffffff'
};
