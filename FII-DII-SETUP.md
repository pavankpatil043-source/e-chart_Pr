# FII DII Data System Setup Guide

## Overview
This system automatically fetches and stores FII (Foreign Institutional Investor) and DII (Domestic Institutional Investor) data daily at 7 PM IST on weekdays. It provides real-time data integration with fallback to sample data when needed.

## Features
- ✅ **Automated Data Fetching**: Scheduled at 7 PM IST on weekdays
- ✅ **Multiple Data Sources**: NSE, BSE, SEBI, MoneyControl support
- ✅ **Database Storage**: PostgreSQL and MySQL support
- ✅ **Fallback System**: Uses sample data when real data unavailable
- ✅ **Manual Control**: API endpoints for manual triggers and management
- ✅ **Error Handling**: Retry mechanisms and comprehensive logging
- ✅ **Caching**: 5-minute API response caching for performance

## Database Setup

### Option 1: PostgreSQL (Recommended)

1. **Install PostgreSQL**:
   ```bash
   # Windows (using Chocolatey)
   choco install postgresql
   
   # Or download from: https://www.postgresql.org/download/
   ```

2. **Create Database**:
   ```sql
   CREATE DATABASE fiidii_db;
   CREATE USER fiidii_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE fiidii_db TO fiidii_user;
   ```

3. **Run Schema**:
   ```bash
   psql -h localhost -U fiidii_user -d fiidii_db -f database/schema.sql
   ```

### Option 2: MySQL

1. **Install MySQL**:
   ```bash
   # Windows (using Chocolatey)
   choco install mysql
   
   # Or download from: https://dev.mysql.com/downloads/mysql/
   ```

2. **Create Database**:
   ```sql
   CREATE DATABASE fiidii_db;
   CREATE USER 'fiidii_user'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON fiidii_db.* TO 'fiidii_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Run Schema**:
   ```bash
   mysql -h localhost -u fiidii_user -p fiidii_db < database/schema.sql
   ```

## Environment Configuration

1. **Copy Environment File**:
   ```bash
   cp .env.example .env.local
   ```

2. **Configure Database Settings** in `.env.local`:
   ```env
   DATABASE_TYPE=postgresql
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DATABASE=fiidii_db
   POSTGRES_USER=fiidii_user
   POSTGRES_PASSWORD=your_secure_password
   ```

## Installation & Running

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Start Development Server**:
   ```bash
   pnpm dev
   ```

3. **Verify Setup**:
   - Visit `http://localhost:3000/api/fii-dii-admin?action=status`
   - Should show scheduler status and configuration

## API Endpoints

### Data Retrieval
- `GET /api/fii-dii-data?period=7d` - Get FII DII data for period
- `GET /api/fii-dii-admin?action=status` - Get scheduler status

### Data Management
- `POST /api/fii-dii-admin?action=manual-fetch` - Trigger manual data fetch
- `POST /api/fii-dii-admin?action=start-scheduler` - Start automatic scheduler
- `POST /api/fii-dii-admin?action=stop-scheduler` - Stop automatic scheduler

### Manual Data Entry
```bash
curl -X POST "http://localhost:3000/api/fii-dii-admin?action=manual-entry" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15",
    "fii": {
      "buy": 5000,
      "sell": 4500,
      "net": 500
    },
    "dii": {
      "buy": 3000,
      "sell": 3200,
      "net": -200
    }
  }'
```

## Data Sources

### Currently Implemented:
- ✅ **NSE Official API**: Primary source for institutional data
- 🔄 **MoneyControl**: Secondary source (placeholder)
- 🔄 **BSE Data**: Tertiary source (placeholder)
- 🔄 **SEBI Data**: Backup source (placeholder)

### Adding New Data Sources:
1. Create new class extending `DataSource` in `lib/fii-dii-fetcher.ts`
2. Implement `getName()` and `fetchData()` methods
3. Add to `sources` array in `FIIDIIDataFetcher` constructor

## Scheduler Configuration

The scheduler runs automatically in production. Configure timing:

```env
FII_DII_FETCH_HOUR=19          # 7 PM IST
FII_DII_FETCH_MINUTE=0         # Exact hour
FII_DII_RETRY_ATTEMPTS=3       # Number of retry attempts
FII_DII_RETRY_DELAY_MINUTES=15 # Minutes between retries
```

## Monitoring & Troubleshooting

### Check Scheduler Status:
```bash
curl http://localhost:3000/api/fii-dii-admin?action=status
```

### Manual Data Fetch:
```bash
curl -X POST http://localhost:3000/api/fii-dii-admin?action=manual-fetch
```

### Common Issues:

1. **Database Connection Failed**:
   - Verify database is running
   - Check credentials in `.env.local`
   - Ensure database and user exist

2. **No Data Available**:
   - Check if scheduler is running
   - Try manual fetch
   - Verify data sources are accessible

3. **Scheduler Not Running**:
   - Check `NODE_ENV=production` for auto-start
   - Manually start via API: `POST /api/fii-dii-admin?action=start-scheduler`

## File Structure

```
lib/
├── database.ts          # Database connection and operations
├── fii-dii-fetcher.ts   # Data fetching service
└── fii-dii-scheduler.ts # Automated scheduling service

app/api/
├── fii-dii-data/        # Public data API
└── fii-dii-admin/       # Management API

database/
└── schema.sql           # Database schema

components/
└── fii-dii-data-panel.tsx  # Frontend display component
```

## Production Deployment

1. **Database Setup**: Use managed database service (AWS RDS, Google Cloud SQL, etc.)
2. **Environment Variables**: Set in hosting platform (Vercel, Netlify, etc.)
3. **Scheduler**: Automatically starts in production mode
4. **Monitoring**: Set up alerts for failed data fetches
5. **Backup**: Regular database backups recommended

## Security Considerations

- Database credentials in environment variables only
- API rate limiting recommended for public endpoints
- Consider authentication for admin endpoints in production
- Regular security updates for dependencies

## Support

- Check logs in browser console and server console
- Use manual fetch API for testing
- Verify database connection before troubleshooting data issues
- Sample data is used as fallback when real data unavailable