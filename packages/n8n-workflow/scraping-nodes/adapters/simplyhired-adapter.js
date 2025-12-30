/**
 * SimplyHired Jobs Adapter
 * Specialized scraping logic for SimplyHired.com
 */

const BaseAdapter = require('../base-adapter');

class SimplyHiredAdapter extends BaseAdapter {
  constructor(websiteConfig) {
    super(websiteConfig);
    this.name = 'SimplyHired';
  }

  /**
   * Build SimplyHired-specific search URL
   */
  buildSearchUrl(searchParams) {
    const baseUrl = 'https://www.simplyhired.com/search';
    const url = new URL(baseUrl);
    
    // SimplyHired-specific parameters
    if (searchParams.jobTitle) {
      url.searchParams.set('q', searchParams.jobTitle);
    }
    
    if (searchParams.location) {
      url.searchParams.set('l', searchParams.location);
    }
    
    // Filter by date - last day
    url.searchParams.set('fdb', '1');
    
    return url.toString();
  }

  /**
   * Extract jobs with SimplyHired-specific logic
   */
  extractJobs($) {
    const jobs = [];
    
    const jobSelectors = [
      '[data-testid="searchSerpJob"]',
      '.SerpJob-jobCard',
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
        console.warn(`Error extracting SimplyHired job at index ${index}:`, error.message);
      }
    });

    return jobs;
  }

  /**
   * Extract job title with SimplyHired-specific selectors
   */
  extractJobTitle($job) {
    const titleSelectors = [
      '[data-testid="searchSerpJobTitle"]',
      '.jobposting-title',
      'h3[data-testid="searchSerpJobTitle"]'
    ];
    
    for (const selector of titleSelectors) {
      const title = this.extractText($job, selector);
      if (title) return title;
    }
    
    return '';
  }

  /**
   * Extract company with SimplyHired-specific selectors
   */
  extractCompany($job) {
    const companySelectors = [
      '[data-testid="searchSerpJobCompanyName"]',
      '.jobposting-company',
      'span[data-testid="searchSerpJobCompanyName"]'
    ];
    
    for (const selector of companySelectors) {
      const company = this.extractText($job, selector);
      if (company) return company;
    }
    
    return '';
  }

  /**
   * Extract location with SimplyHired-specific selectors
   */
  extractLocation($job) {
    const locationSelectors = [
      '[data-testid="searchSerpJobLocation"]',
      '.jobposting-location',
      'span[data-testid="searchSerpJobLocation"]'
    ];
    
    for (const selector of locationSelectors) {
      const location = this.extractText($job, selector);
      if (location) return location;
    }
    
    return '';
  }

  /**
   * Extract salary with SimplyHired-specific selectors
   */
  extractSalary($job) {
    const salarySelectors = [
      '[data-testid="searchSerpJobSalaryEst"]',
      '.jobposting-salary',
      '.salary-estimate'
    ];
    
    for (const selector of salarySelectors) {
      const salary = this.extractText($job, selector);
      if (salary) return salary;
    }
    
    return '';
  }

  /**
   * Extract job URL with SimplyHired-specific logic
   */
  extractJobUrl($job) {
    const linkSelectors = [
      '[data-testid="searchSerpJobTitle"] a',
      '.jobposting-title a',
      'h3[data-testid="searchSerpJobTitle"] a'
    ];
    
    for (const selector of linkSelectors) {
      const element = $job.find(selector).first();
      if (element.length > 0) {
        let href = element.attr('href');
        if (href) {
          if (href.startsWith('/')) {
            href = 'https://www.simplyhired.com' + href;
          }
          return href;
        }
      }
    }
    
    return '';
  }

  /**
   * Extract posted date with SimplyHired-specific logic
   */
  extractPostedDate($job) {
    const dateSelectors = [
      '[data-testid="searchSerpJobDateStamp"]',
      '.jobposting-date',
      '.posted-date'
    ];
    
    for (const selector of dateSelectors) {
      const dateText = this.extractText($job, selector);
      if (dateText) {
        return this.parseSimplyHiredDate(dateText);
      }
    }
    
    return new Date().toISOString();
  }

  /**
   * Parse SimplyHired-specific date formats
   */
  parseSimplyHiredDate(dateText) {
    return this.parseDate(dateText);
  }
}

module.exports = SimplyHiredAdapter;