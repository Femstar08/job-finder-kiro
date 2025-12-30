import { JobMatchRepository } from '../database/repositories/JobMatchRepository';
import { JobPreferencesRepository } from '../database/repositories/JobPreferencesRepository';
import { DuplicateDetectionService } from './DuplicateDetectionService';
import {
  JobMatch,
  ApplicationStatus,
  N8NJobFound,
  N8NJobMatch,
  JobMatchesResponse,
  JobStatistics
} from '../types';
import { AppError } from '../middleware/errorHandler';

export class JobMatchService {
  private jobMatchRepository: JobMatchRepository;
  private jobPreferencesRepository: JobPreferencesRepository;
  private duplicateDetectionService: DuplicateDetectionService;

  constructor() {
    this.jobMatchRepository = new JobMatchRepository();
    this.jobPreferencesRepository = new JobPreferencesRepository();
    this.duplicateDetectionService = new DuplicateDetectionService();
  }

  async createJobMatch(preferenceId: string, jobData: N8NJobFound): Promise<JobMatch> {
    // Verify preference exists
    const preference = await this.jobPreferencesRepository.findById(preferenceId, ''); // No user check for N8N
    if (!preference) {
      throw new AppError('Job preference not found', 404, 'PREFERENCE_NOT_FOUND');
    }

    // Enhanced duplicate detection
    const duplicateResult = await this.duplicateDetectionService.detectDuplicates(jobData, {
      checkExactDuplicates: true,
      checkSimilarJobs: true,
      similarityThreshold: 0.85,
      checkAcrossWebsites: false
    });

    if (duplicateResult.isDuplicate) {
      throw new AppError(
        `Job match already exists (confidence: ${Math.round(duplicateResult.confidence * 100)}%)`,
        409,
        'DUPLICATE_JOB_MATCH'
      );
    }

    return await this.jobMatchRepository.create(preferenceId, jobData);
  }

