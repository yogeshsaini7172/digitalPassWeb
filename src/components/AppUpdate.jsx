import React, { useState } from 'react';
import { uploadApkFile } from '../services/api';

const AppUpdate = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const token = localStorage.getItem('token');

  const showMsg = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showMsg('error', 'Please select an APK file to upload.');
      return;
    }
    if (!message.trim()) {
      showMsg('error', 'Please enter a release message.');
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const response = await uploadApkFile(file, token, message);
      showMsg('success', 'APK uploaded successfully! The new version is now live.');
      setFile(null);
      setMessage('');
      // Reset file input
      const fileInput = document.getElementById('apk-file-input');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      showMsg('error', error.message || 'Failed to upload APK.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>App Update Management</h3>
      
      {feedback && (
        <div style={{
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          borderRadius: '8px',
          background: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${feedback.type === 'success' ? 'var(--success)' : 'var(--danger)'}55`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {feedback.type === 'success' ? '✅' : '❌'} {feedback.msg}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
          Upload a new Android APK file. This will create a new release on GitHub, and users will be prompted to download the update automatically when they next open the app.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="input-label" style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '0.5rem' }}>APK File</label>
            <div style={{ position: 'relative' }}>
              <input
                id="apk-file-input"
                type="file"
                accept=".apk"
                onChange={handleFileChange}
                disabled={loading}
                className="input-control"
                style={{ cursor: 'pointer', padding: '0.5rem' }}
              />
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Only .apk files are supported. Ensure the version code in the APK is incremented.</span>
          </div>

          <div>
            <label className="input-label" style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '0.5rem' }}>Release Notes / Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              placeholder="E.g., Added new features and fixed bugs..."
              className="input-control"
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.8rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }}></div>
                  Uploading... This may take a minute.
                </>
              ) : (
                'Upload and Release'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppUpdate;
