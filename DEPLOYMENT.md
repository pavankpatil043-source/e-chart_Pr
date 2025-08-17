# EChart Trading Platform - Deployment Guide

## 🚀 Quick Start Deployment

### Prerequisites
- Node.js 18+ installed
- Git repository set up
- Domain `echart.in` configured

### 1. Vercel Deployment (Recommended)

#### Step 1: Install Vercel CLI
\`\`\`bash
npm install -g vercel
\`\`\`

#### Step 2: Login to Vercel
\`\`\`bash
vercel login
\`\`\`

#### Step 3: Deploy
\`\`\`bash
# For production deployment
vercel --prod

# For preview deployment
vercel
\`\`\`

#### Step 4: Configure Custom Domain
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Domains
4. Add `echart.in` and `www.echart.in`

#### Step 5: Update DNS Records
Add these DNS records in your domain provider:

\`\`\`
Type: A
Name: @
Value: 76.76.19.61
TTL: 300

Type: A  
Name: www
Value: 76.76.19.61
TTL: 300

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 300
\`\`\`

### 2. Docker Deployment

#### Build and Run
\`\`\`bash
# Build the Docker image
docker build -t echart-trading-platform .

# Run the container
docker run -d -p 3000:3000 --name echart-app echart-trading-platform
\`\`\`

#### Using Docker Compose
\`\`\`yaml
version: '3.8'
services:
  echart-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://echart.in
      - NEXT_PUBLIC_DOMAIN=echart.in
    restart: unless-stopped
\`\`\`

### 3. Traditional VPS Deployment

#### Step 1: Server Setup
\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
\`\`\`

#### Step 2: Deploy Application
\`\`\`bash
# Clone repository
git clone <your-repo-url>
cd echart-trading-platform

# Install dependencies
npm ci

# Build application
npm run build

# Start with PM2
pm2 start npm --name "echart-trading" -- start
pm2 startup
pm2 save
\`\`\`

#### Step 3: Configure Nginx (Optional)
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
