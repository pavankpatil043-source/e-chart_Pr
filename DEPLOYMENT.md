# EChart Trading Platform - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or pnpm package manager
- Vercel account (recommended)
- Domain: echart.in configured

### 1. Environment Setup

Create `.env.local` file:
\`\`\`env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://echart.in
NEXT_PUBLIC_DOMAIN=echart.in
NEXT_PUBLIC_ENABLE_LIVE_DATA=true
NEXT_PUBLIC_ENABLE_AI_CHAT=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_PORTFOLIO=true
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
# or
pnpm install
\`\`\`

### 3. Build Application
\`\`\`bash
npm run build
# or
pnpm run build
\`\`\`

### 4. Deploy to Vercel
\`\`\`bash
# Make script executable
chmod +x deploy.sh

# Deploy to production
./deploy.sh production
\`\`\`

## 🔧 Deployment Options

### Option 1: Vercel (Recommended)
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
\`\`\`

### Option 2: Docker
\`\`\`bash
# Build Docker image
docker build -t echart-trading .

# Run container
docker run -p 3000:3000 echart-trading
\`\`\`

### Option 3: Traditional VPS
\`\`\`bash
# Build application
npm run build

# Start with PM2
pm2 start npm --name "echart" -- start
\`\`\`

## 🌐 Domain Configuration

### DNS Records for echart.in
\`\`\`bash
Type: A
Name: @
Value: 76.76.19.61

Type: A  
Name: www
Value: 76.76.19.61

Type: CNAME
Name: *
Value: cname.vercel-dns.com
\`\`\`

### SSL Certificate
- Automatic with Vercel
- Manual with Let's Encrypt for VPS

## 📊 Performance Optimization

### Build Optimization
- Tree shaking enabled
- Code splitting configured
- Image optimization active
- Static file compression

### Caching Strategy
- Static assets: 1 year
- API responses: 5 minutes
- Dynamic content: No cache

### CDN Configuration
- Global edge network
- Image optimization
- Automatic compression

## 🛡️ Security Configuration

### Security Headers
\`\`\`javascript
{
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000"
}
\`\`\`

### CORS Policy
- Origin: https://echart.in
- Methods: GET, POST, PUT, DELETE
- Headers: Content-Type, Authorization

## 📈 Monitoring & Analytics

### Health Checks
- Endpoint: `/api/health`
- Interval: 30 seconds
- Timeout: 10 seconds

### Error Tracking
- Sentry integration ready
- Custom error boundaries
- Performance monitoring

### Analytics
- Google Analytics ready
- Custom event tracking
- User behavior analysis

## 🔄 CI/CD Pipeline

### GitHub Actions
\`\`\`yaml
# Automatic deployment on push to main
# Testing before deployment
# Environment-specific builds
\`\`\`

### Deployment Stages
1. Code checkout
2. Dependency installation
3. Type checking
4. Linting
5. Build process
6. Testing
7. Deployment
8. Health checks

## 🚨 Troubleshooting

### Common Build Errors

#### TypeScript Errors
\`\`\`bash
# Fix type issues
npm run type-check
\`\`\`

#### Dependency Issues
\`\`\`bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
\`\`\`

#### Memory Issues
\`\`\`bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
\`\`\`

### Runtime Errors

#### Port Already in Use
\`\`\`bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
\`\`\`

#### Permission Denied
\`\`\`bash
# Fix script permissions
chmod +x deploy.sh
\`\`\`

### Deployment Errors

#### Vercel Build Failures
\`\`\`bash
# Check build logs
vercel logs

# Redeploy
vercel --prod --force
\`\`\`

#### Domain Configuration
\`\`\`bash
# Check domain status
vercel domains ls

# Add domain
vercel domains add echart.in
\`\`\`

## 📞 Support & Maintenance

### Monitoring URLs
- Production: https://echart.in
- Health Check: https://echart.in/api/health
- Admin Panel: https://echart.in/admin

### Backup Strategy
- Database backups: Daily
- Code repository: GitHub
- Asset backups: Cloud storage

### Update Process
1. Test in development
2. Deploy to staging
3. Run integration tests
4. Deploy to production
5. Monitor for issues

## 🎯 Performance Targets

### Core Web Vitals
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- First Input Delay: < 100ms

### API Performance
- Response time: < 200ms
- Uptime: 99.9%
- Error rate: < 0.1%

## 🔐 Security Checklist

- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] CORS policy set
- [ ] Rate limiting active
- [ ] Input validation implemented
- [ ] SQL injection protection
- [ ] XSS protection enabled
- [ ] CSRF protection active

## 🎉 Success Metrics

### Technical Metrics
- Build time: < 2 minutes
- Deploy time: < 5 minutes
- Cold start: < 3 seconds
- Memory usage: < 512MB

### Business Metrics
- Page load speed: < 2 seconds
- User engagement: > 5 minutes
- Bounce rate: < 30%
- Conversion rate: > 5%

---

## 📋 Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Build successful
- [ ] Tests passing
- [ ] Security scan completed

### Deployment
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] CDN configured
- [ ] Monitoring setup
- [ ] Backup configured

### Post-deployment
- [ ] Health check passing
- [ ] Performance metrics good
- [ ] Error rates low
- [ ] User feedback positive
- [ ] Analytics tracking

Your EChart Trading Platform is now ready for production deployment! 🚀📈
