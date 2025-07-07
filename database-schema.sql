-- SocialBot Pro Database Schema
-- Run this on your PostgreSQL database to create all required tables

-- Create enums
CREATE TYPE platform AS ENUM ('instagram', 'facebook');
CREATE TYPE campaign_status AS ENUM ('draft', 'running', 'paused', 'completed', 'failed');
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'failed', 'delivered');

-- Session storage table (for authentication)
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Create index for session expiration
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions USING btree (expire);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY,
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Social accounts table (Instagram/Facebook credentials)
CREATE TABLE IF NOT EXISTS social_accounts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform platform NOT NULL,
    username VARCHAR NOT NULL,
    password TEXT NOT NULL, -- Base64 encoded for security
    twofa TEXT, -- 2FA secret if enabled
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Instagram Business Account fields (for webhooks)
    instagram_business_id VARCHAR,
    page_access_token TEXT,
    webhook_connected BOOLEAN DEFAULT false,
    business_id VARCHAR
);

-- Google Sheets table
CREATE TABLE IF NOT EXISTS google_sheets (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    sheet_url TEXT NOT NULL,
    access_token TEXT, -- OAuth access token
    refresh_token TEXT, -- OAuth refresh token
    range VARCHAR DEFAULT 'A:B', -- Default range A:B
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    platform platform NOT NULL,
    status campaign_status DEFAULT 'draft',
    google_sheet_id INTEGER REFERENCES google_sheets(id),
    messages_per_account INTEGER DEFAULT 50,
    delay_between_messages INTEGER DEFAULT 30, -- seconds
    total_targets INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign targets table (loaded from Google Sheets)
CREATE TABLE IF NOT EXISTS campaign_targets (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    profile_url TEXT NOT NULL,
    custom_message TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table (tracks each message sent)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    social_account_id INTEGER NOT NULL REFERENCES social_accounts(id),
    target_id INTEGER NOT NULL REFERENCES campaign_targets(id),
    content TEXT NOT NULL,
    status message_status DEFAULT 'pending',
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    instagram_message_id TEXT -- For webhook reply matching
);

-- Replies table (Instagram webhook responses)
CREATE TABLE IF NOT EXISTS replies (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    instagram_user_id TEXT NOT NULL,
    content TEXT,
    attachments TEXT[], -- Array of attachment URLs
    reply_to_message_id TEXT,
    received_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Proxies table (rotating proxy support)
CREATE TABLE IF NOT EXISTS proxies (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    host VARCHAR NOT NULL,
    port INTEGER NOT NULL,
    username VARCHAR,
    password TEXT, -- Base64 encoded
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs table (audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR NOT NULL,
    details TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign_id ON campaign_targets(campaign_id);

-- Insert sample data for testing (optional)
-- Uncomment the following lines if you want test data

/*
-- Sample user
INSERT INTO users (id, email, first_name, last_name) 
VALUES ('test-user-1', 'test@example.com', 'Test', 'User')
ON CONFLICT (id) DO NOTHING;

-- Sample Google Sheet
INSERT INTO google_sheets (user_id, name, sheet_url) 
VALUES ('test-user-1', 'Test Targets', 'https://docs.google.com/spreadsheets/d/your-sheet-id')
ON CONFLICT DO NOTHING;
*/

-- Verify tables were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;