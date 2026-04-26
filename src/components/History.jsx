import React, { useEffect, useState } from 'react';
import { getVisitorListHistory, getGatePassListHistory } from '../services/api';

const History = () => {
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

  const getImageUrl = (img) => {
    if (!img) return null;
    return `https://res.cloudinary.com/dtdo4gzfh/image/upload/${img}.jpg`;
  };

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
    <div className="page-content animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>History Records</h3>
      </div>

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
              className="glass-panel" 
              style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
              onClick={() => {
                setSelectedItem(item);
                setIsDetailModalOpen(true);
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            >
              <div>
                <h4 style={{ marginBottom: '0.25rem' }}>{item.name || 'Unknown User'}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Date: {item.applyDate || item.entryDate || item.date || 'N/A'} | Status: <span style={{ color: item.status === 'Approved' || item.status === 'approved' ? 'var(--success)' : item.status === 'Rejected' || item.status === 'rejected' ? 'var(--danger)' : 'var(--warning)' }}>{item.status || 'Past Record'}</span>
                </p>
                {item.reason && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Reason: {item.reason}</p>}
              </div>
              <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>View Details</button>
            </div>
          ))}
        </div>
      )}

      {isDetailModalOpen && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: '#121212' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{activeTab === 'GatePass' ? 'Gate Pass Details' : 'Visitor Details'}</h3>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {selectedItem.img && (
                <div style={{ flex: '0 0 200px', width: '100%' }}>
                  <img 
                    src={getImageUrl(selectedItem.img)} 
                    alt="User" 
                    style={{ width: '100%', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', objectFit: 'cover', aspectRatio: '3/4', background: 'rgba(255,255,255,0.05)' }} 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {Object.keys(selectedItem).map(key => {
                  if (!selectedItem[key] || key === 'img' || key === 'visitorId' || key === 'gatePassId' || key === 'passId' || key === 'v') return null;
                  
                  return (
                    <div key={key} className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'capitalize', marginBottom: '0.25rem' }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: '500', wordBreak: 'break-word' }}>
                        {selectedItem[key]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsDetailModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
