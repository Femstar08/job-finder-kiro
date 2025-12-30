import Joi from 'joi';
import { ContractType, ExperienceLevel, CompanySize, ApplicationStatus } from '../types';

// User validation schemas
export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Job preferences validation schemas
export const locationSchema = Joi.object({
  city: Joi.string().max(100).allow('').optional(),
  state: Joi.string().max(100).allow('').optional(),
  country: Joi.string().max(100).allow('').optional(),
  remote: Joi.boolean().required(),
});

export const salaryRangeSchema = Joi.object({
  min: Joi.number().min(0).allow(null).optional(),
  max: Joi.number().min(0).allow(null).optional(),
  currency: Joi.string().length(3).required(), // ISO currency codes
}).custom((value, helpers) => {
  if (value.min && value.max && value.min > value.max) {
    return helpers.error('any.invalid', { message: 'Minimum salary cannot be greater than maximum salary' });
  }
  return value;
});

export const dayRateRangeSchema = Joi.object({
  min: Joi.number().min(0).allow(null).optional(),
  max: Joi.number().min(0).allow(null).optional(),
  currency: Joi.string().length(3).required(),
}).custom((value, helpers) => {
  if (value.min && value.max && value.min > value.max) {
    return helpers.error('any.invalid', { message: 'Minimum day rate cannot be greater than maximum day rate' });
  }
  return value;
});

export const createJobPreferencesSchema = Joi.object({
  profileName: Joi.string().min(1).max(100).required(),
  jobTitle: Joi.string().max(200).allow('').optional(),
  keywords: Joi.array().items(Joi.string().max(50)).min(0).max(20).required(),
  location: locationSchema.required(),
  contractTypes: Joi.array().items(
    Joi.string().valid('permanent', 'contract', 'freelance', 'internship')
  ).min(1).required(),
  salaryRange: salaryRangeSchema.required(),
  dayRateRange: dayRateRangeSchema.required(),
  experienceLevel: Joi.array().items(
    Joi.string().valid('entry', 'mid', 'senior', 'executive')
  ).min(1).required(),
  companySize: Joi.array().items(
    Joi.string().valid('startup', 'small', 'medium', 'large')
  ).min(1).required(),
});

export const updateJobPreferencesSchema = Joi.object({
  profileName: Joi.string().min(1).max(100).optional(),
  jobTitle: Joi.string().max(200).optional(),
  keywords: Joi.array().items(Joi.string().max(50)).min(0).max(20).optional(),
  location: locationSchema.optional(),
  contractTypes: Joi.array().items(
    Joi.string().valid('permanent', 'contract', 'freelance', 'internship')
  ).min(1).optional(),
  salaryRange: salaryRangeSchema.optional(),
  dayRateRange: dayRateRangeSchema.optional(),
  experienceLevel: Joi.array().items(
    Joi.string().valid('entry', 'mid', 'senior', 'executive')
  ).min(1).optional(),
  companySize: Joi.array().items(
    Joi.string().valid('startup', 'small', 'medium', 'large')
  ).min(1).optional(),
});

// Job match validation schemas
export const updateApplicationStatusSchema = Joi.object({
  applicationStatus: Joi.string().valid(
    'not_applied', 'applied', 'interviewed', 'rejected', 'offered'
  ).required(),
});

// Notification settings validation schemas
export const notificationSettingsSchema = Joi.object({
  emailEnabled: Joi.boolean().optional(),
  emailAddress: Joi.string().email().optional(),
  emailConsolidateDaily: Joi.boolean().optional(),
  smsEnabled: Joi.boolean().optional(),
  smsPhoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(), // E.164 format
  quietHoursEnabled: Joi.boolean().optional(),
  quietHoursStart: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM format
  quietHoursEnd: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
});

export const testNotificationSchema = Joi.object({
  type: Joi.string().valid('email', 'sms').required(),
  recipient: Joi.alternatives().try(
    Joi.string().email(), // For email
    Joi.string().pattern(/^\+?[1-9]\d{1,14}$/) // For SMS
  ).optional(),
});

