-- FII DII Database Schema for PostgreSQL/MySQL
-- This schema stores daily institutional investment flows

CREATE TABLE fii_dii_data (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    day_of_week INTEGER NOT NULL, -- 1=Monday, 5=Friday
    
    -- FII Data (Foreign Institutional Investors)
    fii_buy_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    fii_sell_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    fii_net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- DII Data (Domestic Institutional Investors)  
    dii_buy_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    dii_sell_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    dii_net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Combined flows
    total_net_flow DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Metadata
    data_source VARCHAR(100) NOT NULL DEFAULT 'NSE',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_date CHECK (date >= '2020-01-01'),
    CONSTRAINT valid_weekday CHECK (day_of_week BETWEEN 1 AND 5)
);

-- Create indices for better query performance
CREATE INDEX idx_fii_dii_date ON fii_dii_data(date DESC);
CREATE INDEX idx_fii_dii_created_at ON fii_dii_data(created_at DESC);
CREATE INDEX idx_fii_dii_verified ON fii_dii_data(is_verified, date DESC);

-- Data sources tracking table
CREATE TABLE fii_dii_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL UNIQUE,
    source_url VARCHAR(500),
    api_endpoint VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    last_fetch_at TIMESTAMP,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common data sources
INSERT INTO fii_dii_sources (source_name, source_url, api_endpoint) VALUES
('NSE_Official', 'https://www.nseindia.com/', 'https://www.nseindia.com/api/fiidiiTradeReact'),
('SEBI_Data', 'https://www.sebi.gov.in/', NULL),
('MoneyControl', 'https://www.moneycontrol.com/', NULL),
('BSE_Data', 'https://www.bseindia.com/', NULL),
('Manual_Entry', NULL, NULL);

-- Scheduler logs table
CREATE TABLE fii_dii_fetch_logs (
    id SERIAL PRIMARY KEY,
    scheduled_time TIMESTAMP NOT NULL,
    execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'FAILED', 'PARTIAL'
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    data_source VARCHAR(100),
    execution_duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fetch_logs_date ON fii_dii_fetch_logs(scheduled_time DESC);
CREATE INDEX idx_fetch_logs_status ON fii_dii_fetch_logs(status, scheduled_time DESC);