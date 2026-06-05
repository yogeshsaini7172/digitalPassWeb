import React, { useEffect, useState } from 'react';
import { getAllBatches, getCampusAndDepartment, removeBatch, editBatch, getLeveledMember, getAllMemberForLevel, getDataForBatch, addNewBatch, getMembersForUserManagement, editUser, getRoleBasedOnDepartment, getBatchesBasedOnDepartment } from '../services/api';

const Batches = () => {
  const [batches, setBatches] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [studentBatches, setStudentBatches] = useState([]);
  const [otherBatches, setOtherBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  
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

  // View Members Modal State
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedBatchMembers, setSelectedBatchMembers] = useState([]);
  const [viewingBatchName, setViewingBatchName] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Edit User Profile Modal State
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editDepartments, setEditDepartments] = useState([]);
  const [editRoles, setEditRoles] = useState([]);
  const [editBatches, setEditBatches] = useState([]);
  const [editCampuses, setEditCampuses] = useState([]);

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
      
      const usersData = await getMembersForUserManagement(token);
      setAllUsers(usersData || []);
      const batchCounts = {};
      (usersData || []).forEach(u => {
        if (u.batch) {
          batchCounts[u.batch] = (batchCounts[u.batch] || 0) + 1;
        }
      });

      const studentBatchesWithCount = students.map(b => ({ name: b, count: batchCounts[b] || 0 }));
      const otherBatchesWithCount = others.map(b => ({ name: b, count: batchCounts[b] || 0 }));
      
      setStudentBatches(studentBatchesWithCount);
      setOtherBatches(otherBatchesWithCount);
      setAllBatches([...studentBatchesWithCount, ...otherBatchesWithCount]);
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
      baseList = baseList.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
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

  const handleViewMembers = (batchName) => {
    const membersInBatch = allUsers.filter(u => u.batch === batchName);
    setViewingBatchName(batchName);
    setSelectedBatchMembers(membersInBatch);
    setIsMembersModalOpen(true);
  };

  const handleUserClick = async (user) => {
    setEditingUser({
      ...user,
      previousEmail: user.email,
      fathername: user.fatherName || user.fathername || '',
      fatherphone: user.fatherPhone || user.fatherphone || '',
    });
    setIsEditUserModalOpen(true);
    
    // Fetch options for dropdowns
    try {
      const token = localStorage.getItem('token');
      const campusDeptData = await getCampusAndDepartment(token);
      const fetchedCampuses = campusDeptData.campus || ["SISTec-Gandhi Nagar", "SISTec-Ratibad"];
      const fetchedDepts = campusDeptData.department || [
          "COMPUTER SCIENCE", "INFORMATION TECHNOLOGY", "MECHANICAL ENGINEERING",
          "CIVIL ENGINEERING", "ELECTRICAL ENGINEERING", "ELECTRONICS & COMMUNICATION",
          "MBA", "ADMINISTRATION"
      ];
      setEditCampuses(fetchedCampuses);
      setEditDepartments(fetchedDepts);

      if (user.department) {
        const rolesData = await getRoleBasedOnDepartment({ department: user.department, token });
        setEditRoles(rolesData || ["student"]);
        
        if (user.role?.toLowerCase() === 'student') {
          const batchPayload = { department: user.department, role: user.role, token };
          if (userRole === 'admin') batchPayload.campus = user.campus || fetchedCampuses[0];
          const batchesData = await getBatchesBasedOnDepartment(batchPayload);
          setEditBatches(batchesData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching dropdown data for edit:', error);
    }
  };

  // Watch for department/role changes in edit modal
  useEffect(() => {
    if (isEditUserModalOpen && editingUser?.department) {
      const fetchEditRoles = async () => {
        try {
          const token = localStorage.getItem('token');
          const rolesData = await getRoleBasedOnDepartment({ department: editingUser.department, token });
          setEditRoles(rolesData || ["student"]);
        } catch (error) {}
      };
      fetchEditRoles();
    }
  }, [editingUser?.department, isEditUserModalOpen]);

  useEffect(() => {
    if (isEditUserModalOpen && editingUser?.department && editingUser?.role) {
      const fetchEditBatches = async () => {
        try {
          const token = localStorage.getItem('token');
          const batchPayload = { department: editingUser.department, role: editingUser.role, token };
          if (userRole === 'admin') batchPayload.campus = editingUser.campus;
          const batchesData = await getBatchesBasedOnDepartment(batchPayload);
          setEditBatches(batchesData || []);
        } catch (error) {}
      };
      if (editingUser.role.toLowerCase() === 'student') {
        fetchEditBatches();
      } else {
        setEditBatches([]);
      }
    }
  }, [editingUser?.department, editingUser?.role, editingUser?.campus, isEditUserModalOpen]);

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        department: editingUser.department,
        role: editingUser.role,
        uid: editingUser.uid,
        fathername: editingUser.fathername,
        fatherphone: editingUser.fatherphone,
        batch: editingUser.batch,
        campus: editingUser.campus,
        previousEmail: editingUser.previousEmail,
        token
      };
      await editUser(payload);
      
      const updatedUsers = allUsers.map(u => u.email === payload.previousEmail ? { ...u, ...payload } : u);
      setAllUsers(updatedUsers);
      setSelectedBatchMembers(updatedUsers.filter(u => u.batch === viewingBatchName));
      setIsEditUserModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Failed to update user');
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
    <>
      <div className="page-content animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1.5rem' }}>
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
            <div key={index} className="glass-panel responsive-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{batch.name}</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--surface-hover)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                    {batch.count} Members
                  </span>
                </div>
              </div>
              <div className="responsive-card-actions" style={{ marginTop: '0' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', flex: 1 }}
                  onClick={() => handleViewMembers(batch.name)}
                >
                  Members
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', flex: 1 }}
                  onClick={() => handleEditClick(batch.name)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', flex: 1 }}
                  onClick={() => handleRemoveBatch(batch.name)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {isEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--surface-modal)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Edit Batch: <span style={{ color: 'var(--accent-primary)' }}>{editingBatchName}</span></h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            
            {modalLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
              </div>
            ) : (
              <div className="responsive-grid-2">
                
                {/* Level 1 Section */}
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Level 1 Approvers</h4>
                  {allAvailableMembers.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No members available</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                      {allAvailableMembers.map((member, idx) => (
                        <label key={`l1-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', background: 'var(--surface-hover)', borderRadius: '4px' }}>
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
                        <label key={`l2-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', background: 'var(--surface-hover)', borderRadius: '4px' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--surface-modal)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Add New Batch</h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            
            {modalLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
              </div>
            ) : (
              <div className="responsive-grid-2">
                
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
                        <label key={`add-l1-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', background: 'var(--surface-hover)', borderRadius: '4px' }}>
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
                        <label key={`add-l2-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', background: 'var(--surface-hover)', borderRadius: '4px' }}>
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

      {isMembersModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--surface-modal)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Members of <span style={{ color: 'var(--accent-primary)' }}>{viewingBatchName}</span></h3>
              <button onClick={() => { setIsMembersModalOpen(false); setMemberSearchQuery(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Search members by name..."
                className="input-control"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                style={{ marginBottom: '0' }}
              />
            </div>
            
            {selectedBatchMembers.filter(m => m.name?.toLowerCase().includes(memberSearchQuery.toLowerCase())).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No members found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedBatchMembers
                  .filter(m => m.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                  .map((member, idx) => (
                  <div key={idx} className="glass-panel" 
                    style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface-hover)', cursor: 'pointer', transition: 'transform 0.2s' }}
                    onClick={() => handleUserClick(member)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                      {(member.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{member.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{member.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsMembersModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isEditUserModalOpen && editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--surface-modal)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>User Profile</h3>
              <button onClick={() => setIsEditUserModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2.5rem', fontWeight: 'bold', boxShadow: 'var(--glass-shadow)' }}>
                {(editingUser.name || 'U').charAt(0).toUpperCase()}
              </div>
            </div>

            <form onSubmit={handleEditUserSubmit}>
              <div className="input-group">
                <label className="input-label">Name</label>
                <input type="text" className="input-control" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} required />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input type="email" className="input-control" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} required />
              </div>
              <div className="input-group">
                <label className="input-label">Phone</label>
                <input type="text" className="input-control" value={editingUser.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} required />
              </div>

              {userRole === 'admin' && (
                <div className="input-group">
                  <label className="input-label">Campus</label>
                  <select className="input-control" value={editingUser.campus || ''} onChange={e => setEditingUser({...editingUser, campus: e.target.value})} required>
                    <option value="">Select Campus</option>
                    {editCampuses.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    {editingUser.campus && !editCampuses.includes(editingUser.campus) && <option value={editingUser.campus}>{editingUser.campus}</option>}
                  </select>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Department</label>
                <select className="input-control" value={editingUser.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value})} required>
                  <option value="">Select Department</option>
                  {editDepartments.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  {editingUser.department && !editDepartments.includes(editingUser.department) && <option value={editingUser.department}>{editingUser.department}</option>}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Role</label>
                <select className="input-control" value={editingUser.role || ''} onChange={e => setEditingUser({...editingUser, role: e.target.value})} required>
                  <option value="">Select Role</option>
                  {editRoles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                  {editingUser.role && !editRoles.includes(editingUser.role) && <option value={editingUser.role}>{editingUser.role}</option>}
                </select>
              </div>

              {editingUser.role?.toLowerCase() === 'student' && (
                <>
                  <div className="input-group">
                    <label className="input-label">Batch</label>
                    <select className="input-control" value={editingUser.batch || ''} onChange={e => setEditingUser({...editingUser, batch: e.target.value})} required>
                      <option value="">Select Batch</option>
                      {editBatches.map((b, i) => <option key={i} value={b}>{b}</option>)}
                      {editingUser.batch && !editBatches.includes(editingUser.batch) && <option value={editingUser.batch}>{editingUser.batch}</option>}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">UID</label>
                    <input type="text" className="input-control" value={editingUser.uid || ''} onChange={e => setEditingUser({...editingUser, uid: e.target.value})} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Father's Name</label>
                    <input type="text" className="input-control" value={editingUser.fathername || ''} onChange={e => setEditingUser({...editingUser, fathername: e.target.value})} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Father's Phone</label>
                    <input type="text" className="input-control" value={editingUser.fatherphone || ''} onChange={e => setEditingUser({...editingUser, fatherphone: e.target.value})} required />
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditUserModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Batches;
