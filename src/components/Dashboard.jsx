import React, { useEffect, useState, useRef } from 'react';
import { getRecentGatePassList, getRecentVisitorList, approveGatePass, rejectGatePass, editGatePass, removeGatePassBySelfUser, meetVisitor, checkPermissionOfSecurityGuard } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import UserManagement from './UserManagement';
import Batches from './Batches';
import History from './History';
import SecurityGuardAllotment from './SecurityGuardAllotment';
import MyGatePass from './MyGatePass';
import EnterVisitorModal from './EnterVisitorModal';

// Helper: checks if applyDate is today (so actions are enabled)
const isToday = (dateStr) => {
  if (!dateStr) return false;
  const passDate = new Date(dateStr.split(' ')[0]);
  const today = new Date();
  return passDate.toDateString() === today.toDateString();
};

// Status badge colour helper
const statusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'meet' || s === 'exit') return 'var(--success)';
  if (s === 'rejected') return 'var(--danger)';
  return 'var(--warning)';
};

/* ─────────────────────────────────────────────────────────
   VISITOR DETAIL MODAL
───────────────────────────────────────────────────────── */
const VisitorDetailModal = ({ item, onClose, onRefresh, getImageUrl, onEditStart }) => {
  const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
  const userEmail = localStorage.getItem('userEmail') || '';
  const token = localStorage.getItem('token');

  const isSecurityGuard = userRole === 'security guard';
  // The person assigned to meet the visitor
  const isMeetPerson = item.meetEmail === userEmail;
  // Visitor already met or exited — no further actions possible
  const isMeetOrExit = item.status === 'meet' || item.status === 'exit';

  // Remark for meet approval (shown when meet person is not self or security guard in exit mode)
  const [showRemarkInput, setShowRemarkInput] = useState(false);
  const [meetRemark, setMeetRemark] = useState('');

  // Other info toggle
  const [showOtherInfo, setShowOtherInfo] = useState(false);

  // Feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const showMsg = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  /* ── Meet / Exit ── */
  const handleMeet = async (remark) => {
    setActionLoading(true);
    const meetData = { visitorId: item.visitorId, token };
    if (remark) meetData.remark = remark;
    try {
      await meetVisitor(meetData);
      const msg = isSecurityGuard ? 'Visitor exited successfully.' : 'Visitor met successfully!';
      showMsg('success', msg);
      setTimeout(() => { onClose(); onRefresh(); }, 1200);
    } catch {
      showMsg('error', 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const onMeetClick = () => {
    // Security guard exit from 'meet' status => no remark needed
    if (isSecurityGuard && item.status === 'meet') { handleMeet(); return; }
    // Meet-person direct meet => no remark needed
    if (isMeetPerson) { handleMeet(); return; }
    // Others need to enter a remark
    setShowRemarkInput(true);
  };

  const onRemarkSubmit = () => {
    if (!meetRemark.trim()) { showMsg('error', 'Please enter a remark before proceeding.'); return; }
    handleMeet(meetRemark);
  };

  /* ── Other Info ── */
  const buildOtherInfo = () => {
    const lines = [];
    if (item.lastUpdatedBy) lines.push(`Last Updated By: ${item.lastUpdatedBy}`);
    if (item.remark) lines.push(`Remark: ${item.remark}`);
    return lines;
  };

  const sc = statusColor(item.status);

  // Can the current user trigger a Meet/Exit action?
  const canMeetOrExit =
    (isMeetPerson && !isMeetOrExit) ||
    (isSecurityGuard && (item.status === 'meet' || item.status === 'pending'));

  // Can edit? Only when status is NOT meet/exit. Now security guards can edit too!
  const canEdit = !isMeetOrExit;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', padding: '0', background: '#111', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#111', zIndex: 2 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Visitor Details</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {canEdit && (
              <button onClick={() => { onClose(); onEditStart(item); }} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>✏ Edit</button>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
          </div>
        </div>

        {/* ── Feedback banner ── */}
        {feedback && (
          <div style={{ padding: '0.75rem 1.5rem', background: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', borderBottom: '1px solid var(--glass-border)', color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
            {feedback.msg}
          </div>
        )}

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* ── Profile photo + basic info ── */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: '110px', height: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', flexShrink: 0, background: 'rgba(255,255,255,0.04)' }}>
              {item.img ? (
                <img src={getImageUrl(item.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'var(--accent-primary)' }}>
                  {(item.name || 'V').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.4rem' }}>{item.name}</h2>
              <span style={{ display: 'inline-block', padding: '0.2rem 0.8rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: sc + '22', color: sc, border: `1px solid ${sc}55`, marginBottom: '0.75rem', textTransform: 'capitalize' }}>
                {item.status}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '100px' }}>Visitor ID</span>
                  <span style={{ color: 'var(--text-primary)' }}>{item.visitorId}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '100px' }}>Campus</span>
                  <span style={{ color: 'var(--text-primary)' }}>{item.campus}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '100px' }}>Entry Date</span>
                  <span style={{ color: 'var(--text-primary)' }}>{item.entryDate || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Contact Details ── */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.75rem' }}>Contact Details</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '0.75rem' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Phone</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.phone}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Email</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500, wordBreak: 'break-word' }}>{item.visitorEmail}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>No. of Visitors</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.numberOfVisitor}</div>
              </div>
            </div>
          </div>

          {/* ── Reason ── */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>Reason for Visit</label>
            <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6 }}>{item.reason || '—'}</p>
          </div>

          {/* ── Meet-to Information ── */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>Meeting</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', minWidth: '120px' }}>Meeting With</span>
                <span style={{ color: 'var(--text-primary)' }}>{item.meetEmail || '—'}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', minWidth: '120px' }}>Department</span>
                <span style={{ color: 'var(--text-primary)' }}>{item.meetDepartment || '—'}</span>
              </div>
            </div>
          </div>

          {/* ── Other Information (collapsible) ── */}
          {buildOtherInfo().length > 0 && (
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
              <button
                onClick={() => setShowOtherInfo(v => !v)}
                style={{ width: '100%', background: 'transparent', border: 'none', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}
              >
                <span>Other Information</span>
                <span style={{ transition: 'transform 0.2s', transform: showOtherInfo ? 'rotate(90deg)' : 'none', fontSize: '1rem' }}>›</span>
              </button>
              {showOtherInfo && (
                <div style={{ padding: '0.25rem 1rem 1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
                  {buildOtherInfo().map((line, i) => {
                    const [label, ...rest] = line.split(':');
                    return (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)', minWidth: '130px' }}>{label}:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{rest.join(':').trim()}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Remark input (shown when non-meet-person needs to provide remark) ── */}
          {showRemarkInput && (
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <label className="input-label" style={{ color: 'var(--accent-primary)' }}>Your Remark (Required)</label>
              <textarea
                className="input-control"
                rows={2}
                placeholder="Enter your remark here…"
                value={meetRemark}
                onChange={(e) => setMeetRemark(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.04)', resize: 'none' }}
              />
            </div>
          )}

          {/* ── Action Buttons ── */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {canMeetOrExit && !showRemarkInput && (
              <button
                onClick={onMeetClick}
                disabled={actionLoading}
                className="btn btn-success"
                style={{ flex: 1, padding: '0.75rem' }}
              >
                {actionLoading ? 'Processing…' : isSecurityGuard ? '✓ Mark as Exited' : '✓ Meet Visitor'}
              </button>
            )}

            {/* Non-meet-person meet button shows remark input first */}
            {!isMeetPerson && !isSecurityGuard && !isMeetOrExit && !showRemarkInput && (
              <button
                onClick={() => setShowRemarkInput(true)}
                disabled={actionLoading}
                className="btn btn-success"
                style={{ flex: 1, padding: '0.75rem' }}
              >
                Meet Visitor
              </button>
            )}

            {showRemarkInput && (
              <button onClick={onRemarkSubmit} disabled={actionLoading} className="btn btn-success" style={{ flex: 1, padding: '0.75rem' }}>
                {actionLoading ? 'Processing…' : isSecurityGuard ? 'Confirm Exit' : 'Confirm Meet'}
              </button>
            )}

            <button onClick={onClose} className="btn btn-outline" style={{ padding: '0.75rem 1.5rem' }}>
              {showRemarkInput ? 'Cancel' : isMeetOrExit ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const GatePassDetailModal = ({ item, onClose, onRefresh, getImageUrl }) => {
  const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
  const userEmail = localStorage.getItem('userEmail') || '';

  // Determine if current user is the self-applicant
  const isSelf = item.applyEmail === userEmail;
  const isSecurityGuard = userRole === 'security guard';

  // Check date: actions only allowed when applyDate == today  
  const dateValid = isToday(item.applyDate);
  const isPendingOrApproving = item.status === 'pending' || item.status === 'approving';
  const canAct = isPendingOrApproving && dateValid;

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editReason, setEditReason] = useState(item.reason || '');
  const [editTgRemark, setEditTgRemark] = useState(item.tgRemark || '');

  // Approval remark (tgRemark for first-time approval)
  const [approvalRemark, setApprovalRemark] = useState(item.tgRemark || '');

  // Other info toggle
  const [showOtherInfo, setShowOtherInfo] = useState(false);

  // Loading / feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg }

  const token = localStorage.getItem('token');

  const showMsg = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  /* ── Approve ── */
  const handleApprove = async () => {
    if (!approvalRemark.trim()) {
      showMsg('error', 'Please enter your authority remark before approving.');
      return;
    }
    setActionLoading(true);
    try {
      await approveGatePass({ token, gatePassId: item.gatePassId, tgRemark: approvalRemark });
      showMsg('success', 'Gate pass approved successfully!');
      setTimeout(() => { onClose(); onRefresh(); }, 1200);
    } catch {
      showMsg('error', 'Failed to approve. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Reject ── */
  const handleReject = async () => {
    setActionLoading(true);
    try {
      await rejectGatePass({ token, gatePassId: item.gatePassId });
      showMsg('success', 'Gate pass rejected.');
      setTimeout(() => { onClose(); onRefresh(); }, 1200);
    } catch {
      showMsg('error', 'Failed to reject. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Security Guard Exit ── */
  const handleExit = async () => {
    setActionLoading(true);
    try {
      await approveGatePass({ token, gatePassId: item.gatePassId });
      showMsg('success', 'Gate pass marked as exited.');
      setTimeout(() => { onClose(); onRefresh(); }, 1200);
    } catch {
      showMsg('error', 'Failed to mark exit. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Self User Remove ── */
  const handleRemove = async () => {
    setActionLoading(true);
    try {
      await removeGatePassBySelfUser({ token, gatePassId: item.gatePassId });
      showMsg('success', 'Gate pass removed successfully.');
      setTimeout(() => { onClose(); onRefresh(); }, 1200);
    } catch {
      showMsg('error', 'Failed to remove. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Edit / Done ── */
  const handleEditDone = async () => {
    if (!editReason.trim()) { showMsg('error', 'Reason cannot be empty.'); return; }

    const changes = {};
    if (editReason !== item.reason) changes.reason = editReason;
    if (editTgRemark !== (item.tgRemark || '') && !isSelf) changes.tgRemark = editTgRemark;

    if (Object.keys(changes).length === 0) {
      showMsg('success', 'No changes made.');
      setEditMode(false);
      return;
    }

    setActionLoading(true);
    try {
      await editGatePass({ token, gatePassId: item.gatePassId, ...changes });
      showMsg('success', 'Gate pass updated successfully!');
      setEditMode(false);
      onRefresh();
    } catch {
      showMsg('error', 'Failed to save changes. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Other Info content ── */
  const buildOtherInfo = () => {
    const lines = [`Campus: ${item.campus || '—'}`, `Apply Date: ${item.applyDate || '—'}`];
    if (item.role === 'student' && !isSelf) {
      if (item.uid) lines.push(`UID: ${item.uid}`);
      if (item.batch) lines.push(`Batch: ${item.batch}`);
      if (item.fathername) lines.push(`Father Name: ${item.fathername}`);
      if (item.fatherphone) lines.push(`Father Phone: ${item.fatherphone}`);
    }
    if (item.remark && item.remark.trim()) lines.push(`Remarks: ${item.remark}`);
    return lines;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', padding: '0', background: '#111', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#111', zIndex: 2 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Gate Pass Details</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Edit / Done toggle — shown if canAct, not security guard, not self without permission */}
            {canAct && !isSecurityGuard && (
              editMode ? (
                <button onClick={handleEditDone} disabled={actionLoading} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
                  {actionLoading ? 'Saving…' : 'Save'}
                </button>
              ) : (
                <button onClick={() => setEditMode(true)} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
                  ✏ Edit
                </button>
              )
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
          </div>
        </div>

        {/* ── Feedback banner ── */}
        {feedback && (
          <div style={{ padding: '0.75rem 1.5rem', background: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', borderBottom: '1px solid var(--glass-border)', color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
            {feedback.msg}
          </div>
        )}

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* ── Profile header row ── */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Photo */}
            <div style={{ width: '110px', height: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', flexShrink: 0, background: 'rgba(255,255,255,0.04)' }}>
              {item.img ? (
                <img src={getImageUrl(item.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'var(--accent-primary)' }}>
                  {(item.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: '180px' }}>
              <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.4rem' }}>{item.name}</h2>
              <span style={{ display: 'inline-block', padding: '0.2rem 0.8rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: statusColor(item.status) + '22', color: statusColor(item.status), border: `1px solid ${statusColor(item.status)}55`, marginBottom: '0.75rem', textTransform: 'capitalize' }}>
                {item.status}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '90px' }}>Pass ID</span>
                  <span style={{ color: 'var(--text-primary)' }}>{item.gatePassId}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '90px' }}>Department</span>
                  <span style={{ color: 'var(--text-primary)' }}>{item.department}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '90px' }}>Role</span>
                  <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{item.role}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', minWidth: '90px' }}>Phone</span>
                  <span style={{ color: 'var(--text-primary)' }}>{item.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Reason for Leave ── */}
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>Reason for Leave</label>
            {editMode && !isSelf ? (
              <textarea
                className="input-control"
                rows={2}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.04)', resize: 'vertical', marginBottom: 0 }}
              />
            ) : editMode && isSelf ? (
              <textarea
                className="input-control"
                rows={2}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.04)', resize: 'vertical', marginBottom: 0 }}
              />
            ) : (
              <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6 }}>{item.reason || '—'}</p>
            )}
          </div>

          {/* ── tgRemark (Authority Remark) — shown if exists ── */}
          {(item.tgRemark || (canAct && !isSelf && !isSecurityGuard)) && (
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>Authority Remark</label>
              {(editMode && !isSelf) || (!item.tgRemark && canAct && !isSelf && !isSecurityGuard) ? (
                <textarea
                  className="input-control"
                  rows={2}
                  placeholder="Enter your authority remark (required for approval)…"
                  value={editMode ? editTgRemark : approvalRemark}
                  onChange={(e) => editMode ? setEditTgRemark(e.target.value) : setApprovalRemark(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.04)', resize: 'vertical', marginBottom: 0 }}
                />
              ) : (
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6 }}>{item.tgRemark || '—'}</p>
              )}
            </div>
          )}

          {/* ── Other Information (collapsible) ── */}
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
            <button
              onClick={() => setShowOtherInfo(v => !v)}
              style={{ width: '100%', background: 'transparent', border: 'none', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}
            >
              <span>Other Information</span>
              <span style={{ transition: 'transform 0.2s', transform: showOtherInfo ? 'rotate(90deg)' : 'none', fontSize: '1rem' }}>›</span>
            </button>
            {showOtherInfo && (
              <div style={{ padding: '0.25rem 1rem 1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
                {buildOtherInfo().map((line, i) => {
                  const [label, ...rest] = line.split(':');
                  return (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)', minWidth: '110px' }}>{label}:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{rest.join(':').trim()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Action Buttons ── */}
          {!editMode && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {isSecurityGuard && item.status === 'approved' && (
                <button onClick={handleExit} disabled={actionLoading} className="btn btn-success" style={{ flex: 1, padding: '0.75rem' }}>
                  {actionLoading ? 'Processing…' : '✓ Mark as Exited'}
                </button>
              )}

              {!isSecurityGuard && isSelf && item.status === 'pending' && (
                <button onClick={handleRemove} disabled={actionLoading} className="btn btn-danger" style={{ flex: 1, padding: '0.75rem' }}>
                  {actionLoading ? 'Removing…' : '🗑 Remove Request'}
                </button>
              )}

              {!isSecurityGuard && !isSelf && canAct && (
                <>
                  <button onClick={handleReject} disabled={actionLoading} className="btn btn-danger" style={{ flex: 1, padding: '0.75rem' }}>
                    {actionLoading ? '…' : '✗ Reject'}
                  </button>
                  <button onClick={handleApprove} disabled={actionLoading} className="btn btn-success" style={{ flex: 1, padding: '0.75rem' }}>
                    {actionLoading ? '…' : '✓ Approve'}
                  </button>
                </>
              )}

              <button onClick={onClose} className="btn btn-outline" style={{ padding: '0.75rem 1.5rem' }}>
                {canAct && !isSecurityGuard && !isSelf ? 'Cancel' : 'Close'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   DASHBOARD CONTENT
───────────────────────────────────────────────────────── */
const DashboardContent = ({ activeTab, setActiveTab, dataList, loading, onRefresh, getImageUrl, securityPermission, userRole }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGatePass, setSelectedGatePass] = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [isEnterVisitorModalOpen, setIsEnterVisitorModalOpen] = useState(false);
  const [editVisitorData, setEditVisitorData] = useState(null);

  const filteredData = dataList.filter(item =>
    !searchQuery || (item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', gap: '1rem' }}>
          {userRole?.toLowerCase() !== 'reception' && (
            <button className={`btn ${activeTab === 'GatePass' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('GatePass')}>Gate Passes</button>
          )}
          <button className={`btn ${activeTab === 'Visitors' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('Visitors')}>Visitors</button>
        </div>
        <span className="badge badge-success">Online</span>
      </div>

      <div className="page-content animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0 }}>Recent {activeTab === 'GatePass' ? 'Gate Passes' : 'Visitors'}</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder={`Search by name…`}
              className="input-control"
              style={{ maxWidth: '280px', marginBottom: 0 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {securityPermission && activeTab === 'Visitors' && (
              <button className="btn btn-primary" onClick={() => {
                setEditVisitorData(null);
                setIsEnterVisitorModalOpen(true);
              }}>
                + Enter Visitor
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>No {activeTab === 'GatePass' ? 'gate passes' : 'visitors'} found</h3>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {filteredData.map((item, index) => {
              const sc = statusColor(item.status);
              return (
                <div
                  key={item.gatePassId || item.visitorId || index}
                  className="glass-panel"
                  style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s', borderLeft: `3px solid ${sc}` }}
                  onClick={() => activeTab === 'GatePass' ? setSelectedGatePass(item) : setSelectedVisitor(item)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--glass-border)' }}>
                      {item.img ? (
                        <img src={getImageUrl(item.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{(item.name || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem' }}>{item.name || 'Unknown'}</h4>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        {item.department && <span>{item.department} · </span>}
                        {item.applyDate || item.entryDate || item.date || ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.65rem', borderRadius: '999px', background: sc + '22', color: sc, border: `1px solid ${sc}55`, textTransform: 'capitalize' }}>
                      {item.status || 'pending'}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gate Pass Detail Modal */}
      {selectedGatePass && (
        <GatePassDetailModal
          item={selectedGatePass}
          onClose={() => setSelectedGatePass(null)}
          onRefresh={onRefresh}
          getImageUrl={getImageUrl}
        />
      )}

      {/* Visitor Detail Modal */}
      {selectedVisitor && (
        <VisitorDetailModal
          item={selectedVisitor}
          onClose={() => setSelectedVisitor(null)}
          onRefresh={onRefresh}
          getImageUrl={getImageUrl}
          onEditStart={(item) => {
            setEditVisitorData(item);
            setIsEnterVisitorModalOpen(true);
          }}
        />
      )}

      {/* Enter Visitor Modal */}
      {isEnterVisitorModalOpen && (
        <EnterVisitorModal
          onClose={() => {
            setIsEnterVisitorModalOpen(false);
            setEditVisitorData(null);
          }}
          onRefresh={onRefresh}
          initialData={editVisitorData}
          getImageUrl={getImageUrl}
        />
      )}
    </>
  );
};




const Dashboard = ({ onLogout }) => {
  // Moved userRole declaration up to initialize activeView correctly
  const userRole = localStorage.getItem('userRole') || 'Member';
  const initialView = userRole.toLowerCase() === 'student' ? 'MyGatePass' : 'Dashboard';

  const [activeView, setActiveView] = useState(initialView);
  const [activeTab, setActiveTab] = useState('GatePass'); // 'GatePass' or 'Visitors' for Dashboard
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [securityPermission, setSecurityPermission] = useState(false);

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const userDataStr = localStorage.getItem('userData');
  const userData = userDataStr ? JSON.parse(userDataStr) : null;

  const getImageUrl = (img) => {
    if (!img) return null;
    return `https://res.cloudinary.com/dtdo4gzfh/image/upload/${img}.jpg`;
  };

  const fetchDataRef = useRef();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = connectSocket(token);

    const handleUpdate = (event) => (data) => {
      console.log(`Real-time update received (${event}):`, data);
      if (fetchDataRef.current) {
        fetchDataRef.current(true, event);
      }
    };

    socket.on('visitorUpdate', handleUpdate('visitorUpdate'));
    socket.on('visitorInsert', handleUpdate('visitorInsert'));
    socket.on('gatePassInsert', handleUpdate('gatePassInsert'));
    socket.on('gatePassUpdate', handleUpdate('gatePassUpdate'));
    socket.on('gatePassStatusUpdate', handleUpdate('gatePassStatusUpdate'));

    // Check Security Guard Permission
    const role = localStorage.getItem('userRole');
    if (role && role.toLowerCase() === 'security guard') {
      checkPermissionOfSecurityGuard(token)
        .then(() => setSecurityPermission(true))
        .catch(() => setSecurityPermission(false));
    }

    return () => {
      socket.off('visitorUpdate', handleUpdate);
      socket.off('visitorInsert', handleUpdate);
      socket.off('gatePassInsert', handleUpdate);
      socket.off('gatePassUpdate', handleUpdate);
      socket.off('gatePassStatusUpdate', handleUpdate);
      // We don't necessarily want to disconnect the socket if the user is just navigating 
      // between views, but since Dashboard is the main wrapper, we'll keep it active.
    };
  }, []);

  useEffect(() => {
    if (activeView === 'Dashboard') {
      // Reception should always default to Visitors tab
      if (userRole.toLowerCase() === 'reception' && activeTab === 'GatePass') {
        setActiveTab('Visitors');
      }
      fetchData();
    }
  }, [activeTab, activeView]);

  const fetchData = async (isBackground = false, event = null) => {
    // Optimization: ignore events that don't belong to the active tab
    if (isBackground && event) {
      if (activeTab === 'GatePass' && event.startsWith('visitor')) return;
      if (activeTab === 'Visitors' && event.startsWith('gatePass')) return;
    }

    if (!isBackground) {
      setLoading(true);
    }
    try {
      const token = localStorage.getItem('token');
      let data = [];
      if (activeTab === 'GatePass') {
        data = await getRecentGatePassList(token);
      } else {
        data = await getRecentVisitorList(token);
      }
      setDataList(data || []);
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  fetchDataRef.current = fetchData;

  const handleApprove = async (passId, tgRemark) => {
    try {
      const token = localStorage.getItem('token');
      await approveGatePass({ token, gatePassId: passId, tgRemark });
      fetchData();
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleReject = async (passId) => {
    try {
      const token = localStorage.getItem('token');
      await rejectGatePass({ token, gatePassId: passId });
      fetchData();
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  };



  const renderView = () => {
    switch (activeView) {
      case 'SecurityGuard':
        return <SecurityGuardAllotment />;
      case 'Batches':
        return <Batches />;
      case 'UserManagement':
        return <UserManagement />;
      case 'History':
        return <History />;
      case 'MyGatePass':
        return <MyGatePass />;
      case 'Dashboard':
      default:
        return (
          <DashboardContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            dataList={dataList}
            loading={loading}
            onRefresh={fetchData}
            getImageUrl={getImageUrl}
            securityPermission={securityPermission}
            userRole={userRole}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ padding: '2rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {userData && userData.img ? (
            <img
              src={getImageUrl(userData.img)}
              alt="Profile"
              style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {(localStorage.getItem('userName') || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', margin: 0 }}>DigitalPass</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, textTransform: 'capitalize' }}>{userRole}</p>
          </div>
        </div>
        <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {userRole.toLowerCase() !== 'student' && (
            <button
              onClick={() => setActiveView('Dashboard')}
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start', background: activeView === 'Dashboard' ? 'rgba(255,255,255,0.05)' : 'transparent', border: activeView === 'Dashboard' ? '1px solid var(--glass-border)' : 'none' }}>
              🏠 Dashboard
            </button>
          )}

          {userRole.toLowerCase() !== 'security guard' && (
            <button
              onClick={() => setActiveView('MyGatePass')}
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start', background: activeView === 'MyGatePass' ? 'rgba(255,255,255,0.05)' : 'transparent', border: activeView === 'MyGatePass' ? '1px solid var(--glass-border)' : 'none' }}>
              🪪 My Gate Pass
            </button>
          )}

          {/* SG Allotment & Batches — admin / principal / hod only */}
          {['admin', 'principal', 'hod'].includes(userRole.toLowerCase()) && (
            <>
              <button
                onClick={() => setActiveView('SecurityGuard')}
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', background: activeView === 'SecurityGuard' ? 'rgba(255,255,255,0.05)' : 'transparent', border: activeView === 'SecurityGuard' ? '1px solid var(--glass-border)' : 'none' }}>
                🔒 SG Allotment
              </button>
              <button
                onClick={() => setActiveView('Batches')}
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', background: activeView === 'Batches' ? 'rgba(255,255,255,0.05)' : 'transparent', border: activeView === 'Batches' ? '1px solid var(--glass-border)' : 'none' }}>
                📋 Batches
              </button>
            </>
          )}

          {/* User Management — all management roles */}
          {['admin', 'principal', 'hod', 'faculty'].includes(userRole.toLowerCase()) && (
            <button
              onClick={() => setActiveView('UserManagement')}
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start', background: activeView === 'UserManagement' ? 'rgba(255,255,255,0.05)' : 'transparent', border: activeView === 'UserManagement' ? '1px solid var(--glass-border)' : 'none' }}>
              👥 User Management
            </button>
          )}

          {userRole.toLowerCase() !== 'student' && (
            <button
              onClick={() => setActiveView('History')}
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start', background: activeView === 'History' ? 'rgba(255,255,255,0.05)' : 'transparent', border: activeView === 'History' ? '1px solid var(--glass-border)' : 'none' }}>
              📜 History
            </button>
          )}
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)' }}>
          <button onClick={() => setIsProfileModalOpen(true)} className="btn btn-outline" style={{ width: '100%', marginBottom: '0.5rem' }}>My Profile</button>
          <button onClick={onLogout} className="btn btn-danger" style={{ width: '100%' }}>Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {renderView()}
      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: '#121212' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>My Profile</h3>
              <button onClick={() => setIsProfileModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>

            {userData ? (
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {userData.img && (
                  <div style={{ flex: '0 0 200px', width: '100%' }}>
                    <img
                      src={getImageUrl(userData.img)}
                      alt="User"
                      style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', objectFit: 'cover', aspectRatio: '3/4', background: 'rgba(255,255,255,0.05)' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {Object.keys(userData).map(key => {
                    if (!userData[key] || key === 'img' || key === 'token' || key === 'password' || key === 'v') return null;

                    return (
                      <div key={key} className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'capitalize', marginBottom: '0.25rem' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '500', wordBreak: 'break-word' }}>
                          {userData[key]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Please log out and log back in to sync your full profile details.</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsProfileModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