  async getUserJobMatches(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: ApplicationStatus;
      sourceWebsite?: string;
      search?: string;
    }
  ): Promise<JobMatchesResponse> {
    const { matches, total } = await this.jobMatchRepository.findByUserId(
      userId,
      page,
      limit,
      filters
    );

    return {
      matches,
      total,
      page,
      limit
    };
  }

  async getJobMatchById(id: string, userId: string): Promise<JobMatch> {
    const jobMatch = await this.jobMatchRepository.findById(id);

    if (!jobMatch) {
      throw new AppError('Job match not found', 404, 'JOB_MATCH_NOT_FOUND');
    }

    // Verify user owns this job match through preferences
    const preference = await this.jobPreferencesRepository.findById(jobMatch.preferenceId, userId);
    if (!preference) {
      throw new AppError('Job match not found', 404, 'JOB_MATCH_NOT_FOUND');
    }

    return jobMatch;
  }

  async updateApplicationStatus(id: string, userId: string, status: ApplicationStatus): Promise<JobMatch> {
    // First verify user owns this job match
    await this.getJobMatchById(id, userId);

    return await this.jobMatchRepository.updateApplicationStatus(id, status);
  }

  async getJobStatistics(userId: string): Promise<JobStatistics> {
    const [matchStats, preferencesStats, recentMatches, sourceStats] = await Promise.all([
      this.jobMatchRepository.getJobStatistics(userId),
      this.jobPreferencesRepository.countActiveByUserId(userId),
      this.jobMatchRepository.getRecentMatches(userId, 1),
      this.jobMatchRepository.getMatchesBySourceWebsite(userId)
    ]);

    return {
      totalMatches: matchStats.totalMatches,
      appliedJobs: matchStats.appliedJobs,
      interviewedJobs: matchStats.interviewedJobs,
      rejectedJobs: matchStats.rejectedJobs,
      offeredJobs: matchStats.offeredJobs,
      activeProfiles: preferencesStats,
      lastExecutionAt: recentMatches.length > 0 ? recentMatches[0].foundAt : undefined
    };
  }

  async getRecentJobMatches(userId: string, limit: number = 10): Promise<JobMatch[]> {
    return await this.jobMatchRepository.getRecentMatches(userId, limit);
  }

  async getJobMatchesBySourceWebsite(userId: string): Promise<Record<string, number>> {
    return await this.jobMatchRepository.getMatchesBySourceWebsite(userId);
  }

  async markJobMatchAlertSent(id: string): Promise<void> {
    await this.jobMatchRepository.markAlertSent(id);
  }

  async cleanupOldJobMatches(daysOld: number = 90): Promise<number> {
    return await this.jobMatchRepository.deleteOldMatches(daysOld);
  }

  // Enhanced batch job processing with duplicate detection
  async processBatchJobs(jobs: N8NJobFound[], preferences: any[]): Promise<{
    processed: number;
    duplicates: number;
    matches: N8NJobMatch[];
    errors: string[];
  }> {
    const result = {
      processed: 0,
      duplicates: 0,
      matches: [] as N8NJobMatch[],
      errors: [] as string[]
    };

    // Detect duplicates in batch
    const duplicateResults = await this.duplicateDetectionService.detectBatchDuplicates(jobs, {
      checkExactDuplicates: true,
      checkSimilarJobs: true,
      similarityThreshold: 0.85,
      checkAcrossWebsites: false
    });

    // Process each job
    for (const job of jobs) {
      try {
        const duplicateResult = duplicateResults.get(job.url);

        if (duplicateResult?.isDuplicate) {
          result.duplicates++;
          continue;
        }

        // Check if job matches any preferences
        const matchingPreferenceIds = await this.matchJobAgainstPreferences(job, preferences);

        if (matchingPreferenceIds.length > 0) {
          // Create job matches for each matching preference
          for (const preferenceId of matchingPreferenceIds) {
            try {
              await this.jobMatchRepository.create(preferenceId, job);
              result.matches.push({
                preferenceId,
                job,
                matchScore: this.calculateMatchScore(job, preferences.find(p => p.id === preferenceId))
              });
            } catch (error) {
              if (error instanceof AppError && error.code === 'DUPLICATE_JOB_MATCH') {
                result.duplicates++;
              } else {
                result.errors.push(`Failed to create match for preference ${preferenceId}: ${error}`);
              }
            }
          }
        }

        result.processed++;
      } catch (error) {
        result.errors.push(`Failed to process job ${job.url}: ${error}`);
      }
    }

    return result;
  }

  // Consolidate duplicates for a user
  async consolidateDuplicatesForUser(userId: string): Promise<number> {
    const preferences = await this.jobPreferencesRepository.findByUserId(userId);
    let totalConsolidated = 0;

    for (const preference of preferences) {
      const consolidated = await this.duplicateDetectionService.consolidateDuplicatesForPreference(preference.id);
      totalConsolidated += consolidated;
    }

    return totalConsolidated;
  }

  // Get duplicate statistics for a user
  async getDuplicateStatistics(userId: string): Promise<{
    totalDuplicates: number;
    duplicatesByWebsite: Record<string, number>;
    recentDuplicates: JobMatch[];
  }> {
    const preferences = await this.jobPreferencesRepository.findByUserId(userId);
    let totalDuplicates = 0;
    const duplicatesByWebsite: Record<string, number> = {};
    const recentDuplicates: JobMatch[] = [];

    for (const preference of preferences) {
      const duplicates = await this.jobMatchRepository.getDuplicateJobsByPreference(preference.id);
      totalDuplicates += duplicates.length;

      // Count by website
      duplicates.forEach(job => {
        duplicatesByWebsite[job.sourceWebsite] = (duplicatesByWebsite[job.sourceWebsite] || 0) + 1;
      });

      // Collect recent duplicates (last 10)
      const recent = duplicates
        .sort((a, b) => b.foundAt.getTime() - a.foundAt.getTime())
        .slice(0, 10);
      recentDuplicates.push(...recent);
    }

    return {
      totalDuplicates,
      duplicatesByWebsite,
      recentDuplicates: recentDuplicates
        .sort((a, b) => b.foundAt.getTime() - a.foundAt.getTime())
        .slice(0, 10)
    };
  }

  // Job matching algorithm (used by N8N workflow)
  async matchJobAgainstPreferences(jobData: N8NJobFound, preferences: any[]): Promise<string[]> {
    const matchingPreferenceIds: string[] = [];

    for (const preference of preferences) {
      if (this.isJobMatchingPreference(jobData, preference)) {
        matchingPreferenceIds.push(preference.id);
      }
    }

    return matchingPreferenceIds;
  }

  // Enhanced matching with scoring
  async matchJobAgainstPreferencesWithScore(jobData: N8NJobFound, preferences: any[]): Promise<N8NJobMatch[]> {
    const matches: N8NJobMatch[] = [];

    for (const preference of preferences) {
      if (this.isJobMatchingPreference(jobData, preference)) {
        const matchScore = this.calculateMatchScore(jobData, preference);
        matches.push({
          preferenceId: preference.id,
          job: jobData,
          matchScore
        });
      }
    }

    // Sort by match score (highest first)
    return matches.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }

  private isJobMatchingPreference(jobData: N8NJobFound, preference: any): boolean {
    // Job title matching
    if (preference.jobTitle && !this.matchesJobTitle(jobData.title, preference.jobTitle)) {
      return false;
    }

    // Keywords matching
    if (preference.keywords && preference.keywords.length > 0) {
      if (!this.matchesKeywords(jobData.title + ' ' + (jobData.description || ''), preference.keywords)) {
        return false;
      }
    }

    // Location matching
    if (!this.matchesLocation(jobData.location, preference.location)) {
      return false;
    }

    // Contract type matching
    if (preference.contractTypes && preference.contractTypes.length > 0) {
      if (!this.matchesContractType(jobData.contractType, preference.contractTypes)) {
        return false;
      }
    }

    // Salary matching (if both job and preference have salary info)
    if (jobData.salary && preference.salaryRange) {
      if (!this.matchesSalaryRange(jobData.salary, preference.salaryRange)) {
        return false;
      }
    }

    // Day rate matching for contract positions
    if (jobData.salary && preference.dayRateRange &&
      preference.contractTypes.some((type: string) => ['contract', 'freelance'].includes(type))) {
      if (!this.matchesDayRateRange(jobData.salary, preference.dayRateRange)) {
        return false;
      }
    }

    return true;
  }

  private matchesJobTitle(jobTitle: string, preferenceTitle: string): boolean {
    const jobTitleLower = jobTitle.toLowerCase();
    const preferenceTitleLower = preferenceTitle.toLowerCase();

    // Exact match first
    if (jobTitleLower.includes(preferenceTitleLower)) {
      return true;
    }

    // Fuzzy matching - check if preference title words are in job title
    const preferenceWords = preferenceTitleLower.split(/\s+/).filter(word => word.length > 2);
    const matchedWords = preferenceWords.filter(word => jobTitleLower.includes(word));

    // Require at least 60% of significant words to match
    return matchedWords.length >= Math.ceil(preferenceWords.length * 0.6);
  }

  private matchesKeywords(jobText: string, keywords: string[]): boolean {
    const jobTextLower = jobText.toLowerCase();

    // At least one keyword must match (with fuzzy matching for longer keywords)
    return keywords.some(keyword => {
      const keywordLower = keyword.toLowerCase().trim();

      // Exact match first
      if (jobTextLower.includes(keywordLower)) {
        return true;
      }

      // For longer keywords, try partial matching
      if (keywordLower.length > 4) {
        const keywordWords = keywordLower.split(/\s+/);
        return keywordWords.every(word => jobTextLower.includes(word));
      }

      return false;
    });
  }

  private matchesLocation(jobLocation: string | undefined, preferenceLocation: any): boolean {
    // If remote is acceptable, always match
    if (preferenceLocation.remote) {
      return true;
    }

    if (!jobLocation) {
      return false;
    }

    const jobLocationLower = jobLocation.toLowerCase();

    // Check for remote indicators in job location
    const remoteIndicators = ['remote', 'work from home', 'wfh', 'anywhere', 'distributed'];
    if (preferenceLocation.remote && remoteIndicators.some(indicator => jobLocationLower.includes(indicator))) {
      return true;
    }

    // Geographic flexibility - check city, state, country matching with variations
    const locationChecks = [
      preferenceLocation.city,
      preferenceLocation.state,
      preferenceLocation.country
    ].filter(Boolean);

    if (locationChecks.length === 0) {
      return true; // No location preference specified
    }

    return locationChecks.some(location => {
      const locationLower = location.toLowerCase();

      // Exact match
      if (jobLocationLower.includes(locationLower)) {
        return true;
      }

      // Handle common abbreviations and variations
      if (this.matchesLocationVariations(jobLocationLower, locationLower)) {
        return true;
      }

      return false;
    });
  }

  private matchesLocationVariations(jobLocation: string, preferenceLocation: string): boolean {
    // Common location abbreviations and variations
    const locationMappings: Record<string, string[]> = {
      'new york': ['ny', 'nyc', 'new york city'],
      'california': ['ca', 'calif'],
      'united kingdom': ['uk', 'britain', 'great britain'],
      'united states': ['usa', 'us', 'america'],
      'san francisco': ['sf', 'san fran'],
      'los angeles': ['la', 'los ang'],
    };

    // Check if preference location has known variations
    const variations = locationMappings[preferenceLocation] || [];
    return variations.some(variation => jobLocation.includes(variation));
  }

  private matchesContractType(jobContractType: string | undefined, preferenceContractTypes: string[]): boolean {
    if (!jobContractType) {
      return true; // If job doesn't specify, assume it matches
    }

    const jobTypeLower = jobContractType.toLowerCase();

    return preferenceContractTypes.some(prefType => {
      const prefTypeLower = prefType.toLowerCase();

      // Handle common variations
      if (prefTypeLower === 'permanent' && (jobTypeLower.includes('full') || jobTypeLower.includes('permanent'))) {
        return true;
      }

      if (prefTypeLower === 'contract' && (jobTypeLower.includes('contract') || jobTypeLower.includes('temp'))) {
        return true;
      }

      if (prefTypeLower === 'freelance' && (jobTypeLower.includes('freelance') || jobTypeLower.includes('consultant'))) {
        return true;
      }

      if (prefTypeLower === 'internship' && jobTypeLower.includes('intern')) {
        return true;
      }

      return jobTypeLower.includes(prefTypeLower);
    });
  }

  private matchesSalaryRange(jobSalary: string, salaryRange: any): boolean {
    // Extract numeric values from job salary string
    const salaryNumbers = jobSalary.match(/[\d,]+/g);
    if (!salaryNumbers) {
      return true; // If we can't parse salary, assume it matches
    }

    // Handle salary ranges in job postings (e.g., "50,000 - 70,000")
    const cleanNumbers = salaryNumbers.map(num => parseInt(num.replace(/,/g, '')));

    let jobMinSalary: number;
    let jobMaxSalary: number;

    if (cleanNumbers.length >= 2) {
      // Job has a salary range
      jobMinSalary = Math.min(...cleanNumbers);
      jobMaxSalary = Math.max(...cleanNumbers);
    } else {
      // Single salary value
      jobMinSalary = jobMaxSalary = cleanNumbers[0];
    }

    // Handle different salary formats (annual vs hourly vs daily)
    const salaryText = jobSalary.toLowerCase();
    let multiplier = 1;

    if (salaryText.includes('hour') || salaryText.includes('/hr')) {
      multiplier = 2080; // ~40 hours/week * 52 weeks
    } else if (salaryText.includes('day') || salaryText.includes('/day')) {
      multiplier = 260; // ~5 days/week * 52 weeks
    }

    const annualizedMinSalary = jobMinSalary * multiplier;
    const annualizedMaxSalary = jobMaxSalary * multiplier;

    // Check if there's any overlap between job salary range and preference range
    if (salaryRange.min && annualizedMaxSalary < salaryRange.min) {
      return false;
    }

    if (salaryRange.max && annualizedMinSalary > salaryRange.max) {
      return false;
    }

    return true;
  }

  private matchesDayRateRange(jobSalary: string, dayRateRange: any): boolean {
    const salaryText = jobSalary.toLowerCase();

    // Only process if it looks like a day rate
    if (!salaryText.includes('day') && !salaryText.includes('/day') && !salaryText.includes('daily')) {
      return true; // Not a day rate, skip validation
    }

    const salaryNumbers = jobSalary.match(/[\d,]+/g);
    if (!salaryNumbers) {
      return true; // Can't parse, assume it matches
    }

    const dayRate = parseInt(salaryNumbers[0].replace(/,/g, ''));

    if (dayRateRange.min && dayRate < dayRateRange.min) {
      return false;
    }

    if (dayRateRange.max && dayRate > dayRateRange.max) {
      return false;
    }

    return true;
  }

  private calculateMatchScore(jobData: N8NJobFound, preference: any): number {
    let score = 0;
    let maxScore = 0;

    // Job title matching (weight: 30%)
    maxScore += 30;
    if (preference.jobTitle) {
      const jobTitleLower = jobData.title.toLowerCase();
      const preferenceTitleLower = preference.jobTitle.toLowerCase();

      if (jobTitleLower.includes(preferenceTitleLower)) {
        score += 30; // Exact match
      } else {
        const preferenceWords = preferenceTitleLower.split(/\s+/).filter((word: string) => word.length > 2);
        const matchedWords = preferenceWords.filter((word: string) => jobTitleLower.includes(word));
        score += Math.round((matchedWords.length / preferenceWords.length) * 30);
      }
    } else {
      score += 15; // Partial score if no title preference
    }

    // Keywords matching (weight: 25%)
    maxScore += 25;
    if (preference.keywords && preference.keywords.length > 0) {
      const jobText = (jobData.title + ' ' + (jobData.description || '')).toLowerCase();
      const matchedKeywords = preference.keywords.filter((keyword: string) =>
        jobText.includes(keyword.toLowerCase())
      );
      score += Math.round((matchedKeywords.length / preference.keywords.length) * 25);
    } else {
      score += 12; // Partial score if no keywords
    }

    // Location matching (weight: 20%)
    maxScore += 20;
    if (this.matchesLocation(jobData.location, preference.location)) {
      if (preference.location.remote ||
        (jobData.location && jobData.location.toLowerCase().includes('remote'))) {
        score += 20; // Perfect for remote
      } else {
        score += 15; // Good location match
      }
    }

    // Contract type matching (weight: 15%)
    maxScore += 15;
    if (this.matchesContractType(jobData.contractType, preference.contractTypes)) {
      score += 15;
    }

    // Salary matching (weight: 10%)
    maxScore += 10;
    if (jobData.salary && (preference.salaryRange || preference.dayRateRange)) {
      if (preference.salaryRange && this.matchesSalaryRange(jobData.salary, preference.salaryRange)) {
        score += 10;
      } else if (preference.dayRateRange && this.matchesDayRateRange(jobData.salary, preference.dayRateRange)) {
        score += 10;
      } else {
        score += 5; // Partial score if salary info exists but doesn't match perfectly
      }
    } else {
      score += 5; // Partial score if no salary info
    }

    // Return percentage score
    return Math.round((score / maxScore) * 100);
  }

  // N8N integration methods
  async storeScrapedJobs(jobs: any[]): Promise<any[]> {
    // Store scraped jobs in a temporary table or process them immediately
    // For now, we'll process them immediately and return the stored jobs
    const storedJobs = [];

    for (const job of jobs) {
      try {
        // Store the job data (this could be in a separate jobs table)
        // For now, we'll just validate and return the job
        storedJobs.push({
          ...job,
          id: this.generateJobId(job),
          storedAt: new Date()
        });
      } catch (error) {
        console.error('Failed to store job:', error);
      }
    }

    return storedJobs;
  }

  async storeJobMatches(matches: N8NJobMatch[]): Promise<N8NJobMatch[]> {
    const storedMatches = [];

    for (const match of matches) {
      try {
        // Create the job match in the database
        const jobMatch = await this.jobMatchRepository.create(match.preferenceId, match.job);
        storedMatches.push({
          ...match,
          id: jobMatch.id,
          storedAt: new Date()
        });
      } catch (error) {
        console.error('Failed to store job match:', error);
        // Continue with other matches even if one fails
      }
    }

    return storedMatches;
  }

  async findMatches(job: N8NJobFound, preferences: any[]): Promise<N8NJobMatch[]> {
    return await this.matchJobAgainstPreferencesWithScore(job, preferences);
  }

  private generateJobId(job: any): string {
    // Generate a unique ID for the job based on URL and title
    const crypto = require('crypto');
    const data = `${job.url}-${job.title}-${job.company || ''}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }
}