import React, { createContext, useState, useContext } from 'react';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const login = (email, password) => {
    setUser({
      email,
      name: 'Tapify World',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
      role: 'admin',
    });
    setCurrentScreen('dashboard');
  };

  const logout = () => {
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
      value={{ currentScreen, user, sidebarOpen, setSidebarOpen, login, logout, navigate }}
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
