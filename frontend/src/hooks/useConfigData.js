/**
 * useConfigData - React hook for accessing Configuration module data
 * 
 * This hook provides all modules (RMS, Data Hub, PMS, etc.) with
 * centralized access to hotel configuration data.
 * 
 * Usage:
 *   const { roomTypes, ratePlans, loading, error, refresh } = useConfigData();
 */
import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('flowtym_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

/**
 * Get hotel ID from user data
 */
const getHotelId = () => {
  const userData = JSON.parse(localStorage.getItem('flowtym_user') || '{}');
  return userData.hotel_id || '4f02769a-5f63-4121-bb97-a7061563d934';
};

/**
 * Main hook for accessing configuration data
 */
export function useConfigData(options = {}) {
  const {
    autoLoad = true,
    includeRoomCount = true,
  } = options;
  
  const [hotelId] = useState(getHotelId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    hotel: null,
    roomTypes: [],
    ratePlans: [],
    pricingMatrix: {},
    cancellationPolicies: [],
    paymentPolicies: [],
    taxes: [],
    settings: {},
    inventory: null,
  });

  const fetchFullConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `${API_URL}/api/shared/config/${hotelId}/all`,
        { headers: getAuthHeaders() }
      );
      
      if (!response.ok) throw new Error('Failed to fetch configuration');
      
      const result = await response.json();
      
      setData({
        hotel: result.hotel,
        roomTypes: result.room_types || [],
        ratePlans: result.rate_plans || [],
        pricingMatrix: result.pricing_matrix || {},
        cancellationPolicies: result.cancellation_policies || [],
        paymentPolicies: result.payment_policies || [],
        taxes: result.taxes || [],
        settings: result.settings || {},
        inventory: result.rooms_summary,
        fetchedAt: result.fetched_at,
      });
      
    } catch (err) {
      console.error('Failed to load config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    if (autoLoad) {
      fetchFullConfig();
    }
  }, [autoLoad, fetchFullConfig]);

  return {
    hotelId,
    loading,
    error,
    refresh: fetchFullConfig,
    ...data,
  };
}

/**
 * Hook specifically for room types
 */
export function useRoomTypes(includeRoomCount = true) {
  const [hotelId] = useState(getHotelId());
  const [loading, setLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState([]);
  const [error, setError] = useState(null);

  const fetchRoomTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/shared/config/${hotelId}/room-types?include_room_count=${includeRoomCount}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch room types');
      const data = await response.json();
      setRoomTypes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hotelId, includeRoomCount]);

  useEffect(() => {
    fetchRoomTypes();
  }, [fetchRoomTypes]);

  // Create mapping helpers
  const roomTypeByCode = roomTypes.reduce((acc, rt) => {
    acc[rt.code] = rt;
    return acc;
  }, {});

  const roomTypeById = roomTypes.reduce((acc, rt) => {
    acc[rt.id] = rt;
    return acc;
  }, {});

  return {
    roomTypes,
    roomTypeByCode,
    roomTypeById,
    loading,
    error,
    refresh: fetchRoomTypes,
  };
}

/**
 * Hook specifically for rate plans
 */
export function useRatePlans(includeDerived = true) {
  const [hotelId] = useState(getHotelId());
  const [loading, setLoading] = useState(true);
  const [ratePlans, setRatePlans] = useState([]);
  const [error, setError] = useState(null);

  const fetchRatePlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/shared/config/${hotelId}/rate-plans?include_derived=${includeDerived}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch rate plans');
      const data = await response.json();
      setRatePlans(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hotelId, includeDerived]);

  useEffect(() => {
    fetchRatePlans();
  }, [fetchRatePlans]);

  // Separate base and derived
  const baseRatePlans = ratePlans.filter(rp => !rp.is_derived);
  const derivedRatePlans = ratePlans.filter(rp => rp.is_derived);

  return {
    ratePlans,
    baseRatePlans,
    derivedRatePlans,
    loading,
    error,
    refresh: fetchRatePlans,
  };
}

/**
 * Hook for pricing matrix
 */
export function usePricingMatrix() {
  const [hotelId] = useState(getHotelId());
  const [loading, setLoading] = useState(true);
  const [matrix, setMatrix] = useState({});
  const [error, setError] = useState(null);

  const fetchMatrix = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/shared/config/${hotelId}/pricing-matrix`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch pricing matrix');
      const data = await response.json();
      setMatrix(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  /**
   * Get price for a specific rate/room combination
   */
  const getPrice = (rateCode, roomTypeCode) => {
    return matrix[rateCode]?.[roomTypeCode] || null;
  };

  return {
    matrix,
    getPrice,
    loading,
    error,
    refresh: fetchMatrix,
  };
}

/**
 * Hook for inventory summary
 */
export function useInventory() {
  const [hotelId] = useState(getHotelId());
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState(null);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/shared/config/${hotelId}/inventory`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return {
    inventory,
    totalRooms: inventory?.total_rooms || 0,
    byType: inventory?.by_type || {},
    byFloor: inventory?.by_floor || {},
    loading,
    error,
    refresh: fetchInventory,
  };
}

/**
 * Hook for RMS-specific configuration data
 */
export function useRmsConfigData() {
  const [hotelId] = useState(getHotelId());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/shared/config/${hotelId}/rms-data`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch RMS config');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

/**
 * Hook for Data Hub-specific configuration data
 */
export function useDataHubConfigData() {
  const [hotelId] = useState(getHotelId());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/shared/config/${hotelId}/datahub-data`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch Data Hub config');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

/**
 * Trigger RMS sync from Configuration
 */
export async function syncRmsFromConfig(hotelId) {
  const response = await fetch(
    `${API_URL}/api/rms/hotels/${hotelId}/sync-from-config`,
    {
      method: 'POST',
      headers: getAuthHeaders()
    }
  );
  if (!response.ok) throw new Error('Sync failed');
  return response.json();
}

export default useConfigData;
