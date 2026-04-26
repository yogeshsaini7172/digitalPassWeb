import React, { useEffect, useState } from 'react';
import { getAllBatches, getCampusAndDepartment, removeBatch, editBatch, getLeveledMember, getAllMemberForLevel, getDataForBatch, addNewBatch } from '../services/api';

const Batches = () => {
  const [batches, setBatches] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [studentBatches, setStudentBatches] = useState([]);
  const [otherBatches, setOtherBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For Admin campus selection
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // 'All', 'Student', 'Other'

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBatchName, setEditingBatchName] = useState('');
  const [allAvailableMembers, setAllAvailableMembers] = useState([]);
  const [level1Selected, setLevel1Selected] = useState([]);
  const [level2Selected, setLevel2Selected] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addBatchOptions, setAddBatchOptions] = useState({ year: [], department: [], section: [], campus: [] });
  const [newBatchYear, setNewBatchYear] = useState('');
  const [newBatchDepartment, setNewBatchDepartment] = useState('');
  const [newBatchSection, setNewBatchSection] = useState('');
  const [newBatchCampus, setNewBatchCampus] = useState('');
  const [addLevel1Selected, setAddLevel1Selected] = useState([]);
  const [addLevel2Selected, setAddLevel2Selected] = useState([]);
  const [addAvailableMembers, setAddAvailableMembers] = useState([]);

  const userRole = localStorage.getItem('userRole') || '';
  const userCampus = localStorage.getItem('userCampus') || '';

  useEffect(() => {
    if (userRole === 'admin') {
      fetchCampuses();
    } else {
      if (userCampus) fetchBatches(userCampus);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'admin' && selectedCampus) {
      fetchBatches(selectedCampus);
    }
  }, [selectedCampus]);

  useEffect(() => {
    filterBatches();
  }, [searchQuery, activeTab, studentBatches, otherBatches, allBatches]);

  const fetchCampuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = await getCampusAndDepartment(token);
      setCampuses(data.campus || []);
      if (data.campus && data.campus.length > 0) {
        setSelectedCampus(data.campus[0]);
      }
    } catch (error) {
      console.error('Error fetching campuses:', error);
    }
  };

  const fetchBatches = async (campus) => {
    if (!campus) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const data = await getAllBatches({ token, campus });
      
      const students = data?.student || [];
      const others = data?.member || [];
      
      setStudentBatches(students);
      setOtherBatches(others);
      setAllBatches([...students, ...others]);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setAllBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const filterBatches = () => {
    let baseList = [];
    if (activeTab === 'Student') baseList = studentBatches;
    else if (activeTab === 'Other') baseList = otherBatches;
    else baseList = allBatches;

    if (searchQuery) {
      baseList = baseList.filter(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setBatches(baseList);
  };

  const handleRemoveBatch = async (batchName) => {
    const campus = userRole === 'admin' ? selectedCampus : userCampus;
    if (!campus) return alert('Campus not specified');
    
    if (window.confirm(`Are you sure you want to remove the batch: ${batchName}?`)) {
      try {
        const token = localStorage.getItem('token');
        await removeBatch({ token, batchName, campus });
        alert('Batch removed successfully');
        fetchBatches(campus);
      } catch (error) {
        console.error('Error removing batch:', error);
        alert('Failed to remove batch. ' + error.message);
      }
    }
  };

  const handleEditClick = async (batchName) => {
    const campus = userRole === 'admin' ? selectedCampus : userCampus;
    if (!campus) return alert('Campus not specified');

    setEditingBatchName(batchName);
    setIsEditModalOpen(true);
    setModalLoading(true);

    try {
      const token = localStorage.getItem('token');
      // Fetch all possible members for this campus
      const allMembersData = await getAllMemberForLevel({ token, campus });
      setAllAvailableMembers(allMembersData || []);

      // Fetch currently assigned members
      const currentMembers = await getLeveledMember({ token, batchName });
      
      const l1 = (currentMembers.level1 || []).map(m => m.email);
      const l2 = (currentMembers.level2 || []).map(m => m.email);
      
      setLevel1Selected(l1);
      setLevel2Selected(l2);
    } catch (error) {
      console.error('Error fetching edit data:', error);
      alert('Failed to load batch data');
      setIsEditModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const toggleLevelSelection = (level, email) => {
    if (level === 1) {
      setLevel1Selected(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
    } else {
      setLevel2Selected(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
    }
  };

  const handleSaveBatch = async () => {
    try {
      const token = localStorage.getItem('token');
      await editBatch({
        token,
        batchName: editingBatchName,
        level1: level1Selected,
        level2: level2Selected
      });
      alert('Batch edited successfully');
      setIsEditModalOpen(false);
      const campus = userRole === 'admin' ? selectedCampus : userCampus;
      fetchBatches(campus);
    } catch (error) {
      console.error('Error saving batch:', error);
      alert('Failed to save batch. ' + error.message);
    }
  };

  const handleOpenAddModal = async () => {
    setIsAddModalOpen(true);
    setModalLoading(true);
    try {
      const token = localStorage.getItem('token');
      const data = await getDataForBatch(token);
      setAddBatchOptions({
        year: data.year || [],
        department: data.department || [],
        section: data.section || [],
        campus: data.campus || []
      });
      setNewBatchYear('');
      setNewBatchDepartment(localStorage.getItem('userDepartment') || '');
      setNewBatchSection('');
      setNewBatchCampus('');
      setAddLevel1Selected([]);
      setAddLevel2Selected([]);
      
      // If non-admin, we know the campus
      if (userRole !== 'admin' && userCampus) {
        const allMembersData = await getAllMemberForLevel({ token, campus: userCampus });
        setAddAvailableMembers(allMembersData || []);
      } else {
        setAddAvailableMembers([]);
      }
    } catch (error) {
      console.error('Error fetching batch data options:', error);
      alert('Failed to load batch creation options');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddCampusChange = async (e) => {
    const campus = e.target.value;
    setNewBatchCampus(campus);
    if (campus) {
      try {
        const token = localStorage.getItem('token');
        const allMembersData = await getAllMemberForLevel({ token, campus });
        setAddAvailableMembers(allMembersData || []);
        // Reset selections since campus changed
        setAddLevel1Selected([]);
        setAddLevel2Selected([]);
      } catch (error) {
        console.error('Error fetching members for campus:', error);
      }
    } else {
      setAddAvailableMembers([]);
    }
  };

  const toggleAddLevelSelection = (level, email) => {
    if (level === 1) {
      setAddLevel1Selected(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
    } else {
      setAddLevel2Selected(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
    }
  };

  const handleCreateBatch = async () => {
    if (!newBatchYear || !newBatchDepartment || !newBatchSection) {
      return alert('Please select Year, Department, and Section');
    }
    if (userRole === 'admin' && !newBatchCampus) {
      return alert('Please select Campus');
    }
    if (addLevel1Selected.length === 0 || addLevel2Selected.length === 0) {
      return alert('Please select at least one member for each level');
    }

    let batchName = `${newBatchYear}-${newBatchDepartment}-${newBatchSection}`;
    if (userRole === 'admin') {
      batchName = `${newBatchCampus}-${batchName}`;
    }

    setModalLoading(true);
    try {
      const token = localStorage.getItem('token');
      await addNewBatch({
        token,
        batchName,
        level1: addLevel1Selected,
        level2: addLevel2Selected
      });
      alert('Batch added successfully');
      setIsAddModalOpen(false);
      const refreshCampus = userRole === 'admin' ? (selectedCampus || newBatchCampus) : userCampus;
      if (refreshCampus) fetchBatches(refreshCampus);
    } catch (error) {
      console.error('Error adding batch:', error);
      alert('Failed to add batch. ' + error.message);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="page-content animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Batches</h3>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>+ Add New Batch</button>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {userRole === 'admin' && (
          <select 
            className="input-control" 
            style={{ minWidth: '200px', marginBottom: 0 }}
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
          >
            <option value="">Select Campus</option>
            {campuses.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
        )}
        
        <input 
          type="text" 
          placeholder="Search batch..." 
          className="input-control" 
          style={{ flex: 1, minWidth: '200px', marginBottom: 0 }} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'Student', 'Other'].map(tab => (
            <button 
              key={tab}
              className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 1rem' }}
              onClick={() => setActiveTab(tab)}
            >
              {tab} Batches
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
        </div>
      ) : batches.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-secondary)' }}>No batches found</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {batches.map((batch, index) => (
            <div key={index} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{batch}</h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.5rem 1rem' }}
                  onClick={() => handleEditClick(batch)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ padding: '0.5rem 1rem' }}
                  onClick={() => handleRemoveBatch(batch)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: '#121212' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Edit Batch: <span style={{ color: 'var(--accent-primary)' }}>{editingBatchName}</span></h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            
            {modalLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                
                {/* Level 1 Section */}
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Level 1 Approvers</h4>
                  {allAvailableMembers.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No members available</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                      {allAvailableMembers.map((member, idx) => (
                        <label key={`l1-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                          <input 
                            type="checkbox" 
                            checked={level1Selected.includes(member.email)}
                            onChange={() => toggleLevelSelection(1, member.email)}
                            style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                          />
                          <div>
                            <div style={{ fontWeight: '500' }}>{member.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{member.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Level 2 Section */}
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Level 2 Approvers</h4>
                  {allAvailableMembers.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No members available</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                      {allAvailableMembers.map((member, idx) => (
                        <label key={`l2-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                          <input 
                            type="checkbox" 
                            checked={level2Selected.includes(member.email)}
                            onChange={() => toggleLevelSelection(2, member.email)}
                            style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                          />
                          <div>
                            <div style={{ fontWeight: '500' }}>{member.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{member.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveBatch}>Save Changes</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: '#121212' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Add New Batch</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            
            {modalLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {userRole === 'admin' && (
                    <select className="input-control" value={newBatchCampus} onChange={handleAddCampusChange} style={{ flex: 1, minWidth: '150px' }}>
                      <option value="">Select Campus</option>
                      {addBatchOptions.campus.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  )}
                  <select className="input-control" value={newBatchYear} onChange={(e) => setNewBatchYear(e.target.value)} style={{ flex: 1, minWidth: '150px' }}>
                    <option value="">Select Year</option>
                    {addBatchOptions.year.map((y, i) => <option key={i} value={y}>{y}</option>)}
                  </select>
                  <select className="input-control" value={newBatchDepartment} onChange={(e) => setNewBatchDepartment(e.target.value)} style={{ flex: 1, minWidth: '150px' }}>
                    <option value="">Select Department</option>
                    {addBatchOptions.department.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                  <select className="input-control" value={newBatchSection} onChange={(e) => setNewBatchSection(e.target.value)} style={{ flex: 1, minWidth: '150px' }}>
                    <option value="">Select Section</option>
                    {addBatchOptions.section.map((s, i) => <option key={i} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Level 1 Section */}
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Level 1 Approvers</h4>
                  {addAvailableMembers.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No members available</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                      {addAvailableMembers.map((member, idx) => (
                        <label key={`add-l1-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                          <input 
                            type="checkbox" 
                            checked={addLevel1Selected.includes(member.email)}
                            onChange={() => toggleAddLevelSelection(1, member.email)}
                            style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                          />
                          <div>
                            <div style={{ fontWeight: '500' }}>{member.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{member.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Level 2 Section */}
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Level 2 Approvers</h4>
                  {addAvailableMembers.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No members available</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                      {addAvailableMembers.map((member, idx) => (
                        <label key={`add-l2-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                          <input 
                            type="checkbox" 
                            checked={addLevel2Selected.includes(member.email)}
                            onChange={() => toggleAddLevelSelection(2, member.email)}
                            style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                          />
                          <div>
                            <div style={{ fontWeight: '500' }}>{member.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{member.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleCreateBatch}>Create Batch</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Batches;
