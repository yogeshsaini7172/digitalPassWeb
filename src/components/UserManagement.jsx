import React, { useEffect, useState, useRef } from 'react';
import {
  getMembersForUserManagement, removeUser,
  getCampusAndDepartment, getRoleBasedOnDepartment, getBatchesBasedOnDepartment,
  addNewUser, editUser, uploadExcelUsers
} from '../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState(null); // null, 'ADD', 'EDIT'
  const fileInputRef = useRef(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Add/Edit User Form State
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', uid: '', fathername: '', fatherphone: '', previousEmail: ''
  });
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [batches, setBatches] = useState([]);

  const [selectedCampus, setSelectedCampus] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');

  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    if (!formMode) fetchUsers();
    else fetchCampusAndDept();
  }, [formMode]);

  useEffect(() => {
    if (selectedDept) fetchRoles();
  }, [selectedDept]);

  useEffect(() => {
    if (selectedDept && selectedRole) fetchBatches();
  }, [selectedDept, selectedRole, selectedCampus]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const data = await getMembersForUserManagement(token);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampusAndDept = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = await getCampusAndDepartment(token);
      setCampuses(data.campus || []);
      setDepartments(data.department || []);
    } catch (error) {
      console.error('Error fetching campus/dept:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const data = await getRoleBasedOnDepartment({ department: selectedDept, token });
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = { department: selectedDept, role: selectedRole, token };
      if (userRole === 'admin') payload.campus = selectedCampus;
      const data = await getBatchesBasedOnDepartment(payload);
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      setBatches([]);
    }
  };

  const handleRemove = async (email) => {
    if (!window.confirm(`Are you sure you want to remove ${email}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await removeUser({ token, removeEmail: email });
      fetchUsers();
    } catch (error) {
      console.error('Error removing user:', error);
    }
  };

  const openAddForm = () => {
    setFormData({ name: '', email: '', phone: '', uid: '', fathername: '', fatherphone: '', previousEmail: '' });
    setSelectedCampus('');
    setSelectedDept('');
    setSelectedRole('');
    setSelectedBatch('');
    setFormMode('ADD');
  };

  const openEditForm = (user) => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      uid: user.uid || '',
      fathername: user.fatherName || user.fathername || '',
      fatherphone: user.fatherPhone || user.fatherphone || '',
      previousEmail: user.email || ''
    });
    setSelectedCampus(user.campus || '');
    setSelectedDept(user.department || '');
    setSelectedRole(user.role || '');
    setSelectedBatch(user.batch || '');
    setFormMode('EDIT');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'admin' && !selectedCampus) return alert('Select a campus');
    if (!selectedDept || !selectedRole) return alert('Select Dept and Role');
    if (selectedRole.toLowerCase() === 'student' && !selectedBatch) return alert('Select Batch for Student');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: selectedDept,
        role: selectedRole,
        token
      };

      if (formMode === 'EDIT') {
        payload.previousEmail = formData.previousEmail;
      }

      if (selectedRole.toLowerCase() === 'student') {
        payload.uid = formData.uid;
        payload.fathername = formData.fathername;
        payload.fatherphone = formData.fatherphone;
        payload.batch = selectedBatch;
      }

      if (userRole === 'admin') payload.campus = selectedCampus;

      if (formMode === 'ADD') {
        await addNewUser(payload);
        alert('User added successfully');
      } else if (formMode === 'EDIT') {
        await editUser(payload);
        alert('User updated successfully');
      }

      setFormMode(null);
      await fetchUsers(); // explicitly fetch users again
    } catch (error) {
      alert(`Error ${formMode === 'ADD' ? 'adding' : 'updating'} user`);
      console.error(error);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const token = localStorage.getItem('token');
      await uploadExcelUsers(file, token);
      alert('Excel uploaded successfully');
      fetchUsers();
    } catch (error) {
      alert('Error uploading excel');
    }
  };

  const getRoleBadgeColor = (role) => {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: 'rgba(139,92,246,0.3)' };
    if (r === 'principal') return { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)' };
    if (r === 'hod') return { bg: 'rgba(249,115,22,0.15)', color: '#fb923c', border: 'rgba(249,115,22,0.3)' };
    if (r === 'faculty') return { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' };
    if (r === 'student') return { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)' };
    if (r === 'security guard' || r === 'security') return { bg: 'rgba(234,179,8,0.15)', color: '#facc15', border: 'rgba(234,179,8,0.3)' };
    if (r === 'reception') return { bg: 'rgba(20,184,166,0.15)', color: '#2dd4bf', border: 'rgba(20,184,166,0.3)' };
    return { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', border: 'rgba(255,255,255,0.15)' };
  };

  const getFilteredUsers = () => {
    return users.filter(user => {
      if (searchQuery && !user.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (roleFilter === 'All') return true;

      const uRole = user.role?.toLowerCase() || '';
      if (roleFilter === 'Student') return uRole === 'student';
      if (roleFilter === 'Management') return ['principal', 'hod', 'faculty', 'admin'].includes(uRole);
      if (roleFilter === 'Security') return uRole === 'security guard' || uRole === 'security';
      if (roleFilter === 'Reception') return uRole === 'reception';

      return true;
    });
  };

  const filteredUsers = getFilteredUsers();

  if (formMode) {
    return (
      <div className="page-content animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>{formMode === 'ADD' ? 'Add New User' : 'Edit User'}</h3>
          <button onClick={() => setFormMode(null)} className="btn btn-outline">Back to List</button>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
          <form onSubmit={handleFormSubmit}>
            {userRole === 'admin' && (
              <div className="input-group">
                <label className="input-label">Campus</label>
                <select className="input-control" value={selectedCampus} onChange={e => setSelectedCampus(e.target.value)} required>
                  <option value="">Select Campus</option>
                  {campuses.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  {formMode === 'EDIT' && selectedCampus && !campuses.includes(selectedCampus) && (
                    <option value={selectedCampus}>{selectedCampus}</option>
                  )}
                </select>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Department</label>
              <select className="input-control" value={selectedDept} onChange={e => setSelectedDept(e.target.value)} required>
                <option value="">Select Department</option>
                {departments.map((d, i) => <option key={i} value={d}>{d}</option>)}
                {formMode === 'EDIT' && selectedDept && !departments.includes(selectedDept) && (
                  <option value={selectedDept}>{selectedDept}</option>
                )}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Role</label>
              <select className="input-control" value={selectedRole} onChange={e => setSelectedRole(e.target.value)} required>
                <option value="">Select Role</option>
                {roles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                {formMode === 'EDIT' && selectedRole && !roles.includes(selectedRole) && (
                  <option value={selectedRole}>{selectedRole}</option>
                )}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Name</label>
              <input type="text" className="input-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>

            <div className="input-group">
              <label className="input-label">Email</label>
              <input type="email" className="input-control" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
            </div>

            <div className="input-group">
              <label className="input-label">Phone</label>
              <input type="text" className="input-control" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
            </div>

            {selectedRole.toLowerCase() === 'student' && (
              <>
                <div className="input-group">
                  <label className="input-label">UID</label>
                  <input type="text" className="input-control" value={formData.uid} onChange={e => setFormData({ ...formData, uid: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Father's Name</label>
                  <input type="text" className="input-control" value={formData.fathername} onChange={e => setFormData({ ...formData, fathername: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Father's Phone</label>
                  <input type="text" className="input-control" value={formData.fatherphone} onChange={e => setFormData({ ...formData, fatherphone: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Batch</label>
                  <select className="input-control" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} required>
                    <option value="">Select Batch</option>
                    {batches.map((b, i) => <option key={i} value={b}>{b}</option>)}
                    {formMode === 'EDIT' && selectedBatch && !batches.includes(selectedBatch) && (
                      <option value={selectedBatch}>{selectedBatch}</option>
                    )}
                  </select>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              {formMode === 'ADD' ? 'Add User' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>User Management</h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelUpload}
            style={{ display: 'none' }}
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          />
          <button onClick={() => fileInputRef.current.click()} className="btn btn-outline">Upload Excel</button>
          <button onClick={openAddForm} className="btn btn-primary">+ Add Manually</button>
        </div>
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'Student', 'Management', 'Security', 'Reception'].map(role => (
            <button
              key={role}
              className={`btn ${roleFilter === role ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.5rem 1rem' }}
              onClick={() => setRoleFilter(role)}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-secondary)' }}>No users found matching criteria</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filteredUsers.map((user, index) => {
            const badge = getRoleBadgeColor(user.role);
            const isStudent = (user.role || '').toLowerCase() === 'student';
            return (
              <div
                key={index}
                className="glass-panel"
                style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                {/* Avatar + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                  {/* Avatar */}
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: badge.bg, border: `1px solid ${badge.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: badge.color }}>
                    {(user.name || 'U').charAt(0).toUpperCase()}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || 'Unknown Name'}</h4>
                      <span style={{ padding: '0.1rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, textTransform: 'capitalize', flexShrink: 0 }}>
                        {user.role || 'N/A'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        ✉ {user.email || '—'}
                      </span>
                      {user.phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          📞 {user.phone}
                        </span>
                      )}
                      {user.department && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          🏢 {user.department}
                        </span>
                      )}
                      {user.campus && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          📍 {user.campus}
                        </span>
                      )}
                      {isStudent && user.batch && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.1rem 0.5rem', borderRadius: '6px', background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                          📋 {user.batch}
                        </span>
                      )}
                      {isStudent && user.uid && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          🪪 {user.uid}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button onClick={() => openEditForm(user)} className="btn btn-outline" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>Edit</button>
                  <button onClick={() => handleRemove(user.email)} className="btn btn-danger" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
