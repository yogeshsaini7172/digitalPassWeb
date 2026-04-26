import React, { useState, useEffect, useCallback } from 'react';
import { applyForGatePass, getSelfUserGatePass, removeGatePassBySelfUser } from '../services/api';

/* ─────────────────────────────────────────────────────────
   STATUS helpers
───────────────────────────────────────────────────────── */
const statusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'exited') return 'var(--success)';
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
const ApplyModal = ({ onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please enter a reason for the gate pass.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const result = await applyForGatePass({ reason: trimmed, token });
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
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%', maxWidth: '480px',
          background: '#111', borderRadius: '16px',
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
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Icon + intro */}
          <div style={{
            display: 'flex', gap: '1rem', alignItems: 'center',
            padding: '1rem', borderRadius: '10px',
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <span style={{ fontSize: '2rem' }}>🪪</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Gate Pass Request
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Describe your reason clearly. It will be reviewed by the authority.
              </div>
            </div>
          </div>

          <div>
            <label className="input-label" style={{ color: 'var(--accent-primary)' }}>
              Reason for Gate Pass <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              className="input-control"
              rows={4}
              placeholder="e.g. Going home for family function, medical appointment…"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              style={{
                resize: 'vertical',
                background: 'rgba(255,255,255,0.04)',
                marginBottom: 0,
                minHeight: '100px',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
              }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
              Tip: Ctrl+Enter to submit
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '8px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              color: 'var(--danger)', fontSize: '0.875rem',
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
              disabled={submitting}
              className="btn btn-primary"
              style={{ flex: 2, padding: '0.75rem' }}
            >
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  Submitting…
                </span>
              ) : '📤 Submit Application'}
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
const GatePassDetailModal = ({ pass, onClose, onRemoved, getImageUrl }) => {
  const [removing, setRemoving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const sc = statusColor(pass.status);
  const isPending = (pass.status || '').toLowerCase() === 'pending';

  const handleRemove = async () => {
    if (!window.confirm('Remove this gate pass request?')) return;
    setRemoving(true);
    try {
      const token = localStorage.getItem('token');
      await removeGatePassBySelfUser({ token, gatePassId: pass.gatePassId });
      setFeedback({ type: 'success', msg: 'Gate pass removed successfully.' });
      setTimeout(() => { onClose(); onRemoved(pass.gatePassId); }, 1200);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to remove. Please try again.' });
      setRemoving(false);
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
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: '540px', maxHeight: '92vh',
        overflowY: 'auto', background: '#111', borderRadius: '16px',
        padding: 0, display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: '#111', zIndex: 2,
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Gate Pass Details</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>
            &times;
          </button>
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
          {/* Profile row */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              overflow: 'hidden', border: '2px solid var(--glass-border)',
              flexShrink: 0, background: 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {pass.img ? (
                <img src={getImageUrl(pass.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {(pass.name || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem' }}>{pass.name}</h2>
              <span style={{
                display: 'inline-block', padding: '0.2rem 0.8rem', borderRadius: '999px',
                fontSize: '0.78rem', fontWeight: 600,
                background: sc + '22', color: sc, border: `1px solid ${sc}55`,
                textTransform: 'capitalize',
              }}>
                {statusLabel(pass.status)}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>
              Reason for Leave
            </label>
            <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6 }}>{pass.reason || '—'}</p>
          </div>

          {/* Authority Remark */}
          {pass.tgRemark && (
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>
                Authority Remark
              </label>
              <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6 }}>{pass.tgRemark}</p>
            </div>
          )}

          {/* Info grid */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.75rem' }}>
              Details
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
              {fields.map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '110px' }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

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
const MyGatePass = () => {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const loadPasses = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const data = await getSelfUserGatePass(token);
      // Enrich each pass with user profile data (mirrors Android getCommonData)
      const enriched = (data || []).map(pass => ({
        img: userData.img || '',
        name: userData.name || '',
        applyEmail: userData.email || '',
        department: userData.department || '',
        campus: userData.campus || '',
        role: userData.role || '',
        phone: userData.phone || '',
        ...pass,
      }));
      setPasses(enriched);
    } catch (err) {
      showMsg('error', `Failed to load gate passes: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPasses(); }, [loadPasses]);

  const handleApplySuccess = (newPass) => {
    // Enrich with local user data (mirrors Android getCommonData)
    const enriched = {
      img: userData.img || '',
      name: userData.name || '',
      applyEmail: userData.email || '',
      department: userData.department || '',
      campus: userData.campus || '',
      role: userData.role || '',
      phone: userData.phone || '',
      ...newPass,
    };
    setPasses(prev => [enriched, ...prev]);
    setShowApplyModal(false);
    showMsg('success', 'Gate pass applied successfully! Awaiting approval.');
  };

  const handleRemoved = (gatePassId) => {
    setPasses(prev => prev.filter(p => p.gatePassId !== gatePassId));
    setSelectedPass(null);
  };

  const filtered = passes.filter(p =>
    !searchQuery ||
    (p.reason || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.status || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const stats = {
    total: passes.length,
    pending: passes.filter(p => (p.status || '').toLowerCase() === 'pending').length,
    approved: passes.filter(p => (p.status || '').toLowerCase() === 'approved').length,
    rejected: passes.filter(p => (p.status || '').toLowerCase() === 'rejected').length,
  };

  return (
    <>
      {/* ── Top bar ── */}
      <div className="topbar">
        <h3 style={{ margin: 0 }}>My Gate Pass</h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={loadPasses}
            className="btn btn-outline"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            title="Refresh"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => setShowApplyModal(true)}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
          >
            + Apply for Gate Pass
          </button>
        </div>
      </div>

      <div className="page-content animate-fade-in">

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

        {/* ── Stats row ── */}
        {!loading && passes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total', value: stats.total, color: 'var(--accent-primary)' },
              { label: 'Pending', value: stats.pending, color: 'var(--warning)' },
              { label: 'Approved', value: stats.approved, color: 'var(--success)' },
              { label: 'Rejected', value: stats.rejected, color: 'var(--danger)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-panel" style={{
                padding: '1rem', textAlign: 'center',
                borderTop: `3px solid ${color}`,
              }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Search ── */}
        {!loading && passes.length > 0 && (
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
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 && passes.length > 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No results match your search.</p>
          </div>
        ) : passes.length === 0 ? (
          /* Empty state */
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🪪</div>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No Gate Passes Yet</h3>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)' }}>
              You haven't applied for any gate passes. Click below to submit your first request.
            </p>
            <button
              onClick={() => setShowApplyModal(true)}
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
                  className="glass-panel"
                  onClick={() => setSelectedPass(pass)}
                  style={{
                    padding: '1rem 1.25rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', transition: 'background 0.2s',
                    borderLeft: `3px solid ${sc}`,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  {/* Left: icon + info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                    {/* Icon */}
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
                    {/* Text */}
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

                  {/* Right: status badge + arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: '1rem' }}>
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

      {/* ── Apply Modal ── */}
      {showApplyModal && (
        <ApplyModal
          onClose={() => setShowApplyModal(false)}
          onSuccess={handleApplySuccess}
        />
      )}

      {/* ── Detail Modal ── */}
      {selectedPass && (
        <GatePassDetailModal
          pass={selectedPass}
          onClose={() => setSelectedPass(null)}
          onRemoved={handleRemoved}
          getImageUrl={getImageUrl}
        />
      )}
    </>
  );
};

export default MyGatePass;
