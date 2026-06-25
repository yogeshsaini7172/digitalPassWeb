import React, { useState, useEffect } from 'react';
import { getReports, removeReport, addReport, getAllDepartment } from '../services/api';

const AddReportModal = ({ onClose, onSuccess, token }) => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('ALL DEPARTMENT');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const deps = await getAllDepartment();
        setDepartments(['ALL DEPARTMENT', ...deps]);
      } catch (err) {
        console.error("Failed to load departments", err);
        setDepartments(['ALL DEPARTMENT']);
      }
    };
    fetchDepartments();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setFeedback({ type: 'error', msg: 'Please enter a description.' });
      return;
    }
    if (!file) {
      setFeedback({ type: 'error', msg: 'Please select an image.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('department', selectedDepartment);
    formData.append('reportDescription', description.trim());
    formData.append('token', token);
    formData.append('img', file);

    try {
      const result = await addReport(formData);
      onSuccess(result);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to submit report.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--overlay-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: '500px', background: 'var(--surface-modal)',
        borderRadius: '16px', padding: 0, overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Add Report</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {feedback && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '10px',
              background: feedback.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.85rem'
            }}>
              {feedback.msg}
            </div>
          )}

          <div>
            <label className="input-label" style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '0.5rem' }}>Image <span style={{ color: 'var(--danger)' }}>*</span></label>
            <div style={{
              border: '2px dashed var(--glass-border)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center',
              cursor: 'pointer', background: 'var(--surface-hover)', position: 'relative'
            }}>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} />
              {preview ? (
                <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', borderRadius: '8px' }} />
              ) : (
                <div style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📷</span>
                  Tap to capture or select image
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="input-label" style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '0.5rem' }}>Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="input-control"
            >
              {departments.map((dep, idx) => (
                <option key={idx} value={dep}>{dep}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label" style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '0.5rem' }}>Description <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea
              className="input-control"
              rows={3}
              placeholder="Enter report description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button onClick={onClose} disabled={loading} className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading} className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportManagement = ({ getImageUrl, onImageClick }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const token = localStorage.getItem('token');

  const showMsg = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getReports(token);
      setReports(data || []);
      setSelectedIds([]); // reset selection
    } catch (err) {
      showMsg('error', 'Failed to load reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const toggleSelection = (reportId) => {
    setSelectedIds(prev =>
      prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]
    );
  };

  const handleRemoveReports = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} report(s)?`)) return;

    setLoading(true);
    try {
      await removeReport({ token, reportIds: selectedIds });
      showMsg('success', 'Reports removed successfully.');
      setReports(prev => prev.filter(r => !selectedIds.includes(r.reportId)));
      setSelectedIds([]);
    } catch (err) {
      showMsg('error', 'Failed to remove reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = (newReport) => {
    // Add report to top of list
    setReports(prev => [newReport, ...prev]);
    setShowAddModal(false);
    showMsg('success', 'Report added successfully!');
  };

  return (
    <div className="page-content animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
          {selectedIds.length > 0 ? `${selectedIds.length} Selected` : 'Reports'}
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={loadReports} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} title="Refresh">
            ↻ Refresh
          </button>
          {selectedIds.length > 0 ? (
            <button onClick={handleRemoveReports} className="btn btn-danger" style={{ padding: '0.5rem 1.25rem' }}>
              🗑 Delete Selected
            </button>
          ) : (
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
              + Add Report
            </button>
          )}
        </div>
      </div>

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

      {loading && reports.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" />
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No Reports Found</h3>
          <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)' }}>There are no reports available at the moment.</p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
            + Create First Report
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {reports.map((report) => {
            const isSelected = selectedIds.includes(report.reportId);
            return (
              <div
                key={report.reportId}
                className="glass-panel"
                onClick={() => toggleSelection(report.reportId)}
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                  boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'var(--glass-shadow)',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{
                  height: '250px',
                  width: '100%',
                  background: 'var(--surface-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {report.img ? (
                    <img
                      src={getImageUrl(report.img)}
                      alt="Report"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); if (onImageClick) onImageClick(getImageUrl(report.img)); }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <span style={{ fontSize: '3rem', color: 'var(--text-secondary)', opacity: 0.5 }}>📷</span>
                  )}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: '10px', right: '10px',
                      background: 'var(--accent-primary)', color: 'white',
                      width: '24px', height: '24px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      ✓
                    </div>
                  )}
                </div>
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '0.3rem 0.8rem',
                      borderRadius: '16px', background: 'var(--accent-primary)', color: 'white', letterSpacing: '0.05em', textTransform: 'uppercase'
                    }}>
                      {report.department === 'ALL DEPARTMENT' ? 'Department: Unknown' : (report.department || 'Unknown')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {report.dateTime || 'Unknown Date'}
                    </span>
                  </div>
                  {report.reportedBy && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Reported by: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{report.reportedBy}</span>
                    </div>
                  )}
                  <div style={{
                    margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid var(--glass-border)'
                  }}>
                    {report.description || report.reportDescription || 'No description provided.'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddReportModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
          token={token}
        />
      )}
    </div>
  );
};

export default ReportManagement;
