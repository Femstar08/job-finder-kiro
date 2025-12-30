/**
 * Website Adapter Factory
 * Creates specialized adapters for different job websites
 */

const BaseAdapter = require('./base-adapter');
const IndeedAdapter = require('./adapters/indeed-adapter');
const LinkedInAdapter = require('./adapters/linkedin-adapter');
const GlassdoorAdapter = require('./adapters/glassdoor-adapter');
const MonsterAdapter = require('./adapters/monster-adapter');
const ZipRecruiterAdapter = require('./adapters/ziprecruiter-adapter');
const SimplyHiredAdapter = require('./adapters/simplyhired-adapter');

class WebsiteAdapterFactory {
  constructor() {
    this.adapters = new Map();
    this.registerDefaultAdapters();
  }

  /**
   * Register default website adapters
   */
  registerDefaultAdapters() {
    this.registerAdapter('Indeed', IndeedAdapter);
    this.registerAdapter('LinkedIn Jobs', LinkedInAdapter);
    this.registerAdapter('Glassdoor', GlassdoorAdapter);
    this.registerAdapter('Monster', MonsterAdapter);
    this.registerAdapter('ZipRecruiter', ZipRecruiterAdapter);
    this.registerAdapter('SimplyHired', SimplyHiredAdapter);
  }

  /**
   * Register a new website adapter
   */
  registerAdapter(websiteName, AdapterClass) {
    this.adapters.set(websiteName.toLowerCase(), AdapterClass);
  }

  /**
   * Create adapter for specific website
   */
  createAdapter(websiteConfig) {
    // Handle invalid configurations gracefully
    if (!websiteConfig || !websiteConfig.name) {
      return new BaseAdapter(websiteConfig || {});
    }
    
    const websiteName = websiteConfig.name.toLowerCase();
    
    if (this.adapters.has(websiteName)) {
      const AdapterClass = this.adapters.get(websiteName);
      return new AdapterClass(websiteConfig);
    }
    
    // Fallback to base adapter for unknown websites
    return new BaseAdapter(websiteConfig);
  }

  /**
   * Get list of supported websites
   */
  getSupportedWebsites() {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if website is supported
   */
  isSupported(websiteName) {
    return this.adapters.has(websiteName.toLowerCase());
  }

  /**
   * Auto-detect website from URL
   */
  detectWebsite(url) {
    const urlLower = url.toLowerCase();
    
    const websitePatterns = {
      'indeed': /indeed\.com/,
      'linkedin jobs': /linkedin\.com/,
      'glassdoor': /glassdoor\.com/,
      'monster': /monster\.com/,
      'ziprecruiter': /ziprecruiter\.com/,
      'simplyhired': /simplyhired\.com/
    };
    
    for (const [website, pattern] of Object.entries(websitePatterns)) {
      if (pattern.test(urlLower)) {
        return website;
      }
    }
    
    return null;
  }
}

module.exports = WebsiteAdapterFactory;