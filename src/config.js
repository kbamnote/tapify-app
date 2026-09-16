import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const API_BASE = 'https://app.tapify.co.in';

// Tells the backend a request came from the app (and which platform/version),
// so customer activity is recorded as app use rather than website use.
export const CLIENT_HEADER = `app;${Platform.OS};${Constants.expoConfig?.version ?? ''}`;

export const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;

  const defaultHeaders = {
    'Accept': 'application/json',
    'X-Tapify-Client': CLIENT_HEADER,
  };

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const defaultOptions = {
    headers: defaultHeaders,
    // The backend uses session cookies (PHPSESSID) and has CORS credentials enabled.
    // In React Native, 'include' is required to send cookies on cross-origin requests.
    credentials: 'include',
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    
    // PHP might return 200 with {success: false, message: ...}
    // We should parse that correctly
    if (!response.ok || data.success === false) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};
