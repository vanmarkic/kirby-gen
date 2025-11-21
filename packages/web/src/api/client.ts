import axios from 'axios';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token from environment variable
    const token = import.meta.env.VITE_AUTH_TOKEN;
    if (token) {
      config.headers['X-Auth-Token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 400:
          console.error('Bad Request:', data.message);
          break;
        case 401:
          console.error('Unauthorized');
          // Redirect to login if needed
          break;
        case 403:
          console.error('Forbidden');
          break;
        case 404:
          console.error('Not Found:', data.message);
          break;
        case 500:
          console.error('Server Error:', data.message);
          break;
        default:
          console.error('Error:', data.message);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error: No response from server');
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
