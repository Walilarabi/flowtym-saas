/**
 * Flowtym Configuration Module - API Service
 * 
 * Provides all API calls for the Configuration module
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('flowtym_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOTEL PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

export const getHotelProfile = async (hotelId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/profile`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch hotel profile');
  return res.json();
};

export const updateHotelProfile = async (hotelId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update hotel profile');
  return res.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOM TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export const getRoomTypes = async (hotelId, activeOnly = true) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/room-types?active_only=${activeOnly}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch room types');
  return res.json();
};

export const createRoomType = async (hotelId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/room-types`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create room type');
  }
  return res.json();
};

export const updateRoomType = async (hotelId, typeId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/room-types/${typeId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update room type');
  }
  return res.json();
};

export const deleteRoomType = async (hotelId, typeId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/room-types/${typeId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to delete room type');
  }
  return res.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOMS
// ═══════════════════════════════════════════════════════════════════════════════

export const getRooms = async (hotelId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.room_type_id) params.append('room_type_id', filters.room_type_id);
  if (filters.floor !== undefined) params.append('floor', filters.floor);
  if (filters.status) params.append('status', filters.status);
  params.append('active_only', filters.active_only !== false);
  
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rooms?${params}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch rooms');
  return res.json();
};

export const createRoom = async (hotelId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rooms`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create room');
  }
  return res.json();
};

export const updateRoom = async (hotelId, roomId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rooms/${roomId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update room');
  }
  return res.json();
};

export const deleteRoom = async (hotelId, roomId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rooms/${roomId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to delete room');
  }
  return res.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const downloadRoomTemplate = async (hotelId) => {
  const token = localStorage.getItem('flowtym_token');
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rooms/import/template`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to download template');
  return res.blob();
};

export const previewRoomImport = async (hotelId, file) => {
  const token = localStorage.getItem('flowtym_token');
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rooms/import/preview`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to preview import');
  }
  return res.json();
};

export const confirmRoomImport = async (hotelId, file, updateExisting = false) => {
  const token = localStorage.getItem('flowtym_token');
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rooms/import/confirm?update_existing=${updateExisting}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to import rooms');
  }
  return res.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// RATE PLANS
// ═══════════════════════════════════════════════════════════════════════════════

export const getRatePlans = async (hotelId, activeOnly = true) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rate-plans?active_only=${activeOnly}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch rate plans');
  return res.json();
};

export const createRatePlan = async (hotelId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rate-plans`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create rate plan');
  }
  return res.json();
};

export const updateRatePlan = async (hotelId, rateId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rate-plans/${rateId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update rate plan');
  }
  return res.json();
};

export const deleteRatePlan = async (hotelId, rateId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rate-plans/${rateId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to delete rate plan');
  }
  return res.json();
};

export const simulateRatePrices = async (hotelId, baseRateId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/rate-plans/simulate?base_rate_id=${baseRateId}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to simulate prices');
  return res.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// POLICIES
// ═══════════════════════════════════════════════════════════════════════════════

export const getCancellationPolicies = async (hotelId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/cancellation-policies`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch cancellation policies');
  return res.json();
};

export const createCancellationPolicy = async (hotelId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/cancellation-policies`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create policy');
  }
  return res.json();
};

export const updateCancellationPolicy = async (hotelId, policyId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/cancellation-policies/${policyId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update policy');
  }
  return res.json();
};

export const deleteCancellationPolicy = async (hotelId, policyId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/cancellation-policies/${policyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete policy');
  return res.json();
};

export const getPaymentPolicies = async (hotelId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/payment-policies`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch payment policies');
  return res.json();
};

export const createPaymentPolicy = async (hotelId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/payment-policies`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create policy');
  }
  return res.json();
};

export const deletePaymentPolicy = async (hotelId, policyId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/payment-policies/${policyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete policy');
  return res.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

export const getAdvancedSettings = async (hotelId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/settings`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
};

export const updateAdvancedSettings = async (hotelId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
};

export const addTaxRule = async (hotelId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/taxes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add tax');
  return res.json();
};

export const removeTaxRule = async (hotelId, taxId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/taxes/${taxId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to remove tax');
  return res.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

export const getConfigurationSummary = async (hotelId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/summary`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
};

// ═══════════════════════════════════════════════════════════════════════════════
// USERS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const getAvailableRoles = async () => {
  const res = await fetch(`${API_URL}/api/config/roles`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch roles');
  return res.json();
};

export const getConfigUsers = async (hotelId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_URL}/api/config/hotels/${hotelId}/users${query ? `?${query}` : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

export const createConfigUser = async (hotelId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create user');
  }
  return res.json();
};

export const updateConfigUser = async (hotelId, userId, data) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update user');
  }
  return res.json();
};

export const deleteConfigUser = async (hotelId, userId) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
};

export const resetUserPassword = async (hotelId, userId, newPassword) => {
  const res = await fetch(`${API_URL}/api/config/hotels/${hotelId}/users/${userId}/reset-password?new_password=${encodeURIComponent(newPassword)}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to reset password');
  return res.json();
};
