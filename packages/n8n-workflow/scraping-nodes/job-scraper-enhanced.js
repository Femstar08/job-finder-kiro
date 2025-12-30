/**
 * Enhanced Job Scraper Node for N8N
 * Handles multiple website formats with intelligent parsing and error handling
 */

const cheerio = require('cheerio');
const axios = require('axios');
const crypto = require('crypto');

class JobScraperEnhanced {
  constructor() {
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
    
    this.rateLimitMap = new Map();
  }

  /**
   * Main scraping function that handles different website configurations
   */
  async scrapeJobs(searchUrl, scrapingConfig, websiteConfig) {
    try {
      // Apply rate limiting
      await this.applyRateLimit(websiteConfig.name, websiteConfig.rateLimitMs || 3000);

      // Fetch the webpage
      const response = await this.fetchWebpage(searchUrl, websiteConfig);
      
      // Parse HTML content
      const $ = cheerio.load(response.data);
      
      // Extract jobs using website-specific selectors
      const jobs = this.extractJobs($, scrapingConfig, websiteConfig);
      
      // Normalize job data
      const normalizedJobs = jobs.map(job => this.normalizeJobData(job, websiteConfig));
      
      // Filter out invalid jobs
      const validJobs = normalizedJobs.filter(job => this.validateJobData(job));
      
      return {
        success: true,
        jobs: validJobs,
        totalFound: validJobs.length,
        website: websiteConfig.name,
        scrapedAt: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        website: websiteConfig.name,
        scrapedAt: new Date().toISOString(),
        jobs: []
      };
    }
  }

  /**
   * Fetch webpage with proper headers and error handling
   */
  async fetchWebpage(url, websiteConfig) {
    const headers = {
      ...this.defaultHeaders,
      ...(websiteConfig.headers || {})
    };

    const config = {
      method: 'GET',
      url: url,
      headers: headers,
      timeout: websiteConfig.timeout || 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    };

    // Add authentication if required
    if (websiteConfig.requiresAuth && websiteConfig.authConfig) {
      config.auth = websiteConfig.authConfig;
    }

    return await axios(config);
  }

