# EChart Trading Platform - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm 8+ package manager
- Git
- Vercel account (recommended)

### One-Click Deployment

\`\`\`bash
# Make script executable
chmod +x deploy.sh

# Deploy to production
./deploy.sh production

# Deploy to preview
./deploy.sh preview
\`\`\`

### Environment Setup

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/your-username/echart-trading-platform.git
   cd echart-trading-platform
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables:**
   Create `.env.local` file:
   \`\`\`env
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://echart.in
   NEXT_PUBLIC_DOMAIN=echart.in
   NEXT_PUBLIC_ENABLE_LIVE_DATA=true
   NEXT_PUBLIC_ENABLE_AI_CHAT=true
   \`\`\`
   
   Edit `.env.local` with your actual values:
   \`\`\`env
   # External APIs
   YAHOO_FINANCE_API_KEY=your_key_here
   NSE_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here

   # Database
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...

   # Analytics
   GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
   VERCEL_ANALYTICS_ID=your_id_here
   \`\`\`

4. **Test locally:**
   \`\`\`bash
   npm run dev
   \`\`\`
   Visit http://localhost:3000

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

#### Automatic Deployment
1. **Connect to Vercel:**
   \`\`\`bash
   npm install -g vercel
   vercel login
   vercel --prod
   \`\`\`

2. **Configure custom domain:**
   - Go to Vercel Dashboard
   - Select your project
   - Go to Settings → Domains
   - Add `echart.in` and `www.echart.in`

3. **Set environment variables:**
   - In Vercel Dashboard → Settings → Environment Variables
   - Add all variables from `.env.example`

#### Manual Steps
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Set custom domain: `echart.in`
4. Enable automatic deployments

### Option 2: Docker Deployment

1. **Build Docker image:**
   \`\`\`bash
   docker build -t echart-trading .
   \`\`\`

2. **Run container:**
   \`\`\`bash
   docker run -p 3000:3000 echart-trading
   \`\`\`

### Option 3: Traditional VPS

1. **Server setup:**
   \`\`\`bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   npm install -g pm2
   \`\`\`

2. **Deploy application:**
   \`\`\`bash
   # Clone and build
   git clone https://github.com/your-username/echart-trading-platform.git
   cd echart-trading-platform
   npm ci
   npm run build
   
   # Start with PM2
   pm2 start npm --name "echart" -- start
   pm2 save
   pm2 startup
   \`\`\`

3. **Nginx configuration:**
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

## 🔧 Configuration

### Environment Variables

#### Required Variables
Create `.env.local` file:
\`\`\`env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://echart.in
NEXT_PUBLIC_DOMAIN=echart.in
NEXT_PUBLIC_ENABLE_LIVE_DATA=true
NEXT_PUBLIC_ENABLE_AI_CHAT=true
\`\`\`

#### Optional Variables
\`\`\`env
# External APIs
YAHOO_FINANCE_API_KEY=your_key_here
NSE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VERCEL_ANALYTICS_ID=your_id_here
\`\`\`

### DNS Configuration

For `echart.in` domain:

\`\`\`
Type: A
Name: @
Value: 76.76.19.61 (Vercel IP)

Type: A  
Name: www
Value: 76.76.19.61

Type: CNAME
Name: www
Value: cname.vercel-dns.com (Alternative)
\`\`\`

## 📊 Monitoring & Health Checks

### Health Check Endpoint
- URL: `https://echart.in/api/health`
- Returns: JSON with application status, memory usage, uptime
- Use for load balancer health checks

### Monitoring Setup
\`\`\`bash
# Check application status
curl https://echart.in/api/health

# Monitor logs (Vercel)
vercel logs

# Monitor logs (PM2)
pm2 logs echart
\`\`\`

## 🔒 Security Configuration

### Security Headers (Configured in vercel.json)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: origin-when-cross-origin

### Rate Limiting
- API endpoints: 100 requests/minute
- WebSocket connections: 10/minute

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
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
\`\`\`

#### Environment Variables Not Loading
\`\`\`bash
# Check environment variables
printenv | grep NEXT_PUBLIC

# Verify .env.local exists
ls -la .env*
\`\`\`

### Debug Commands
\`\`\`bash
# Check build output
npm run build -- --debug

# Analyze bundle size
npm run analyze

# Type checking
npm run type-check

# Linting
npm run lint
\`\`\`

## 📈 Performance Optimization

### Build Optimization
- Tree shaking enabled
- Code splitting configured
- Image optimization active
- Static file compression

### Caching Strategy
- Static assets: 1 year cache
- API responses: 5 minutes cache
- Dynamic content: No cache

### CDN Configuration
- Vercel Edge Network (automatic)
- Custom CDN: Cloudflare (optional)

## 🔄 CI/CD Pipeline

### GitHub Actions
- Automatic testing on PR
- Deploy on merge to main
- Environment-specific deployments

### Deployment Stages
1. Install dependencies
2. Run linting and type checking
3. Run tests
4. Build application
5. Deploy to Vercel
6. Run health checks
7. Performance testing

## 📞 Support & Maintenance

### Monitoring URLs
- Production: https://echart.in
- Health Check: https://echart.in/api/health
- API Status: https://echart.in/api/status

### Backup Strategy
- Database backups (if applicable)
- Environment variable backups
- Code repository backups

### Update Process
\`\`\`bash
# Update dependencies
npm update

# Security audit
npm audit fix

# Rebuild and deploy
./deploy.sh production
\`\`\`

## 🎉 Success Checklist

- [ ] Domain configured (echart.in)
- [ ] SSL certificate active
- [ ] Environment variables set
- [ ] Health check responding
- [ ] All features working
- [ ] Performance optimized
- [ ] Security headers configured
- [ ] Monitoring setup
- [ ] Backup strategy in place

## 📊 Performance Metrics

### Target Metrics
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- First Input Delay: < 100ms

### Monitoring Tools
- Vercel Analytics
- Google PageSpeed Insights
- Lighthouse CI
- Real User Monitoring

Your EChart Trading Platform is now ready for production! 🚀📈
