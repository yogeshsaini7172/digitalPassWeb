// In dev: uses Vite proxy (/api). In production: hits backend directly via env variable.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getErrorMessage = async (response, fallbackPrefix = '') => {
  try {
    const errText = await response.text();
    try {
      const parsed = JSON.parse(errText);
      if (parsed && parsed.message) {
        return parsed.message;
      }
    } catch (e) {}
    return fallbackPrefix ? `${fallbackPrefix}: ${errText}` : errText;
  } catch (e) {
    return fallbackPrefix || `Server error ${response.status}`;
  }
};

export const loginUser = async (email, password) => {
  const response = await fetch(`${BASE_URL}/login-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error('Login failed');
  return response.json();
};

export const getRecentGatePassList = async (token) => {
  const response = await fetch(`${BASE_URL}/get-recent-gate-pass-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token),
  });
  if (!response.ok) throw new Error('Failed to fetch gate passes');
  return response.json();
};

export const approveGatePass = async (hashToApproveGatePass) => {
  const response = await fetch(`${BASE_URL}/approve-gate-pass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hashToApproveGatePass),
  });
  if (!response.ok) throw new Error('Failed to approve gate pass');
  return response.text();
};

export const rejectGatePass = async (hashToRejectGatePass) => {
  const response = await fetch(`${BASE_URL}/reject-gate-pass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hashToRejectGatePass),
  });
  if (!response.ok) throw new Error('Failed to reject gate pass');
  return response.text();
};

export const editGatePass = async (data) => {
  const response = await fetch(`${BASE_URL}/edit-gate-pass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to edit gate pass');
  return response.text();
};

export const removeGatePassBySelfUser = async (data) => {
  const response = await fetch(`${BASE_URL}/remove-gate-pass-by-self-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to remove gate pass');
  return response.text();
};

export const meetVisitor = async (meetData) => {
  const response = await fetch(`${BASE_URL}/meet-visitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meetData),
  });
  if (!response.ok) throw new Error('Failed to meet visitor');
  return response.text();
};

export const getRecentVisitorList = async (token) => {
  const response = await fetch(`${BASE_URL}/get-recent-visitor-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token),
  });
  if (!response.ok) throw new Error('Failed to fetch visitors');
  return response.json();
};

// USER MANAGEMENT
export const getMembersForUserManagement = async (token) => {
  const response = await fetch(`${BASE_URL}/get-members-for-user-management`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token),
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const addNewUser = async (usersData) => {
  const response = await fetch(`${BASE_URL}/add-new-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(usersData),
  });
  if (!response.ok) throw new Error('Failed to add user');
  return response.text();
};

export const editUser = async (editedUser) => {
  const response = await fetch(`${BASE_URL}/edit-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(editedUser),
  });
  if (!response.ok) throw new Error('Failed to edit user');
  return response.text();
};

export const uploadExcelUsers = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('token', token);

  const response = await fetch(`${BASE_URL}/upload-excel-users`, {
    method: 'POST',
    body: formData, // fetch automatically sets Content-Type for FormData
  });
  if (!response.ok) throw new Error('Failed to upload Excel');
  return response.text();
};

export const getCampusAndDepartment = async (token) => {
  const response = await fetch(`${BASE_URL}/get-campus-and-department`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token),
  });
  if (!response.ok) throw new Error('Failed to fetch campus data');
  return response.json();
};

export const getRoleBasedOnDepartment = async (departmentData) => {
  const response = await fetch(`${BASE_URL}/get-role-based-on-department`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(departmentData),
  });
  if (!response.ok) throw new Error('Failed to fetch roles');
  return response.json();
};

export const getBatchesBasedOnDepartment = async (batchData) => {
  const response = await fetch(`${BASE_URL}/get-batches-based-on-department`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batchData),
  });
  if (!response.ok) throw new Error('Failed to fetch batches');
  return response.json();
};

export const removeUser = async (hashToRemoveUser) => {
  const response = await fetch(`${BASE_URL}/remove-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hashToRemoveUser),
  });
  if (!response.ok) throw new Error('Failed to remove user');
  return response.text();
};

// BATCHES
export const getAllBatches = async (hashToGetAllBatches) => {
  const response = await fetch(`${BASE_URL}/get-all-batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hashToGetAllBatches),
  });
  if (!response.ok) throw new Error('Failed to fetch batches');
  return response.json();
};

export const removeBatch = async (hashToRemoveBatch) => {
  const response = await fetch(`${BASE_URL}/remove-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hashToRemoveBatch),
  });
  if (!response.ok) throw new Error('Failed to remove batch');
  return response.text();
};

export const editBatch = async (batchData) => {
  const response = await fetch(`${BASE_URL}/edit-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batchData),
  });
  if (!response.ok) throw new Error('Failed to edit batch');
  return response.text();
};

