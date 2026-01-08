// API Configuration for Production Deployment
// Frontend: https://frontend-8x7e.onrender.com
// Backend: https://backend-35m2.onrender.com

export const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  'https://backend-35m2.onrender.com';

console.log('🔧 API Configuration:', {
  apiUrl: API_BASE_URL,
  envVariable: import.meta.env.VITE_API_URL,
  mode: import.meta.env.MODE
});

// API Endpoints
export const API_ENDPOINTS = {
  health: '/',
  test: '/api/test',
  employees: '/api/employees',
  stats: '/api/stats',
  employeeDetails: (deviceId: string) => `/api/employee/${deviceId}`,
  
  // Activity endpoints
  activity: '/api/activity',
  
  // ENHANCED - Paginated activity log
  activityLog: '/api/activity-log',
  deviceActivityLog: (deviceId: string) => `/api/activity-log/${deviceId}`,
  
  // NEW - Website visits tracking
  websiteVisits: (deviceId: string) => `/api/website-visits/${deviceId}`,
  
  heartbeat: '/api/device/heartbeat',
  screenshots: (deviceId: string) => `/api/screenshots/${deviceId}`,
  
  // Analytics endpoints
  analytics: {
    appUsage: (deviceId: string) => `/api/analytics/app-usage/${deviceId}`,
    historical: (deviceId: string) => `/api/analytics/historical/${deviceId}`,
    productivityTrends: (deviceId: string) => `/api/analytics/productivity-trends/${deviceId}`,
    dailySummary: (deviceId: string) => `/api/analytics/daily-summary/${deviceId}`,
    exportData: (deviceId: string) => `/api/analytics/export-data/${deviceId}`
  }
};

// Enhanced fetch with better error handling and retries
export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
      console.log(`🌐 [Attempt ${attempt}/${maxRetries}] Fetching:`, url);
      console.log(`📋 Method: ${options.method || 'GET'}`);
      if (options.body) {
        console.log(`📦 Body:`, options.body);
      }
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(options.headers || {})
        },
        mode: 'cors',
        credentials: 'omit',
        body: options.body ? options.body : undefined
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        
        // Try to parse error as JSON
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || response.statusText };
        }
        
        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          const errorMessage = errorData.error || errorData.message || response.statusText;
          throw new Error(`HTTP ${response.status}: ${errorMessage}`);
        }
        
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Response:', data);
      return data;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Fetch Error (Attempt ${attempt}/${maxRetries}):`, error);
      
      // Check for specific error types
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          console.error('⚠️ Network error. Possible causes:', {
            'Backend sleeping': 'Render free tier - first request wakes it up (30-60s)',
            'CORS issue': 'Check backend CORS configuration',
            'Backend down': 'Check https://backend-35m2.onrender.com',
          });
        }
      }
      
      // Don't retry on 4xx errors
      if (error instanceof Error && error.message.includes('HTTP 4')) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  console.error('❌ All retry attempts failed');
  
  if (lastError instanceof TypeError && lastError.message.includes('fetch')) {
    throw new Error(
      `Cannot connect to backend at ${API_BASE_URL}. ` +
      `The backend might be sleeping (Render free tier). ` +
      `Please wait 30-60 seconds and refresh.`
    );
  }
  
  throw lastError || new Error('Unknown error occurred');
}

// Fetch Screenshots for a Device
export async function getScreenshots(deviceId: string) {
  return await fetchAPI(API_ENDPOINTS.screenshots(deviceId));
}

// Fetch Activity Log with Pagination
export async function getActivityLog(deviceId?: string, offset: number = 0, limit: number = 10) {
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString()
  });
  
  if (deviceId) {
    params.append('device_id', deviceId);
  }
  
  return await fetchAPI(`${API_ENDPOINTS.activityLog}?${params.toString()}`);
}

// Fetch Website Visits
export async function getWebsiteVisits(deviceId: string, period: 'today' | 'yesterday' | 'week' | 'month' = 'today') {
  return await fetchAPI(`${API_ENDPOINTS.websiteVisits(deviceId)}?period=${period}`);
}

// Test connection to backend
export async function testConnection() {
  try {
    const data = await fetchAPI(API_ENDPOINTS.health);
    return data.status === 'online';
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return false;
  }
}
