import React, { useEffect, useState } from 'react';
import { getVisitorListHistory, getGatePassListHistory } from '../services/api';

const History = ({ getImageUrl: propGetImageUrl }) => {
  const [activeTab, setActiveTab] = useState('GatePass'); // 'GatePass' or 'Visitors'
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const statusOptions = ['All Status', 'pending', 'meet', 'exit', 'approving', 'approved', 'rejected'];

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);

  const localGetImageUrl = (img) => {
    if (!img) return null;
    return `https://res.cloudinary.com/dtdo4gzfh/image/upload/${img}.jpg`;
  };
  const getImageUrl = propGetImageUrl || localGetImageUrl;

  useEffect(() => {
    fetchHistory();
  }, [activeTab]);

  const fetchHistory = async (overrideFromDate, overrideToDate) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        token,
        fromDate: overrideFromDate !== undefined ? overrideFromDate : fromDate,
        toDate: overrideToDate !== undefined ? overrideToDate : toDate
      };
      let data = [];
      if (activeTab === 'GatePass') {
        data = await getGatePassListHistory(payload);
      } else {
        data = await getVisitorListHistory(payload);
      }
      setHistoryData(data || []);
    } catch (error) {
      console.error(`Error fetching ${activeTab} history:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (fromDate && toDate && fromDate > toDate) {
      return alert("From Date should be less than or equal to To Date");
    }
    fetchHistory();
  };

  const handleClear = () => {
    setFromDate('');
    setToDate('');
    setSearchQuery('');
    setStatusFilter('All Status');
    fetchHistory('', '');
  };

  const handleDownloadCSV = () => {
    if (filteredData.length === 0) return alert('No data to download');
    setShowDownloadConfirm(true);
  };

  const triggerCSVDownload = () => {
    const keys = Object.keys(filteredData[0]);
    const csvContent = [
      keys.join(','),
      ...filteredData.map(item => keys.map(k => `"${(item[k] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const downloadName = `DigitalPass_History_${activeTab}_${fromDate || 'AllTime'}_to_${toDate || 'AllTime'}.csv`;
    link.setAttribute('download', downloadName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = historyData.filter(item => {
    const matchesName = !searchQuery || (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || (item.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesName && matchesStatus;
  });

  return (
    <>
      <div className="page-content animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className={`btn ${activeTab === 'GatePass' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('GatePass')}
            >
              Gate Pass History
            </button>
            <button 
              className={`btn ${activeTab === 'Visitors' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('Visitors')}
            >
              Visitor History
            </button>
          </div>
          <button className="btn btn-outline" onClick={handleDownloadCSV}>
            Download CSV
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search by name..." 
            className="input-control" 
            style={{ flex: 1, minWidth: '200px', marginBottom: 0 }} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <select 
            className="input-control" 
            style={{ minWidth: '150px', marginBottom: 0 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>From:</span>
            <input 
              type="date" 
              className="input-control" 
              style={{ marginBottom: 0 }}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>To:</span>
            <input 
              type="date" 
              className="input-control" 
              style={{ marginBottom: 0 }}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={handleApply}>Apply</button>
          <button className="btn btn-outline" onClick={handleClear}>Clear</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>No history records found</h3>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredData.map((item, index) => (
              <div 
                key={index} 
                className="glass-panel responsive-card" 
                style={{ padding: '1.5rem', cursor: 'pointer', transition: 'background 0.2s' }}
                onClick={() => {
                  setSelectedItem(item);
                  setIsDetailModalOpen(true);
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = ''}
              >
                <div>
                  <h4 style={{ marginBottom: '0.25rem' }}>{item.name || 'Unknown User'}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Date: {item.applyDate || item.entryDate || item.date || 'N/A'} | Status: <span style={{ color: item.status === 'Approved' || item.status === 'approved' ? 'var(--success)' : item.status === 'Rejected' || item.status === 'rejected' ? 'var(--danger)' : 'var(--warning)' }}>{item.status || 'Past Record'}</span>
                  </p>
                  {item.reason && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Reason: {item.reason}</p>}
                </div>
                <div className="responsive-card-actions">
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '0.5rem 1rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDetailModalOpen && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--surface-modal)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{activeTab === 'GatePass' ? 'Gate Pass Details' : 'Visitor Details'}</h3>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            
            {/* ── Dynamic Details Grid (2 columns on desktop) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              
              {/* Column 1: Profile Card & Reason */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Profile Card */}
                <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-primary)', flexShrink: 0, background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glass-shadow)' }}>
                    {selectedItem.img ? (
                      <img 
                        src={getImageUrl(selectedItem.img)} 
                        alt="User" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        {(selectedItem.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>{selectedItem.name || 'Unknown'}</h2>
                    <span style={{ display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: (selectedItem.status === 'Approved' || selectedItem.status === 'approved' || selectedItem.status === 'meet' || selectedItem.status === 'exit' ? 'var(--success)' : selectedItem.status === 'Rejected' || selectedItem.status === 'rejected' ? 'var(--danger)' : 'var(--warning)') + '22', color: selectedItem.status === 'Approved' || selectedItem.status === 'approved' || selectedItem.status === 'meet' || selectedItem.status === 'exit' ? 'var(--success)' : selectedItem.status === 'Rejected' || selectedItem.status === 'rejected' ? 'var(--danger)' : 'var(--warning)', border: `1px solid ${selectedItem.status === 'Approved' || selectedItem.status === 'approved' || selectedItem.status === 'meet' || selectedItem.status === 'exit' ? 'var(--success)' : selectedItem.status === 'Rejected' || selectedItem.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'}55`, textTransform: 'capitalize' }}>
                      {selectedItem.status || 'Past Record'}
                    </span>
                  </div>
                </div>

                {/* Reason Card */}
                {selectedItem.reason && (
                  <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      {activeTab === 'GatePass' ? 'Reason for Leave' : 'Reason for Visit'}
                    </label>
                    <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.9rem' }}>{selectedItem.reason}</p>
                  </div>
                )}
              </div>

              {/* Column 2: Info Fields Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
                    Details
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                    {[
                      { label: activeTab === 'GatePass' ? 'Pass ID' : 'Visitor ID', value: selectedItem.gatePassId || selectedItem.visitorId || selectedItem.passId },
                      { label: 'Role', value: selectedItem.role },
                      { label: 'Campus', value: selectedItem.campus },
                      { label: 'Department', value: selectedItem.department },
                      { label: 'Phone', value: selectedItem.phone },
                      { label: 'Email', value: selectedItem.email || selectedItem.visitorEmail || selectedItem.applyEmail },
                      { label: activeTab === 'GatePass' ? 'Apply Date' : 'Entry Date', value: selectedItem.applyDate || selectedItem.entryDate || selectedItem.date },
                      { label: 'Meeting With', value: selectedItem.meetEmail },
                      { label: 'Meet Department', value: selectedItem.meetDepartment },
                      { label: 'No. of Visitors', value: selectedItem.numberOfVisitor },
                      { label: 'UID', value: selectedItem.uid },
                      { label: 'Batch', value: selectedItem.batch },
                      { label: 'Father Name', value: selectedItem.fathername },
                      { label: 'Father Phone', value: selectedItem.fatherphone },
                    ].filter(f => f.value).map(({ label, value }, idx, arr) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: idx < arr.length - 1 ? '1px dashed var(--glass-border)' : 'none', paddingBottom: idx < arr.length - 1 ? '0.4rem' : '0' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{label}:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Authority Remark */}
            {selectedItem.tgRemark && (
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)', marginTop: '1.25rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Authority Remark</label>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.9rem' }}>{selectedItem.tgRemark}</p>
              </div>
            )}

            {/* Remarks (collapsible / general) */}
            {selectedItem.remark && selectedItem.remark.trim() && (
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--surface-card)', marginTop: '1.25rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Remarks</label>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.9rem' }}>{selectedItem.remark}</p>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsDetailModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showDownloadConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--overlay-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: '1rem',
        }} onClick={(e) => e.target === e.currentTarget && setShowDownloadConfirm(false)}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%', maxWidth: '380px',
            background: 'var(--surface-modal)', borderRadius: '16px',
            padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
            boxShadow: 'var(--glass-shadow)', textAlign: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Confirm Download</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Are you sure you want to download the {activeTab === 'GatePass' ? 'Gate Pass' : 'Visitor'} history data as CSV ({filteredData.length} records)?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button 
                onClick={() => setShowDownloadConfirm(false)} 
                className="btn btn-outline" 
                style={{ flex: 1, padding: '0.65rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  triggerCSVDownload();
                  setShowDownloadConfirm(false);
                }} 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '0.65rem' }}
              >
                ✓ Download
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default History;
