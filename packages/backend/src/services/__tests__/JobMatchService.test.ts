import { JobMatchService } from '../JobMatchService';
import { N8NJobFound } from '../../types';

describe('JobMatchService', () => {
  let jobMatchService: JobMatchService;

  beforeEach(() => {
    jobMatchService = new JobMatchService();
  });

  describe('Job Matching Algorithm', () => {
    const mockJobData: N8NJobFound = {
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      salary: '$120,000 - $150,000',
      contractType: 'permanent',
      url: 'https://example.com/job/123',
      sourceWebsite: 'example.com',
      description: 'We are looking for a senior software engineer with React and Node.js experience'
    };

    const mockPreference = {
      id: 'pref-123',
      jobTitle: 'Software Engineer',
      keywords: ['React', 'Node.js'],
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        remote: false
      },
      contractTypes: ['permanent'],
      salaryRange: {
        min: 100000,
        max: 160000,
        currency: 'USD'
      },
      dayRateRange: {
        min: 500,
        max: 800,
        currency: 'USD'
      }
    };

    test('should match job against preferences correctly', async () => {
      const matchingIds = await jobMatchService.matchJobAgainstPreferences(
        mockJobData,
        [mockPreference]
      );

      expect(matchingIds).toContain('pref-123');
    });

    test('should calculate match score correctly', async () => {
      const matches = await jobMatchService.matchJobAgainstPreferencesWithScore(
        mockJobData,
        [mockPreference]
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].preferenceId).toBe('pref-123');
      expect(matches[0].matchScore).toBeGreaterThan(80); // Should be a high match
    });

    test('should not match when job title is completely different', async () => {
      const differentJobData = {
        ...mockJobData,
        title: 'Marketing Manager'
      };

      const matchingIds = await jobMatchService.matchJobAgainstPreferences(
        differentJobData,
        [mockPreference]
      );

      expect(matchingIds).toHaveLength(0);
    });

    test('should match remote jobs when remote is preferred', async () => {
      const remoteJobData = {
        ...mockJobData,
        location: 'Remote'
      };

      const remotePreference = {
        ...mockPreference,
        location: {
          ...mockPreference.location,
          remote: true
        }
      };

      const matchingIds = await jobMatchService.matchJobAgainstPreferences(
        remoteJobData,
        [remotePreference]
      );

      expect(matchingIds).toContain('pref-123');
    });

    test('should not match when salary is below minimum', async () => {
      const lowSalaryJobData = {
        ...mockJobData,
        salary: '$50,000'
      };

      const matchingIds = await jobMatchService.matchJobAgainstPreferences(
        lowSalaryJobData,
        [mockPreference]
      );

      expect(matchingIds).toHaveLength(0);
    });

    test('should match when keywords are found in description', async () => {
      const jobWithKeywords = {
        ...mockJobData,
        title: 'Full Stack Software Engineer', // More similar title
        description: 'Looking for someone with React and Node.js experience'
      };

      const matchingIds = await jobMatchService.matchJobAgainstPreferences(
        jobWithKeywords,
        [mockPreference]
      );

      expect(matchingIds).toContain('pref-123');
    });
  });
});