/**
 * Base Adapter Class
 * Provides common functionality for all website adapters
 */

const cheerio = require('cheerio');
const axios = require('axios');
const crypto = require('crypto');

class BaseAdapter {
  constructor(websiteConfig = {}) {
    this.config = websiteConfig;
    this.name = websiteConfig.name || 'Unknown';
    this.baseUrl = websiteConfig.baseUrl || '';
    this.scrapingConfig = websiteConfig.scrapingConfig || {};
    this.rateLimitMs = websiteConfig.rateLimitMs || 3000;
    this.lastRequestTime = 0;
  }

  /**
   * Check if URL belongs to this website
   */
  isValidUrl(url) {
    return url.includes(this.baseUrl.replace(/https?:\/\//, ''));
  }

  /**
   * Build search URL from template and parameters
   */
  buildSearchUrl(searchParams) {
    let url = this.config.searchUrlTemplate;
    
    // Replace template variables
    Object.entries(searchParams).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const encodedValue = encodeURIComponent(value || '');
      url = url.replace(new RegExp(placeholder, 'g'), encodedValue);
    });
    
    return url;
  }

  /**
   * Build paginated URL
   */
  buildPageUrl(baseUrl, pageNumber) {
    if (pageNumber === 0) return baseUrl;
    
    const url = new URL(baseUrl);
    url.searchParams.set('page', pageNumber + 1);
    return url.toString();
  }

  /**
   * Apply rate limiting
   */
  async applyRateLimit() {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitMs) {
      const waitTime = this.rateLimitMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch webpage with proper headers and error handling
   */
  async fetchPage(url) {
    await this.applyRateLimit();
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      ...(this.config.headers || {})
    };

    const config = {
      method: 'GET',
      url: url,
      headers: headers,
      timeout: this.config.timeout || 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    };

    return await axios(config);
  }

  /**
   * Extract jobs from HTML - can be overridden by specific adapters
   */
  extractJobs($) {
    const jobs = [];
    const jobElements = $(this.scrapingConfig.jobSelector);

    jobElements.each((index, element) => {
      try {
        const $job = $(element);
        
        const job = {
          title: this.extractText($job, this.scrapingConfig.titleSelector),
          company: this.extractText($job, this.scrapingConfig.companySelector),
          location: this.extractText($job, this.scrapingConfig.locationSelector),
          salary: this.extractText($job, this.scrapingConfig.salarySelector),
          url: this.extractUrl($job, this.scrapingConfig.linkSelector),
          description: this.extractText($job, this.scrapingConfig.descriptionSelector),
          postedDate: this.extractDate($job, this.scrapingConfig.dateSelector)
        };

        if (job.title && job.company) {
          jobs.push(job);
        }
      } catch (error) {
        console.warn(`Error extracting job at index ${index}:`, error.message);
      }
    });

    return jobs;
  }

