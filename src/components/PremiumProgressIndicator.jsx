import React, { useEffect, useState } from 'react';

// Helper to format "YYYY-MM-DD hh:mm AM/PM" to:
// hh:mm AM/PM
// YYYY-MM-DD
const formatTime = (timeStr) => {
  if (!timeStr || timeStr === 'null' || timeStr.trim() === '') return { time: '', date: '' };
  const parts = timeStr.trim().split(' ');
  if (parts.length >= 2) {
    // parts[0] is Date, parts[1] is Time, parts[2] is AM/PM (if exists)
    const time = parts[1] + (parts.length > 2 ? ` ${parts[2]}` : '');
    const date = parts[0];
    return { time, date };
  }
  return { time: timeStr, date: '' };
};

const PremiumProgressIndicator = ({ pass }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Trigger animation slightly after mount for smooth entry
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (pass.destinationCampus) return null; // Safety check

  const applyTime = pass.applyDate;
  const initialApprTime = pass.initialApprovalTime;
  const finalApprTime = pass.finalApprovalTime;
  const exitTime = pass.exitTime;

  const hasInitial = !!initialApprTime && initialApprTime !== 'null';
  const hasFinal = !!finalApprTime && finalApprTime !== 'null';
  const hasExit = !!exitTime && exitTime !== 'null';
  const isBypassed = !hasInitial && hasFinal;

  const nodes = [
    { key: 'applied', label: 'Gate Pass\nApplied', timeStr: applyTime, state: 'PENDING', isBypass: false },
    { key: 'initial', label: 'Initial\nApproval', timeStr: initialApprTime, state: 'PENDING', isBypass: false },
    { key: 'final', label: 'Final\nApproval', timeStr: finalApprTime, state: 'PENDING', isBypass: false },
    { key: 'exit', label: 'Exit', timeStr: exitTime, state: 'PENDING', isBypass: false },
  ];

  nodes[0].state = 'COMPLETED';

  if (hasInitial) {
    nodes[1].state = 'COMPLETED';
    if (hasFinal) {
      nodes[2].state = 'COMPLETED';
      if (hasExit) {
        nodes[3].state = 'COMPLETED';
      } else {
        nodes[3].state = 'ACTIVE';
      }
    } else {
      nodes[2].state = 'ACTIVE';
      nodes[3].state = 'PENDING';
    }
  } else if (isBypassed) {
    nodes[1].state = 'SKIPPED';
    nodes[1].isBypass = true;
    nodes[2].state = 'COMPLETED';
    if (hasExit) {
      nodes[3].state = 'COMPLETED';
    } else {
      nodes[3].state = 'ACTIVE';
    }
  } else {
    // No initial, no final -> active is initial
    nodes[1].state = 'ACTIVE';
    nodes[2].state = 'PENDING';
    nodes[3].state = 'PENDING';
  }

  // Calculate line fill percentages (0 to 1) for animations
  const lineFractions = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    if (nodes[i].state === 'COMPLETED' && nodes[i+1].state !== 'PENDING') lineFractions[i] = 1;
    else if (nodes[i].state === 'SKIPPED' && nodes[i+1].state !== 'PENDING') lineFractions[i] = 1;
    else if (nodes[i].state === 'COMPLETED' && nodes[i+1].state === 'PENDING') lineFractions[i] = 0.5;
    else lineFractions[i] = 0;
  }

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', paddingBottom: '1.5rem', background: 'var(--surface-card)', marginTop: '1rem', overflowX: 'auto' }}>
      <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '2.5rem', fontWeight: 600 }}>
        Pass Progress
      </label>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', minWidth: '320px', paddingBottom: '1rem', paddingLeft: '10px', paddingRight: '10px' }}>
        
        {/* Background Lines */}
        <div style={{ position: 'absolute', top: '14px', left: '10%', right: '10%', height: '3px', background: 'var(--glass-border)', zIndex: 0, borderRadius: '2px' }} />
        
        {/* Filled Lines */}
        {lineFractions.map((fraction, i) => {
          if (fraction === 0) return null;
          const leftOffset = 10 + (i * 26.66); // roughly spacing them out (10 to 90 = 80 span / 3)
          const isGradient = nodes[i+1].state === 'ACTIVE' && fraction < 1;
          const bg = isGradient ? 'linear-gradient(90deg, #22C55E, #3B82F6)' : '#22C55E';
          return (
            <div key={`line-${i}`} style={{
              position: 'absolute', top: '14px', left: `${leftOffset}%`, 
              width: mounted ? `${fraction * 26.66}%` : '0%', 
              height: '3px', background: bg, zIndex: 0,
              transition: 'width 0.8s ease-in-out',
              transitionDelay: `${200 + (i * 300)}ms`
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
              width: '60px', position: 'relative',
              transform: showAnim ? 'scale(1)' : 'scale(0)',
              transition: 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              
              {/* Timestamp above */}
              <div style={{ position: 'absolute', top: '-32px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: timeData.time ? 1 : 0 }}>
                {timeData.time ? (
                  <>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{timeData.time}</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{timeData.date}</span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', opacity: isPending ? 1 : 0 }}>--:--</span>
                )}
              </div>

              {/* Node Circle */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isActive && (
                  <div className="pulse-ring" style={{
                    position: 'absolute', width: '40px', height: '40px', borderRadius: '50%',
                    background: '#DBEAFE', zIndex: -1
                  }} />
                )}
                
                <div style={{ 
                  width: '28px', height: '28px', borderRadius: '50%', 
                  background: isCompleted ? '#22C55E' : isActive ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : isSkipped ? 'var(--surface-hover)' : 'var(--surface-card)',
                  border: isSkipped ? '2px dashed #9CA3AF' : isPending ? '2px solid #D1D5DB' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 10px rgba(59,130,246,0.5)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {isCompleted && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
                    SKIPPED
                  </div>
                )}
              </div>
              
              {/* Label below */}
              <div style={{ 
                fontSize: '0.65rem', marginTop: isSkipped ? '14px' : '8px', 
                color: 'var(--text-primary)', fontWeight: 600, textAlign: 'center',
                lineHeight: 1.2
              }}>
                {node.label.split('\n').map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          );
        })}
      </div>

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

export default PremiumProgressIndicator;
