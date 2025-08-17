# EChart Trading Platform - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Vercel account (recommended)
- Domain access (echart.in)

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
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   
   Edit `.env.local` with your actual values:
   \`\`\`env
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://echart.in
   NEXT_PUBLIC_DOMAIN=echart.in
   # Add other required variables...
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
   vercel
   \`\`\`

2. **Configure custom domain:**
   - Go to Vercel Dashboard
   - Select your project
   - Go to Settings → Domains
   - Add `echart.in` and `www.echart.in`

3. **Set environment variables:**
   - In Vercel Dashboard → Settings → Environment Variables
   - Add all variables from `.env.example`

#### Manual Deployment
\`\`\`bash
# Deploy to production
npm run deploy

# Deploy preview
npm run deploy:preview
\`\`\`

### Option 2: Docker Deployment

1. **Build Docker image:**
   \`\`\`bash
   docker build -t echart-trading .
   \`\`\`

2. **Run container:**
   \`\`\`bash
   docker run -p 3000:3000 \
     -e NODE_ENV=production \
     -e NEXT_PUBLIC_APP_URL=https://echart.in \
     -e NEXT_PUBLIC_DOMAIN=echart.in \
     echart-trading
   \`\`\`

3. **Using Docker Compose:**
   \`\`\`yaml
   version: '3.8'
   services:
     echart:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - NEXT_PUBLIC_APP_URL=https://echart.in
         - NEXT_PUBLIC_DOMAIN=echart.in
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
   npm install
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
\`\`\`env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://echart.in
NEXT_PUBLIC_DOMAIN=echart.in
\`\`\`

#### Optional Variables
\`\`\`env
# Feature flags
NEXT_PUBLIC_ENABLE_LIVE_DATA=true
NEXT_PUBLIC_ENABLE_AI_CHAT=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_PORTFOLIO=true

# External APIs
YAHOO_FINANCE_API_KEY=your_key_here
NSE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
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
- Returns: JSON with application status
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

## 🔒 Security

### SSL Certificate
- **Vercel**: Automatic SSL with Let's Encrypt
- **VPS**: Use Certbot for Let's Encrypt

\`\`\`bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d echart.in -d www.echart.in
\`\`\`

### Security Headers
Configured in `vercel.json` and `next.config.mjs`:
- Content Security Policy
- X-Frame-Options
- X-XSS-Protection
- Strict Transport Security

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

#### Port Conflicts
\`\`\`bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
\`\`\`

#### Environment Variable Issues
\`\`\`bash
# Check environment variables
printenv | grep NEXT_PUBLIC
\`\`\`

### Debug Commands
\`\`\`bash
# View build logs
npm run build 2>&1 | tee build.log

# Test API endpoints
curl -v https://echart.in/api/health
curl -v https://echart.in/api/sitemap
curl -v https://echart.in/api/robots

# Check DNS
nslookup echart.in
dig echart.in

# Test SSL
openssl s_client -connect echart.in:443
\`\`\`

## 📈 Performance Optimization

### Build Optimization
- Bundle analysis: `npm run analyze`
- Tree shaking enabled
- Code splitting configured
- Image optimization enabled

### Caching Strategy
- Static assets: 1 year cache
- API responses: 5 minutes cache
- Dynamic content: No cache

### CDN Configuration
- Vercel Edge Network (automatic)
- Custom CDN: Configure in `next.config.mjs`

## 🔄 CI/CD Pipeline

### GitHub Actions
- Automatic testing on PR
- Deploy on merge to main
- Lighthouse performance checks
- Security scanning

### Manual Deployment
\`\`\`bash
# Quick deployment script
chmod +x deploy.sh
./deploy.sh production
\`\`\`

## 📞 Support

### Monitoring URLs
- **Production**: https://echart.in
- **Health Check**: https://echart.in/api/health
- **Sitemap**: https://echart.in/sitemap.xml
- **Robots**: https://echart.in/robots.txt

### Performance Metrics
- Core Web Vitals monitoring
- Real User Monitoring (RUM)
- Server-side performance tracking

### Error Tracking
- Vercel Analytics (built-in)
- Custom error boundaries
- API error logging

## ✅ Deployment Checklist

- [ ] Environment variables configured
- [ ] Domain DNS records updated
- [ ] SSL certificate active
- [ ] Health check responding (200 OK)
- [ ] All features working correctly
- [ ] Performance optimized (Lighthouse score >90)
- [ ] Security headers configured
- [ ] Monitoring and alerts set up
- [ ] Backup strategy implemented
- [ ] Documentation updated

## 🎉 Success!

Your EChart Trading Platform should now be live at:
**https://echart.in**

### Features Deployed:
- 📈 Live NSE market data with real-time updates
- 🤖 AI-powered trading insights and chat
- 📊 Technical analysis with advanced indicators
- 📱 Mobile-responsive design
- ⚡ High-performance optimized build
- 🔒 Production-ready security
- 🌐 SEO-optimized with comprehensive sitemap

### Next Steps:
1. Monitor application performance
2. Set up user analytics
3. Configure error tracking
4. Plan feature updates
5. Scale infrastructure as needed

For support, contact: admin@echart.in
