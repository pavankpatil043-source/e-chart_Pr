# EChart Trading Platform - Deployment Guide

Complete deployment guide for the EChart Trading Platform to echart.in domain.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Git repository access
- Domain configured (echart.in)

### One-Click Deployment
\`\`\`bash
# Make script executable
chmod +x deploy.sh

# Deploy to production
./deploy.sh production vercel
\`\`\`

## 📋 Deployment Options

### 1. Vercel (Recommended)
**Pros:** Automatic SSL, global CDN, zero-config deployment
**Best for:** Production deployments with minimal maintenance

\`\`\`bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod

# Configure custom domain
# Go to Vercel Dashboard → Project → Settings → Domains
# Add: echart.in and www.echart.in
\`\`\`

**DNS Configuration for Vercel:**
\`\`\`
Type: A
Name: @
Value: 76.76.19.61

Type: A  
Name: www
Value: 76.76.19.61
\`\`\`

### 2. Docker Deployment
**Pros:** Consistent environment, easy scaling, containerized
**Best for:** VPS deployments with Docker support

\`\`\`bash
# Build and run with Docker
docker build -t echart-trading .
docker run -d -p 3000:3000 --name echart-trading echart-trading

# Or use deployment script
./deploy.sh production docker
\`\`\`

### 3. VPS Deployment
**Pros:** Full control, custom configuration, cost-effective
**Best for:** Custom server setups with specific requirements

\`\`\`bash
# Deploy to VPS with PM2
./deploy.sh production vps

# Manual VPS setup
npm install
npm run build
pm2 start npm --name "echart-trading" -- start
\`\`\`

## 🔧 Environment Configuration

### Required Environment Variables
\`\`\`env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://echart.in
NEXT_PUBLIC_DOMAIN=echart.in
\`\`\`

### Optional Environment Variables
\`\`\`env
# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VERCEL_ANALYTICS_ID=your_analytics_id

# External APIs
ALPHA_VANTAGE_API_KEY=your_key
YAHOO_FINANCE_API_KEY=your_key
NSE_API_KEY=your_key

# AI Features
OPENAI_API_KEY=your_openai_key

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
\`\`\`

### Setting Environment Variables

#### Vercel
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable for Production environment

#### Docker
\`\`\`bash
# Create .env file
cp .env.example .env
# Edit .env with your values

# Run with environment file
docker run -d --env-file .env -p 3000:3000 echart-trading
\`\`\`

#### VPS
\`\`\`bash
# Create .env.local file
cp .env.example .env.local
# Edit .env.local with your values
\`\`\`

## 🛡️ Security Configuration

### SSL Certificate

#### Vercel
- Automatic SSL certificate
- No configuration required

#### VPS with Nginx
\`\`\`bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d echart.in -d www.echart.in

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
\`\`\`

### Security Headers
Configured in `next.config.mjs`:
\`\`\`javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        }
      ]
    }
  ]
}
\`\`\`

## 📊 Monitoring & Health Checks

### Health Check Endpoint
- URL: `https://echart.in/api/health`
- Returns: Application status and system metrics
- Monitoring: Automatic health checks every 30 seconds

### Logging

#### Vercel
\`\`\`bash
# View deployment logs
vercel logs

# Real-time logs
vercel logs --follow
\`\`\`

#### Docker
\`\`\`bash
# View container logs
docker logs echart-trading

# Follow logs
docker logs -f echart-trading
\`\`\`

#### VPS with PM2
\`\`\`bash
# View PM2 logs
pm2 logs echart-trading

# Monitor in real-time
pm2 monit
\`\`\`

### Performance Monitoring
- Core Web Vitals tracking
- Real User Monitoring (RUM)
- Server-side performance metrics
- API response time monitoring

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
\`\`\`bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
\`\`\`

#### Memory Issues
\`\`\`bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
\`\`\`

#### Port Already in Use
\`\`\`bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
\`\`\`

#### PostCSS/Tailwind Issues
\`\`\`bash
# Reinstall CSS dependencies
npm uninstall tailwindcss autoprefixer postcss
npm install tailwindcss autoprefixer postcss
\`\`\`

#### Docker Issues
\`\`\`bash
# Remove old containers and images
docker container prune
docker image prune

# Rebuild from scratch
docker build --no-cache -t echart-trading .
\`\`\`

### Debug Commands
\`\`\`bash
# Test build locally
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Health check
curl -f https://echart.in/api/health
\`\`\`

## 🔄 CI/CD Pipeline

### GitHub Actions (Automatic)
The repository includes GitHub Actions workflow for:
- Automatic testing on pull requests
- Deployment on merge to main branch
- Environment-specific deployments

### Manual Deployment
\`\`\`bash
# Production deployment
git push origin main
# Triggers automatic deployment

# Or manual deployment
./deploy.sh production vercel
\`\`\`

## 📈 Performance Optimization

### Build Optimization
- Bundle analysis with `@next/bundle-analyzer`
- Tree shaking for unused code removal
- Image optimization with WebP/AVIF formats
- Static asset caching (1 year)

### Runtime Optimization
- Server-side rendering (SSR)
- Static site generation (SSG) where applicable
- API route caching (5 minutes)
- CDN distribution via Vercel Edge Network

### Monitoring Performance
\`\`\`bash
# Analyze bundle size
npm run analyze

# Lighthouse audit
npx lighthouse https://echart.in --view

# Core Web Vitals
# Check in Google Search Console
\`\`\`

## 🔐 Backup & Recovery

### Database Backup (if using)
\`\`\`bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
\`\`\`

### Application Backup
\`\`\`bash
# Create backup
tar -czf echart-backup-$(date +%Y%m%d).tar.gz .

# Restore
tar -xzf echart-backup-YYYYMMDD.tar.gz
\`\`\`

## 📞 Support & Maintenance

### Monitoring URLs
- **Production**: https://echart.in
- **Health Check**: https://echart.in/api/health
- **Sitemap**: https://echart.in/sitemap.xml
- **Robots**: https://echart.in/robots.txt

### Maintenance Tasks
- Weekly dependency updates
- Monthly security patches
- Quarterly performance reviews
- SSL certificate renewal (automatic with Vercel)

### Support Contacts
- Technical Issues: Create GitHub issue
- Deployment Issues: Check deployment logs
- Performance Issues: Monitor health endpoint

## ✅ Post-Deployment Checklist

- [ ] Domain configured and accessible
- [ ] SSL certificate active and valid
- [ ] Health checks passing
- [ ] All environment variables set
- [ ] Performance metrics within targets
- [ ] Security headers configured
- [ ] Monitoring and alerting setup
- [ ] Backup strategy implemented
- [ ] Documentation updated
- [ ] Team notified of deployment

## 🎉 Success!

Your EChart Trading Platform should now be live at:
**https://echart.in**

Features included:
- 📈 Live NSE market data with real-time updates
- 🤖 AI-powered trading insights and chat
- 📊 Technical analysis tools and indicators
- 📱 Mobile-responsive design
- ⚡ High-performance optimized build
- 🔒 Production-ready security
- 🌐 SEO-optimized with sitemap
- 📊 Comprehensive monitoring and health checks

For any issues or questions, refer to the troubleshooting section or create a GitHub issue.
