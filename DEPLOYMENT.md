# 🚀 Deployment Guide for ECHART.CO.IN

## Quick Deploy to Vercel (Recommended)

### 1. **Prepare Your Code**
\`\`\`bash
# Clone/download your project
git clone <your-repo-url>
cd tradingui250812

# Install dependencies
npm install

# Test locally
npm run dev
\`\`\`

### 2. **Deploy to Vercel**
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
\`\`\`

### 3. **Configure Custom Domain**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Domains**
4. Add `echart.co.in` and `www.echart.co.in`
5. Configure DNS records as shown by Vercel

---

## DNS Configuration for echart.co.in

### **A Records** (Point to Vercel)
\`\`\`
Type: A
Name: @
Value: 76.76.19.61
TTL: 3600

Type: A  
Name: www
Value: 76.76.19.61
TTL: 3600
\`\`\`

### **CNAME Record** (Alternative)
\`\`\`
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
\`\`\`

---

## Alternative Deployment Options

### **Option 1: Netlify**
\`\`\`bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=.next
\`\`\`

### **Option 2: Docker + VPS**
\`\`\`bash
# Build Docker image
docker build -t echart-trading .

# Run container
docker run -p 3000:3000 echart-trading
\`\`\`

### **Option 3: Traditional VPS**
\`\`\`bash
# On your server
git clone <your-repo>
cd tradingui250812
npm install
npm run build
npm start

# Use PM2 for process management
npm install -g pm2
pm2 start npm --name "echart" -- start
pm2 startup
pm2 save
\`\`\`

---

## Environment Setup

### **Production Environment Variables**
Create `.env.local`:
\`\`\`env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://echart.co.in
\`\`\`

### **SSL Certificate**
- Vercel provides automatic SSL
- For custom servers, use Let's Encrypt:
\`\`\`bash
sudo certbot --nginx -d echart.co.in -d www.echart.co.in
\`\`\`

---

## Performance Optimization

### **1. Enable Caching**
\`\`\`javascript
// In next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
\`\`\`

### **2. Enable Compression**
\`\`\`javascript
// Automatic with Vercel
// For custom servers, use compression middleware
\`\`\`

### **3. Optimize Images**
- Images are already optimized with Next.js Image component
- Vercel automatically serves WebP/AVIF formats

---

## Monitoring & Analytics

### **1. Add Vercel Analytics**
\`\`\`bash
npm install @vercel/analytics
\`\`\`

### **2. Add Error Monitoring**
\`\`\`bash
npm install @sentry/nextjs
\`\`\`

### **3. Performance Monitoring**
- Use Vercel's built-in performance monitoring
- Add Google Analytics for user tracking

---

## Security Checklist

- ✅ HTTPS enabled (automatic with Vercel)
- ✅ Security headers configured
- ✅ API routes protected
- ✅ Environment variables secured
- ✅ CORS properly configured

---

## Troubleshooting

### **Common Issues:**

1. **Build Errors**
   \`\`\`bash
   npm run type-check
   npm run lint
   \`\`\`

2. **Domain Not Working**
   - Check DNS propagation: `dig echart.co.in`
   - Verify Vercel domain configuration

3. **API Issues**
   - Check API routes in `/api` folder
   - Verify environment variables

4. **Performance Issues**
   - Enable caching
   - Optimize images
   - Use CDN (automatic with Vercel)

---

## Support

For deployment issues:
1. Check Vercel documentation
2. Review build logs
3. Test locally first: `npm run dev`
4. Check domain DNS settings

**Your trading platform will be live at: https://echart.co.in** 🎉
