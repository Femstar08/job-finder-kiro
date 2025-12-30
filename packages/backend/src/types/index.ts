// Core data types for the Job Finder system
import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
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
  foundAt: Date;
  applicationStatus: ApplicationStatus;
  alertSent: boolean;
  jobHash: string;
}

export interface NotificationSettings {
  userId: string;
  email: {
    enabled: boolean;
    address: string | null;
    consolidateDaily: boolean;
  };
  sms: {
    enabled: boolean;
    phoneNumber: string | null;
  };
  quietHours: {
    enabled: boolean;
    startTime: string | null; // HH:MM format
    endTime: string | null;   // HH:MM format
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface JobWebsite {
  id: string;
  name: string;
  baseUrl: string;
  searchUrlTemplate: string;
  scrapingConfig: {
    jobSelector: string;
    titleSelector: string;
    companySelector: string;
    locationSelector: string;
    salarySelector?: string;
    descriptionSelector?: string;
  };
  isActive: boolean;
  rateLimitMs: number;
  createdAt: Date;
}

export interface WorkflowExecution {
  id: string;
  executionId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  jobsFound: number;
  jobsMatched: number;
  alertsSent: number;
  errorMessage?: string;
  executionDetails?: Record<string, any>;
}

// Enums
export type ContractType = 'permanent' | 'contract' | 'freelance' | 'internship';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive';
export type CompanySize = 'startup' | 'small' | 'medium' | 'large';
export type ApplicationStatus = 'not_applied' | 'applied' | 'interviewed' | 'rejected' | 'offered';
export type ExecutionStatus = 'running' | 'success' | 'failed' | 'retry';

// API Request/Response types
export interface AuthenticatedRequest extends Request {
  user?: Omit<User, 'passwordHash'>;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

export interface CreateJobPreferencesRequest {
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
}

export interface UpdateJobPreferencesRequest extends Partial<CreateJobPreferencesRequest> { }

export interface UpdateApplicationStatusRequest {
  applicationStatus: ApplicationStatus;
}

export interface UpdateNotificationSettingsRequest {
  emailEnabled?: boolean;
  emailAddress?: string;
  emailConsolidateDaily?: boolean;
  smsEnabled?: boolean;
  smsPhoneNumber?: string;
  pushEnabled?: boolean;
  pushDeviceTokens?: string[];
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
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
  lastExecutionAt?: Date;
}

// N8N Integration types
export interface N8NJobFound {
  title: string;
  company?: string;
  location?: string;
  salary?: string;
  contractType?: string;
  url: string;
  sourceWebsite: string;
  description?: string;
  requirements?: string;
  postedAt?: Date;
}

export interface N8NJobMatch {
  preferenceId: string;
  job: N8NJobFound;
  matchScore?: number;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  statusCode: number;
}