import { JobMatchRepository } from '../database/repositories/JobMatchRepository';
import { N8NJobFound, JobMatch } from '../types';

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  existingJob?: JobMatch;
  similarJobs: JobMatch[];
  confidence: number; // 0-1 scale
}

export interface DuplicateDetectionOptions {
  checkExactDuplicates: boolean;
  checkSimilarJobs: boolean;
  similarityThreshold: number;
  checkAcrossWebsites: boolean;
}

export class DuplicateDetectionService {
  private jobMatchRepository: JobMatchRepository;

  constructor() {
    this.jobMatchRepository = new JobMatchRepository();
  }

  async detectDuplicates(
    jobData: N8NJobFound,
    options: DuplicateDetectionOptions = {
      checkExactDuplicates: true,
      checkSimilarJobs: true,
      similarityThreshold: 0.85,
      checkAcrossWebsites: false
    }
  ): Promise<DuplicateDetectionResult> {
    const result: DuplicateDetectionResult = {
      isDuplicate: false,
      similarJobs: [],
      confidence: 0
    };

    // 1. Check for exact URL duplicates (highest priority)
    if (options.checkExactDuplicates) {
      const exactDuplicate = await this.jobMatchRepository.checkDuplicateByUrl(jobData.url);
      if (exactDuplicate) {
        result.isDuplicate = true;
        result.existingJob = exactDuplicate;
        result.confidence = 1.0;
        return result;
      }
    }

    // 2. Check for hash-based duplicates
    const jobHash = this.jobMatchRepository['generateJobHash'](jobData);
    const hashDuplicate = await this.jobMatchRepository.checkDuplicate(jobHash);
    if (hashDuplicate) {
      result.isDuplicate = true;
      result.confidence = 0.95;
      return result;
    }

    // 3. Check for fuzzy duplicates using multiple hash variations
    const fuzzyHashes = this.jobMatchRepository['generateFuzzyHashes'](jobData);
    const existingHashes = await this.jobMatchRepository.checkBatchDuplicates(fuzzyHashes);
    if (existingHashes.length > 0) {
      result.isDuplicate = true;
      result.confidence = 0.9;
      return result;
    }

    // 4. Check for similar jobs (if enabled)
    if (options.checkSimilarJobs) {
      try {
        const similarJobs = await this.jobMatchRepository.findSimilarJobs(
          jobData,
          options.similarityThreshold
        );

        if (similarJobs.length > 0) {
          result.similarJobs = similarJobs;

          // Calculate confidence based on similarity
          const highSimilarityJobs = similarJobs.filter(job =>
            this.calculateJobSimilarity(jobData, job) > 0.9
          );

          if (highSimilarityJobs.length > 0) {
            result.isDuplicate = true;
            result.existingJob = highSimilarityJobs[0];
            result.confidence = 0.85;
          }
        }
      } catch (error) {
        // Similarity search might fail if pg_trgm extension is not available
        console.warn('Similarity search failed, skipping:', error);
      }
    }

    return result;
  }

  async detectBatchDuplicates(
    jobs: N8NJobFound[],
    options?: DuplicateDetectionOptions
  ): Promise<Map<string, DuplicateDetectionResult>> {
    const results = new Map<string, DuplicateDetectionResult>();

    // Process jobs in batches for efficiency
    const batchSize = 50;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);

      const batchPromises = batch.map(async (job) => {
        const result = await this.detectDuplicates(job, options);
        return { job, result };
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(({ job, result }) => {
        results.set(job.url, result);
      });
    }

    return results;
  }

  async consolidateDuplicatesForPreference(preferenceId: string): Promise<number> {
    const duplicates = await this.jobMatchRepository.getDuplicateJobsByPreference(preferenceId);

    if (duplicates.length === 0) {
      return 0;
    }

    // Group duplicates by hash
    const duplicateGroups = new Map<string, JobMatch[]>();
    duplicates.forEach(job => {
      const hash = job.jobHash;
      if (!duplicateGroups.has(hash)) {
        duplicateGroups.set(hash, []);
      }
      duplicateGroups.get(hash)!.push(job);
    });

    let consolidatedCount = 0;

    // Consolidate each group
    for (const [hash, jobs] of duplicateGroups) {
      if (jobs.length > 1) {
        // Keep the most recent job or the one with application status
        const jobToKeep = this.selectJobToKeep(jobs);
        const jobsToRemove = jobs.filter(job => job.id !== jobToKeep.id);

        await this.jobMatchRepository.consolidateDuplicateJobs(
          jobToKeep.id,
          jobsToRemove.map(job => job.id)
        );

        consolidatedCount += jobsToRemove.length;
      }
    }

    return consolidatedCount;
  }

  private selectJobToKeep(jobs: JobMatch[]): JobMatch {
    // Priority order:
    // 1. Job with application status other than 'not_applied'
    // 2. Job with alert sent
    // 3. Most recent job

    const appliedJobs = jobs.filter(job => job.applicationStatus !== 'not_applied');
    if (appliedJobs.length > 0) {
      return appliedJobs.sort((a, b) => b.foundAt.getTime() - a.foundAt.getTime())[0];
    }

    const alertedJobs = jobs.filter(job => job.alertSent);
    if (alertedJobs.length > 0) {
      return alertedJobs.sort((a, b) => b.foundAt.getTime() - a.foundAt.getTime())[0];
    }

    return jobs.sort((a, b) => b.foundAt.getTime() - a.foundAt.getTime())[0];
  }

  private calculateJobSimilarity(job1: N8NJobFound, job2: JobMatch): number {
    let similarity = 0;
    let factors = 0;

    // Title similarity (weight: 40%)
    const titleSim = this.stringSimilarity(job1.title, job2.jobTitle);
    similarity += titleSim * 0.4;
    factors += 0.4;

    // Company similarity (weight: 30%)
    if (job1.company && job2.company) {
      const companySim = this.stringSimilarity(job1.company, job2.company);
      similarity += companySim * 0.3;
      factors += 0.3;
    }

    // Location similarity (weight: 20%)
    if (job1.location && job2.location) {
      const locationSim = this.stringSimilarity(job1.location, job2.location);
      similarity += locationSim * 0.2;
      factors += 0.2;
    }

    // URL domain similarity (weight: 10%)
    const urlSim = this.urlSimilarity(job1.url, job2.jobUrl);
    similarity += urlSim * 0.1;
    factors += 0.1;

    return factors > 0 ? similarity / factors : 0;
  }

  private stringSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity for strings
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private urlSimilarity(url1: string, url2: string): number {
    try {
      const domain1 = new URL(url1).hostname;
      const domain2 = new URL(url2).hostname;
      return domain1 === domain2 ? 1 : 0;
    } catch {
      return 0;
    }
  }

  // Utility method to clean up old duplicates
  async cleanupDuplicates(daysOld: number = 30): Promise<number> {
    // This would implement a cleanup strategy for old duplicate jobs
    // For now, we'll just return 0 as this is a complex operation
    // that would need careful consideration of user data
    return 0;
  }
}