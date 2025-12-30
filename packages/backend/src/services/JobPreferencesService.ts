import { JobPreferencesRepository } from '../database/repositories/JobPreferencesRepository';
import {
  JobPreferences,
  CreateJobPreferencesRequest,
  UpdateJobPreferencesRequest
} from '../types';
import { AppError } from '../middleware/errorHandler';
import { validateKeywords, validateSalaryRange, validateDayRateRange } from '../validation/schemas';

export class JobPreferencesService {
  private jobPreferencesRepository: JobPreferencesRepository;

  constructor() {
    this.jobPreferencesRepository = new JobPreferencesRepository();
  }

  async createPreferences(userId: string, preferencesData: CreateJobPreferencesRequest): Promise<JobPreferences> {
    // Validate and clean keywords
    const cleanedKeywords = validateKeywords(preferencesData.keywords);

    // Validate salary and day rate ranges
    validateSalaryRange(preferencesData.salaryRange);
    validateDayRateRange(preferencesData.dayRateRange);

    // Check if user already has a profile with this name
    const existingProfiles = await this.jobPreferencesRepository.findByUserId(userId);
    const duplicateName = existingProfiles.find(
      profile => profile.profileName.toLowerCase() === preferencesData.profileName.toLowerCase()
    );

    if (duplicateName) {
      throw new AppError(
        'A profile with this name already exists',
        409,
        'DUPLICATE_PROFILE_NAME',
        'profileName'
      );
    }

    // Create the preferences with cleaned data
    const cleanedData = {
      ...preferencesData,
      keywords: cleanedKeywords
    };

    return await this.jobPreferencesRepository.create(userId, cleanedData);
  }

  async getUserPreferences(userId: string): Promise<JobPreferences[]> {
    return await this.jobPreferencesRepository.findByUserId(userId);
  }

  async getPreferencesById(id: string, userId: string): Promise<JobPreferences> {
    const preferences = await this.jobPreferencesRepository.findById(id, userId);

    if (!preferences) {
      throw new AppError('Job preferences not found', 404, 'PREFERENCES_NOT_FOUND');
    }

    return preferences;
  }

  async getActivePreferences(userId: string): Promise<JobPreferences[]> {
    return await this.jobPreferencesRepository.findActiveByUserId(userId);
  }

  async getAllActivePreferences(): Promise<JobPreferences[]> {
    // This method is used by N8N to get all active preferences for processing
    return await this.jobPreferencesRepository.findAllActive();
  }

  async updatePreferences(
    id: string,
    userId: string,
    updates: UpdateJobPreferencesRequest
  ): Promise<JobPreferences> {
    // Check if preferences exist
    const existingPreferences = await this.jobPreferencesRepository.findById(id, userId);
    if (!existingPreferences) {
      throw new AppError('Job preferences not found', 404, 'PREFERENCES_NOT_FOUND');
    }

    // Validate and clean keywords if provided
    if (updates.keywords !== undefined) {
      updates.keywords = validateKeywords(updates.keywords);
    }

    // Validate salary and day rate ranges if provided
    if (updates.salaryRange !== undefined) {
      validateSalaryRange(updates.salaryRange);
    }

    if (updates.dayRateRange !== undefined) {
      validateDayRateRange(updates.dayRateRange);
    }

    // Check for duplicate profile name if name is being updated
    if (updates.profileName && updates.profileName !== existingPreferences.profileName) {
      const existingProfiles = await this.jobPreferencesRepository.findByUserId(userId);
      const duplicateName = existingProfiles.find(
        profile => profile.id !== id &&
          profile.profileName.toLowerCase() === updates.profileName!.toLowerCase()
      );

      if (duplicateName) {
        throw new AppError(
          'A profile with this name already exists',
          409,
          'DUPLICATE_PROFILE_NAME',
          'profileName'
        );
      }
    }

    return await this.jobPreferencesRepository.update(id, userId, updates);
  }

  async togglePreferencesActive(id: string, userId: string): Promise<JobPreferences> {
    const preferences = await this.jobPreferencesRepository.findById(id, userId);
    if (!preferences) {
      throw new AppError('Job preferences not found', 404, 'PREFERENCES_NOT_FOUND');
    }

    return await this.jobPreferencesRepository.toggleActive(id, userId);
  }

  async deletePreferences(id: string, userId: string): Promise<void> {
    const preferences = await this.jobPreferencesRepository.findById(id, userId);
    if (!preferences) {
      throw new AppError('Job preferences not found', 404, 'PREFERENCES_NOT_FOUND');
    }

    await this.jobPreferencesRepository.delete(id, userId);
  }

  async getUserPreferencesStats(userId: string): Promise<{
    totalProfiles: number;
    activeProfiles: number;
  }> {
    const [totalProfiles, activeProfiles] = await Promise.all([
      this.jobPreferencesRepository.countByUserId(userId),
      this.jobPreferencesRepository.countActiveByUserId(userId)
    ]);

    return {
      totalProfiles,
      activeProfiles
    };
  }

  async validatePreferencesData(data: CreateJobPreferencesRequest | UpdateJobPreferencesRequest): Promise<void> {
    // Additional business logic validation beyond Joi schema validation

    if ('contractTypes' in data && data.contractTypes) {
      if (data.contractTypes.length === 0) {
        throw new AppError('At least one contract type must be selected', 400, 'INVALID_CONTRACT_TYPES');
      }
    }

    if ('experienceLevel' in data && data.experienceLevel) {
      if (data.experienceLevel.length === 0) {
        throw new AppError('At least one experience level must be selected', 400, 'INVALID_EXPERIENCE_LEVELS');
      }
    }

    if ('companySize' in data && data.companySize) {
      if (data.companySize.length === 0) {
        throw new AppError('At least one company size must be selected', 400, 'INVALID_COMPANY_SIZES');
      }
    }

    // Validate location - at least one location criteria should be provided
    if ('location' in data && data.location) {
      const { city, state, country, remote } = data.location;
      if (!city && !state && !country && !remote) {
        throw new AppError(
          'At least one location criteria must be provided (city, state, country, or remote)',
          400,
          'INVALID_LOCATION'
        );
      }
    }
  }

  async duplicatePreferences(id: string, userId: string, newProfileName: string): Promise<JobPreferences> {
    const originalPreferences = await this.getPreferencesById(id, userId);

    // Check if new profile name already exists
    const existingProfiles = await this.jobPreferencesRepository.findByUserId(userId);
    const duplicateName = existingProfiles.find(
      profile => profile.profileName.toLowerCase() === newProfileName.toLowerCase()
    );

    if (duplicateName) {
      throw new AppError(
        'A profile with this name already exists',
        409,
        'DUPLICATE_PROFILE_NAME',
        'profileName'
      );
    }

    // Create new preferences based on original
    const newPreferencesData: CreateJobPreferencesRequest = {
      profileName: newProfileName,
      jobTitle: originalPreferences.jobTitle,
      keywords: [...originalPreferences.keywords],
      location: { ...originalPreferences.location },
      contractTypes: [...originalPreferences.contractTypes],
      salaryRange: { ...originalPreferences.salaryRange },
      dayRateRange: { ...originalPreferences.dayRateRange },
      experienceLevel: [...originalPreferences.experienceLevel],
      companySize: [...originalPreferences.companySize]
    };

    return await this.jobPreferencesRepository.create(userId, newPreferencesData);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to query the database
      await this.jobPreferencesRepository.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }
}