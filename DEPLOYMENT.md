# EChart Trading Platform - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- Git

### One-Click Deployment
\`\`\`bash
# Make script executable
chmod +x deploy.sh

# Deploy to production
./deploy.sh production
\`\`\`

## 📋 Environment Setup

### 1. Environment Variables
Copy the example environment file:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit `.env.local` with your configuration:
\`\`\`env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://echart.in
NEXT_PUBLIC_DOMAIN=echart.in
\`\`\`

### 2. Required Variables
- `NODE_ENV`: Application environment
- `NEXT_PUBLIC_APP_URL`: Full application URL
- `NEXT_PUBLIC_DOMAIN`: Domain name

### 3. Optional Variables
- `OPENAI_API_KEY`: For AI chat features
- `DATABASE_URL`: Database connection
- `REDIS_URL`: Cache connection
- `GOOGLE_ANALYTICS_ID`: Analytics tracking

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

#### Install Vercel CLI
\`\`\`bash
npm install -g vercel
\`\`\`

#### Deploy
\`\`\`bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Or use deployment script
./deploy.sh production
\`\`\`

#### Configure Custom Domain
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Domains
4. Add `echart.in` and `www.echart.in`
5. Update DNS records:
   \`\`\`
   Type: A
   Name: @
   Value: 76.76.19.61
   
   Type: A
   Name: www
   Value: 76.76.19.61
   \`\`\`

### Option 2: Docker Deployment

#### Build and Run
\`\`\`bash
# Build Docker image
docker build -t echart-trading .

# Run container
docker run -d \
  --name echart-trading \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  echart-trading

# Or use deployment script
./deploy.sh docker
\`\`\`

#### Docker Compose
\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
\`\`\`

### Option 3: VPS with PM2

#### Install PM2
\`\`\`bash
npm install -g pm2
\`\`\`

#### Deploy
\`\`\`bash
# Build application
npm run build

# Start with PM2
pm2 start npm --name "echart-trading" -- start

# Save PM2 configuration
pm2 save
pm2 startup

# Or use deployment script
./deploy.sh pm2
\`\`\`

### Option 4: Traditional VPS

#### Install Dependencies
\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y
\`\`\`

#### Configure Nginx
```nginx
server {
    listen 80;
    server_name echart.in www.echart.in;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
