import React, { createContext, useState, useContext, useEffect } from 'react';

import { fetchApi } from '../config';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [params, setParams] = useState(null);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      
      setUser(response.data?.user || response.user);
      setCurrentScreen('dashboard');
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    // In the future, we could call /api/logout.php here
    setUser(null);
    setCurrentScreen('login');
    setSidebarOpen(false);
  };

  const navigate = (screen, screenParams = null) => {
    setCurrentScreen(screen);
    setParams(screenParams);
    setSidebarOpen(false);
  };

  return (
    <NavigationContext.Provider
      value={{ currentScreen, params, user, setUser, sidebarOpen, setSidebarOpen, login, logout, navigate }}
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
