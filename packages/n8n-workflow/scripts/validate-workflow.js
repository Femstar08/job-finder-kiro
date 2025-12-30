#!/usr/bin/env node

/**
 * Workflow Validation Script
 * Validates the N8N workflow configuration for common issues
 */

const fs = require('fs');
const path = require('path');

function validateWorkflow() {
  console.log('🔍 Validating N8N workflow configuration...\n');

  try {
    // Load workflow configuration
    const workflowPath = path.join(__dirname, '..', 'workflow-config.json');
    const workflowConfig = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // Load website configurations
    const websitesPath = path.join(__dirname, '..', 'website-configs.json');
    const websiteConfigs = JSON.parse(fs.readFileSync(websitesPath, 'utf8'));

    let errors = [];
    let warnings = [];

    // Validate workflow structure
    console.log('✅ Checking workflow structure...');
    
    if (!workflowConfig.name) {
      errors.push('Workflow name is missing');
    }

    if (!workflowConfig.nodes || !Array.isArray(workflowConfig.nodes)) {
      errors.push('Workflow nodes array is missing or invalid');
    } else {
      console.log(`   Found ${workflowConfig.nodes.length} nodes`);
    }

    if (!workflowConfig.connections) {
      errors.push('Workflow connections object is missing');
    }

    // Validate required nodes
    console.log('✅ Checking required nodes...');
    const requiredNodes = [
      'Daily Job Search Trigger',
      'Fetch Active Preferences',
      'Fetch Job Websites',
      'Build Search URL',
      'Scrape Job Website',
      'Parse Job Data',
      'Match Jobs to Preferences',
      'Store Found Jobs',
      'Send Job Match Alert'
    ];

    const nodeNames = workflowConfig.nodes.map(node => node.name);
    
    requiredNodes.forEach(requiredNode => {
      if (!nodeNames.includes(requiredNode)) {
        errors.push(`Required node missing: ${requiredNode}`);
      }
    });

    // Validate cron trigger
    console.log('✅ Checking cron trigger configuration...');
    const cronNode = workflowConfig.nodes.find(node => node.type === 'n8n-nodes-base.cron');
    if (cronNode) {
      const cronExpression = cronNode.parameters?.rule?.interval?.[0]?.cronExpression;
      if (cronExpression !== '0 7 * * *') {
        warnings.push(`Cron expression is "${cronExpression}", expected "0 7 * * *" for 7 AM daily`);
      }
    } else {
      errors.push('Cron trigger node not found');
    }

    // Validate HTTP request nodes
    console.log('✅ Checking HTTP request configurations...');
    const httpNodes = workflowConfig.nodes.filter(node => node.type === 'n8n-nodes-base.httpRequest');
    
    httpNodes.forEach(node => {
      if (node.parameters?.url?.includes('{{$env.API_BASE_URL}}')) {
        // Good - using environment variable
      } else if (node.parameters?.url?.includes('localhost') || node.parameters?.url?.includes('127.0.0.1')) {
        warnings.push(`Node "${node.name}" uses localhost URL - update for production`);
      }

      if (!node.credentials?.httpHeaderAuth) {
        warnings.push(`Node "${node.name}" missing authentication credentials`);
      }
    });

    // Validate website configurations
    console.log('✅ Checking website configurations...');
    
    if (!websiteConfigs.websites || !Array.isArray(websiteConfigs.websites)) {
      errors.push('Website configurations missing or invalid');
    } else {
      console.log(`   Found ${websiteConfigs.websites.length} website configurations`);
      
      websiteConfigs.websites.forEach((website, index) => {
        if (!website.name) {
          errors.push(`Website ${index + 1} missing name`);
        }
        
        if (!website.searchUrlTemplate) {
          errors.push(`Website "${website.name}" missing searchUrlTemplate`);
        }
        
        if (!website.scrapingConfig) {
          warnings.push(`Website "${website.name}" missing scrapingConfig`);
        }
        
        if (!website.rateLimitMs || website.rateLimitMs < 1000) {
          warnings.push(`Website "${website.name}" has low rate limit (${website.rateLimitMs}ms) - may cause blocking`);
        }
      });
    }

    // Validate environment variables usage
    console.log('✅ Checking environment variable usage...');
    const workflowString = JSON.stringify(workflowConfig);
    const envVars = workflowString.match(/\{\{\$env\.([^}]+)\}\}/g);
    
    if (envVars) {
      const uniqueEnvVars = [...new Set(envVars)];
      console.log(`   Found environment variables: ${uniqueEnvVars.join(', ')}`);
    } else {
      warnings.push('No environment variables found - hardcoded URLs may cause issues');
    }

    // Validate JavaScript code nodes
    console.log('✅ Checking JavaScript code nodes...');
    const codeNodes = workflowConfig.nodes.filter(node => node.type === 'n8n-nodes-base.code');
    
    codeNodes.forEach(node => {
      const jsCode = node.parameters?.jsCode;
      if (jsCode) {
        // Check for common issues
        if (jsCode.includes('console.log') && !jsCode.includes('console.error')) {
          warnings.push(`Node "${node.name}" uses console.log - consider using console.error for errors`);
        }
        
        if (jsCode.includes('require(') && !jsCode.includes('crypto')) {
          warnings.push(`Node "${node.name}" uses require() - ensure modules are available in N8N`);
        }
      }
    });

    // Report results
    console.log('\n📊 Validation Results:');
    console.log('='.repeat(50));
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ All validations passed! Workflow configuration looks good.');
    } else {
      if (errors.length > 0) {
        console.log(`❌ ${errors.length} error(s) found:`);
        errors.forEach(error => console.log(`   • ${error}`));
      }
      
      if (warnings.length > 0) {
        console.log(`⚠️  ${warnings.length} warning(s) found:`);
        warnings.forEach(warning => console.log(`   • ${warning}`));
      }
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Fix any errors before deploying');
    console.log('2. Review warnings and update as needed');
    console.log('3. Test workflow in N8N development environment');
    console.log('4. Configure credentials and environment variables');
    console.log('5. Run manual test execution');

    return errors.length === 0;

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  const isValid = validateWorkflow();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateWorkflow };