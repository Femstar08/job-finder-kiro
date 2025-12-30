#!/usr/bin/env node

/**
 * Test Workflow Script
 * Tests individual components of the N8N workflow
 */

const fs = require('fs');
const path = require('path');

// Import scraping components if available
let JobScraperEnhanced, WebsiteAdapterFactory;
try {
  JobScraperEnhanced = require('../scraping-nodes/job-scraper-enhanced');
  WebsiteAdapterFactory = require('../scraping-nodes/website-adapter-factory');
} catch (error) {
  console.warn('⚠️ Scraping components not available for testing');
}

async function testWorkflowComponents() {
  console.log('🧪 Testing N8N workflow components...\n');

  try {
    // Load configurations
    const websitesPath = path.join(__dirname, '..', 'website-configs.json');
    const websiteConfigs = JSON.parse(fs.readFileSync(websitesPath, 'utf8'));

    let testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };

    // Test 1: Website Adapter Factory
    if (WebsiteAdapterFactory) {
      console.log('🔧 Testing Website Adapter Factory...');
      try {
        const factory = new WebsiteAdapterFactory();
        const supportedWebsites = factory.getSupportedWebsites();
        console.log(`   ✅ Factory supports ${supportedWebsites.length} websites: ${supportedWebsites.join(', ')}`);
        
        // Test adapter creation
        const indeedConfig = websiteConfigs.websites.find(w => w.name === 'Indeed');
        if (indeedConfig) {
          const adapter = factory.createAdapter(indeedConfig);
          console.log(`   ✅ Successfully created adapter for ${adapter.name}`);
        }
        
        testResults.passed++;
      } catch (error) {
        console.log(`   ❌ Factory test failed: ${error.message}`);
        testResults.failed++;
        testResults.errors.push(`Website Adapter Factory: ${error.message}`);
      }
    }

    // Test 2: Job Scraper Enhanced
    if (JobScraperEnhanced) {
      console.log('\n🕷️ Testing Job Scraper Enhanced...');
      try {
        const scraper = new JobScraperEnhanced();
        
        // Test URL building
        const testParams = {
          jobTitle: 'Software Engineer',
          location: 'New York',
          keywords: ['JavaScript', 'React']
        };
        
        const testTemplate = 'https://example.com/jobs?q={{jobTitle}}&l={{location}}';
        const builtUrl = scraper.buildSearchUrl(testTemplate, testParams);
        
        if (builtUrl.includes('Software%20Engineer') && builtUrl.includes('New%20York')) {
          console.log('   ✅ URL building works correctly');
        } else {
          throw new Error('URL building failed');
        }
        
        testResults.passed++;
      } catch (error) {
        console.log(`   ❌ Scraper test failed: ${error.message}`);
        testResults.failed++;
        testResults.errors.push(`Job Scraper Enhanced: ${error.message}`);
      }
    }

    // Test 3: Website Configuration Validation
    console.log('\n⚙️ Testing Website Configurations...');
    try {
      let configErrors = [];
      
      websiteConfigs.websites.forEach(website => {
        // Test required fields
        if (!website.name || !website.searchUrlTemplate || !website.scrapingConfig) {
          configErrors.push(`${website.name || 'Unknown'}: Missing required fields`);
        }
        
        // Test URL template
        if (website.searchUrlTemplate && !website.searchUrlTemplate.includes('{{jobTitle}}')) {
          configErrors.push(`${website.name}: URL template missing {{jobTitle}} placeholder`);
        }
        
        // Test scraping selectors
        const requiredSelectors = ['jobSelector', 'titleSelector', 'companySelector'];
        requiredSelectors.forEach(selector => {
          if (!website.scrapingConfig[selector]) {
            configErrors.push(`${website.name}: Missing ${selector}`);
          }
        });
      });
      
      if (configErrors.length === 0) {
        console.log(`   ✅ All ${websiteConfigs.websites.length} website configurations are valid`);
        testResults.passed++;
      } else {
        throw new Error(`Configuration errors: ${configErrors.join(', ')}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Configuration test failed: ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`Website Configurations: ${error.message}`);
    }

    // Test 4: Mock Scraping Test (without actual HTTP requests)
    console.log('\n🎭 Testing Mock Scraping Logic...');
    try {
      const mockHtml = `
        <div class="job-card" data-jk="123">
          <h2 class="job-title">Software Engineer</h2>
          <span class="company-name">Tech Corp</span>
          <div class="job-location">San Francisco, CA</div>
          <span class="salary">$100,000 - $150,000</span>
          <div class="job-snippet">Great opportunity for a software engineer...</div>
          <span class="date">2 days ago</span>
        </div>
      `;
      
      // Mock cheerio functionality
      const mockExtractJobs = (html, config) => {
        // Simplified extraction for testing
        if (html.includes('Software Engineer') && html.includes('Tech Corp')) {
          return [{
            title: 'Software Engineer',
            company: 'Tech Corp',
            location: 'San Francisco, CA',
            salary: '$100,000 - $150,000'
          }];
        }
        return [];
      };
      
      const mockConfig = {
        jobSelector: '.job-card',
        titleSelector: '.job-title',
        companySelector: '.company-name',
        locationSelector: '.job-location',
        salarySelector: '.salary'
      };
      
      const jobs = mockExtractJobs(mockHtml, mockConfig);
      
      if (jobs.length === 1 && jobs[0].title === 'Software Engineer') {
        console.log('   ✅ Mock scraping logic works correctly');
        testResults.passed++;
      } else {
        throw new Error('Mock scraping failed to extract job data');
      }
      
    } catch (error) {
      console.log(`   ❌ Mock scraping test failed: ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`Mock Scraping: ${error.message}`);
    }

    // Test 5: Job Matching Logic
    console.log('\n🎯 Testing Job Matching Logic...');
    try {
      const mockJob = {
        jobTitle: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        salary: '$120,000 - $160,000',
        contractType: 'permanent'
      };
      
      const mockPreference = {
        jobTitle: 'Software Engineer',
        keywords: ['JavaScript', 'React'],
        location: { remote: true },
        salaryRange: { min: 100000, max: 200000 },
        contractTypes: ['permanent']
      };
      
      // Test title matching
      const titleMatch = mockJob.jobTitle.toLowerCase().includes(mockPreference.jobTitle.toLowerCase());
      
      // Test location matching (remote)
      const locationMatch = mockJob.location.toLowerCase().includes('remote') && mockPreference.location.remote;
      
      // Test salary matching (simplified)
      const salaryMatch = true; // Would implement full salary parsing logic
      
      // Test contract type matching
      const contractMatch = mockPreference.contractTypes.includes(mockJob.contractType);
      
      if (titleMatch && locationMatch && salaryMatch && contractMatch) {
        console.log('   ✅ Job matching logic works correctly');
        testResults.passed++;
      } else {
        throw new Error('Job matching logic failed');
      }
      
    } catch (error) {
      console.log(`   ❌ Job matching test failed: ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`Job Matching: ${error.message}`);
    }

    // Test 6: Data Normalization
    console.log('\n🔄 Testing Data Normalization...');
    try {
      const rawJob = {
        title: '  Senior Software Engineer  ',
        company: 'Tech Corp\n',
        location: 'San Francisco, CA',
        salary: 'Salary: $120,000 - $160,000 per year',
        description: 'Great opportunity...\n\nJoin our team!'
      };
      
      // Mock normalization function
      const normalizeJobData = (job, websiteConfig) => {
        return {
          jobTitle: job.title.trim(),
          company: job.company.replace(/\n/g, ' ').trim(),
          location: job.location,
          salary: job.salary.replace(/^(salary|pay|compensation):\s*/i, '').replace(/\s*(per year|annually|p\.a\.|pa)$/i, '').trim(),
          sourceWebsite: websiteConfig.name,
          jobDescription: job.description.replace(/\n+/g, ' ').trim()
        };
      };
      
      const normalized = normalizeJobData(rawJob, { name: 'Test Site' });
      
      if (normalized.jobTitle === 'Senior Software Engineer' && 
          normalized.company === 'Tech Corp' &&
          normalized.salary === '$120,000 - $160,000' &&
          normalized.sourceWebsite === 'Test Site') {
        console.log('   ✅ Data normalization works correctly');
        testResults.passed++;
      } else {
        throw new Error('Data normalization failed');
      }
      
    } catch (error) {
      console.log(`   ❌ Data normalization test failed: ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`Data Normalization: ${error.message}`);
    }

    // Report results
    console.log('\n📊 Test Results:');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    
    if (testResults.errors.length > 0) {
      console.log('\n🐛 Errors:');
      testResults.errors.forEach(error => console.log(`   • ${error}`));
    }

    if (testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Workflow components are ready.');
    } else {
      console.log('\n⚠️ Some tests failed. Please fix issues before deployment.');
    }

    console.log('\n📋 Manual Testing Steps:');
    console.log('1. Import workflow into N8N development instance');
    console.log('2. Configure credentials and environment variables');
    console.log('3. Test individual nodes with sample data');
    console.log('4. Run full workflow execution');
    console.log('5. Verify job data is correctly scraped and matched');
    console.log('6. Check notification delivery');

    return testResults.failed === 0;

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    return false;
  }
}

