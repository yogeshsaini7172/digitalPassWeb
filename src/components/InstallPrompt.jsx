import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    // Also check if app is already installed to avoid showing prompt
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches;

    // Do not show PWA install prompt on Android OS
    const isAndroid = /android/i.test(navigator.userAgent);

    if (isAppInstalled || isAndroid) {
      return;
    }

    window.addEventListener('beforeinstallprompt', handler);

    // If it's already installed successfully, we can hide the prompt
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 48px)',
      maxWidth: '400px',
      backgroundColor: '#1e293b', /* Dark slate background */
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      borderRadius: 'var(--radius-md, 16px)',
      padding: '16px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      animation: 'slideUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 40px) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-sm, 10px)',
          background: 'var(--accent-gradient, linear-gradient(135deg, #3b82f6, #8b5cf6))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.4rem',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
        }}>
          DP
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#f8fafc', fontWeight: 600 }}>SISTec Digital Pass</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>Install SISTec Digital Pass App for better and faster experience.</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button
          onClick={handleClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            color: '#cbd5e1',
            padding: '10px 20px',
            borderRadius: 'var(--radius-sm, 8px)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#cbd5e1';
          }}
        >
          Not Now
        </button>
        <button
          onClick={handleInstallClick}
          style={{
            background: 'var(--accent-primary, #3b82f6)',
            color: 'white',
            border: 'none',
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm, 8px)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Install App
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