// Legacy notification settings schema (for backward compatibility)
export const updateNotificationSettingsSchema = Joi.object({
  emailEnabled: Joi.boolean().optional(),
  emailAddress: Joi.string().email().optional(),
  emailConsolidateDaily: Joi.boolean().optional(),
  smsEnabled: Joi.boolean().optional(),
  smsPhoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(), // E.164 format
  quietHoursEnabled: Joi.boolean().optional(),
  quietHoursStart: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM format
  quietHoursEnd: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
});

// N8N integration validation schemas
export const n8nJobFoundSchema = Joi.object({
  jobs: Joi.array().items(Joi.object({
    title: Joi.string().required(),
    company: Joi.string().optional(),
    location: Joi.string().optional(),
    salary: Joi.string().optional(),
    contractType: Joi.string().optional(),
    url: Joi.string().uri().required(),
    description: Joi.string().optional(),
    requirements: Joi.string().optional(),
    postedAt: Joi.date().optional(),
  })).required(),
  websiteSource: Joi.string().required(),
  executionId: Joi.string().optional(),
});

export const n8nJobMatchesSchema = Joi.object({
  matches: Joi.array().items(Joi.object({
    preferenceId: Joi.string().uuid().required(),
    job: Joi.object({
      title: Joi.string().required(),
      company: Joi.string().optional(),
      location: Joi.string().optional(),
      salary: Joi.string().optional(),
      contractType: Joi.string().optional(),
      url: Joi.string().uri().required(),
      description: Joi.string().optional(),
      requirements: Joi.string().optional(),
      postedAt: Joi.date().optional(),
    }).required(),
    matchScore: Joi.number().min(0).max(1).optional(),
  })).required(),
  executionId: Joi.string().optional(),
});

export const n8nTestWebhookSchema = Joi.object({
  testType: Joi.string().valid('preferences', 'matching', 'duplicate').required(),
  data: Joi.object().optional(),
});

// Query parameter validation schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const jobMatchesQuerySchema = paginationSchema.keys({
  status: Joi.string().valid('not_applied', 'applied', 'interviewed', 'rejected', 'offered').optional(),
  sourceWebsite: Joi.string().optional(),
  search: Joi.string().max(100).optional(),
});

// Custom validation functions
export const validateKeywords = (keywords: string[]): string[] => {
  // Parse comma-separated keywords and clean them
  const parsed = keywords.flatMap(keyword =>
    keyword.split(',').map(k => k.trim()).filter(k => k.length > 0)
  );

  // Remove duplicates and limit to 20 keywords
  return [...new Set(parsed)].slice(0, 20);
};

export const validateSalaryRange = (range: { min?: number; max?: number; currency: string }) => {
  if (range.min && range.max && range.min > range.max) {
    throw new Error('Minimum salary cannot be greater than maximum salary');
  }
  return range;
};

export const validateDayRateRange = (range: { min?: number; max?: number; currency: string }) => {
  if (range.min && range.max && range.min > range.max) {
    throw new Error('Minimum day rate cannot be greater than maximum day rate');
  }
  return range;
};

// Duplicate detection validation schemas
export const duplicateDetectionSchema = Joi.object({
  jobData: n8nJobFoundSchema.required(),
  options: Joi.object({
    checkExactDuplicates: Joi.boolean().default(true),
    checkSimilarJobs: Joi.boolean().default(true),
    similarityThreshold: Joi.number().min(0).max(1).default(0.85),
    checkAcrossWebsites: Joi.boolean().default(false)
  }).optional()
});

export const batchDuplicateDetectionSchema = Joi.object({
  jobs: Joi.array().items(n8nJobFoundSchema).min(1).max(100).required(),
  options: Joi.object({
    checkExactDuplicates: Joi.boolean().default(true),
    checkSimilarJobs: Joi.boolean().default(true),
    similarityThreshold: Joi.number().min(0).max(1).default(0.85),
    checkAcrossWebsites: Joi.boolean().default(false)
  }).optional()
});