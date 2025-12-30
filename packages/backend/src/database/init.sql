-- Job Finder Database Schema
-- This script initializes the database with all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE jf_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job preferences table
CREATE TABLE jf_job_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES jf_users(id) ON DELETE CASCADE,
  profile_name VARCHAR(100) NOT NULL,
  job_title VARCHAR(200),
  keywords TEXT[], -- Array of keywords
  location JSONB, -- Flexible location data: {city, state, country, remote}
  contract_types TEXT[], -- Array of contract types
  salary_range JSONB, -- {min, max, currency}
  day_rate_range JSONB, -- {min, max, currency}
  experience_levels TEXT[], -- Array of experience levels
  company_sizes TEXT[], -- Array of company sizes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job matches table
CREATE TABLE jf_job_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preference_id UUID REFERENCES jf_job_preferences(id) ON DELETE CASCADE,
  job_title VARCHAR(300) NOT NULL,
  company VARCHAR(200),
  location VARCHAR(200),
  salary VARCHAR(100),
  contract_type VARCHAR(50),
  job_url TEXT NOT NULL,
  source_website VARCHAR(100) NOT NULL,
  job_description TEXT,
  requirements TEXT,
  found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  application_status VARCHAR(20) DEFAULT 'not_applied',
  alert_sent BOOLEAN DEFAULT false,
  job_hash VARCHAR(64) UNIQUE -- For duplicate detection
);

-- Notification settings table
CREATE TABLE jf_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES jf_users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  email_address VARCHAR(255),
  email_consolidate_daily BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT false,
  sms_phone_number VARCHAR(20),
  push_enabled BOOLEAN DEFAULT true,
  push_device_tokens TEXT[],
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job websites configuration table
CREATE TABLE jf_job_websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  base_url VARCHAR(500) NOT NULL,
  search_url_template VARCHAR(1000) NOT NULL,
  scraping_config JSONB, -- Site-specific scraping configuration
  is_active BOOLEAN DEFAULT true,
  rate_limit_ms INTEGER DEFAULT 2000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow execution logs table
CREATE TABLE jf_workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id VARCHAR(100) UNIQUE,
  status VARCHAR(20) NOT NULL, -- 'running', 'success', 'failed', 'retry'
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  jobs_found INTEGER DEFAULT 0,
  jobs_matched INTEGER DEFAULT 0,
  alerts_sent INTEGER DEFAULT 0,
  error_message TEXT,
  execution_details JSONB
);

-- Indexes for performance
CREATE INDEX idx_jf_users_email ON jf_users(email);
CREATE INDEX idx_jf_job_preferences_user_id ON jf_job_preferences(user_id);
CREATE INDEX idx_jf_job_preferences_active ON jf_job_preferences(is_active);
CREATE INDEX idx_jf_job_matches_preference_id ON jf_job_matches(preference_id);
CREATE INDEX idx_jf_job_matches_found_at ON jf_job_matches(found_at);
CREATE INDEX idx_jf_job_matches_hash ON jf_job_matches(job_hash);
CREATE INDEX idx_jf_job_matches_status ON jf_job_matches(application_status);
CREATE INDEX idx_jf_job_websites_active ON jf_job_websites(is_active);
CREATE INDEX idx_jf_workflow_executions_status ON jf_workflow_executions(status);
CREATE INDEX idx_jf_workflow_executions_started ON jf_workflow_executions(started_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jf_users_updated_at BEFORE UPDATE ON jf_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jf_job_preferences_updated_at BEFORE UPDATE ON jf_job_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jf_notification_settings_updated_at BEFORE UPDATE ON jf_notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default job websites
INSERT INTO jf_job_websites (name, base_url, search_url_template, scraping_config, is_active) VALUES
('Indeed', 'https://indeed.com', 'https://indeed.com/jobs?q={keywords}&l={location}', 
 '{"job_selector": ".jobsearch-SerpJobCard", "title_selector": ".jobTitle a", "company_selector": ".companyName", "location_selector": ".companyLocation"}', true),
('LinkedIn', 'https://linkedin.com', 'https://www.linkedin.com/jobs/search/?keywords={keywords}&location={location}',
 '{"job_selector": ".job-search-card", "title_selector": ".base-search-card__title", "company_selector": ".base-search-card__subtitle", "location_selector": ".job-search-card__location"}', true),
('Glassdoor', 'https://glassdoor.com', 'https://www.glassdoor.com/Job/jobs.htm?sc.keyword={keywords}&locT=C&locId={location}',
 '{"job_selector": ".react-job-listing", "title_selector": ".jobTitle", "company_selector": ".jobEmpolyerName", "location_selector": ".jobLocation"}', true);