export const getLeveledMember = async (hashToGetLeveledMember) => {
  const response = await fetch(`${BASE_URL}/get-leveled-member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hashToGetLeveledMember),
  });
  if (!response.ok) throw new Error('Failed to fetch leveled members');
  return response.json();
};

export const getAllMemberForLevel = async (hashToGetAllMemberForLevel) => {
  const response = await fetch(`${BASE_URL}/get-all-members-for-level`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hashToGetAllMemberForLevel),
  });
  if (!response.ok) throw new Error('Failed to fetch all level members');
  return response.json();
};

export const getDataForBatch = async (token) => {
  const response = await fetch(`${BASE_URL}/get-data-for-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token),
  });
  if (!response.ok) throw new Error('Failed to fetch batch data');
  return response.json();
};

export const addNewBatch = async (batchData) => {
  const response = await fetch(`${BASE_URL}/add-new-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batchData),
  });
  if (!response.ok) throw new Error('Failed to add new batch');
  return response.text();
};

// HISTORY
export const getVisitorListHistory = async (hashToGetVisitorListHistory) => {
  const response = await fetch(`${BASE_URL}/get-visitor-list-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hashToGetVisitorListHistory),
  });
  if (!response.ok) throw new Error('Failed to fetch visitor history');
  return response.json();
};

export const getGatePassListHistory = async (hashToGetGatePassListHistory) => {
  const response = await fetch(`${BASE_URL}/get-gate-pass-list-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hashToGetGatePassListHistory),
  });
  if (!response.ok) throw new Error('Failed to fetch gate pass history');
  return response.json();
};

// SECURITY GUARD ALLOTMENT
export const getCampusForAllotment = async (token) => {
  const response = await fetch(`${BASE_URL}/get-campus-for-allotment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token),
  });
  if (!response.ok) throw new Error('Failed to fetch campuses');
  return response.json();
};

export const getAllottedSecurityGuard = async (data) => {
  const response = await fetch(`${BASE_URL}/get-allotted-security-guard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Server error ${response.status}`));
  }
  return response.json();
};

export const saveAllottedSecurityGuard = async (data) => {
  const response = await fetch(`${BASE_URL}/save-allotted-security-guard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Server error ${response.status}`));
  }
  return response.text();
};

// SELF USER GATE PASS
export const getSelfUserGatePass = async (token) => {
  const response = await fetch(`${BASE_URL}/get-self-user-gate-pass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Server error ${response.status}`));
  }
  return response.json();
};

export const applyForGatePass = async (data) => {
  const response = await fetch(`${BASE_URL}/apply-for-gate-pass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Server error ${response.status}`));
  }
  return response.json();
};

export const checkPermissionOfSecurityGuard = async (token) => {
  const response = await fetch(`${BASE_URL}/check-permission-of-security-guard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Server error ${response.status}`));
  }
  return response.text();
};

export const getAllMemberForVisitor = async (token) => {
  const response = await fetch(`${BASE_URL}/get-all-member-for-visitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Server error ${response.status}`));
  }
  return response.json();
};

export const enterVisitor = async (formData) => {
  // formData contains visitor (JSON string), token, and file
  const response = await fetch(`${BASE_URL}/enter-visitor`, {
    method: 'POST',
    body: formData, // FormData automatically sets the boundary and content-type
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Server error ${response.status}`));
  }
  return response.text();
};

export const editVisitor = async (formData) => {
  const response = await fetch(`${BASE_URL}/edit-visitor`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Server error ${response.status}`));
  }
  return response.text();
};

export const sendVerificationCode = async (email) => {
  const response = await fetch(`${BASE_URL}/send-verification-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(email),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Failed to send verification code');
  }
  return response.json();
};

export const verifyVerificationCode = async (email, verificationCode) => {
  const response = await fetch(`${BASE_URL}/verify-verification-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, verificationCode }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Invalid verification code');
  }
  return response.json();
};

export const updatePassword = async (email, verificationCode, newPassword) => {
  const response = await fetch(`${BASE_URL}/update-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, verificationCode, newPassword }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Failed to update password');
  }
  return response.json();
};

export const getCampusLocation = async (token) => {
  const response = await fetch(`${BASE_URL}/get-campus-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Failed to fetch campus locations');
  }
  return response.json();
};

export const saveCampusLocation = async (data) => {
  const response = await fetch(`${BASE_URL}/save-campus-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Failed to save campus location');
  }
  return response.json();
};

export const createCampusLocation = async (data) => {
  const response = await fetch(`${BASE_URL}/create-campus-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Failed to create campus location');
  }
  return response.json();
};

export const uploadProfileImage = async (file, token) => {
  const formData = new FormData();
  formData.append('img', file);
  formData.append('token', token);

  const response = await fetch(`${BASE_URL}/upload-profile-image`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Failed to upload profile image');
  }
  return response.json();
};
