import React, { useState, useEffect } from 'react';
import { getCampusForAllotment, getAllottedSecurityGuard, saveAllottedSecurityGuard } from '../services/api';

/* ─────────────────────────────────────────────────────────
   SECURITY GUARD ALLOTMENT
   Mirrors the Android app's allotment functionality:
   1. Choose a campus from the list
   2. See currently allotted guards (draggable left column)
   3. See available guards (right column)
   4. Move guards between allotted ↔ available
   5. Save allotment
───────────────────────────────────────────────────────── */
const SecurityGuardAllotment = () => {
  const token = localStorage.getItem('token');

  // Step 1 — campuses
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState(null);

  // Step 2 — guard lists
  const [allottedGuards, setAllottedGuards] = useState([]);
  const [availableGuards, setAvailableGuards] = useState([]);

  // Loading / feedback
  const [loadingCampuses, setLoadingCampuses] = useState(true);
  const [loadingGuards, setLoadingGuards] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // {type, msg}
  const [searchAllotted, setSearchAllotted] = useState('');
  const [searchAvailable, setSearchAvailable] = useState('');

  // ── Fetch campuses on mount ──
  useEffect(() => {
    const fetch = async () => {
      setLoadingCampuses(true);
      try {
        const data = await getCampusForAllotment(token);
        // API returns an array of campus strings
        setCampuses(Array.isArray(data) ? data : Object.values(data).flat());
      } catch {
        showMsg('error', 'Failed to load campuses. Please refresh.');
      } finally {
        setLoadingCampuses(false);
      }
    };
    fetch();
  }, []);

  // ── Load guards when campus is selected ──
  useEffect(() => {
    if (!selectedCampus) return;
    loadGuards(selectedCampus);
  }, [selectedCampus]);

  const loadGuards = async (campus) => {
    setLoadingGuards(true);
    setAllottedGuards([]);
    setAvailableGuards([]);
    setSearchAllotted('');
    setSearchAvailable('');
    try {
      const data = await getAllottedSecurityGuard({ token, campus });
      // Backend returns { allotted: [...], unallotted: [...] }
      const allotted = data.allotted || data.allottedGuards || data.allotted_guards || [];
      // Key for available is 'unallotted' on the backend
      const available = data.unallotted || data.available || data.availableGuards || data.available_guards || [];
      setAllottedGuards(allotted);
      setAvailableGuards(available);
      console.log('[Allotment] Keys:', Object.keys(data), '| Allotted:', allotted.length, '| Available:', available.length);
    } catch (err) {
      console.error('[Allotment] loadGuards error:', err.message);
      showMsg('error', `Failed to load guards: ${err.message}`);
    } finally {
      setLoadingGuards(false);
    }
  };

  const showMsg = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ── Move guard: available → allotted ──
  const addGuard = (guard) => {
    setAvailableGuards(prev => prev.filter(g => g.email !== guard.email));
    setAllottedGuards(prev => [...prev, guard]);
  };

  // ── Move guard: allotted → available ──
  const removeGuard = (guard) => {
    setAllottedGuards(prev => prev.filter(g => g.email !== guard.email));
    setAvailableGuards(prev => [...prev, guard]);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!selectedCampus) return;
    setSaving(true);
    try {
      // Backend expects 'allottedSecurityGuard' key with array of email strings (matches Android)
      const payload = {
        token,
        campus: selectedCampus,
        allottedSecurityGuard: allottedGuards.map(g => g.email),
      };
      console.log('[Allotment] Save payload:', JSON.stringify(payload));
      await saveAllottedSecurityGuard(payload);
      showMsg('success', `Security guards for "${selectedCampus}" saved successfully!`);
      // Reload from server to confirm saved state
      await loadGuards(selectedCampus);
    } catch (err) {
      console.error('[Allotment] Save error:', err.message);
      showMsg('error', err.message || 'Failed to save allotment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Filtered lists ──
  const filteredAllotted = allottedGuards.filter(g =>
    !searchAllotted || (g.name || '').toLowerCase().includes(searchAllotted.toLowerCase())
  );
  const filteredAvailable = availableGuards.filter(g =>
    !searchAvailable || (g.name || '').toLowerCase().includes(searchAvailable.toLowerCase())
  );

  // ── Guard card ──
  const GuardCard = ({ guard, action, actionLabel, actionClass }) => (
    <div
      className="glass-panel"
      style={{
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        transition: 'background 0.2s',
        background: 'rgba(255,255,255,0.02)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    >
      {/* Avatar */}
      <div style={{
        width: '38px', height: '38px', borderRadius: '50%',
        background: 'var(--accent-primary)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', fontWeight: 700, color: '#fff',
      }}>
        {(guard.name || 'G').charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {guard.name || 'Unknown'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {guard.email}
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={() => action(guard)}
        className={`btn ${actionClass}`}
        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', flexShrink: 0 }}
      >
        {actionLabel}
      </button>
    </div>
  );

  return (
    <>
      {/* ── Top bar ── */}
      <div className="topbar">
        <h3 style={{ margin: 0 }}>Security Guard Allotment</h3>
        <span className="badge badge-success">Online</span>
      </div>

      <div className="page-content animate-fade-in">

        {/* ── Feedback banner ── */}
        {feedback && (
          <div style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            background: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.9rem',
          }}>
            {feedback.msg}
          </div>
        )}

        {/* ── Step 1: Campus Selection ── */}
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '1rem' }}>
            Select Campus
          </label>

          {loadingCampuses ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '38px', width: '120px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : campuses.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No campuses found.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {campuses.map((campus, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedCampus(campus)}
                  className={`btn ${selectedCampus === campus ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.5rem 1.25rem', transition: 'all 0.2s' }}
                >
                  {campus}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Step 2: Guards panel (only when campus is selected) ── */}
        {selectedCampus && (
          <>
            {loadingGuards ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
              </div>
            ) : (
              <>
                {/* Summary row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Campus: <strong style={{ color: 'var(--text-primary)' }}>{selectedCampus}</strong>
                    </span>
                    <span className="badge badge-success">{allottedGuards.length} Allotted</span>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>{availableGuards.length} Available</span>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1.5rem' }}
                  >
                    {saving ? 'Saving…' : '💾 Save Allotment'}
                  </button>
                </div>

                {/* ── Two-column layout ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                  {/* Left: Allotted Guards */}
                  <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                        ✓ Allotted ({filteredAllotted.length})
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="Search allotted…"
                      className="input-control"
                      style={{ marginBottom: 0 }}
                      value={searchAllotted}
                      onChange={e => setSearchAllotted(e.target.value)}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
                      {filteredAllotted.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {allottedGuards.length === 0 ? 'No guards allotted to this campus yet.' : 'No results for your search.'}
                        </div>
                      ) : (
                        filteredAllotted.map((guard, i) => (
                          <GuardCard
                            key={i}
                            guard={guard}
                            action={removeGuard}
                            actionLabel="Remove"
                            actionClass="btn-danger"
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: Available Guards */}
                  <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                        Available Guards ({filteredAvailable.length})
                      </label>
                    </div>
                    <input
                      type="text"
                      placeholder="Search available…"
                      className="input-control"
                      style={{ marginBottom: 0 }}
                      value={searchAvailable}
                      onChange={e => setSearchAvailable(e.target.value)}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
                      {filteredAvailable.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {availableGuards.length === 0 ? 'All guards have been allotted.' : 'No results for your search.'}
                        </div>
                      ) : (
                        filteredAvailable.map((guard, i) => (
                          <GuardCard
                            key={i}
                            guard={guard}
                            action={addGuard}
                            actionLabel="+ Add"
                            actionClass="btn-success"
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </>
            )}
          </>
        )}

        {/* ── Empty state ── */}
        {!selectedCampus && !loadingCampuses && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Select a Campus to Begin</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Choose a campus above to see and manage the security guards allotted to it.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default SecurityGuardAllotment;
