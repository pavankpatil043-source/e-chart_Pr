# EChart Trading Platform - Deployment Guide

Complete deployment guide for the EChart Trading Platform to echart.in domain.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Git for version control

### One-Click Deployment
\`\`\`bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy to production
./deploy.sh production vercel
\`\`\`

## 📋 Environment Configuration

### Required Environment Variables
\`\`\`env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://echart.in
NEXT_PUBLIC_DOMAIN=echart.in
\`\`\`

### Optional Environment Variables
\`\`\`env
# Feature Flags
NEXT_PUBLIC_ENABLE_LIVE_DATA=true
NEXT_PUBLIC_ENABLE_AI_CHAT=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# External APIs
ALPHA_VANTAGE_API_KEY=your_key
YAHOO_FINANCE_API_KEY=your_key
NSE_API_KEY=your_key

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
\`\`\`

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)
Best for production deployments with automatic SSL and global CDN.

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Or use the deployment script
./deploy.sh production vercel
\`\`\`

#### Vercel Configuration
- Domain: echart.in
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### Option 2: Docker Deployment
Perfect for VPS or cloud server deployments.

\`\`\`bash
# Build and run with Docker
docker build -t echart-trading .
docker run -d -p 3000:3000 --name echart-trading echart-trading

# Or use the deployment script
./deploy.sh production docker
\`\`\`

### Option 3: PM2 Deployment
Ideal for Node.js process management on VPS.

\`\`\`bash
# Install PM2 globally
npm i -g pm2

# Deploy with PM2
./deploy.sh production pm2
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
\`\`\`nginx
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

\`\`\`

## 🌐 Domain Configuration

### DNS Records for echart.in
\`\`\`
Type: A
Name: @
Value: 76.76.19.61 (Vercel IP)

Type: A  
Name: www
Value: 76.76.19.61

Type: CNAME
Name: www
Value: cname.vercel-dns.com
\`\`\`

### SSL Certificate
- **Vercel**: Automatic SSL certificate
- **VPS**: Use Let's Encrypt
\`\`\`bash
sudo certbot --nginx -d echart.in -d www.echart.in
\`\`\`

## 📊 Monitoring & Health Checks

### Health Check Endpoint
- URL: `https://echart.in/api/health`
- Returns: Application status and metrics
- Monitoring: Every 30 seconds

### Performance Monitoring
- Core Web Vitals tracking
- Real User Monitoring (RUM)
- Server-side performance metrics
- API response time monitoring

## 🛡️ Security Configuration

### Security Headers
\`\`\`json
{
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
}
\`\`\`

### Rate Limiting
- API endpoints: 100 requests/minute
- WebSocket connections: 10/minute
- File uploads: 5MB max size

## 🚨 Troubleshooting

### Common Build Issues

#### PostCSS Configuration Error
\`\`\`bash
# Fix: Remove @tailwindcss/postcss and use tailwindcss directly
npm uninstall @tailwindcss/postcss
npm install tailwindcss autoprefixer postcss
\`\`\`

#### Memory Issues During Build
\`\`\`bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
\`\`\`

#### Port Already in Use
\`\`\`bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
\`\`\`

### Debug Commands
\`\`\`bash
# Check build locally
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Health check
curl -f https://echart.in/api/health
\`\`\`

### Log Analysis
\`\`\`bash
# Vercel logs
vercel logs

# PM2 logs
pm2 logs echart-trading

# Docker logs
docker logs echart-trading
\`\`\`

## 📈 Performance Optimization

### Build Optimization
- Bundle analysis with `npm run analyze`
- Code splitting and tree shaking
- Image optimization (WebP/AVIF)
- Static asset compression

### Runtime Optimization
- CDN for static assets
- Database connection pooling
- Redis caching for API responses
- Gzip/Brotli compression

### Caching Strategy
- Static assets: 1 year cache
- API responses: 5 minutes cache
- Dynamic content: No cache
- Service worker for offline support

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
\`\`\`yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
\`\`\`

### Automated Testing
- Unit tests with Jest
- Integration tests
- E2E tests with Playwright
- Performance testing

## 📞 Support & Monitoring

### Monitoring URLs
- **Production**: https://echart.in
- **Health Check**: https://echart.in/api/health
- **Sitemap**: https://echart.in/sitemap.xml
- **Robots**: https://echart.in/robots.txt

### Performance Targets
- Lighthouse Score: 90+
- Core Web Vitals: All Green
- Server Response Time: <200ms
- Error Rate: <0.1%
- Uptime: 99.9%

### Error Tracking
- Sentry for error monitoring
- DataDog for performance metrics
- Custom logging with Winston
- Real-time alerts via Slack/Email

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Build passes locally
- [ ] Tests are passing
- [ ] Security scan completed
- [ ] Performance audit done

### Deployment
- [ ] Domain DNS records updated
- [ ] SSL certificate active
- [ ] Health checks passing
- [ ] Performance metrics green
- [ ] Error tracking configured

### Post-Deployment
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented
- [ ] Documentation updated
- [ ] Team notified
- [ ] Rollback plan ready

## 🎉 Success!

Your EChart Trading Platform should now be live at:
**https://echart.in**

### Features Available
- 📈 Live NSE market data with real-time updates
- 🤖 AI-powered trading insights and chat
- 📊 Technical analysis with advanced indicators
- 📱 Mobile-responsive design optimized for trading
- ⚡ High-performance build with proper caching
- 🔒 Production-ready security headers and monitoring
- 🌐 SEO-optimized with comprehensive sitemap
- 🏥 Advanced health monitoring with system metrics

### Next Steps
1. Configure monitoring and alerts
2. Set up analytics tracking
3. Implement user authentication
4. Add portfolio tracking features
5. Integrate with real trading APIs

For support or issues, check the health endpoint or review the logs using the commands provided above.
