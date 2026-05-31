import React, { useState } from 'react';
import { loginUser, sendVerificationCode, verifyVerificationCode, updatePassword } from '../services/api';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Forgot Password Wizard State: null | 'email' | 'code' | 'reset'
  const [forgotMode, setForgotMode] = useState(null);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await loginUser(email, password);
      if (data && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userLevel', data.level || '');
        localStorage.setItem('userRole', data.role || '');
        localStorage.setItem('userName', data.name || '');
        localStorage.setItem('userEmail', data.email || '');
        localStorage.setItem('userCampus', data.campus || '');
        localStorage.setItem('userDepartment', data.department || '');
        localStorage.setItem('userData', JSON.stringify(data));
        onLoginSuccess();
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await sendVerificationCode(email);
      setSuccessMsg('Verification code sent to your email.');
      setForgotMode('code');
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please verify email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the verification code');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await verifyVerificationCode(email, otp);
      setSuccessMsg('Code verified. Set your new password.');
      setForgotMode('reset');
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await updatePassword(email, otp, newPassword);
      setSuccessMsg('Password updated successfully! Please login with your new password.');
      // Return to login screen
      setForgotMode(null);
      setPassword('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderForgotFlow = () => {
    if (forgotMode === 'email') {
      return (
        <form onSubmit={handleSendCode}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input 
              type="email" 
              className="input-control" 
              placeholder="Enter registered email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? <div className="spinner"></div> : 'Send Verification Code'}
          </button>
          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ width: '100%', marginTop: '0.75rem' }} 
            onClick={() => { setForgotMode(null); setError(null); setSuccessMsg(null); }}
          >
            Back to Login
          </button>
        </form>
      );
    }

    if (forgotMode === 'code') {
      return (
        <form onSubmit={handleVerifyCode}>
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Code sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
          </div>
          <div className="input-group">
            <label className="input-label">Verification Code</label>
            <input 
              type="text" 
              className="input-control" 
              placeholder="Enter 4-8 digit OTP code" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? <div className="spinner"></div> : 'Verify Code'}
          </button>
          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ width: '100%', marginTop: '0.75rem' }} 
            onClick={() => { setForgotMode('email'); setError(null); setSuccessMsg(null); }}
          >
            Back / Resend Code
          </button>
        </form>
      );
    }

    if (forgotMode === 'reset') {
      return (
        <form onSubmit={handleResetPassword}>
          <div className="input-group">
            <label className="input-label">New Password</label>
            <input 
              type="password" 
              className="input-control" 
              placeholder="Enter new password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required 
            />
          </div>
          <div className="input-group">
            <label className="input-label">Confirm New Password</label>
            <input 
              type="password" 
              className="input-control" 
              placeholder="Confirm new password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? <div className="spinner"></div> : 'Reset Password'}
          </button>
          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ width: '100%', marginTop: '0.75rem' }} 
            disabled={loading}
            onClick={() => { setForgotMode(null); setError(null); setSuccessMsg(null); }}
          >
            Cancel
          </button>
        </form>
      );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>DigitalPass</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {forgotMode ? 'Reset password recovery' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ display: 'block', textAlign: 'center', marginBottom: '1.5rem', padding: '0.5rem' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="badge badge-success" style={{ display: 'block', textAlign: 'center', marginBottom: '1.5rem', padding: '0.5rem' }}>
            {successMsg}
          </div>
        )}

        {forgotMode ? (
          renderForgotFlow()
        ) : (
          <form onSubmit={handleLoginSubmit}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input 
                type="email" 
                className="input-control" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">Password</label>
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                  onClick={() => { setForgotMode('email'); setError(null); setSuccessMsg(null); }}
                >
                  Forgot Password?
                </button>
              </div>
              <input 
                type="password" 
                className="input-control" 
                placeholder="Enter your password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
              {loading ? <div className="spinner"></div> : 'Sign In'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Or use our mobile app</p>
          <a href={`${import.meta.env.BASE_URL}app-debug.apk`} download className="btn btn-outline" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download Android App
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
