import React, { useEffect, useState } from 'react';
import { activateInterInstitutionalGatePass } from '../services/api';

// Helper to format "YYYY-MM-DD hh:mm AM/PM" to:
// hh:mm AM/PM
// YYYY-MM-DD
const formatTime = (timeStr) => {
  if (!timeStr || timeStr === 'null' || timeStr.trim() === '') return { time: '', date: '' };
  const parts = timeStr.trim().split(' ');
  if (parts.length >= 2) {
    const time = parts[1] + (parts.length > 2 ? ` ${parts[2]}` : '');
    const date = parts[0];
    return { time, date };
  }
  return { time: timeStr, date: '' };
};

const PremiumInterProgressIndicator = ({ pass, onActivateExit }) => {
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState(null);
  const [activateSuccess, setActivateSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!pass.destinationCampus) return null;

  const applyTime = pass.applyDate;
  const initialApprTime = pass.initialApprovalTime;
  const finalApprTime = pass.finalApprovalTime;
  const sourceExitTime = pass.sourceCampusExitTime;
  const destEntryTime = pass.destinationCampusEntryTime;
  const destExitTime = pass.destinationCampusExitTime;
  const sourceEntryTime = pass.sourceCampusReEntryTime;

  const hasInitial = !!initialApprTime && initialApprTime !== 'null';
  const hasFinal = !!finalApprTime && finalApprTime !== 'null';
  const hasSrcExit = !!sourceExitTime && sourceExitTime !== 'null';
  const hasDestEntry = !!destEntryTime && destEntryTime !== 'null';
  const hasDestExit = !!destExitTime && destExitTime !== 'null';
  const hasSrcEntry = !!sourceEntryTime && sourceEntryTime !== 'null';

  const initialBypassed = !hasInitial && hasFinal;
  const destBypassed = !hasDestEntry && !hasDestExit && hasSrcEntry;

  const nodes = [
    { key: 'applied', label: 'Applied', timeStr: applyTime, state: 'PENDING', isBypass: false },
    { key: 'initial', label: 'Init\nAppr', timeStr: initialApprTime, state: 'PENDING', isBypass: false },
    { key: 'final', label: 'Final\nAppr', timeStr: finalApprTime, state: 'PENDING', isBypass: false },
    { key: 'src_exit', label: 'Source\nExit', timeStr: sourceExitTime, state: 'PENDING', isBypass: false },
    { key: 'dst_entry', label: 'Dest\nEntry', timeStr: destEntryTime, state: 'PENDING', isBypass: false },
    { key: 'dst_exit', label: 'Dest\nExit', timeStr: destExitTime, state: 'PENDING', isBypass: false },
    { key: 'src_entry', label: 'Source\nEntry', timeStr: sourceEntryTime, state: 'PENDING', isBypass: false },
  ];

  // Logic mimicking Android's sequential state determination
  nodes[0].state = 'COMPLETED';

  let done = false;

  if (hasInitial) {
    nodes[1].state = 'COMPLETED';
  } else if (initialBypassed) {
    nodes[1].state = 'SKIPPED';
  } else {
    nodes[1].state = 'ACTIVE';
    done = true;
  }

  if (!done) {
    if (hasFinal) {
      nodes[2].state = 'COMPLETED';
    } else {
      nodes[2].state = 'ACTIVE';
      done = true;
    }
  }

  if (!done) {
    if (hasSrcExit) {
      nodes[3].state = 'COMPLETED';
    } else {
      nodes[3].state = 'ACTIVE';
      done = true;
    }
  }

  if (!done) {
    if (hasDestEntry) {
      nodes[4].state = 'COMPLETED';
    } else if (destBypassed) {
      nodes[4].state = 'SKIPPED';
    } else {
      nodes[4].state = 'ACTIVE';
      done = true;
    }
  }

  if (!done) {
    if (hasDestExit) {
      nodes[5].state = 'COMPLETED';
    } else if (destBypassed) {
      nodes[5].state = 'SKIPPED';
    } else {
      nodes[5].state = 'ACTIVE';
      done = true;
    }
  }

  if (!done) {
    if (hasSrcEntry) {
      nodes[6].state = 'COMPLETED';
    } else {
      nodes[6].state = 'ACTIVE';
      done = true;
    }
  }

  // Calculate line fractions (6 lines total)
  const lineFractions = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6; i++) {
    if (nodes[i].state === 'COMPLETED' && nodes[i+1].state !== 'PENDING') lineFractions[i] = 1;
    else if (nodes[i].state === 'SKIPPED' && nodes[i+1].state !== 'PENDING') lineFractions[i] = 1;
    else if (nodes[i].state === 'COMPLETED' && nodes[i+1].state === 'PENDING') lineFractions[i] = 0.5;
    else lineFractions[i] = 0;
  }

  const dbStatus = (pass.status || '').toLowerCase();
  const userEmail = (localStorage.getItem('userEmail') || '').toLowerCase();
  const isSelf = userEmail === (pass.applyEmail || '').toLowerCase();

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', paddingBottom: '1.5rem', background: 'var(--surface-card)', marginTop: '1rem', overflowX: 'auto' }}>
      <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '2.5rem', fontWeight: 600 }}>
        Inter-Institutional Progress
      </label>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', minWidth: '480px', paddingBottom: '1rem', paddingLeft: '5px', paddingRight: '5px' }}>
        
        {/* Background Lines */}
        <div style={{ position: 'absolute', top: '12px', left: '8%', right: '8%', height: '3px', background: 'var(--glass-border)', zIndex: 0, borderRadius: '2px' }} />
        
        {/* Filled Lines */}
        {lineFractions.map((fraction, i) => {
          if (fraction === 0) return null;
          const leftOffset = 8 + (i * 14); // 8% + index * 14% (to hit 92% end)
          const isGradient = nodes[i+1].state === 'ACTIVE' && fraction < 1;
          const bg = isGradient ? 'linear-gradient(90deg, #22C55E, #3B82F6)' : '#22C55E';
          return (
            <div key={`line-${i}`} style={{
              position: 'absolute', top: '12px', left: `${leftOffset}%`, 
              width: mounted ? `${fraction * 14}%` : '0%', 
              height: '3px', background: bg, zIndex: 0,
              transition: 'width 0.8s ease-in-out',
              transitionDelay: `${200 + (i * 150)}ms` // faster stagger
            }} />
          );
        })}

        {nodes.map((node, idx) => {
          const isCompleted = node.state === 'COMPLETED';
          const isActive = node.state === 'ACTIVE';
          const isSkipped = node.state === 'SKIPPED';
          const isPending = node.state === 'PENDING';
          
          const timeData = formatTime(node.timeStr);
          const showAnim = mounted;

          return (
            <div key={node.key} style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1,
              width: '40px', position: 'relative',
              transform: showAnim ? 'scale(1)' : 'scale(0)',
              transition: 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              
              {/* Timestamp above */}
              <div style={{ position: 'absolute', top: '-30px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: timeData.time ? 1 : 0 }}>
                {timeData.time ? (
                  <>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{timeData.time}</span>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{timeData.date}</span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', opacity: isPending ? 1 : 0 }}>--:--</span>
                )}
              </div>

              {/* Node Circle */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isActive && (
                  <div className="pulse-ring" style={{
                    position: 'absolute', width: '36px', height: '36px', borderRadius: '50%',
                    background: '#DBEAFE', zIndex: -1
                  }} />
                )}
                
                <div style={{ 
                  width: '24px', height: '24px', borderRadius: '50%', 
                  background: isCompleted ? '#22C55E' : isActive ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : isSkipped ? 'var(--surface-hover)' : 'var(--surface-card)',
                  border: isSkipped ? '1.5px dashed #9CA3AF' : isPending ? '1.5px solid #D1D5DB' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 10px rgba(59,130,246,0.5)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {isCompleted && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>

                {isSkipped && (
                  <div style={{
                    position: 'absolute', bottom: '-8px', background: '#F3F4F6',
                    padding: '1px 3px', borderRadius: '4px', fontSize: '0.4rem',
                    color: '#6B7280', fontWeight: 'bold', whiteSpace: 'nowrap',
                    border: '1px solid #E5E7EB'
                  }}>
                    SKIP
                  </div>
                )}
              </div>
              
              {/* Label below */}
              <div style={{ 
                fontSize: '0.6rem', marginTop: isSkipped ? '12px' : '6px', 
                color: 'var(--text-primary)', fontWeight: 600, textAlign: 'center',
                lineHeight: 1.15
              }}>
                {node.label.split('\n').map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          );
        })}
      </div>

      {dbStatus === 'entered into destination campus' && (pass.passActivity || '').toLowerCase() === 'inactive' && isSelf && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          {activateError && (
            <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>{activateError}</p>
          )}
          {activateSuccess ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>✓ Pass activated! You can now exit.</p>
          ) : (
            <>
              <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginBottom: '0.75rem', fontWeight: 600 }}>Pass is currently inactive at destination.</p>
              <button
                onClick={async () => {
                  setActivating(true);
                  setActivateError(null);
                  try {
                    const token = localStorage.getItem('token');
                    await activateInterInstitutionalGatePass({ token, gatePassId: pass.gatePassId });
                    setActivateSuccess(true);
                    if (onActivateExit) onActivateExit(pass);
                  } catch (err) {
                    setActivateError(err?.message || 'Failed to activate. Please try again.');
                  } finally {
                    setActivating(false);
                  }
                }}
                disabled={activating}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.8rem', opacity: activating ? 0.6 : 1 }}
              >
                {activating ? 'Activating…' : 'Activate Pass (Exit Dest)'}
              </button>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-anim {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .pulse-ring {
          animation: pulse-anim 1.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default PremiumInterProgressIndicator;
