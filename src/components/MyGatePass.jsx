import React, { useState, useEffect, useCallback } from 'react';
import { applyForGatePass, removeGatePassBySelfUser, editGatePassBySelfUser } from '../services/api';
import { useGatePasses, useInterInstitutionalGatePasses, triggerAllPassSync } from '../viewmodels/PassViewModel';
import { fetchCampusesForAllotment } from '../viewmodels/CampusDepartmentViewModel';
import socket from '../services/socket';
import { db } from '../database/db';
import PremiumInterProgressIndicator from './PremiumInterProgressIndicator';
import PremiumProgressIndicator from './PremiumProgressIndicator';

/* ─────────────────────────────────────────────────────────
   STATUS helpers
───────────────────────────────────────────────────────── */
const statusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'exit') return 'var(--success)';
  if (s === 'rejected') return 'var(--danger)';
  if (s === 'approving') return '#f59e0b';
  return 'var(--warning)';
};

const statusLabel = (status) => {
  const s = (status || 'pending').toLowerCase();
  if (s === 'approving') return 'In Review';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* ─────────────────────────────────────────────────────────
   APPLY GATE PASS MODAL
───────────────────────────────────────────────────────── */
const ApplyModal = ({ onClose, onSuccess, isInterInstitutional, allCampuses }) => {
  const [reason, setReason] = useState('');
  const [destinationCampus, setDestinationCampus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [textareaFocused, setTextareaFocused] = useState(false);

  // Geolocation states
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [locationError, setLocationError] = useState(null);

  const QUICK_REASONS = ["Going Home", "Medical Checkup", "Family Event", "Urgent Work"];

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setDetectingLocation(false);
      return;
    }

    setDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationError(null);
        setDetectingLocation(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocationError("Location permission denied or timed out. GPS access is required to verify you are physically inside the campus.");
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please enter a reason for the gate pass.');
      return;
    }
    if (detectingLocation) {
      setError('Still acquiring GPS coordinates. Please wait...');
      return;
    }
    if (locationError || !location.latitude || !location.longitude) {
      setError(locationError || 'GPS location is required to apply.');
      return;
    }

    if (isInterInstitutional && !destinationCampus) {
      setError('Destination campus is required for inter-institutional gate pass.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = { 
        reason: trimmed, 
        token,
        latitude: location.latitude,
        longitude: location.longitude
      };
      if (isInterInstitutional) payload.destinationCampus = destinationCampus;

      const result = await applyForGatePass(payload);
      onSuccess(result);
    } catch (err) {
      setError(err.message || 'Failed to apply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Close on backdrop click
  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={onBackdropClick}
      style={{
        position: 'fixed', inset: 0, background: 'var(--overlay-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
    >
      <style>{`
        @keyframes pulse-success {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes pulse-warning {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
      `}</style>
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--surface-modal)', borderRadius: '16px',
          padding: 0, overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Apply for Gate Pass</h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Your request will be sent for approval
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Instruction Card */}
          <div style={{
            display: 'flex', gap: '1rem', alignItems: 'center',
            padding: '1rem', borderRadius: '12px',
            background: 'var(--surface-hover)', 
            border: '1px solid var(--glass-border)',
          }}>
            <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }}>🪪</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Gate Pass Request
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                Describe your reason clearly. It will be reviewed by the authority.
              </div>
            </div>
          </div>

          {isInterInstitutional && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="input-label" style={{ color: 'var(--accent-primary)', marginBottom: 0 }}>
                Destination Campus <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                className="input-control"
                value={destinationCampus}
                onChange={(e) => { setDestinationCampus(e.target.value); setError(''); }}
                style={{ background: 'var(--surface-input)', border: '1px solid var(--glass-border)' }}
              >
                <option value="">Select Destination Campus</option>
                {allCampuses.filter(c => c !== localStorage.getItem('userCampus')).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reason Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label" style={{ color: 'var(--accent-primary)', marginBottom: 0 }}>
                Reason for Gate Pass <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Tip: Ctrl+Enter to submit
              </span>
            </div>

            <textarea
              className="input-control"
              rows={4}
              placeholder="e.g. Going home for family function, medical appointment…"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              onFocus={() => setTextareaFocused(true)}
              onBlur={() => setTextareaFocused(false)}
              style={{
                resize: 'none',
                minHeight: '100px',
                padding: '0.75rem 0.85rem',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                background: 'var(--surface-input)',
                border: `1px solid ${textareaFocused ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                boxShadow: textareaFocused ? '0 0 0 3px var(--surface-input-focus-shadow)' : 'none',
                borderRadius: '10px',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
                color: 'var(--text-primary)',
                marginBottom: 0
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
              }}
            />

            {/* Quick Choice Chips */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              {QUICK_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setReason(r);
                    setError('');
                  }}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    background: reason === r ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface-hover)',
                    border: `1px solid ${reason === r ? 'rgba(59, 130, 246, 0.4)' : 'var(--glass-border)'}`,
                    color: reason === r ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Location Verification Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.85rem 1.25rem', borderRadius: '12px',
            fontSize: '0.85rem', fontWeight: 500,
            background: detectingLocation ? 'rgba(245,158,11,0.06)' : locationError ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
            border: `1px solid ${detectingLocation ? 'rgba(245,158,11,0.18)' : locationError ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)'}`,
            color: detectingLocation ? 'var(--warning)' : locationError ? 'var(--danger)' : 'var(--success)',
            transition: 'all 0.3s ease'
          }}>
            {detectingLocation ? (
              <>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: 'var(--warning)',
                  animation: 'pulse-warning 1.5s infinite',
                  flexShrink: 0
                }} />
                <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>Detecting GPS Coordinates...</span>
              </>
            ) : locationError ? (
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
                <span style={{ fontSize: '0.82rem', lineHeight: 1.4, flex: 1 }}>{locationError}</span>
                <button 
                  onClick={fetchLocation} 
                  style={{
                    background: 'var(--danger)', color: 'white', border: 'none',
                    padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem',
                    cursor: 'pointer', fontWeight: 600, flexShrink: 0
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: 'var(--success)',
                  animation: 'pulse-success 1.5s infinite',
                  display: 'inline-block',
                  flexShrink: 0
                }} />
                <span style={{ color: 'var(--text-primary)' }}>
                  GPS Verified: <strong style={{ color: 'var(--success)' }}>{location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)}</strong>
                </span>
              </>
            )}
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '10px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
              color: 'var(--danger)', fontSize: '0.85rem', lineHeight: 1.4
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button onClick={onClose} className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || detectingLocation || !!locationError}
              className="btn btn-primary"
              style={{ 
                flex: 2, 
                padding: '0.75rem',
                opacity: (submitting || detectingLocation || !!locationError) ? 0.6 : 1,
                cursor: (submitting || detectingLocation || !!locationError) ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  Submitting…
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>📤</span> Submit Application
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   GATE PASS DETAIL MODAL (self-user view)
───────────────────────────────────────────────────────── */
const GatePassDetailModal = ({ pass, onClose, onRemoved, getImageUrl, onImageClick, onEdited }) => {
  const [removing, setRemoving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editReason, setEditReason] = useState(pass.reason || '');
  const [saving, setSaving] = useState(false);

  const sc = statusColor(pass.status);
  const isPending = (pass.status || '').toLowerCase() === 'pending';

  const handleRemove = async () => {
    if (!window.confirm('Remove this gate pass request?')) return;
    setRemoving(true);
    try {
      const token = localStorage.getItem('token');
      await removeGatePassBySelfUser({ 
        token, 
        gatePassId: pass.gatePassId,
        ...(pass.destinationCampus ? { destinationCampus: pass.destinationCampus } : {})
      });
      setFeedback({ type: 'success', msg: 'Gate pass removed successfully.' });
      setTimeout(() => { onClose(); onRemoved(pass.gatePassId); }, 1200);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to remove. Please try again.' });
      setRemoving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editReason.trim()) {
      setFeedback({ type: 'error', msg: 'Reason cannot be empty.' });
      return;
    }
    if (editReason === pass.reason) {
      setEditMode(false);
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await editGatePassBySelfUser({
        token,
        gatePassId: pass.gatePassId,
        reason: editReason,
        ...(pass.destinationCampus ? { destinationCampus: pass.destinationCampus } : {})
      });
      // Instantly update local database
      const updatedPass = { ...pass, reason: editReason };
      if (pass.destinationCampus) {
        await db.interInstitutionalGatePasses.put(updatedPass);
      } else {
        await db.gatePasses.put(updatedPass);
      }
      if (onEdited) onEdited(updatedPass);
      setFeedback({ type: 'success', msg: 'Gate pass reason updated successfully.' });
      setEditMode(false);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to edit. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: 'Pass ID', value: pass.gatePassId },
    { label: 'Apply Date', value: pass.applyDate },
    { label: 'Campus', value: pass.campus },
    { label: 'Department', value: pass.department },
    { label: 'Role', value: pass.role },
    { label: 'Phone', value: pass.phone },
  ].filter(f => f.value);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--overlay-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: '760px', maxHeight: '92vh',
        overflowY: 'auto', background: 'var(--surface-modal)', borderRadius: '16px',
        padding: 0, display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'var(--surface-modal)', zIndex: 2,
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Gate Pass Details</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isPending && (
              editMode ? (
                <button onClick={handleSaveEdit} disabled={saving} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              ) : (
                <button onClick={() => setEditMode(true)} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
                  ✏ Edit
                </button>
              )
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>
              &times;
            </button>
          </div>
        </div>

        {feedback && (
          <div style={{
            padding: '0.75rem 1.5rem',
            background: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            borderBottom: '1px solid var(--glass-border)',
            color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.9rem',
          }}>
            {feedback.msg}
          </div>
        )}

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* ── Dynamic Details Grid (2 columns on desktop) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            
            {/* Column 1: Profile Card & Reason */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Profile Card */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-primary)', flexShrink: 0, background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glass-shadow)' }}>
                  {pass.img ? (
                    <img src={getImageUrl(pass.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if (onImageClick) onImageClick(getImageUrl(pass.img)); }} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                      {(pass.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pass.name}</h2>
                  <span style={{ display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: sc + '22', color: sc, border: `1px solid ${sc}55`, textTransform: 'capitalize', marginBottom: '0.5rem' }}>
                    {statusLabel(pass.status)}
                  </span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Role: <span style={{ textTransform: 'capitalize' }}>{pass.role || 'User'}</span></div>
                </div>
              </div>

              {/* Reason Card */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Reason for Leave</label>
                {editMode ? (
                  <textarea
                    className="input-control"
                    rows={2}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    style={{ resize: 'vertical', marginBottom: 0 }}
                  />
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.9rem' }}>{pass.reason || '—'}</p>
                )}
              </div>
            </div>

            {/* Column 2: Pass details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Pass & Contact Details Card */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Pass & Contact Details</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                  {fields.map(({ label, value }, idx) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: idx < fields.length - 1 ? '1px dashed var(--glass-border)' : 'none', paddingBottom: idx < fields.length - 1 ? '0.4rem' : '0' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label}:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {pass.destinationCampus ? (
            <PremiumInterProgressIndicator 
              pass={pass} 
              onActivateExit={async (p) => {
                try {
                  const token = localStorage.getItem('token');
                  if (token) {
                    triggerAllPassSync(token);
                  }
                  console.log('Success', 'Pass activated for exiting destination.');
                } catch(e) {
                  console.log('Error', 'Failed to sync after activating pass.');
                }
              }} 
            />
          ) : (
            <PremiumProgressIndicator pass={pass} />
          )}

          {/* Authority Remark */}
          {pass.tgRemark && (
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Authority Remark
              </label>
              <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.9rem' }}>{pass.tgRemark}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isPending && (
              <button
                onClick={handleRemove}
                disabled={removing}
                className="btn btn-danger"
                style={{ flex: 1, padding: '0.75rem' }}
              >
                {removing ? 'Removing…' : '🗑 Remove Request'}
              </button>
            )}
            <button onClick={onClose} className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   MY GATE PASS — main component
───────────────────────────────────────────────────────── */
export default function MyGatePass({ onImageClick }) {
  const [showApplyTypeDialog, setShowApplyTypeDialog] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isInterInstitutionalApply, setIsInterInstitutionalApply] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);
  const [allCampuses, setAllCampuses] = useState([]);
  const [isInterInstitutionalView, setIsInterInstitutionalView] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [localAddedPasses, setLocalAddedPasses] = useState([]);

  const userData = (() => {
    try { return JSON.parse(localStorage.getItem('userData') || '{}'); } catch { return {}; }
  })();

  const getImageUrl = (img) => {
    if (!img) return null;
    return `https://res.cloudinary.com/dtdo4gzfh/image/upload/${img}.jpg`;
  };

  const showMsg = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const gatePasses = useGatePasses();
  const interInstitutionalGatePasses = useInterInstitutionalGatePasses();
  const currentUserEmail = (userData.email || '').toLowerCase();

  const allPasses = React.useMemo(() => {
    const allPassesMap = new Map();
    
    [...gatePasses, ...interInstitutionalGatePasses].forEach(p => {
      allPassesMap.set(p.gatePassId, p);
    });

    localAddedPasses.forEach(p => {
      if (!allPassesMap.has(p.gatePassId)) {
        allPassesMap.set(p.gatePassId, p);
      }
    });

    const parseDateStr = (dStr) => {
      if (!dStr) return 0;
      let t = new Date(dStr).getTime();
      if (!isNaN(t)) return t;
      // Fallback for "YYYY-MM-DD hh:mm AM/PM"
      const match = dStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        let [_, y, m, d, h, min, ampm] = match;
        h = parseInt(h, 10);
        if (ampm && ampm.toUpperCase() === 'PM' && h < 12) h += 12;
        if (ampm && ampm.toUpperCase() === 'AM' && h === 12) h = 0;
        return new Date(y, m - 1, d, h, min).getTime();
      }
      return 0;
    };

    return Array.from(allPassesMap.values())
      .filter(p => (p.applyEmail || '').toLowerCase() === currentUserEmail)
      .sort((a, b) => parseDateStr(b.applyDate) - parseDateStr(a.applyDate))
      .map(pass => ({
        img: userData.img || '',
        name: userData.name || '',
        applyEmail: userData.email || '',
        department: userData.department || '',
        campus: userData.campus || '',
        role: userData.role || '',
        phone: userData.phone || '',
        ...pass,
      }));
  }, [gatePasses, interInstitutionalGatePasses, currentUserEmail, userData, localAddedPasses]);

  const passes = React.useMemo(() => {
    return allPasses.filter(p => isInterInstitutionalView ? !!p.destinationCampus : !p.destinationCampus);
  }, [allPasses, isInterInstitutionalView]);

  useEffect(() => {
    fetchCampuses();
    triggerAllPassSync(localStorage.getItem('token'));
  }, []);

  const fetchCampuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = await fetchCampusesForAllotment(token);
      setAllCampuses(data || []);
    } catch (e) {
      console.error("Failed to fetch campuses", e);
    }
  };

  const handleApplySuccess = (newPass) => {
    setShowApplyModal(false);
    showMsg('success', 'Gate pass applied successfully! Awaiting approval.');
    if (newPass) {
      newPass.applyEmail = currentUserEmail;
      newPass.campus = userData.campus;
      newPass.department = userData.department;
      setLocalAddedPasses(prev => [newPass, ...prev]);
    }
  };

  const handleRemoved = (gatePassId) => {
    db.gatePasses.delete(gatePassId);
    db.interInstitutionalGatePasses.delete(gatePassId);
    setLocalAddedPasses(prev => prev.filter(p => p.gatePassId !== gatePassId));
    setSelectedPass(null);
  };

  const handleEdited = (updatedPass) => {
    setLocalAddedPasses(prev => prev.map(p => p.gatePassId === updatedPass.gatePassId ? updatedPass : p));
  };

  const filtered = passes.filter(p =>
    !searchQuery ||
    (p.reason || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.status || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-content animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.4rem', margin: 0 }}>My Gate Passes</h1>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowApplyTypeDialog(true)}
            style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            + Apply for Gate Pass
          </button>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            background: 'var(--surface-hover)',
            padding: '0.25rem',
            borderRadius: '999px',
            border: '1px solid var(--glass-border)',
          }}>
            <button
              onClick={() => setIsInterInstitutionalView(false)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '999px',
                border: 'none',
                background: !isInterInstitutionalView ? 'var(--accent-primary)' : 'transparent',
                color: !isInterInstitutionalView ? 'white' : 'var(--text-secondary)',
                fontWeight: !isInterInstitutionalView ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              Regular Passes
            </button>
            <button
              onClick={() => setIsInterInstitutionalView(true)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '999px',
                border: 'none',
                background: isInterInstitutionalView ? 'var(--accent-primary)' : 'transparent',
                color: isInterInstitutionalView ? 'white' : 'var(--text-secondary)',
                fontWeight: isInterInstitutionalView ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              Inter-Institutional
            </button>
          </div>
        </div>

        {/* ── Feedback ── */}
        {feedback && (
          <div style={{
            padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem',
            background: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.9rem',
          }}>
            {feedback.msg}
          </div>
        )}

        {/* ── Search ── */}
        {passes.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Search by reason or status…"
              className="input-control"
              style={{ marginBottom: 0 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* ── List ── */}
        {filtered.length === 0 && passes.length > 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No results match your search.</p>
          </div>
        ) : passes.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🪪</div>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No {isInterInstitutionalView ? 'Inter-Institutional ' : ''}Gate Passes Yet</h3>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)' }}>
              Click below to submit a new request.
            </p>
            <button
              onClick={() => setShowApplyTypeDialog(true)}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem' }}
            >
              + Apply for Gate Pass
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map((pass, i) => {
              const sc = statusColor(pass.status);
              return (
                <div
                  key={pass.gatePassId || i}
                  className="glass-panel responsive-card"
                  onClick={() => setSelectedPass(pass)}
                  style={{
                    padding: '1rem 1.25rem',
                    cursor: 'pointer', transition: 'background 0.2s',
                    borderLeft: `3px solid ${sc}`,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: sc + '22', border: `1px solid ${sc}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: '1.1rem',
                    }}>
                      {(pass.status || '').toLowerCase() === 'approved' ? '✓' :
                       (pass.status || '').toLowerCase() === 'rejected' ? '✗' :
                       (pass.status || '').toLowerCase() === 'approving' ? '⏳' : '🕐'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {pass.reason || 'No reason provided'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {pass.applyDate || '—'}
                        {pass.campus && <span> · {pass.campus}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="responsive-card-actions" style={{ flexShrink: 0, marginLeft: '1rem' }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600,
                      padding: '0.2rem 0.65rem', borderRadius: '999px',
                      background: sc + '22', color: sc, border: `1px solid ${sc}55`,
                      textTransform: 'capitalize', whiteSpace: 'nowrap',
                    }}>
                      {statusLabel(pass.status)}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Apply Type Dialog ── */}
      {showApplyTypeDialog && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowApplyTypeDialog(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'var(--overlay-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
          }}
        >
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '360px', padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Select Gate Pass Type</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setIsInterInstitutionalApply(false);
                  setShowApplyTypeDialog(false);
                  setShowApplyModal(true);
                }}
                style={{ padding: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                Regular <span>→</span>
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setIsInterInstitutionalApply(true);
                  setShowApplyTypeDialog(false);
                  setShowApplyModal(true);
                }}
                style={{ padding: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                Inter-Institutional <span>→</span>
              </button>
            </div>
            <button onClick={() => setShowApplyTypeDialog(false)} className="btn btn-text" style={{ marginTop: '1rem', width: '100%' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Apply Modal ── */}
      {showApplyModal && (
        <ApplyModal
          onClose={() => setShowApplyModal(false)}
          onSuccess={handleApplySuccess}
          isInterInstitutional={isInterInstitutionalApply}
          allCampuses={allCampuses}
        />
      )}

      {/* ── Detail Modal ── */}
      {selectedPass && (
        <GatePassDetailModal
          pass={selectedPass}
          onClose={() => setSelectedPass(null)}
          onRemoved={handleRemoved}
          onEdited={handleEdited}
          getImageUrl={getImageUrl}
          onImageClick={onImageClick}
        />
      )}
    </>
  );
};


