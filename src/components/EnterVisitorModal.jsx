import React, { useState, useEffect, useRef } from 'react';
import { getAllMemberForVisitor, enterVisitor, editVisitor } from '../services/api';

const EnterVisitorModal = ({ onClose, onRefresh, initialData = null, getImageUrl }) => {
  const isEditMode = !!initialData;
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [departments, setDepartments] = useState(['All Department']);
  const [selectedDept, setSelectedDept] = useState('All Department');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(isEditMode && initialData.img ? getImageUrl(initialData.img) : null);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.visitorEmail || '',
    numberOfVisitor: initialData?.numberOfVisitor || '',
    reason: initialData?.reason || ''
  });
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingMembers, setFetchingMembers] = useState(true);
  const [feedback, setFeedback] = useState(null);
  
  const fileInputRef = useRef(null);

  const showMsg = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = await getAllMemberForVisitor(token);
      setMembers(data);
      
      const depts = new Set();
      data.forEach(m => {
        if (m.department) depts.add(m.department);
      });
      setDepartments(['All Department', ...Array.from(depts)]);
      setFilteredMembers(data);

      if (isEditMode) {
        const meetMem = data.find(m => m.email === initialData.meetEmail);
        if (meetMem) {
          setSelectedMember(meetMem);
          setSelectedDept(meetMem.department || 'All Department');
        }
      }
    } catch (error) {
      showMsg('error', 'Failed to fetch members.');
    } finally {
      setFetchingMembers(false);
    }
  };

  useEffect(() => {
    if (!members.length) return;
    
    let filtered = members;
    if (selectedDept !== 'All Department') {
      filtered = filtered.filter(m => m.department === selectedDept);
    }
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(m => 
        (m.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredMembers(filtered);
  }, [searchQuery, selectedDept, members]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!isEditMode && !imageFile) { showMsg('error', 'Please capture/upload a photo.'); return; }
    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim() || !formData.numberOfVisitor.trim() || !formData.reason.trim()) {
      showMsg('error', 'Please fill all visitor details.'); return;
    }
    if (!selectedMember) { showMsg('error', 'Please select a member to meet.'); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const visitorObj = {
        name: formData.name,
        phone: formData.phone,
        visitorEmail: formData.email,
        numberOfVisitor: formData.numberOfVisitor,
        reason: formData.reason,
        meetDepartment: selectedMember.department,
        meetEmail: selectedMember.email
      };

      if (isEditMode) {
        visitorObj.visitorId = initialData.visitorId;
      }

      const submitData = new FormData();
      submitData.append('visitor', JSON.stringify(visitorObj));
      submitData.append('token', token);
      if (imageFile) {
        submitData.append('img', imageFile, 'img.jpg');
      }

      if (isEditMode) {
        await editVisitor(submitData);
        showMsg('success', 'Visitor edited successfully!');
      } else {
        await enterVisitor(submitData);
        showMsg('success', 'Visitor entered successfully!');
      }
      
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1500);
    } catch (error) {
      showMsg('error', `Failed to ${isEditMode ? 'edit' : 'enter'} visitor. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '92vh', overflowY: 'auto', padding: '0', background: '#111', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#111', zIndex: 2 }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{isEditMode ? 'Edit Visitor' : 'Enter New Visitor'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div style={{ padding: '0.75rem 1.5rem', background: feedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', borderBottom: '1px solid var(--glass-border)', color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
            {feedback.msg}
          </div>
        )}

        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Left Column: Photo & Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Photo Capture */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div 
                style={{ width: '160px', height: '200px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '2px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                    <div style={{ fontSize: '0.8rem' }}>Tap to capture</div>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                ref={fileInputRef} 
                onChange={handleImageCapture} 
                style={{ display: 'none' }} 
              />
            </div>

            {/* Form Fields */}
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visitor Details</h4>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Full Name</label>
                  <input type="text" name="name" className="input-control" value={formData.name} onChange={handleInputChange} placeholder="E.g. John Doe" style={{ marginBottom: 0 }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>Phone No.</label>
                    <input type="tel" name="phone" className="input-control" value={formData.phone} onChange={handleInputChange} placeholder="E.g. 9876543210" style={{ marginBottom: 0 }} />
                  </div>
                  <div>
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>No. of Visitors</label>
                    <input type="number" name="numberOfVisitor" className="input-control" value={formData.numberOfVisitor} onChange={handleInputChange} min="1" placeholder="E.g. 2" style={{ marginBottom: 0 }} />
                  </div>
                </div>

                <div>
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Email Address</label>
                  <input type="email" name="email" className="input-control" value={formData.email} onChange={handleInputChange} placeholder="john@example.com" style={{ marginBottom: 0 }} />
                </div>

                <div>
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Reason for Visit</label>
                  <textarea name="reason" className="input-control" rows="2" value={formData.reason} onChange={handleInputChange} placeholder="Brief reason for visit..." style={{ marginBottom: 0, resize: 'vertical' }}></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Member Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
            
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '600px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meeting With</h4>
                {selectedMember && (
                  <button 
                    onClick={() => setSelectedMember(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer', padding: '0.2rem 0.5rem' }}
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {selectedMember ? (
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>{selectedMember.name}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {selectedMember.department} • {selectedMember.role}
                  </p>
                  <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                    {selectedMember.email}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select 
                      className="input-control" 
                      style={{ flex: 1, marginBottom: 0, padding: '0.5rem', fontSize: '0.85rem' }}
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                    >
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      className="input-control" 
                      placeholder="Search name..." 
                      style={{ flex: 1.5, marginBottom: 0, padding: '0.5rem', fontSize: '0.85rem' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    {fetchingMembers ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading members...</div>
                    ) : filteredMembers.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No members found</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {filteredMembers.map((member, i) => (
                          <div 
                            key={i}
                            onClick={() => setSelectedMember(member)}
                            style={{ 
                              padding: '0.75rem 1rem', 
                              borderBottom: '1px solid var(--glass-border)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.2rem',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{member.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.department}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#111', position: 'sticky', bottom: 0, zIndex: 2, borderRadius: '0 0 16px 16px' }}>
          <button onClick={onClose} className="btn btn-outline" disabled={loading}>
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-success" disabled={loading} style={{ minWidth: '140px' }}>
            {loading ? 'Processing...' : (isEditMode ? 'Save Changes' : 'Submit Visitor')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default EnterVisitorModal;
