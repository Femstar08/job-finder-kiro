/**
 * LinkedIn Jobs Adapter
 * Specialized scraping logic for LinkedIn Jobs
 */

const BaseAdapter = require('../base-adapter');

class LinkedInAdapter extends BaseAdapter {
  constructor(websiteConfig) {
    super(websiteConfig);
    this.name = 'LinkedIn Jobs';
    this.requiresAuth = true;
  }

  /**
   * Build LinkedIn-specific search URL
   */
  buildSearchUrl(searchParams) {
    const baseUrl = 'https://www.linkedin.com/jobs/search/';
    const url = new URL(baseUrl);
    
    // LinkedIn-specific parameters
    if (searchParams.jobTitle || (searchParams.keywords && searchParams.keywords.length > 0)) {
      const keywords = [searchParams.jobTitle, ...(searchParams.keywords || [])].filter(Boolean).join(' ');
      url.searchParams.set('keywords', keywords);
    }
    
    if (searchParams.location) {
      url.searchParams.set('location', searchParams.location);
    }
    
    // Sort by most recent
    url.searchParams.set('sortBy', 'DD');
    
    // Only show jobs from last week
    url.searchParams.set('f_TPR', 'r604800');
    
    // Set job type filters if specified
    if (searchParams.contractTypes && searchParams.contractTypes.length > 0) {
      const jobTypeMap = {
        'permanent': 'F',
        'contract': 'C',
        'part-time': 'P',
        'internship': 'I'
      };
      
      const jobTypes = searchParams.contractTypes
        .map(type => jobTypeMap[type.toLowerCase()])
        .filter(Boolean);
      
      if (jobTypes.length > 0) {
        url.searchParams.set('f_JT', jobTypes.join(','));
      }
    }
    
    return url.toString();
  }

  /**
   * Build paginated URL for LinkedIn
   */
  buildPageUrl(baseUrl, pageNumber) {
    if (pageNumber === 0) return baseUrl;
    
    const url = new URL(baseUrl);
    url.searchParams.set('start', pageNumber * 25); // LinkedIn shows 25 jobs per page
    return url.toString();
  }

  /**
   * Extract jobs with LinkedIn-specific logic
   */
  extractJobs($) {
    const jobs = [];
    
    // LinkedIn job card selectors
    const jobSelectors = [
      '.job-search-card',
      '.jobs-search__results-list li',
      '[data-entity-urn*="job"]'
    ];
    
    let jobElements = $();
    for (const selector of jobSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        jobElements = elements;
        break;
      }
    }

    jobElements.each((index, element) => {
      try {
        const $job = $(element);
        
        const job = {
          title: this.extractJobTitle($job),
          company: this.extractCompany($job),
          location: this.extractLocation($job),
          salary: this.extractSalary($job),
          url: this.extractJobUrl($job),
          description: this.extractDescription($job),
          postedDate: this.extractPostedDate($job),
          jobId: this.extractJobId($job)
        };

        if (job.title && job.company) {
          jobs.push(job);
        }
      } catch (error) {
        console.warn(`Error extracting LinkedIn job at index ${index}:`, error.message);
      }
    });

