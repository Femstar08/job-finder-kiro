/**
 * Glassdoor Jobs Adapter
 * Specialized scraping logic for Glassdoor.com
 */

const BaseAdapter = require('../base-adapter');

class GlassdoorAdapter extends BaseAdapter {
  constructor(websiteConfig) {
    super(websiteConfig);
    this.name = 'Glassdoor';
  }

  /**
   * Build Glassdoor-specific search URL
   */
  buildSearchUrl(searchParams) {
    const baseUrl = 'https://www.glassdoor.com/Job/jobs.htm';
    const url = new URL(baseUrl);
    
    // Glassdoor-specific parameters
    if (searchParams.jobTitle) {
      url.searchParams.set('sc.keyword', searchParams.jobTitle);
    }
    
    if (searchParams.location) {
      url.searchParams.set('locT', 'C');
      url.searchParams.set('locId', this.getLocationId(searchParams.location));
    }
    
    // Job type and filters
    url.searchParams.set('jobType', 'all');
    url.searchParams.set('fromAge', '1'); // Last 24 hours
    url.searchParams.set('minSalary', '0');
    url.searchParams.set('includeNoSalaryJobs', 'true');
    url.searchParams.set('radius', '25');
    
    return url.toString();
  }

  /**
   * Get location ID for Glassdoor (simplified - would need location mapping)
   */
  getLocationId(location) {
    // This would typically require a location mapping service
    // For now, return a default value
    return '-1';
  }

  /**
   * Extract jobs with Glassdoor-specific logic
   */
  extractJobs($) {
    const jobs = [];
    
    const jobSelectors = [
      '[data-test="job-listing"]',
      '.react-job-listing',
      '.jobContainer'
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
          rating: this.extractRating($job)
        };

        if (job.title && job.company) {
          jobs.push(job);
        }
      } catch (error) {
        console.warn(`Error extracting Glassdoor job at index ${index}:`, error.message);
      }
    });

    return jobs;
  }

  /**
   * Extract job title with Glassdoor-specific selectors
   */
  extractJobTitle($job) {
    const titleSelectors = [
      '[data-test="job-title"]',
      '.jobTitle',
      'a[data-test="job-title"]'
    ];
    
    for (const selector of titleSelectors) {
      const title = this.extractText($job, selector);
      if (title) return title;
    }
    
    return '';
  }

  /**
   * Extract company with Glassdoor-specific selectors
   */
  extractCompany($job) {
    const companySelectors = [
      '[data-test="employer-name"]',
      '.employerName',
      'span[data-test="employer-name"]'
    ];
    
    for (const selector of companySelectors) {
      const company = this.extractText($job, selector);
      if (company) return company;
    }
    
    return '';
  }

  /**
   * Extract location with Glassdoor-specific selectors
   */
  extractLocation($job) {
    const locationSelectors = [
      '[data-test="job-location"]',
      '.location',
      'span[data-test="job-location"]'
    ];
    
    for (const selector of locationSelectors) {
      const location = this.extractText($job, selector);
      if (location) return location;
    }
    
    return '';
  }

  /**
   * Extract salary with Glassdoor-specific selectors
   */
  extractSalary($job) {
    const salarySelectors = [
      '[data-test="detailSalary"]',
      '.salaryEstimate',
      '.salary'
    ];
    
    for (const selector of salarySelectors) {
      const salary = this.extractText($job, selector);
      if (salary && !salary.includes('Estimate')) {
        return salary;
      }
    }
    
    return '';
  }

  /**
   * Extract company rating
   */
  extractRating($job) {
    const ratingSelectors = [
      '[data-test="rating"]',
      '.rating',
      '.companyRating'
    ];
    
    for (const selector of ratingSelectors) {
      const rating = this.extractText($job, selector);
      if (rating) return rating;
    }
    
    return '';
  }

  /**
   * Extract job URL with Glassdoor-specific logic
   */
  extractJobUrl($job) {
    const linkSelectors = [
      '[data-test="job-title"]',
      '.jobTitle a',
      'a[data-test="job-title"]'
    ];
    
    for (const selector of linkSelectors) {
      const element = $job.find(selector).first();
      if (element.length > 0) {
        let href = element.attr('href');
        if (href) {
          if (href.startsWith('/')) {
            href = 'https://www.glassdoor.com' + href;
          }
          return href;
        }
      }
    }
    
    return '';
  }

  /**
   * Extract posted date with Glassdoor-specific logic
   */
  extractPostedDate($job) {
    const dateSelectors = [
      '[data-test="job-age"]',
      '.jobAge',
      '.postedDate'
    ];
    
    for (const selector of dateSelectors) {
      const dateText = this.extractText($job, selector);
      if (dateText) {
        return this.parseGlassdoorDate(dateText);
      }
    }
    
    return new Date().toISOString();
  }

  /**
   * Parse Glassdoor-specific date formats
   */
  parseGlassdoorDate(dateText) {
    const now = new Date();
    
    // Glassdoor uses formats like "1d", "2w", "1m"
    const dayMatch = dateText.match(/(\d+)d/);
    if (dayMatch) {
      const days = parseInt(dayMatch[1]);
      return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000)).toISOString();
    }
    
    const weekMatch = dateText.match(/(\d+)w/);
    if (weekMatch) {
      const weeks = parseInt(weekMatch[1]);
      return new Date(now.getTime() - (weeks * 7 * 24 * 60 * 60 * 1000)).toISOString();
    }
    
    const monthMatch = dateText.match(/(\d+)m/);
    if (monthMatch) {
      const months = parseInt(monthMatch[1]);
      return new Date(now.getTime() - (months * 30 * 24 * 60 * 60 * 1000)).toISOString();
    }
    
    return this.parseDate(dateText);
  }

  /**
   * Override normalize data to include Glassdoor-specific fields
   */
  normalizeData(rawJob) {
    const normalized = super.normalizeData(rawJob);
    
    // Add Glassdoor-specific fields
    normalized.companyRating = rawJob.rating;
    
    return normalized;
  }
}

module.exports = GlassdoorAdapter;