/**
 * Indeed Job Website Adapter
 * Specialized scraping logic for Indeed.com
 */

const BaseAdapter = require('../base-adapter');

class IndeedAdapter extends BaseAdapter {
  constructor(websiteConfig) {
    super(websiteConfig);
    this.name = 'Indeed';
  }

  /**
   * Build Indeed-specific search URL
   */
  buildSearchUrl(searchParams) {
    const baseUrl = 'https://www.indeed.com/jobs';
    const url = new URL(baseUrl);
    
    // Indeed-specific parameters
    if (searchParams.jobTitle) {
      url.searchParams.set('q', searchParams.jobTitle);
    }
    
    if (searchParams.location) {
      url.searchParams.set('l', searchParams.location);
    }
    
    // Sort by date to get newest jobs first
    url.searchParams.set('sort', 'date');
    
    // Only show jobs from last 7 days
    url.searchParams.set('fromage', '7');
    
    // Add keywords to search query if provided
    if (searchParams.keywords && searchParams.keywords.length > 0) {
      const query = [searchParams.jobTitle, ...searchParams.keywords].filter(Boolean).join(' ');
      url.searchParams.set('q', query);
    }
    
    return url.toString();
  }

  /**
   * Build paginated URL for Indeed
   */
  buildPageUrl(baseUrl, pageNumber) {
    if (pageNumber === 0) return baseUrl;
    
    const url = new URL(baseUrl);
    url.searchParams.set('start', pageNumber * 10); // Indeed uses start parameter
    return url.toString();
  }