    return jobs;
  }

  /**
   * Extract job title with LinkedIn-specific selectors
   */
  extractJobTitle($job) {
    const titleSelectors = [
      '.base-search-card__title',
      '.job-search-card__title',
      'h3.base-search-card__title a',
      '.sr-only'
    ];
    
    for (const selector of titleSelectors) {
      const title = this.extractText($job, selector);
      if (title && !title.includes('View job details')) {
        return title;
      }
    }
    
    return '';
  }

  /**
   * Extract company with LinkedIn-specific selectors
   */
  extractCompany($job) {
    const companySelectors = [
      '.base-search-card__subtitle a',
      '.job-search-card__subtitle-link',
      'h4.base-search-card__subtitle a'
    ];
    
    for (const selector of companySelectors) {
      const company = this.extractText($job, selector);
      if (company) return company;
    }
    
    return '';
  }

  /**
   * Extract location with LinkedIn-specific selectors
   */
  extractLocation($job) {
    const locationSelectors = [
      '.job-search-card__location',
      '.base-search-card__metadata .job-search-card__location',
      'span.job-search-card__location'
    ];
    
    for (const selector of locationSelectors) {
      const location = this.extractText($job, selector);
      if (location) return location;
    }
    
    return '';
  }

  /**
   * Extract salary (LinkedIn rarely shows salary)
   */
  extractSalary($job) {
    const salarySelectors = [
      '.job-search-card__salary-info',
      '.salary-main-rail__salary-info'
    ];
    
    for (const selector of salarySelectors) {
      const salary = this.extractText($job, selector);
      if (salary) return salary;
    }
    
    return '';
  }

  /**
   * Extract job URL with LinkedIn-specific logic
   */
  extractJobUrl($job) {
    const linkSelectors = [
      '.base-card__full-link',
      '.job-search-card__title a',
      'h3.base-search-card__title a'
    ];
    
    for (const selector of linkSelectors) {
      const element = $job.find(selector).first();
      if (element.length > 0) {
        let href = element.attr('href');
        if (href) {
          if (href.startsWith('/')) {
            href = 'https://www.linkedin.com' + href;
          }
          return href;
        }
      }
    }
    
    return '';
  }

  /**
   * Extract job ID from LinkedIn URL or data attributes
   */
  extractJobId($job) {
    // Try to get from data attribute
    const entityUrn = $job.attr('data-entity-urn');
    if (entityUrn) {
      const match = entityUrn.match(/job:(\d+)/);
      if (match) return match[1];
    }
    
    // Try to get from URL
    const url = this.extractJobUrl($job);
    if (url) {
      const match = url.match(/jobs\/view\/(\d+)/);
      if (match) return match[1];
    }
    
    return '';
  }

  /**
   * Extract job description (limited on search results)
   */
  extractDescription($job) {
    const descSelectors = [
      '.job-search-card__snippet',
      '.base-search-card__snippet'
    ];
    
    for (const selector of descSelectors) {
      const description = this.extractText($job, selector);
      if (description) return description;
    }
    
    return '';
  }

  /**
   * Extract posted date with LinkedIn-specific logic
   */
  extractPostedDate($job) {
    const dateSelectors = [
      '.job-search-card__listdate',
      'time.job-search-card__listdate',
      '.job-search-card__listdate--new'
    ];
    
    for (const selector of dateSelectors) {
      const element = $job.find(selector).first();
      if (element.length > 0) {
        // Try datetime attribute first
        const datetime = element.attr('datetime');
        if (datetime) {
          return new Date(datetime).toISOString();
        }
        
        // Fall back to text content
        const dateText = element.text().trim();
        if (dateText) {
          return this.parseLinkedInDate(dateText);
        }
      }
    }
    
    return new Date().toISOString();
  }

  /**
   * Parse LinkedIn-specific date formats
   */
  parseLinkedInDate(dateText) {
    const now = new Date();
    
    // LinkedIn uses formats like "1 day ago", "2 weeks ago", "1 month ago"
    if (/just now|moments ago/i.test(dateText)) {
      return now.toISOString();
    }
    
    const dayMatch = dateText.match(/(\d+)\s+days?\s+ago/i);
    if (dayMatch) {
      const days = parseInt(dayMatch[1]);
      return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000)).toISOString();
    }
    
    const weekMatch = dateText.match(/(\d+)\s+weeks?\s+ago/i);
    if (weekMatch) {
      const weeks = parseInt(weekMatch[1]);
      return new Date(now.getTime() - (weeks * 7 * 24 * 60 * 60 * 1000)).toISOString();
    }
    
    const monthMatch = dateText.match(/(\d+)\s+months?\s+ago/i);
    if (monthMatch) {
      const months = parseInt(monthMatch[1]);
      return new Date(now.getTime() - (months * 30 * 24 * 60 * 60 * 1000)).toISOString();
    }
    
    return this.parseDate(dateText);
  }

  /**
   * Infer contract type from LinkedIn job data
   */
  inferContractType(job) {
    const combinedText = `${job.title} ${job.description}`.toLowerCase();
    
    // LinkedIn-specific contract type indicators
    if (/contract|contractor|freelance|consulting/i.test(combinedText)) {
      return 'contract';
    }
    
    if (/full.?time|permanent/i.test(combinedText)) {
      return 'permanent';
    }
    
    if (/part.?time/i.test(combinedText)) {
      return 'part-time';
    }
    
    if (/intern|internship|graduate/i.test(combinedText)) {
      return 'internship';
    }
    
    return 'permanent'; // Default for LinkedIn
  }

  /**
   * Extract additional LinkedIn-specific metadata
   */
  extractMetadata($job) {
    return {
      isPromoted: $job.find('.job-search-card__promoted-label').length > 0,
      easyApply: $job.find('.jobs-apply-button--top-card').length > 0,
      applicantCount: this.extractText($job, '.job-search-card__applicant-count'),
      companySize: this.extractText($job, '.job-search-card__company-size'),
      industry: this.extractText($job, '.job-search-card__industry')
    };
  }

  /**
   * Validate LinkedIn-specific job data
   */
  validateJob(job) {
    // Call parent validation first
    if (!super.validateJob(job)) {
      return false;
    }
    
    // LinkedIn-specific validation
    // Filter out promoted content that isn't jobs
    if (/promoted|sponsored/i.test(job.jobTitle) && job.jobTitle.length < 10) {
      return false;
    }
    
    // LinkedIn jobs should have a valid job ID
    if (!job.jobId) {
      return false;
    }
    
    return true;
  }

  /**
   * Override fetch page to handle LinkedIn's authentication requirements
   */
  async fetchPage(url) {
    // LinkedIn requires specific headers to avoid blocking
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };

    await this.applyRateLimit();

    const config = {
      method: 'GET',
      url: url,
      headers: headers,
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    };

    return await axios(config);
  }

  /**
   * Override normalize data to include LinkedIn-specific fields
   */
  normalizeData(rawJob) {
    const normalized = super.normalizeData(rawJob);
    
    // Add LinkedIn-specific metadata
    if (rawJob.metadata) {
      normalized.isPromoted = rawJob.metadata.isPromoted;
      normalized.hasEasyApply = rawJob.metadata.easyApply;
      normalized.applicantCount = rawJob.metadata.applicantCount;
      normalized.companySize = rawJob.metadata.companySize;
      normalized.industry = rawJob.metadata.industry;
    }
    
    normalized.linkedinJobId = rawJob.jobId;
    
    return normalized;
  }
}

module.exports = LinkedInAdapter;