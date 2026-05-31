import React, { useEffect, useState, useRef } from 'react';
import { getRecentGatePassList, getRecentVisitorList, approveGatePass, rejectGatePass, editGatePass, removeGatePassBySelfUser, meetVisitor, checkPermissionOfSecurityGuard, uploadProfileImage } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useTheme } from '../ThemeContext';
import logoImg from '../assets/Dlogo.png';
import UserManagement from './UserManagement';
import Batches from './Batches';
import History from './History';
import SecurityGuardAllotment from './SecurityGuardAllotment';
import MyGatePass from './MyGatePass';
import EnterVisitorModal from './EnterVisitorModal';
import CampusLocation from './CampusLocation';

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
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '760px', maxHeight: '92vh', overflowY: 'auto', padding: '0', background: 'var(--surface-modal)', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface-modal)', zIndex: 2 }}>
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

          {/* ── Dynamic Details Grid (2 columns on desktop) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            
            {/* Column 1: Profile Card & Reason */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Profile Card */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-primary)', flexShrink: 0, background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glass-shadow)' }}>
                  {item.img ? (
                    <img src={getImageUrl(item.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                      {(item.name || 'V').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h2>
                  <span style={{ display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: sc + '22', color: sc, border: `1px solid ${sc}55`, textTransform: 'capitalize', marginBottom: '0.5rem' }}>
                    {item.status}
                  </span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {item.visitorId}</div>
                </div>
              </div>

              {/* Reason Card */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Reason for Visit</label>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.9rem' }}>{item.reason || '—'}</p>
              </div>
            </div>

            {/* Column 2: Host Details & Contact Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Host & Location Card */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Host & Location</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Meeting With:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, wordBreak: 'break-all' }}>{item.meetEmail || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Department:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.meetDepartment || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Campus:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.campus || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Entry Date:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.entryDate || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Contact & Group Card */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Contact & Group</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Phone:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.phone || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Email:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, wordBreak: 'break-all' }}>{item.visitorEmail || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>No. of Visitors:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.numberOfVisitor || 1}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── Other Information (collapsible) ── */}
          {buildOtherInfo().length > 0 && (
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', background: 'var(--surface-card)' }}>
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
                style={{ resize: 'none' }}
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

  const isPendingOrApproving = item.status === 'pending' || item.status === 'approving';
  const canAct = isPendingOrApproving;

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
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '760px', maxHeight: '92vh', overflowY: 'auto', padding: '0', background: 'var(--surface-modal)', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface-modal)', zIndex: 2 }}>
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

          {/* ── Dynamic Details Grid (2 columns on desktop) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            
            {/* Column 1: Profile Card & Reason */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Profile Card */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-primary)', flexShrink: 0, background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glass-shadow)' }}>
                  {item.img ? (
                    <img src={getImageUrl(item.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                      {(item.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h2>
                  <span style={{ display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: statusColor(item.status) + '22', color: statusColor(item.status), border: `1px solid ${statusColor(item.status)}55`, textTransform: 'capitalize', marginBottom: '0.5rem' }}>
                    {item.status}
                  </span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Role: <span style={{ textTransform: 'capitalize' }}>{item.role}</span></div>
                </div>
              </div>

              {/* Reason Card */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Reason for Leave</label>
                {editMode && !isSelf ? (
                  <textarea
                    className="input-control"
                    rows={2}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    style={{ resize: 'vertical', marginBottom: 0 }}
                  />
                ) : editMode && isSelf ? (
                  <textarea
                    className="input-control"
                    rows={2}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    style={{ resize: 'vertical', marginBottom: 0 }}
                  />
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.9rem' }}>{item.reason || '—'}</p>
                )}
              </div>
            </div>

            {/* Column 2: Pass Info & Academic / Student details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Pass & Contact Details Card */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Pass & Contact Details</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Pass ID:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.gatePassId || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Department:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.department || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Campus:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.campus || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Phone:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.phone || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Apply Date:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.applyDate || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Student Information Card (Conditional) */}
              {item.role === 'student' && (item.uid || item.batch || item.fathername || item.fatherphone) && (
                <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Student Information</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                    {item.uid && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>UID:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.uid}</span>
                      </div>
                    )}
                    {item.batch && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Batch:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.batch}</span>
                      </div>
                    )}
                    {item.fathername && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Father's Name:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.fathername}</span>
                      </div>
                    )}
                    {item.fatherphone && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Father's Phone:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.fatherphone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ── tgRemark (Authority Remark) — shown if exists ── */}
          {(item.tgRemark || (canAct && !isSelf && !isSecurityGuard)) && (
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Authority Remark</label>
              {(editMode && !isSelf) || (!item.tgRemark && canAct && !isSelf && !isSecurityGuard) ? (
                <textarea
                  className="input-control"
                  rows={2}
                  placeholder="Enter your authority remark (required for approval)…"
                  value={editMode ? editTgRemark : approvalRemark}
                  onChange={(e) => editMode ? setEditTgRemark(e.target.value) : setApprovalRemark(e.target.value)}
                  style={{ resize: 'vertical', marginBottom: 0 }}
                />
              ) : (
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.9rem' }}>{item.tgRemark || '—'}</p>
              )}
            </div>
          )}

          {/* ── Remarks (Collapsible / If exists) ── */}
          {item.remark && item.remark.trim() && (
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Remarks</label>
              <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.9rem' }}>{item.remark}</p>
            </div>
          )}

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
const DashboardContent = ({ 
  activeTab, setActiveTab, dataList, loading, onRefresh, getImageUrl, 
  securityPermission, userRole, setSidebarOpen,
  selectedGatePass, setSelectedGatePass,
  selectedVisitor, setSelectedVisitor,
  isEnterVisitorModalOpen, setIsEnterVisitorModalOpen,
  editVisitorData, setEditVisitorData
}) => {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = dataList.filter(item =>
    !searchQuery || (item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            ☰
          </button>
          {userRole?.toLowerCase() !== 'reception' && (
            <button className={`btn ${activeTab === 'GatePass' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('GatePass')}>Gate Passes</button>
          )}
          <button className={`btn ${activeTab === 'Visitors' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('Visitors')}>Visitors</button>
        </div>
        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn"
          style={{ padding: '0.5rem', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="page-content animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0 }}>Recent {activeTab === 'GatePass' ? 'Gate Passes' : 'Visitors'}</h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            <input
              type="text"
              placeholder={`Search by name…`}
              className="input-control"
              style={{ maxWidth: '280px', minWidth: '150px', marginBottom: 0, flex: '1 1 150px' }}
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
            <div className="spinner"></div>
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
                  className="glass-panel responsive-card"
                  style={{ padding: '1rem 1.25rem', cursor: 'pointer', transition: 'background 0.2s', borderLeft: `3px solid ${sc}` }}
                  onClick={() => activeTab === 'GatePass' ? setSelectedGatePass(item) : setSelectedVisitor(item)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--glass-border)' }}>
                      {item.img ? (
                        <img src={getImageUrl(item.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{(item.name || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem' }}>{item.name || 'Unknown'}</h4>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        {item.department && <span>{item.department} · </span>}
                        {item.applyDate || item.entryDate || item.date || ''}
                      </p>
                    </div>
                  </div>
                  <div className="responsive-card-actions" style={{ flexShrink: 0 }}>
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




const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    
    // Play Note 1: D5 (587.33 Hz)
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    // Play Note 2: A5 (880.00 Hz)
    osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.45);
  } catch (error) {
    console.error('Audio chime failed:', error);
  }
};

const showBrowserNotification = (event, data) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const currentRole = (localStorage.getItem('userRole') || '').toLowerCase();
  const currentEmail = (localStorage.getItem('userEmail') || '').toLowerCase();

  let title = 'DigitalPass Update';
  let body = 'There is a new update in the gate pass system.';
  let shouldShow = true;

  switch (event) {
    case 'visitorInsert':
      title = 'New Visitor Entered';
      body = 'A new visitor entry has been recorded in the system.';
      if (currentRole === 'security guard') {
        shouldShow = false; // Guard entered the visitor
      }
      break;

    case 'visitorUpdate':
      const op = data?.operation || 'updated';
      title = 'Visitor Status Update';
      body = `Visitor status has been marked as ${op}.`;
      break;

    case 'gatePassInsert':
      title = 'New Gate Pass Request';
      body = `A new gate pass application #${data?.gatePassId || ''} has been submitted.`;
      if (currentRole === 'student') {
        shouldShow = false; // Student applied themselves
      }
      break;

    case 'gatePassUpdate':
      title = 'Gate Pass Updated';
      body = `Gate pass #${data?.gatePassId || ''} has been updated.`;
      break;

    case 'gatePassStatusUpdate':
      const status = data?.status || 'updated';
      title = 'Gate Pass Status Change';
      body = `Gate pass #${data?.gatePassId || ''} status has been updated to: ${status}.`;
      
      if (currentRole === 'student') {
        title = 'Your Gate Pass Update';
        body = `Your gate pass #${data?.gatePassId || ''} has been ${status}!`;
        shouldShow = true;
      }
      break;

    default:
      break;
  }

  if (shouldShow) {
    new Notification(title, {
      body,
      tag: event + '-' + (data?.gatePassId || data?.visitorId || Date.now())
    });
  }
};

const Dashboard = ({ onLogout }) => {
  const { theme, toggleTheme } = useTheme();

  // Moved userRole declaration up to initialize activeView correctly
  const userRole = localStorage.getItem('userRole') || 'Member';
  const initialView = userRole.toLowerCase() === 'student' ? 'MyGatePass' : 'Dashboard';

  const [activeView, setActiveView] = useState(initialView);
  const [activeTab, setActiveTab] = useState('GatePass'); // 'GatePass' or 'Visitors' for Dashboard
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [securityPermission, setSecurityPermission] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const getSidebarTitle = () => {
    const campus = localStorage.getItem('userCampus') || '';
    const cleanCampus = campus.toLowerCase();
    if (cleanCampus.includes('rrb') || cleanCampus.includes('ratibad')) {
      return "SISTecRRB";
    }
    if (cleanCampus.includes('erb') || cleanCampus.includes('ratibad') || cleanCampus.includes('gn')) {
      return "SISTecERB";
    }
    if (campus) return campus;
    return "SISTEC";
  };

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedGatePass, setSelectedGatePass] = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [isEnterVisitorModalOpen, setIsEnterVisitorModalOpen] = useState(false);
  const [editVisitorData, setEditVisitorData] = useState(null);
  const userDataStr = localStorage.getItem('userData');
  const userData = userDataStr ? JSON.parse(userDataStr) : null;

  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [profileVersions, setProfileVersions] = useState({});
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [showCropper, setShowCropper] = useState(false);

  const handleProfileImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input to allow uploading same file
  };

  const handleCroppedUpload = async (croppedFile) => {
    setShowCropper(false);
    setCropImageSrc('');
    setUploadingImg(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const token = localStorage.getItem('token');
      await uploadProfileImage(croppedFile, token);
      
      const newImgPath = "profile_images/" + userData.email;
      const updatedUserData = { ...userData, img: newImgPath };
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      
      setProfileVersions(prev => ({
        ...prev,
        [newImgPath]: Date.now()
      }));
      setUploadSuccess('Profile image updated successfully!');
    } catch (err) {
      console.error(err);
      setUploadError(err.message || 'Failed to upload image.');
    } finally {
      setUploadingImg(false);
    }
  };

  const getImageUrl = (img) => {
    if (!img) return null;
    const version = profileVersions[img] ? `?t=${profileVersions[img]}` : '';
    return `https://res.cloudinary.com/dtdo4gzfh/image/upload/${img}.jpg${version}`;
  };

  const fetchDataRef = useRef();
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close sidebar when view changes (mobile)
  const handleViewChange = (view) => {
    setActiveView(view);
    setSidebarOpen(false);
    setProfileMenuOpen(false);
  };

  useEffect(() => {
    // Request notification permission on load
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(err => console.warn(err));
      }
    }

    const token = localStorage.getItem('token');
    const socket = connectSocket(token);

    const handleUpdate = (event) => (data) => {
      console.log(`Real-time update received (${event}):`, data);
      
      // Play premium synthesized audio chime
      playNotificationSound();
      
      // Show native desktop notification
      showBrowserNotification(event, data);

      if (fetchDataRef.current) {
        fetchDataRef.current(true, event);
      }
    };

    const handleProfileImageUpdate = (data) => {
      console.log('Real-time profile image update received:', data);
      setProfileVersions(prev => ({
        ...prev,
        [data.img]: Date.now()
      }));

      const userDataStr = localStorage.getItem('userData');
      if (userDataStr) {
        const currentUser = JSON.parse(userDataStr);
        if (currentUser.email === data.email) {
          currentUser.img = data.img;
          localStorage.setItem('userData', JSON.stringify(currentUser));
        }
      }
    };

    socket.on('visitorUpdate', handleUpdate('visitorUpdate'));
    socket.on('visitorInsert', handleUpdate('visitorInsert'));
    socket.on('gatePassInsert', handleUpdate('gatePassInsert'));
    socket.on('gatePassUpdate', handleUpdate('gatePassUpdate'));
    socket.on('gatePassStatusUpdate', handleUpdate('gatePassStatusUpdate'));
    socket.on('profileImageUpdate', handleProfileImageUpdate);

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
      socket.off('profileImageUpdate', handleProfileImageUpdate);
      // We don't necessarily want to disconnect the socket if the user is just navigating 
      // between views, but since Dashboard is the main wrapper, we'll keep it active.
    };
  }, []);

  const [modalHistoryPushed, setModalHistoryPushed] = useState(false);

  useEffect(() => {
    const anyModalOpen = !!(isProfileModalOpen || showLogoutConfirm || selectedGatePass || selectedVisitor || isEnterVisitorModalOpen || showCropper);
    
    if (anyModalOpen && !modalHistoryPushed) {
      window.history.pushState({ modalActive: true }, "");
      setModalHistoryPushed(true);
    } else if (!anyModalOpen && modalHistoryPushed) {
      window.history.back();
      setModalHistoryPushed(false);
    }
  }, [isProfileModalOpen, showLogoutConfirm, selectedGatePass, selectedVisitor, isEnterVisitorModalOpen, showCropper, modalHistoryPushed]);

  useEffect(() => {
    const handlePopState = (event) => {
      const anyModalOpen = !!(isProfileModalOpen || showLogoutConfirm || selectedGatePass || selectedVisitor || isEnterVisitorModalOpen || showCropper);
      if (anyModalOpen) {
        setIsProfileModalOpen(false);
        setShowLogoutConfirm(false);
        setSelectedGatePass(null);
        setSelectedVisitor(null);
        setIsEnterVisitorModalOpen(false);
        setShowCropper(false);
        setModalHistoryPushed(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isProfileModalOpen, showLogoutConfirm, selectedGatePass, selectedVisitor, isEnterVisitorModalOpen, showCropper]);

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
        return <UserManagement getImageUrl={getImageUrl} />;
      case 'History':
        return <History getImageUrl={getImageUrl} />;
      case 'MyGatePass':
        return <MyGatePass getImageUrl={getImageUrl} />;
      case 'CampusLocation':
        return <CampusLocation />;
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
            setSidebarOpen={setSidebarOpen}
            selectedGatePass={selectedGatePass}
            setSelectedGatePass={setSelectedGatePass}
            selectedVisitor={selectedVisitor}
            setSelectedVisitor={setSelectedVisitor}
            isEnterVisitorModalOpen={isEnterVisitorModalOpen}
            setIsEnterVisitorModalOpen={setIsEnterVisitorModalOpen}
            editVisitorData={editVisitorData}
            setEditVisitorData={setEditVisitorData}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => {
          setSidebarOpen(false);
          setProfileMenuOpen(false);
        }}
      />

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Header - Professional Logo and Title */}
        <div className="sidebar-header" style={{ padding: '2rem 1rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--glass-border)' }}>
          <img 
            src={logoImg} 
            alt="DG Pas Logo" 
            onClick={toggleSidebarCollapse}
            style={{
              width: '56px',
              height: '56px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.15))',
              cursor: 'pointer'
            }}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          />
          <div className="sidebar-header-text" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: 0 }}>{getSidebarTitle()}</h2>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.12em', color: 'var(--accent-primary)', textTransform: 'uppercase', margin: '2px 0 0' }}>Digital Pass</p>
          </div>
        </div>
        <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, overflowY: 'auto' }}>
          {userRole.toLowerCase() !== 'student' && (
            <button
              onClick={() => handleViewChange('Dashboard')}
              className="btn btn-outline"
              title="Home"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', background: activeView === 'Dashboard' ? 'var(--surface-hover)' : 'transparent', border: activeView === 'Dashboard' ? '1px solid var(--glass-border)' : 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Home</span>
            </button>
          )}

          {userRole.toLowerCase() !== 'security guard' && (
            <button
              onClick={() => handleViewChange('MyGatePass')}
              className="btn btn-outline"
              title="My Gate Pass"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', background: activeView === 'MyGatePass' ? 'var(--surface-hover)' : 'transparent', border: activeView === 'MyGatePass' ? '1px solid var(--glass-border)' : 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
                <line x1="7" y1="8" x2="17" y2="8" />
                <line x1="7" y1="12" x2="11" y2="12" />
                <line x1="7" y1="16" x2="13" y2="16" />
              </svg>
              <span>My Gate Pass</span>
            </button>
          )}

          {/* SG Allotment & Batches — admin / principal / hod only */}
          {['admin', 'principal', 'hod'].includes(userRole.toLowerCase()) && (
            <>
              <button
                onClick={() => handleViewChange('SecurityGuard')}
                className="btn btn-outline"
                title="SG Allotment"
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', background: activeView === 'SecurityGuard' ? 'var(--surface-hover)' : 'transparent', border: activeView === 'SecurityGuard' ? '1px solid var(--glass-border)' : 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>SG Allotment</span>
              </button>
              <button
                onClick={() => handleViewChange('Batches')}
                className="btn btn-outline"
                title="Batches"
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', background: activeView === 'Batches' ? 'var(--surface-hover)' : 'transparent', border: activeView === 'Batches' ? '1px solid var(--glass-border)' : 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
                <span>Batches</span>
              </button>
            </>
          )}

          {/* Campus Location Setup — admin only */}
          {userRole.toLowerCase() === 'admin' && (
            <button
              onClick={() => handleViewChange('CampusLocation')}
              className="btn btn-outline"
              title="Campus Location"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', background: activeView === 'CampusLocation' ? 'var(--surface-hover)' : 'transparent', border: activeView === 'CampusLocation' ? '1px solid var(--glass-border)' : 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Campus Location</span>
            </button>
          )}

          {/* User Management — all management roles */}
          {['admin', 'principal', 'hod', 'faculty'].includes(userRole.toLowerCase()) && (
            <button
              onClick={() => handleViewChange('UserManagement')}
              className="btn btn-outline"
              title="User Management"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', background: activeView === 'UserManagement' ? 'var(--surface-hover)' : 'transparent', border: activeView === 'UserManagement' ? '1px solid var(--glass-border)' : 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>User Management</span>
            </button>
          )}

          {userRole.toLowerCase() !== 'student' && (
            <button
              onClick={() => handleViewChange('History')}
              className="btn btn-outline"
              title="History"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start', background: activeView === 'History' ? 'var(--surface-hover)' : 'transparent', border: activeView === 'History' ? '1px solid var(--glass-border)' : 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>History</span>
            </button>
          )}
        </nav>
        <div ref={profileMenuRef} className="sidebar-profile-container" style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', position: 'relative' }}>
          {/* Profile Popover Menu (Fly-up) */}
          {profileMenuOpen && (
            <div className="glass-panel animate-fade-in profile-popover" style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '1rem',
              right: '1rem',
              background: 'var(--surface-modal)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
              borderRadius: '12px',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              zIndex: 110,
            }}>
              {/* My Profile option */}
              <button 
                onClick={() => { setIsProfileModalOpen(true); setProfileMenuOpen(false); setSidebarOpen(false); }} 
                className="btn btn-outline" 
                style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', width: '100%', padding: '0.65rem 0.75rem', fontSize: '0.9rem', gap: '0.75rem' }}
              >
                <span>👤</span>
                <span className="profile-menu-text">My Profile</span>
              </button>
              
              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0.25rem 0.5rem' }} />
              
              {/* Logout option */}
              <button 
                onClick={() => { setShowLogoutConfirm(true); setProfileMenuOpen(false); }} 
                className="btn btn-outline" 
                style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', color: 'var(--danger)', width: '100%', padding: '0.65rem 0.75rem', fontSize: '0.9rem', gap: '0.75rem' }}
              >
                <span>🚪</span>
                <span className="profile-menu-text">Logout</span>
              </button>
            </div>
          )}

          {/* User Profile Trigger Bar */}
          <div 
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="profile-trigger"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.75rem',
              borderRadius: '12px',
              cursor: 'pointer',
              background: profileMenuOpen ? 'var(--surface-hover)' : 'transparent',
              transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={e => { if(!profileMenuOpen) e.currentTarget.style.background = 'var(--surface-hover)' }}
            onMouseLeave={e => { if(!profileMenuOpen) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              {userData && userData.img ? (
                <img
                  src={getImageUrl(userData.img)}
                  alt="Profile"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)', flexShrink: 0 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold', color: '#fff', flexShrink: 0 }}>
                  {(localStorage.getItem('userName') || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="profile-info-text" style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {localStorage.getItem('userName') || 'User'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userRole}
                </div>
              </div>
            </div>
            
            {/* Toggle Arrow Indicator */}
            <div className="profile-arrow" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '0.5rem', transition: 'transform 0.2s', transform: profileMenuOpen ? 'rotate(180deg)' : 'none' }}>
              ▲
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Hamburger topbar for non-Dashboard views (Dashboard has its own in DashboardContent) */}
        {activeView !== 'Dashboard' && (
          <div className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                ☰
              </button>
              <h3 style={{ margin: 0 }}>
                {activeView === 'MyGatePass' ? 'My Gate Pass' :
                 activeView === 'SecurityGuard' ? 'SG Allotment' :
                 activeView === 'CampusLocation' ? 'Campus Location' :
                 activeView === 'UserManagement' ? 'User Management' :
                 activeView}
              </h3>
            </div>
            <button 
              onClick={toggleTheme} 
              className="theme-toggle-btn"
              style={{ padding: '0.5rem', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        )}

        {renderView()}
      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--surface-modal)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>My Profile</h3>
              <button onClick={() => { setIsProfileModalOpen(false); setUploadError(''); setUploadSuccess(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>

            {userData ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                {/* Circular Profile Image & Upload Container at Top */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '240px' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '3px solid var(--accent-primary)', overflow: 'hidden', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: 'var(--glass-shadow)' }}>
                    {userData.img ? (
                      <img
                        src={getImageUrl(userData.img)}
                        alt="User"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                        {(userData.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                    {uploadingImg && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="spinner"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* File Upload controls */}
                  <label className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', width: '100%', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '20px' }}>
                    📷 {uploadingImg ? 'Uploading...' : 'Change Photo'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProfileImageUpload} 
                      disabled={uploadingImg}
                      style={{ display: 'none' }} 
                    />
                  </label>
                  
                  {uploadError && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', margin: 0, textAlign: 'center' }}>{uploadError}</p>}
                  {uploadSuccess && <p style={{ color: 'var(--success)', fontSize: '0.75rem', margin: 0, textAlign: 'center' }}>{uploadSuccess}</p>}
                </div>

                {/* Details Grid below */}
                <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                  {Object.keys(userData).map(key => {
                    if (!userData[key] || ['img', 'token', 'password', 'v', '_id', '__v', 'theme'].includes(key)) return null;

                    return (
                      <div key={key} className="glass-panel" style={{ padding: '1rem', background: 'var(--surface-card)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'capitalize', marginBottom: '0.25rem' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '500', wordBreak: 'break-word' }}>
                          {typeof userData[key] === 'object' ? JSON.stringify(userData[key]) : String(userData[key])}
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
              <button className="btn btn-outline" onClick={() => { setIsProfileModalOpen(false); setUploadError(''); setUploadSuccess(''); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showCropper && (
        <ImageCropperModal
          src={cropImageSrc}
          onClose={() => {
            setShowCropper(false);
            setCropImageSrc('');
          }}
          onCrop={handleCroppedUpload}
        />
      )}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--overlay-bg)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1200, padding: '1rem'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%', maxWidth: '400px',
            background: 'var(--surface-modal)', borderRadius: '16px',
            padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
            boxShadow: 'var(--glass-shadow)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', margin: '0 auto' }}>🚪</div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Confirm Logout</h3>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Are you sure you want to log out of your session?
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={onLogout}
                style={{ flex: 1 }}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   IMAGE CROPPER MODAL (Zero-dependency canvas cropper)
   Allows panning and zooming to center profile pictures
───────────────────────────────────────────────────────── */
const ImageCropperModal = ({ src, onClose, onCrop }) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const imgRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleSave = () => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 400);

    // Calculate dimensions to cover 400x400
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let w = 400;
    let h = 400;
    if (imgRatio > 1) {
      w = 400 * imgRatio;
    } else {
      h = 400 / imgRatio;
    }

    // Apply translations
    ctx.translate(200, 200);
    ctx.scale(scale, scale);
    const scaleFactor = 400 / 280; // 280px is display container size
    ctx.translate(offset.x * scaleFactor / scale, offset.y * scaleFactor / scale);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
        onCrop(file);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--overlay-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: '1rem',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: '380px',
        background: 'var(--surface-modal)', borderRadius: '16px',
        padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
        boxShadow: 'var(--glass-shadow)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Adjust Profile Photo</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
        </div>

        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Drag the photo to center it inside the circle, and use the zoom slider below.
        </p>

        {/* Viewport container */}
        <div style={{
          width: '280px', height: '280px',
          margin: '0 auto', borderRadius: '50%',
          border: '3px solid var(--accent-primary)',
          overflow: 'hidden', position: 'relative',
          background: 'var(--surface-hover)',
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: 'var(--glass-shadow)',
          userSelect: 'none', touchAction: 'none'
        }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              pointerEvents: 'none' // Prevents browser default drag
            }}
          />
          {/* Subtle guide ring */}
          <div style={{
            position: 'absolute', inset: 0,
            border: '2px dashed rgba(255, 255, 255, 0.4)',
            borderRadius: '50%', pointerEvents: 'none'
          }} />
        </div>

        {/* Zoom controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Zoom</span>
            <span>{Math.round(scale * 100)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--accent-primary)',
              cursor: 'pointer'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1, padding: '0.65rem' }}>Cancel</button>
          <button onClick={handleSave} className="btn btn-primary" style={{ flex: 2, padding: '0.65rem' }}>✓ Apply & Upload</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
