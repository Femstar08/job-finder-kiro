-- Quick Database Setup for Job Finder
-- Copy and paste this entire script into your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (essential for login)
CREATE TABLE IF NOT EXISTS jf_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job preferences table
CREATE TABLE IF NOT EXISTS jf_job_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES jf_users(id) ON DELETE CASCADE,
  profile_name VARCHAR(100) NOT NULL,
  job_title VARCHAR(200),
  keywords TEXT[],
  location JSONB,
  contract_types TEXT[],
  salary_range JSONB,
  day_rate_range JSONB,
  experience_levels TEXT[],
  company_sizes TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job matches table
CREATE TABLE IF NOT EXISTS jf_job_matches (
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
  job_hash VARCHAR(64) UNIQUE
);

-- Notification settings table
CREATE TABLE IF NOT EXISTS jf_notification_settings (
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

-- Essential indexes
CREATE INDEX IF NOT EXISTS idx_jf_users_email ON jf_users(email);
CREATE INDEX IF NOT EXISTS idx_jf_job_preferences_user_id ON jf_job_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_jf_job_matches_preference_id ON jf_job_matches(preference_id);

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_jf_users_updated_at ON jf_users;
CREATE TRIGGER update_jf_users_updated_at BEFORE UPDATE ON jf_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jf_job_preferences_updated_at ON jf_job_preferences;
CREATE TRIGGER update_jf_job_preferences_updated_at BEFORE UPDATE ON jf_job_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database setup complete! You can now register and login.' as status;