  /**
   * Extract jobs with Indeed-specific logic
   */
  extractJobs($) {
    const jobs = [];
    
    // Indeed uses different selectors for different page layouts
    const jobSelectors = [
      '[data-jk]', // Main job cards
      '.job_seen_beacon', // Alternative layout
      '.slider_container .slider_item' // Sponsored jobs
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
        
        // Extract job data with multiple selector fallbacks
        const job = {
          title: this.extractJobTitle($job),
          company: this.extractCompany($job),
          location: this.extractLocation($job),
          salary: this.extractSalary($job),
          url: this.extractJobUrl($job),
          description: this.extractDescription($job),
          postedDate: this.extractPostedDate($job),
          jobId: $job.attr('data-jk') || `indeed-${index}`
        };

        if (job.title && job.company) {
          jobs.push(job);
        }
      } catch (error) {
        console.warn(`Error extracting Indeed job at index ${index}:`, error.message);
      }
    });

    return jobs;
  }

  /**
   * Extract job title with Indeed-specific selectors
   */
  extractJobTitle($job) {
    const titleSelectors = [
      '[data-testid="job-title"] a span',
      '.jobTitle a span',
      'h2.jobTitle a span',
      '.jobTitle-color-purple span'
    ];
    
    for (const selector of titleSelectors) {
      const title = this.extractText($job, selector);
      if (title) return title;
    }
    
    return '';
  }

  /**
   * Extract company with Indeed-specific selectors
   */
  extractCompany($job) {
    const companySelectors = [
      '[data-testid="company-name"]',
      '.companyName',
      'span.companyName a',
      'span.companyName'
    ];
    
    for (const selector of companySelectors) {
      const company = this.extractText($job, selector);
      if (company) return company;
    }
    
    return '';
  }

  /**
   * Extract location with Indeed-specific selectors
   */
  extractLocation($job) {
    const locationSelectors = [
      '[data-testid="job-location"]',
      '.companyLocation',
      'div.companyLocation'
    ];
    
    for (const selector of locationSelectors) {
      const location = this.extractText($job, selector);
      if (location) return location;
    }
    
    return '';
  }

  /**
   * Extract salary with Indeed-specific selectors
   */
  extractSalary($job) {
    const salarySelectors = [
      '[data-testid="job-salary"]',
      '.salary-snippet',
      '.salaryText'
    ];
    
    for (const selector of salarySelectors) {
      const salary = this.extractText($job, selector);
      if (salary) return salary;
    }
    
    return '';
  }

  /**
   * Extract job URL with Indeed-specific logic
   */
  extractJobUrl($job) {
    const linkSelectors = [
      '[data-testid="job-title"] a',
      '.jobTitle a',
      'h2.jobTitle a'
    ];
    
    for (const selector of linkSelectors) {
      const element = $job.find(selector).first();
      if (element.length > 0) {
        let href = element.attr('href');
        if (href) {
          if (href.startsWith('/')) {
            href = 'https://www.indeed.com' + href;
          }
          return href;
        }
      }
    }
    
    // Fallback: construct URL from job ID
    const jobId = $job.attr('data-jk');
    if (jobId) {
      return `https://www.indeed.com/viewjob?jk=${jobId}`;
    }
    
    return '';
  }

  /**
   * Extract job description (may require additional request)
   */
  extractDescription($job) {
    const descSelectors = [
      '.job-snippet',
      '.summary',
      '[data-testid="job-snippet"]'
    ];
    
    for (const selector of descSelectors) {
      const description = this.extractText($job, selector);
      if (description) return description;
    }
    
    return '';
  }

  /**
   * Extract posted date with Indeed-specific logic
   */
  extractPostedDate($job) {
    const dateSelectors = [
      '.date',
      'span.date',
      '[data-testid="job-age"]'
    ];
    
    for (const selector of dateSelectors) {
      const dateText = this.extractText($job, selector);
      if (dateText) {
        return this.parseIndeedDate(dateText);
      }
    }
    
    return new Date().toISOString();
  }

  /**
   * Parse Indeed-specific date formats
   */
  parseIndeedDate(dateText) {
    const now = new Date();
    
    // Indeed uses formats like "Posted 2 days ago", "Just posted", "Today"
    if (/just posted|today/i.test(dateText)) {
      return now.toISOString();
    }
    
    const daysMatch = dateText.match(/(\d+)\s+days?\s+ago/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000)).toISOString();
    }
    
    const hoursMatch = dateText.match(/(\d+)\s+hours?\s+ago/i);
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1]);
      return new Date(now.getTime() - (hours * 60 * 60 * 1000)).toISOString();
    }
    
    return this.parseDate(dateText);
  }

  /**
   * Infer contract type from Indeed job data
   */
  inferContractType(job) {
    const combinedText = `${job.title} ${job.description}`.toLowerCase();
    
    // Indeed-specific contract type indicators
    if (/contract|contractor|temp|temporary|freelance/i.test(combinedText)) {
      return 'contract';
    }
    
    if (/full.?time|permanent|perm/i.test(combinedText)) {
      return 'permanent';
    }
    
    if (/part.?time/i.test(combinedText)) {
      return 'part-time';
    }
    
    if (/intern|internship/i.test(combinedText)) {
      return 'internship';
    }
    
    // Check job title for contract indicators
    if (/\b(contract|temp|contractor)\b/i.test(job.title)) {
      return 'contract';
    }
    
    return 'permanent'; // Default for Indeed
  }

  /**
   * Validate Indeed-specific job data
   */
  validateJob(job) {
    // Call parent validation first
    if (!super.validateJob(job)) {
      return false;
    }
    
    // Indeed-specific validation
    // Filter out sponsored ads that aren't real jobs
    if (/sponsored|advertisement/i.test(job.jobTitle)) {
      return false;
    }
    
    // Filter out jobs with suspicious salary claims
    if (job.salary && /\$\d{3,4}\/day|make \$\d+ daily/i.test(job.salary)) {
      return false;
    }
    
    return true;
  }

  /**
   * Extract additional metadata specific to Indeed
   */
  extractMetadata($job) {
    return {
      isSponsored: $job.find('.sponsoredGray, [data-testid="sponsored-label"]').length > 0,
      hasEasyApply: $job.find('[data-testid="easy-apply-button"]').length > 0,
      rating: this.extractText($job, '.ratingsDisplay'),
      reviewCount: this.extractText($job, '.ratingNumber')
    };
  }

  /**
   * Override normalize data to include Indeed-specific fields
   */
  normalizeData(rawJob) {
    const normalized = super.normalizeData(rawJob);
    
    // Add Indeed-specific metadata
    if (rawJob.metadata) {
      normalized.isSponsored = rawJob.metadata.isSponsored;
      normalized.hasEasyApply = rawJob.metadata.hasEasyApply;
      normalized.companyRating = rawJob.metadata.rating;
      normalized.reviewCount = rawJob.metadata.reviewCount;
    }
    
    return normalized;
  }
}

module.exports = IndeedAdapter;