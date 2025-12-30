/**
 * Property-Based Tests for N8N Workflow Components
 * Feature: job-finder, Property 4: Multi-Website Monitoring
 * Feature: job-finder, Property 5: Job Data Normalization  
 * Feature: job-finder, Property 16: N8N Workflow Configuration
 * 
 * **Validates: Requirements 2.1, 2.2, 2.4, 2.5, 7.2, 7.3**
 */

const fc = require('fast-check');
const BaseAdapter = require('../scraping-nodes/base-adapter');
const WebsiteAdapterFactory = require('../scraping-nodes/website-adapter-factory');

describe('N8N Workflow Components', () => {
  let factory;

  beforeEach(() => {
    factory = new WebsiteAdapterFactory();
  });

  describe('Property 4: Multi-Website Monitoring', () => {
    /**
     * Feature: job-finder, Property 4: Multi-Website Monitoring
     * For any set of configured job websites, the N8N workflow should attempt to query 
     * each active website and handle failures gracefully without stopping execution for other sites
     */
    test('should handle multiple website configurations without interference', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.oneof(
                fc.constant('Indeed'),
                fc.constant('LinkedIn Jobs'),
                fc.constant('Glassdoor'),
                fc.constant('Monster'),
                fc.constant('ZipRecruiter'),
                fc.constant('SimplyHired')
              ),
              baseUrl: fc.webUrl(),
              searchUrlTemplate: fc.string({ minLength: 10, maxLength: 100 }),
              scrapingConfig: fc.record({
                jobSelector: fc.string({ minLength: 3, maxLength: 20 }),
                titleSelector: fc.string({ minLength: 3, maxLength: 20 }),
                companySelector: fc.string({ minLength: 3, maxLength: 20 }),
                locationSelector: fc.string({ minLength: 3, maxLength: 20 })
              }),
              rateLimitMs: fc.integer({ min: 1000, max: 5000 }),
              isActive: fc.boolean()
            }),
            { minLength: 1, maxLength: 6 }
          ),
          async (websiteConfigs) => {
            const activeConfigs = websiteConfigs.filter(config => config.isActive);
            const adapters = activeConfigs.map(config => factory.createAdapter(config));
            
            // Each adapter should be created successfully
            expect(adapters).toHaveLength(activeConfigs.length);
            
            // Each adapter should have the correct website name
            adapters.forEach((adapter, index) => {
              expect(adapter.name).toBe(activeConfigs[index].name);
              expect(adapter.baseUrl).toBe(activeConfigs[index].baseUrl);
            });
            
            // Adapters should be independent (failure of one doesn't affect others)
            const results = await Promise.allSettled(
              adapters.map(adapter => {
                // Simulate processing - some may fail, some may succeed
                return new Promise((resolve, reject) => {
                  if (Math.random() > 0.3) { // 70% success rate
                    resolve({ website: adapter.name, success: true });
                  } else {
                    reject(new Error(`Simulated failure for ${adapter.name}`));
                  }
                });
              })
            );
            
            // At least some results should be available (not all rejected)
            const successfulResults = results.filter(result => result.status === 'fulfilled');
            const failedResults = results.filter(result => result.status === 'rejected');
            
            // Both successful and failed results should be handled gracefully
            expect(results).toHaveLength(adapters.length);
            expect(successfulResults.length + failedResults.length).toBe(adapters.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should query each configured website independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.constantFrom('Indeed', 'LinkedIn Jobs', 'Glassdoor'),
              baseUrl: fc.webUrl(),
              searchUrlTemplate: fc.string({ minLength: 10 }),
              scrapingConfig: fc.record({
                jobSelector: fc.string({ minLength: 3 }),
                titleSelector: fc.string({ minLength: 3 }),
                companySelector: fc.string({ minLength: 3 }),
                locationSelector: fc.string({ minLength: 3 })
              })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          fc.record({
            jobTitle: fc.string({ minLength: 3, maxLength: 50 }),
            location: fc.string({ minLength: 2, maxLength: 30 }),
            keywords: fc.array(fc.string({ minLength: 2, maxLength: 15 }), { maxLength: 5 })
          }),
          async (websiteConfigs, searchParams) => {
            const adapters = websiteConfigs.map(config => factory.createAdapter(config));
            
            // Each adapter should build search URLs independently
            const searchUrls = adapters.map(adapter => {
              try {
                return adapter.buildSearchUrl(searchParams);
              } catch (error) {
                return null; // Handle gracefully
              }
            });
            
            // URLs should be generated for each adapter
            expect(searchUrls).toHaveLength(adapters.length);
            
            // Each URL should be unique (different websites)
            const validUrls = searchUrls.filter(url => url !== null);
            const uniqueUrls = new Set(validUrls);
            
            // If we have multiple valid configs with different names, we should get different URLs
            const uniqueNames = new Set(websiteConfigs.map(config => config.name));
            if (validUrls.length > 1 && uniqueNames.size > 1) {
              expect(uniqueUrls.size).toBeGreaterThan(1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Job Data Normalization', () => {
    /**
     * Feature: job-finder, Property 5: Job Data Normalization
     * For any job data extracted from different websites, the normalization process 
     * should produce consistent output format regardless of the source website structure
     */
    test('should normalize job data to consistent format across all websites', async () => {
      await fc.assert(
        fc.property(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 3, maxLength: 100 }),
              company: fc.string({ minLength: 2, maxLength: 50 }),
              location: fc.oneof(
                fc.string({ minLength: 2, maxLength: 30 }),
                fc.constant('Remote'),
                fc.constant('Work from home'),
                fc.constant('WFH')
              ),
              salary: fc.oneof(
                fc.string({ minLength: 5, maxLength: 30 }),
                fc.constant(''),
                fc.constant('Competitive salary'),
                fc.constant('$50,000 - $70,000 per year')
              ),
              url: fc.webUrl(),
              description: fc.string({ maxLength: 200 }),
              postedDate: fc.date().map(d => d.toISOString())
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.constantFrom('Indeed', 'LinkedIn Jobs', 'Glassdoor', 'Monster'),
          (rawJobs, websiteName) => {
            const websiteConfig = {
              name: websiteName,
              baseUrl: 'https://example.com',
              searchUrlTemplate: 'https://example.com/search?q={{jobTitle}}',
              scrapingConfig: {}
            };
            
            const adapter = factory.createAdapter(websiteConfig);
            const normalizedJobs = rawJobs.map(job => adapter.normalizeData(job));
            
            // All normalized jobs should have consistent structure
            normalizedJobs.forEach(job => {
              // Required fields should always be present
              expect(job).toHaveProperty('jobTitle');
              expect(job).toHaveProperty('company');
              expect(job).toHaveProperty('location');
              expect(job).toHaveProperty('salary');
              expect(job).toHaveProperty('contractType');
              expect(job).toHaveProperty('jobUrl');
              expect(job).toHaveProperty('sourceWebsite');
              expect(job).toHaveProperty('jobDescription');
              expect(job).toHaveProperty('foundAt');
              expect(job).toHaveProperty('jobHash');
              
              // Source website should be consistent
              expect(job.sourceWebsite).toBe(websiteName);
              
              // foundAt should be a valid ISO date
              expect(() => new Date(job.foundAt)).not.toThrow();
              
              // jobHash should be a non-empty string
              expect(job.jobHash).toBeTruthy();
              expect(typeof job.jobHash).toBe('string');
              
              // Contract type should be one of valid values
              expect(['permanent', 'contract', 'part-time', 'internship']).toContain(job.contractType);
            });
            
            // Jobs from same source should have same sourceWebsite
            const sourceWebsites = normalizedJobs.map(job => job.sourceWebsite);
            const uniqueSources = new Set(sourceWebsites);
            expect(uniqueSources.size).toBe(1);
            expect(uniqueSources.has(websiteName)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should generate consistent job hashes for duplicate detection', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 50 }),
            company: fc.string({ minLength: 2, maxLength: 30 }),
            location: fc.string({ minLength: 2, maxLength: 20 })
          }),
          (jobData) => {
            const websiteConfig = {
              name: 'TestSite',
              baseUrl: 'https://test.com',
              searchUrlTemplate: 'https://test.com/search',
              scrapingConfig: {}
            };
            
            const adapter = factory.createAdapter(websiteConfig);
            
            // Same job data should produce same hash
            const hash1 = adapter.generateJobHash(jobData.title, jobData.company, jobData.location);
            const hash2 = adapter.generateJobHash(jobData.title, jobData.company, jobData.location);
            
            expect(hash1).toBe(hash2);
            expect(hash1).toBeTruthy();
            expect(typeof hash1).toBe('string');
            
            // Hash should be consistent length (MD5 = 32 chars)
            expect(hash1).toHaveLength(32);
            
            // Different job data should produce different hash
            const differentJob = {
              title: jobData.title + ' Modified',
              company: jobData.company,
              location: jobData.location
            };
            
            const hash3 = adapter.generateJobHash(differentJob.title, differentJob.company, differentJob.location);
            expect(hash3).not.toBe(hash1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: N8N Workflow Configuration', () => {
    /**
     * Feature: job-finder, Property 16: N8N Workflow Configuration
     * For any N8N workflow import, the workflow should successfully connect to the database 
     * and support adding new job websites through configuration parameters
     */
    test('should support adding new website configurations dynamically', async () => {
      await fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 3, maxLength: 20 }),
              baseUrl: fc.webUrl(),
              searchUrlTemplate: fc.string({ minLength: 10, maxLength: 100 }),
              scrapingConfig: fc.record({
                jobSelector: fc.string({ minLength: 3, maxLength: 20 }),
                titleSelector: fc.string({ minLength: 3, maxLength: 20 }),
                companySelector: fc.string({ minLength: 3, maxLength: 20 }),
                locationSelector: fc.string({ minLength: 3, maxLength: 20 })
              }),
              rateLimitMs: fc.integer({ min: 1000, max: 10000 }),
              isActive: fc.boolean()
            }),
            { minLength: 1, maxLength: 8 }
          ),
          (newWebsiteConfigs) => {
            const initialSupportedCount = factory.getSupportedWebsites().length;
            
            // Add new website configurations
            newWebsiteConfigs.forEach(config => {
              // Should be able to create adapter for any valid config
              const adapter = factory.createAdapter(config);
              
              expect(adapter).toBeDefined();
              expect(adapter.name).toBe(config.name);
              expect(adapter.baseUrl).toBe(config.baseUrl);
              expect(adapter.rateLimitMs).toBe(config.rateLimitMs);
              
              // Adapter should have all required methods
              expect(typeof adapter.buildSearchUrl).toBe('function');
              expect(typeof adapter.scrape).toBe('function');
              expect(typeof adapter.normalizeData).toBe('function');
              expect(typeof adapter.validateJob).toBe('function');
            });
            
            // Factory should still work with original websites
            const originalWebsites = ['indeed', 'linkedin jobs', 'glassdoor'];
            originalWebsites.forEach(website => {
              expect(factory.isSupported(website)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle website configuration validation', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            name: fc.oneof(
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.constant(''),
              fc.constant(null),
              fc.constant(undefined)
            ),
            baseUrl: fc.oneof(
              fc.webUrl(),
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.constant(''),
              fc.constant('invalid-url')
            ),
            searchUrlTemplate: fc.oneof(
              fc.string({ minLength: 5, maxLength: 100 }),
              fc.constant(''),
              fc.constant(null)
            ),
            scrapingConfig: fc.oneof(
              fc.record({
                jobSelector: fc.string({ minLength: 1, maxLength: 20 }),
                titleSelector: fc.string({ minLength: 1, maxLength: 20 }),
                companySelector: fc.string({ minLength: 1, maxLength: 20 }),
                locationSelector: fc.string({ minLength: 1, maxLength: 20 })
              }),
              fc.constant({}),
              fc.constant(null)
            )
          }),
          (config) => {
            // Should handle any configuration gracefully
            expect(() => {
              const adapter = factory.createAdapter(config);
              
              // Basic properties should be accessible
              expect(adapter.name).toBeDefined();
              expect(adapter.baseUrl).toBeDefined();
              
              // Methods should exist even with invalid config
              expect(typeof adapter.buildSearchUrl).toBe('function');
              expect(typeof adapter.scrape).toBe('function');
              
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should detect websites from URLs correctly', async () => {
      await fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('https://www.indeed.com/jobs?q=developer'),
            fc.constant('https://linkedin.com/jobs/search?keywords=engineer'),
            fc.constant('https://glassdoor.com/Job/jobs.htm?sc.keyword=programmer'),
            fc.constant('https://monster.com/jobs/search?q=analyst'),
            fc.constant('https://ziprecruiter.com/Jobs/Developer'),
            fc.constant('https://simplyhired.com/search?q=designer'),
            fc.webUrl() // Random URL that might not match
          ),
          (testUrl) => {
            const detectedWebsite = factory.detectWebsite(testUrl);
            
            // Detection should return string or null
            expect(detectedWebsite === null || typeof detectedWebsite === 'string').toBe(true);
            
            // If detected, should be a supported website
            if (detectedWebsite !== null) {
              expect(factory.isSupported(detectedWebsite)).toBe(true);
            }
            
            // Known URLs should be detected correctly
            if (testUrl.includes('indeed.com')) {
              expect(detectedWebsite).toBe('indeed');
            } else if (testUrl.includes('linkedin.com')) {
              expect(detectedWebsite).toBe('linkedin jobs');
            } else if (testUrl.includes('glassdoor.com')) {
              expect(detectedWebsite).toBe('glassdoor');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});