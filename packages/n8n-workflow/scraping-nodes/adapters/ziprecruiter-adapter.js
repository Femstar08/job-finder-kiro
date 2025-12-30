/**
 * ZipRecruiter Jobs Adapter
 * Specialized scraping logic for ZipRecruiter.com
 */

const BaseAdapter = require('../base-adapter');

class ZipRecruiterAdapter extends BaseAdapter {
  constructor(websiteConfig) {
    super(websiteConfig);
    this.name = 'ZipRecruiter';
  }

  /**
   * Build ZipRecruiter-specific search URL
   */
  buildSearchUrl(searchParams) {
    const baseUrl = 'https://www.ziprecruiter.com/jobs-search';
    const url = new URL(baseUrl);
    
    // ZipRecruiter-specific parameters
    if (searchParams.jobTitle) {
      url.searchParams.set('search', searchParams.jobTitle);
    }
    
    if (searchParams.location) {
      url.searchParams.set('location', searchParams.location);
    }
    
    // Only show jobs from last day
    url.searchParams.set('days', '1');
    
    return url.toString();
  }

  /**
   * Extract jobs with ZipRecruiter-specific logic
   */
  extractJobs($) {
    const jobs = [];
    
    const jobSelectors = [
      '[data-testid="job_result"]',
      '.job_result',
      '.job-listing'
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
          postedDate: this.extractPostedDate($job)
        };

        if (job.title && job.company) {
          jobs.push(job);
        }
      } catch (error) {
        console.warn(`Error extracting ZipRecruiter job at index ${index}:`, error.message);
      }
    });

    return jobs;
  }

  /**
   * Extract job title with ZipRecruiter-specific selectors
   */
  extractJobTitle($job) {
    const titleSelectors = [
      '[data-testid="job-title"]',
      '.job-title',
      'h2[data-testid="job-title"]'
    ];
    
    for (const selector of titleSelectors) {
      const title = this.extractText($job, selector);
      if (title) return title;
    }
    
    return '';
  }

  /**
   * Extract company with ZipRecruiter-specific selectors
   */
  extractCompany($job) {
    const companySelectors = [
      '[data-testid="job-company"]',
      '.job-company',
      'span[data-testid="job-company"]'
    ];
    
    for (const selector of companySelectors) {
      const company = this.extractText($job, selector);
      if (company) return company;
    }
    
    return '';
  }

  /**
   * Extract location with ZipRecruiter-specific selectors
   */
  extractLocation($job) {
    const locationSelectors = [
      '[data-testid="job-location"]',
      '.job-location',
      'span[data-testid="job-location"]'
    ];
    
    for (const selector of locationSelectors) {
      const location = this.extractText($job, selector);
      if (location) return location;
    }
    
    return '';
  }

  /**
   * Extract salary with ZipRecruiter-specific selectors
   */
  extractSalary($job) {
    const salarySelectors = [
      '[data-testid="job-salary"]',
      '.job-salary',
      '.salary-text'
    ];
    
    for (const selector of salarySelectors) {
      const salary = this.extractText($job, selector);
      if (salary) return salary;
    }
    
    return '';
  }

  /**
   * Extract job URL with ZipRecruiter-specific logic
   */
  extractJobUrl($job) {
    const linkSelectors = [
      '[data-testid="job-title"] a',
      '.job-title a',
      'h2[data-testid="job-title"] a'
    ];
    
    for (const selector of linkSelectors) {
      const element = $job.find(selector).first();
      if (element.length > 0) {
        let href = element.attr('href');
        if (href) {
          if (href.startsWith('/')) {
            href = 'https://www.ziprecruiter.com' + href;
          }
          return href;
        }
      }
    }
    
    return '';
  }

  /**
   * Extract posted date with ZipRecruiter-specific logic
   */
  extractPostedDate($job) {
    const dateSelectors = [
      '[data-testid="job-age"]',
      '.job-age',
      '.posted-time'
    ];
    
    for (const selector of dateSelectors) {
      const dateText = this.extractText($job, selector);
      if (dateText) {
        return this.parseZipRecruiterDate(dateText);
      }
    }
    
    return new Date().toISOString();
  }

  /**
   * Parse ZipRecruiter-specific date formats
   */
  parseZipRecruiterDate(dateText) {
    return this.parseDate(dateText);
  }
}

module.exports = ZipRecruiterAdapter;