// Clear authentication data
export const clearAuth = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('tokenExpiresAt');
};

// Handle authentication errors in API responses
export const handleAuthError = (status: number): void => {
  if (status === 401 || status === 403) {
    clearAuth(); // Clear auth data if unauthorized or forbidden
    window.location.href = '/login';
  }
};

// Helper function to make authenticated API requests
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Check for auth errors
  if (response.status === 401 || response.status === 403) {
    handleAuthError(response.status);
  }
  
  return response;
};
