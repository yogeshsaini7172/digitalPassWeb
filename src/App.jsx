import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './ThemeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';
import { triggerAllPassSync } from './viewmodels/PassViewModel';
import { triggerUserSync } from './viewmodels/UserViewModel';
import { triggerBatchSync } from './viewmodels/BatchViewModel';
import { wipeDatabase } from './database/db';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const performInitialSync = async (token) => {
    try {
      await Promise.all([
        triggerAllPassSync(token),
        triggerUserSync(token),
        triggerBatchSync(token)
      ]);
    } catch (e) {
      console.error('Sync failed:', e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      performInitialSync(token);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    const token = localStorage.getItem('token');
    if (token) {
      performInitialSync(token);
    }
  };

  const handleLogout = async (logoutType) => {
    const token = localStorage.getItem('token');
    if (token && logoutType) {
      try {
        const { logoutUser } = await import('./services/api');
        await logoutUser({ token, logoutType });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    // Fully clear storage to match Android app's SharedPreferences.clear()
    localStorage.clear();
    await wipeDatabase();
    import('./services/socket').then(({ disconnectSocket }) => {
      disconnectSocket();
    });
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider>
      {!isAuthenticated ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </ThemeProvider>
  );
}

export default App;
