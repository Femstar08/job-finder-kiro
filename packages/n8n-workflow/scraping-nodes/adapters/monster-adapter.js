/**
 * Monster Jobs Adapter
 * Specialized scraping logic for Monster.com
 */

const BaseAdapter = require('../base-adapter');

class MonsterAdapter extends BaseAdapter {
  constructor(websiteConfig) {
    super(websiteConfig);
    this.name = 'Monster';
  }

  /**
   * Build Monster-specific search URL
   */
  buildSearchUrl(searchParams) {
    const baseUrl = 'https://www.monster.com/jobs/search';
    const url = new URL(baseUrl);
    
    // Monster-specific parameters
    if (searchParams.jobTitle) {
      url.searchParams.set('q', searchParams.jobTitle);
    }
    
    if (searchParams.location) {
      url.searchParams.set('where', searchParams.location);
    }
    
    // Sort by date
    url.searchParams.set('sort', 'rv.di.dt');
    
    return url.toString();
  }

  /**
   * Extract jobs with Monster-specific logic
   */
  extractJobs($) {
    const jobs = [];
    
    const jobSelectors = [
      '.job-cardstyle__JobCardComponent',
      '.JobCard',
      '[data-testid="job-card"]'
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
        console.warn(`Error extracting Monster job at index ${index}:`, error.message);
      }
    });

    return jobs;
  }

  /**
   * Extract job title with Monster-specific selectors
   */
  extractJobTitle($job) {
    const titleSelectors = [
      '.job-cardstyle__JobTitle',
      '.JobTitle',
      '[data-testid="job-title"]'
    ];
    
    for (const selector of titleSelectors) {
      const title = this.extractText($job, selector);
      if (title) return title;
    }
    
    return '';
  }

  /**
   * Extract company with Monster-specific selectors
   */
  extractCompany($job) {
    const companySelectors = [
      '.job-cardstyle__JobCompany',
      '.JobCompany',
      '[data-testid="job-company"]'
    ];
    
    for (const selector of companySelectors) {
      const company = this.extractText($job, selector);
      if (company) return company;
    }
    
    return '';
  }

  /**
   * Extract location with Monster-specific selectors
   */
  extractLocation($job) {
    const locationSelectors = [
      '.job-cardstyle__JobLocation',
      '.JobLocation',
      '[data-testid="job-location"]'
    ];
    
    for (const selector of locationSelectors) {
      const location = this.extractText($job, selector);
      if (location) return location;
    }
    
    return '';
  }

  /**
   * Extract salary with Monster-specific selectors
   */
  extractSalary($job) {
    const salarySelectors = [
      '.job-cardstyle__JobSalary',
      '.JobSalary',
      '[data-testid="job-salary"]'
    ];
    
    for (const selector of salarySelectors) {
      const salary = this.extractText($job, selector);
      if (salary) return salary;
    }
    
    return '';
  }

  /**
   * Extract job URL with Monster-specific logic
   */
  extractJobUrl($job) {
    const linkSelectors = [
      '.job-cardstyle__JobTitle a',
      '.JobTitle a',
      '[data-testid="job-title"] a'
    ];
    
    for (const selector of linkSelectors) {
      const element = $job.find(selector).first();
      if (element.length > 0) {
        let href = element.attr('href');
        if (href) {
          if (href.startsWith('/')) {
            href = 'https://www.monster.com' + href;
          }
          return href;
        }
      }
    }
    
    return '';
  }

  /**
   * Extract posted date with Monster-specific logic
   */
  extractPostedDate($job) {
    const dateSelectors = [
      '.job-cardstyle__JobDate',
      '.JobDate',
      '[data-testid="job-date"]'
    ];
    
    for (const selector of dateSelectors) {
      const dateText = this.extractText($job, selector);
      if (dateText) {
        return this.parseMonsterDate(dateText);
      }
    }
    
    return new Date().toISOString();
  }

  /**
   * Parse Monster-specific date formats
   */
  parseMonsterDate(dateText) {
    return this.parseDate(dateText);
  }
}

module.exports = MonsterAdapter;