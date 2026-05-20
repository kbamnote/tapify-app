import React, { createContext, useState, useContext } from 'react';

import { fetchApi } from '../config';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const navigate = (screen) => {
    setCurrentScreen(screen);
    setSidebarOpen(false);
  };

  return (
    <NavigationContext.Provider
      value={{ currentScreen, user, setUser, sidebarOpen, setSidebarOpen, login, logout, navigate }}
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
