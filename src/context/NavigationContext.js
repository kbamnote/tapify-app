import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';

import { fetchApi } from '../config';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [params, setParams] = useState(null);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const historyStack = useRef([]);
  const lastBackPress = useRef(0);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetchApi('/api/me.php');
        if (response.success && response.data && response.data.user) {
          setUser(response.data.user);
          setCurrentScreen('dashboard');
        }
      } catch (err) {
        // Not logged in or session expired
      }
    };
    checkSession();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetchApi('/api/login.php', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // After login, fetch full user profile (includes titanium, subscription, vcard)
      const meResponse = await fetchApi('/api/me.php');
      if (meResponse.success && meResponse.data?.user) {
        setUser(meResponse.data.user);
      } else {
        setUser(response.data?.user || response.user);
      }

      setCurrentScreen('dashboard');
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // Re-fetch the current user from the server (call this after admin changes titanium status)
  const refreshUser = async () => {
    try {
      const response = await fetchApi('/api/me.php');
      if (response.success && response.data?.user) {
        setUser(response.data.user);
      }
    } catch (_) {}
  };

  const logout = () => {
    historyStack.current = [];
    setUser(null);
    setCurrentScreen('login');
    setSidebarOpen(false);
  };

  const navigate = (screen, screenParams = null) => {
    setCurrentScreen(prev => {
      // Don't push duplicates or login onto the history stack
      if (prev !== screen && prev !== 'login') {
        historyStack.current.push({ screen: prev, params });
      }
      return screen;
    });
    setParams(screenParams);
    setSidebarOpen(false);
  };

  const goBack = () => {
    if (historyStack.current.length > 0) {
      const previous = historyStack.current.pop();
      setCurrentScreen(previous.screen);
      setParams(previous.params);
      setSidebarOpen(false);
      return true; // handled
    }
    return false; // let OS handle (exit app)
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      // Close sidebar first if open
      if (sidebarOpen) {
        setSidebarOpen(false);
        return true;
      }

      if (historyStack.current.length > 0) {
        goBack();
        return true;
      }

      // On root screen — show "press again to exit" toast
      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        return false; // exit app
      }
      lastBackPress.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [sidebarOpen]);

  return (
    <NavigationContext.Provider
      value={{ currentScreen, params, user, setUser, sidebarOpen, setSidebarOpen, login, logout, navigate, goBack, refreshUser }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used inside NavigationProvider');
  return ctx;
}
