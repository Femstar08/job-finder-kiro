// Frontend types for the Job Finder system

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobPreferences {
  id: string;
  userId: string;
  profileName: string;
  jobTitle?: string;
  keywords: string[];
  location: {
    city?: string;
    state?: string;
    country?: string;
    remote: boolean;
  };
  contractTypes: ContractType[];
  salaryRange: {
    min?: number;
    max?: number;
    currency: string;
  };
  dayRateRange: {
    min?: number;
    max?: number;
    currency: string;
  };
  experienceLevel: ExperienceLevel[];
  companySize: CompanySize[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobMatch {
  id: string;
  preferenceId: string;
  jobTitle: string;
  company?: string;
  location?: string;
  salary?: string;
  contractType?: string;
  jobUrl: string;
  sourceWebsite: string;
  jobDescription?: string;
  requirements?: string;
  foundAt: string;
  applicationStatus: ApplicationStatus;
  alertSent: boolean;
  profileName?: string; // Added when fetching with profile info
}

export interface NotificationSettings {
  userId: string;
  emailEnabled: boolean;
  emailAddress?: string;
  emailConsolidateDaily: boolean;
  smsEnabled: boolean;
  smsPhoneNumber?: string;
  pushEnabled: boolean;
  pushDeviceTokens: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  createdAt: string;
  updatedAt: string;
}

// Enums
export type ContractType = 'permanent' | 'contract' | 'freelance' | 'internship';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive';
export type CompanySize = 'startup' | 'small' | 'medium' | 'large';
export type ApplicationStatus = 'not_applied' | 'applied' | 'interviewed' | 'rejected' | 'offered';

// API Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface JobMatchesResponse {
  matches: JobMatch[];
  total: number;
  page: number;
  limit: number;
}

export interface JobStatistics {
  totalMatches: number;
  appliedJobs: number;
  interviewedJobs: number;
  rejectedJobs: number;
  offeredJobs: number;
  activeProfiles: number;
  lastExecutionAt?: string;
}

export interface DashboardData {
  statistics: JobStatistics;
  recentMatches: JobMatch[];
  sourceStats: Record<string, number>;
}

// Form types
export interface JobPreferencesFormData {
  profileName: string;
  jobTitle: string;
  keywords: string;
  location: {
    city: string;
    state: string;
    country: string;
    remote: boolean;
  };
  contractTypes: ContractType[];
  salaryRange: {
    min: string;
    max: string;
    currency: string;
  };
  dayRateRange: {
    min: string;
    max: string;
    currency: string;
  };
  experienceLevel: ExperienceLevel[];
  companySize: CompanySize[];
}

// UI State types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface FilterState {
  status?: ApplicationStatus;
  sourceWebsite?: string;
  search?: string;
  page: number;
  limit: number;
}

// Constants
export const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
];

export const EXPERIENCE_LEVEL_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'executive', label: 'Executive' },
];

export const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
  { value: 'startup', label: 'Startup (1-50)' },
  { value: 'small', label: 'Small (51-200)' },
  { value: 'medium', label: 'Medium (201-1000)' },
  { value: 'large', label: 'Large (1000+)' },
];

export const APPLICATION_STATUS_OPTIONS: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: 'not_applied', label: 'Not Applied', color: 'default' },
  { value: 'applied', label: 'Applied', color: 'primary' },
  { value: 'interviewed', label: 'Interviewed', color: 'info' },
  { value: 'rejected', label: 'Rejected', color: 'error' },
  { value: 'offered', label: 'Offered', color: 'success' },
];

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'AUD', label: 'AUD (A$)' },
];