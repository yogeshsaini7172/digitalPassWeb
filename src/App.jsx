import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './ThemeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
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
