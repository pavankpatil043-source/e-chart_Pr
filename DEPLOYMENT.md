# 🚀 Deployment Guide for ECHART.IN

## Quick Deploy to Vercel (Recommended)

### Prerequisites
- Node.js 18+ installed
- Git repository with your code
- Vercel account (free tier available)

### Step 1: Install Vercel CLI
\`\`\`bash
npm install -g vercel
\`\`\`

### Step 2: Login to Vercel
\`\`\`bash
vercel login
\`\`\`

### Step 3: Deploy
\`\`\`bash
# Make the deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
\`\`\`

### Step 4: Configure Custom Domain

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Domains
4. Add `echart.in` and `www.echart.in`

### Step 5: Update DNS Records

Add these DNS records in your domain registrar:

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
Name: *
Value: cname.vercel-dns.com
TTL: 300
\`\`\`

## Alternative Deployment Options

### Option 1: Netlify
1. Connect your GitHub repository
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Add custom domain in site settings

### Option 2: Docker + VPS
\`\`\`bash
# Build Docker image
docker build -t echart-trading .

# Run container
docker run -p 3000:3000 echart-trading
\`\`\`

### Option 3: Traditional VPS with PM2
\`\`\`bash
# Install PM2
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start npm --name "echart" -- start

# Setup auto-restart
pm2 startup
pm2 save
\`\`\`

## Environment Variables Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your API keys and configuration
3. For production, set these in your hosting platform

## SSL Certificate

- **Vercel**: Automatic SSL (Let's Encrypt)
- **Netlify**: Automatic SSL
- **VPS**: Use Certbot for Let's Encrypt

## Performance Optimizations

### Already Configured:
- ✅ Next.js optimization
- ✅ Image optimization
- ✅ Code splitting
- ✅ Compression
- ✅ Caching headers

### Additional Optimizations:
- CDN configuration
- Database connection pooling
- Redis caching (optional)
- Load balancing (for high traffic)

## Monitoring & Analytics

### Built-in Features:
- Error boundaries
- Performance monitoring
- Real-time data tracking

### Optional Integrations:
- Google Analytics
- Sentry for error tracking
- Vercel Analytics
- Custom monitoring dashboard

## Security Checklist

- ✅ HTTPS enabled
- ✅ Security headers configured
- ✅ API rate limiting
- ✅ Input validation
- ✅ CORS configuration
- ✅ Environment variables secured

## Post-Deployment Checklist

1. ✅ Domain resolves correctly
2. ✅ SSL certificate active
3. ✅ All pages load properly
4. ✅ API endpoints working
5. ✅ Real-time data updating
6. ✅ Mobile responsiveness
7. ✅ Performance metrics good
8. ✅ Error monitoring active

## Troubleshooting

### Common Issues:

**Build Errors:**
\`\`\`bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
\`\`\`

**Domain Not Resolving:**
- Check DNS propagation (can take 24-48 hours)
- Verify DNS records are correct
- Clear browser cache

**API Errors:**
- Check environment variables
- Verify API endpoints
- Check CORS configuration

## Support

For deployment issues:
- Check Vercel documentation
- Review build logs
- Contact hosting provider support

## Backup Strategy

### Automated Backups:
- Code: Git repository
- Database: Daily automated backups
- Assets: CDN with versioning

### Manual Backup:
\`\`\`bash
# Export database
pg_dump echart_db > backup.sql

# Backup uploads
tar -czf uploads-backup.tar.gz public/uploads/
\`\`\`

---

🎉 **Your ECHART.IN trading platform is now ready for production!**

Visit: https://echart.in