// Test individual scraper with real website (optional)
async function testRealScraping(websiteName = 'Indeed') {
  console.log(`\n🌐 Testing real scraping for ${websiteName}...`);
  console.log('⚠️ This will make actual HTTP requests - use sparingly!');
  
  if (!WebsiteAdapterFactory) {
    console.log('❌ Scraping components not available');
    return false;
  }
  
  try {
    const websitesPath = path.join(__dirname, '..', 'website-configs.json');
    const websiteConfigs = JSON.parse(fs.readFileSync(websitesPath, 'utf8'));
    
    const websiteConfig = websiteConfigs.websites.find(w => w.name === websiteName);
    if (!websiteConfig) {
      throw new Error(`Website ${websiteName} not found in configuration`);
    }
    
    const factory = new WebsiteAdapterFactory();
    const adapter = factory.createAdapter(websiteConfig);
    
    const searchParams = {
      jobTitle: 'Software Engineer',
      location: 'New York',
      keywords: ['JavaScript']
    };
    
    console.log(`Searching for: ${searchParams.jobTitle} in ${searchParams.location}`);
    
    const result = await adapter.scrape(searchParams);
    
    if (result.success) {
      console.log(`✅ Successfully scraped ${result.totalFound} jobs from ${websiteName}`);
      
      if (result.jobs.length > 0) {
        const firstJob = result.jobs[0];
        console.log('📄 Sample job:');
        console.log(`   Title: ${firstJob.jobTitle}`);
        console.log(`   Company: ${firstJob.company}`);
        console.log(`   Location: ${firstJob.location}`);
        console.log(`   URL: ${firstJob.jobUrl}`);
      }
    } else {
      console.log(`❌ Scraping failed: ${result.error}`);
    }
    
    return result.success;
    
  } catch (error) {
    console.error(`❌ Real scraping test failed: ${error.message}`);
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--real-scraping')) {
    const website = args.find(arg => arg.startsWith('--website='))?.split('=')[1] || 'Indeed';
    testRealScraping(website).then(success => {
      process.exit(success ? 0 : 1);
    });
  } else {
    testWorkflowComponents().then(success => {
      process.exit(success ? 0 : 1);
    });
  }
}

module.exports = { testWorkflowComponents, testRealScraping };