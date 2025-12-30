import axios, { AxiosResponse } from 'axios';
import {
  User,
  JobPreferences,
  JobMatch,
  JobStatistics,
  DashboardData,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiResponse,
  JobMatchesResponse,
  JobPreferencesFormData,
  ApplicationStatus,
} from '../types';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('job-finder-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('job-finder-token');
      // Only redirect if we're not already on the login or register page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (data: LoginRequest): Promise<AxiosResponse<ApiResponse<AuthResponse>>> =>
    api.post('/auth/login', data),

  register: (data: RegisterRequest): Promise<AxiosResponse<ApiResponse<AuthResponse>>> =>
    api.post('/auth/register', data),

  getProfile: (token?: string): Promise<AxiosResponse<ApiResponse<User>>> => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    return api.get('/auth/profile', config);
  },

  updateProfile: (data: Partial<User>, token?: string): Promise<AxiosResponse<ApiResponse<User>>> => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    return api.put('/auth/profile', data, config);
  },

  changePassword: (currentPassword: string, newPassword: string): Promise<AxiosResponse<ApiResponse<void>>> =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  logout: (): Promise<AxiosResponse<ApiResponse<void>>> =>
    api.post('/auth/logout'),
};

// Job Preferences API
export const preferencesApi = {
  getAll: (): Promise<AxiosResponse<ApiResponse<JobPreferences[]>>> =>
    api.get('/preferences'),

  getActive: (): Promise<AxiosResponse<ApiResponse<JobPreferences[]>>> =>
    api.get('/preferences/active'),

  getById: (id: string): Promise<AxiosResponse<ApiResponse<JobPreferences>>> =>
    api.get(`/preferences/${id}`),

  create: (data: JobPreferencesFormData): Promise<AxiosResponse<ApiResponse<JobPreferences>>> => {
    // Transform form data to API format
    const apiData = {
      ...data,
      keywords: data.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0),
      salaryRange: {
        min: data.salaryRange.min ? parseFloat(data.salaryRange.min) : undefined,
        max: data.salaryRange.max ? parseFloat(data.salaryRange.max) : undefined,
        currency: data.salaryRange.currency,
      },
      dayRateRange: {
        min: data.dayRateRange.min ? parseFloat(data.dayRateRange.min) : undefined,
        max: data.dayRateRange.max ? parseFloat(data.dayRateRange.max) : undefined,
        currency: data.dayRateRange.currency,
      },
    };
    return api.post('/preferences', apiData);
  },

  update: (id: string, data: Partial<JobPreferencesFormData>): Promise<AxiosResponse<ApiResponse<JobPreferences>>> => {
    // Transform form data to API format
    const apiData: any = { ...data };

    if (data.keywords) {
      apiData.keywords = data.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }

    if (data.salaryRange) {
      apiData.salaryRange = {
        min: data.salaryRange.min ? parseFloat(data.salaryRange.min) : undefined,
        max: data.salaryRange.max ? parseFloat(data.salaryRange.max) : undefined,
        currency: data.salaryRange.currency,
      };
    }

    if (data.dayRateRange) {
      apiData.dayRateRange = {
        min: data.dayRateRange.min ? parseFloat(data.dayRateRange.min) : undefined,
        max: data.dayRateRange.max ? parseFloat(data.dayRateRange.max) : undefined,
        currency: data.dayRateRange.currency,
      };
    }

    return api.put(`/preferences/${id}`, apiData);
  },

  toggle: (id: string): Promise<AxiosResponse<ApiResponse<JobPreferences>>> =>
    api.post(`/preferences/${id}/toggle`),

  duplicate: (id: string, profileName: string): Promise<AxiosResponse<ApiResponse<JobPreferences>>> =>
    api.post(`/preferences/${id}/duplicate`, { profileName }),

  delete: (id: string): Promise<AxiosResponse<ApiResponse<void>>> =>
    api.delete(`/preferences/${id}`),

  getStats: (): Promise<AxiosResponse<ApiResponse<{ totalProfiles: number; activeProfiles: number }>>> =>
    api.get('/preferences/stats'),
};

// Job Matches API
export const jobsApi = {
  getMatches: (queryString?: string): Promise<AxiosResponse<ApiResponse<JobMatchesResponse>>> => {
    const url = queryString ? `/jobs/matches?${queryString}` : '/jobs/matches';
    return api.get(url);
  },

  getMatchById: (id: string): Promise<AxiosResponse<ApiResponse<JobMatch>>> =>
    api.get(`/jobs/matches/${id}`),

  updateApplicationStatus: (id: string, status: ApplicationStatus): Promise<AxiosResponse<ApiResponse<JobMatch>>> =>
    api.put(`/jobs/matches/${id}/status`, { applicationStatus: status }),

  getStatistics: (): Promise<AxiosResponse<ApiResponse<JobStatistics>>> =>
    api.get('/jobs/statistics'),

  getRecentMatches: (limit?: number): Promise<AxiosResponse<ApiResponse<JobMatch[]>>> =>
    api.get('/jobs/matches/recent', { params: { limit } }),

  getMatchesBySource: (): Promise<AxiosResponse<ApiResponse<Record<string, number>>>> =>
    api.get('/jobs/matches/by-source'),

  getDashboard: (): Promise<AxiosResponse<ApiResponse<DashboardData>>> =>
    api.get('/jobs/dashboard'),
};

// Utility function to handle API errors
export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export default api;