  /**
   * Extract text content from element
   */
  extractText($context, selector) {
    if (!selector) return '';
    
    try {
      const element = $context.find(selector).first();
      if (element.length === 0) {
        const directElement = $context.is(selector) ? $context : null;
        return directElement ? directElement.text().trim() : '';
      }
      return element.text().trim();
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract URL from element
   */
  extractUrl($context, selector) {
    if (!selector) return '';
    
    try {
      const element = $context.find(selector).first();
      let url = element.attr('href') || element.attr('data-href') || '';
      
      if (url && !url.startsWith('http')) {
        if (url.startsWith('/')) {
          url = this.baseUrl + url;
        } else {
          url = this.baseUrl + '/' + url;
        }
      }
      
      return url;
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract and normalize date
   */
  extractDate($context, selector) {
    if (!selector) return new Date().toISOString();
    
    try {
      const dateText = this.extractText($context, selector);
      return this.parseDate(dateText);
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Parse date from various formats
   */
  parseDate(dateText) {
    if (!dateText) return new Date().toISOString();
    
    const now = new Date();
    
    // Handle relative dates
    const daysAgoMatch = dateText.match(/(\d+)\s+days?\s+ago/i);
    if (daysAgoMatch) {
      const daysAgo = parseInt(daysAgoMatch[1]);
      return new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000)).toISOString();
    }
    
    const hoursAgoMatch = dateText.match(/(\d+)\s+hours?\s+ago/i);
    if (hoursAgoMatch) {
      const hoursAgo = parseInt(hoursAgoMatch[1]);
      return new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000)).toISOString();
    }
    
    if (/today/i.test(dateText)) {
      return now.toISOString();
    }
    
    if (/yesterday/i.test(dateText)) {
      return new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString();
    }
    
    // Try to parse as regular date
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
    
    return new Date().toISOString();
  }

  /**
   * Normalize job data to standard format
   */
  normalizeData(rawJob) {
    return {
      jobTitle: this.cleanText(rawJob.title),
      company: this.cleanText(rawJob.company),
      location: this.normalizeLocation(rawJob.location),
      salary: this.normalizeSalary(rawJob.salary),
      contractType: this.inferContractType(rawJob),
      jobUrl: rawJob.url,
      sourceWebsite: this.name,
      jobDescription: this.cleanText(rawJob.description),
      requirements: '',
      foundAt: new Date().toISOString(),
      postedDate: rawJob.postedDate,
      jobHash: this.generateJobHash(rawJob.title, rawJob.company, rawJob.location)
    };
  }

  /**
   * Clean text content
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, ' ')
      .trim();
  }

  /**
   * Normalize location
   */
  normalizeLocation(location) {
    if (!location) return '';
    
    const cleaned = this.cleanText(location);
    
    if (/remote|work from home|wfh/i.test(cleaned)) {
      return 'Remote';
    }
    
    return cleaned;
  }

  /**
   * Normalize salary
   */
  normalizeSalary(salary) {
    if (!salary) return '';
    
    return this.cleanText(salary)
      .replace(/^(salary|pay|compensation):\s*/i, '')
      .replace(/\s*(per year|annually|p\.a\.|pa)$/i, '')
      .trim();
  }

  /**
   * Infer contract type from job data
   */
  inferContractType(job) {
    const combinedText = `${job.title} ${job.description}`.toLowerCase();
    
    if (/contract|contractor|freelance|temporary|temp/i.test(combinedText)) {
      return 'contract';
    }
    
    if (/permanent|full.?time|perm/i.test(combinedText)) {
      return 'permanent';
    }
    
    if (/part.?time/i.test(combinedText)) {
      return 'part-time';
    }
    
    if (/internship|intern/i.test(combinedText)) {
      return 'internship';
    }
    
    return 'permanent';
  }

  /**
   * Generate unique hash for job
   */
  generateJobHash(title, company, location) {
    const normalizedData = `${title}-${company}-${location}`.toLowerCase();
    return crypto.createHash('md5').update(normalizedData).digest('hex');
  }

  /**
   * Validate job data
   */
  validateJob(job) {
    if (!job.jobTitle || !job.company) {
      return false;
    }
    
    if (job.jobTitle.length < 3 || job.company.length < 2) {
      return false;
    }
    
    // Check for spam patterns
    const spamPatterns = [
      /make \$\d+ from home/i,
      /work from home.*\$\d+/i,
      /earn money fast/i,
      /no experience required.*high pay/i
    ];
    
    const combinedText = `${job.jobTitle} ${job.jobDescription}`.toLowerCase();
    if (spamPatterns.some(pattern => pattern.test(combinedText))) {
      return false;
    }
    
    return true;
  }

  /**
   * Main scraping method
   */
  async scrape(searchParams) {
    try {
      const searchUrl = this.buildSearchUrl(searchParams);
      const response = await this.fetchPage(searchUrl);
      const $ = cheerio.load(response.data);
      
      const rawJobs = this.extractJobs($);
      const normalizedJobs = rawJobs.map(job => this.normalizeData(job));
      const validJobs = normalizedJobs.filter(job => this.validateJob(job));
      
      return {
        success: true,
        jobs: validJobs,
        totalFound: validJobs.length,
        website: this.name,
        scrapedAt: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        website: this.name,
        scrapedAt: new Date().toISOString(),
        jobs: []
      };
    }
  }
}

module.exports = BaseAdapter;