  /**
   * Extract jobs from HTML using website-specific selectors
   */
  extractJobs($, scrapingConfig, websiteConfig) {
    const jobs = [];
    const jobElements = $(scrapingConfig.jobSelector);

    jobElements.each((index, element) => {
      try {
        const $job = $(element);
        
        const job = {
          title: this.extractText($job, scrapingConfig.titleSelector),
          company: this.extractText($job, scrapingConfig.companySelector),
          location: this.extractText($job, scrapingConfig.locationSelector),
          salary: this.extractText($job, scrapingConfig.salarySelector),
          url: this.extractUrl($job, scrapingConfig.linkSelector, websiteConfig.baseUrl),
          description: this.extractText($job, scrapingConfig.descriptionSelector),
          postedDate: this.extractDate($job, scrapingConfig.dateSelector),
          contractType: this.inferContractType($job, scrapingConfig)
        };

        // Only add jobs with minimum required fields
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
   * Extract text content from element using selector
   */
  extractText($context, selector) {
    if (!selector) return '';
    
    try {
      const element = $context.find(selector).first();
      if (element.length === 0) {
        // Try selector on context itself
        const directElement = $context.is(selector) ? $context : null;
        return directElement ? directElement.text().trim() : '';
      }
      return element.text().trim();
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract URL from element, handling relative URLs
   */
  extractUrl($context, selector, baseUrl) {
    if (!selector) return '';
    
    try {
      const element = $context.find(selector).first();
      let url = element.attr('href') || element.attr('data-href') || '';
      
      if (url && !url.startsWith('http')) {
        // Handle relative URLs
        if (url.startsWith('/')) {
          url = baseUrl + url;
        } else {
          url = baseUrl + '/' + url;
        }
      }
      
      return url;
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract and normalize date information
   */
  extractDate($context, selector) {
    if (!selector) return new Date().toISOString();
    
    try {
      const dateText = this.extractText($context, selector);
      if (!dateText) return new Date().toISOString();
      
      // Handle common date formats
      const datePatterns = [
        /(\d+)\s+days?\s+ago/i,
        /(\d+)\s+hours?\s+ago/i,
        /today/i,
        /yesterday/i,
        /\d{1,2}\/\d{1,2}\/\d{4}/,
        /\d{4}-\d{2}-\d{2}/
      ];
      
      const now = new Date();
      
      // Check for relative dates
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
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Infer contract type from job content
   */
  inferContractType($context, scrapingConfig) {
    try {
      // Look for contract type indicators in various fields
      const titleText = this.extractText($context, scrapingConfig.titleSelector).toLowerCase();
      const descText = this.extractText($context, scrapingConfig.descriptionSelector).toLowerCase();
      const combinedText = `${titleText} ${descText}`;
      
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
      
      return 'permanent'; // Default assumption
    } catch (error) {
      return 'permanent';
    }
  }

  /**
   * Normalize job data to consistent format
   */
  normalizeJobData(job, websiteConfig) {
    return {
      jobTitle: this.cleanText(job.title),
      company: this.cleanText(job.company),
      location: this.normalizeLocation(job.location),
      salary: this.normalizeSalary(job.salary),
      contractType: job.contractType || 'permanent',
      jobUrl: job.url,
      sourceWebsite: websiteConfig.name,
      jobDescription: this.cleanText(job.description),
      requirements: '', // Will be extracted from description if needed
      foundAt: new Date().toISOString(),
      postedDate: job.postedDate,
      jobHash: this.generateJobHash(job.title, job.company, job.location)
    };
  }

  /**
   * Clean and normalize text content
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with space
      .trim();
  }

  /**
   * Normalize location information
   */
  normalizeLocation(location) {
    if (!location) return '';
    
    const cleaned = this.cleanText(location);
    
    // Handle remote work indicators
    if (/remote|work from home|wfh/i.test(cleaned)) {
      return 'Remote';
    }
    
    return cleaned;
  }

  /**
   * Normalize salary information
   */
  normalizeSalary(salary) {
    if (!salary) return '';
    
    const cleaned = this.cleanText(salary);
    
    // Remove common prefixes/suffixes
    return cleaned
      .replace(/^(salary|pay|compensation):\s*/i, '')
      .replace(/\s*(per year|annually|p\.a\.|pa)$/i, '')
      .trim();
  }

  /**
   * Generate unique hash for job deduplication
   */
  generateJobHash(title, company, location) {
    const normalizedData = `${title}-${company}-${location}`.toLowerCase();
    return crypto.createHash('md5').update(normalizedData).digest('hex');
  }

  /**
   * Validate job data completeness
   */
  validateJobData(job) {
    // Minimum required fields
    if (!job.jobTitle || !job.company) {
      return false;
    }
    
    // Check for spam indicators
    if (job.jobTitle.length < 3 || job.company.length < 2) {
      return false;
    }
    
    // Check for suspicious patterns
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
   * Apply rate limiting to prevent overwhelming websites
   */
  async applyRateLimit(websiteName, rateLimitMs) {
    const lastRequestTime = this.rateLimitMap.get(websiteName) || 0;
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    
    if (timeSinceLastRequest < rateLimitMs) {
      const waitTime = rateLimitMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimitMap.set(websiteName, Date.now());
  }

  /**
   * Build search URL from template and parameters
   */
  buildSearchUrl(template, params) {
    let url = template;
    
    // Replace template variables
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const encodedValue = encodeURIComponent(value || '');
      url = url.replace(new RegExp(placeholder, 'g'), encodedValue);
    });
    
    return url;
  }

  /**
   * Handle pagination for websites that support it
   */
  async scrapeMultiplePages(baseUrl, scrapingConfig, websiteConfig, maxPages = 3) {
    const allJobs = [];
    
    for (let page = 0; page < maxPages; page++) {
      try {
        // Build paginated URL
        const pageUrl = this.buildPaginatedUrl(baseUrl, page, websiteConfig);
        
        // Scrape current page
        const result = await this.scrapeJobs(pageUrl, scrapingConfig, websiteConfig);
        
        if (!result.success || result.jobs.length === 0) {
          break; // No more jobs or error occurred
        }
        
        allJobs.push(...result.jobs);
        
        // Add extra delay between pages
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.warn(`Error scraping page ${page + 1}:`, error.message);
        break;
      }
    }
    
    return {
      success: true,
      jobs: allJobs,
      totalFound: allJobs.length,
      pagesScraped: Math.min(maxPages, allJobs.length > 0 ? maxPages : 1)
    };
  }

  /**
   * Build paginated URL based on website's pagination pattern
   */
  buildPaginatedUrl(baseUrl, pageNumber, websiteConfig) {
    if (pageNumber === 0) return baseUrl;
    
    const url = new URL(baseUrl);
    
    // Common pagination patterns
    if (websiteConfig.paginationParam) {
      url.searchParams.set(websiteConfig.paginationParam, pageNumber + 1);
    } else {
      // Default pagination patterns
      url.searchParams.set('page', pageNumber + 1);
    }
    
    return url.toString();
  }
}

// Export for N8N usage
module.exports = JobScraperEnhanced;

// N8N Node Implementation
const nodeImplementation = {
  description: {
    displayName: 'Job Scraper Enhanced',
    name: 'jobScraperEnhanced',
    group: ['transform'],
    version: 1,
    description: 'Enhanced job scraper with multi-website support',
    defaults: {
      name: 'Job Scraper Enhanced',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Website Config',
        name: 'websiteConfig',
        type: 'json',
        default: '{}',
        description: 'Website configuration object',
      },
      {
        displayName: 'Search Parameters',
        name: 'searchParams',
        type: 'json',
        default: '{}',
        description: 'Search parameters for job query',
      },
      {
        displayName: 'Max Pages',
        name: 'maxPages',
        type: 'number',
        default: 1,
        description: 'Maximum number of pages to scrape',
      }
    ],
  },

  async execute() {
    const items = this.getInputData();
    const returnData = [];
    
    const scraper = new JobScraperEnhanced();
    
    for (let i = 0; i < items.length; i++) {
      try {
        const websiteConfig = this.getNodeParameter('websiteConfig', i);
        const searchParams = this.getNodeParameter('searchParams', i);
        const maxPages = this.getNodeParameter('maxPages', i);
        
        // Build search URL
        const searchUrl = scraper.buildSearchUrl(
          websiteConfig.searchUrlTemplate,
          searchParams
        );
        
        // Scrape jobs
        let result;
        if (maxPages > 1) {
          result = await scraper.scrapeMultiplePages(
            searchUrl,
            websiteConfig.scrapingConfig,
            websiteConfig,
            maxPages
          );
        } else {
          result = await scraper.scrapeJobs(
            searchUrl,
            websiteConfig.scrapingConfig,
            websiteConfig
          );
        }
        
        returnData.push({
          json: result,
          pairedItem: { item: i }
        });
        
      } catch (error) {
        returnData.push({
          json: {
            success: false,
            error: error.message,
            jobs: []
          },
          pairedItem: { item: i }
        });
      }
    }
    
    return [returnData];
  }
};

// Export N8N node if in N8N environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports.nodeImplementation = nodeImplementation;
}