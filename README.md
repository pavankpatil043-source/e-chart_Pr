# 📈 EChart Trading Platform

> Advanced AI-powered trading platform for Indian stock market with real-time data, news analysis, and intelligent insights.

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Deployment](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com)

**Live Site:** [echart.in](https://echart.in) (Coming Soon)

---

## ✨ Features

### 🤖 AI-Powered News Analysis
- **30-Word Summaries**: AI-generated concise news summaries using Hugging Face BART model
- **Market Impact Scoring**: 0-100 scale scoring for news impact on markets
- **Stock Detection**: Automatic detection of 20+ Indian companies in news articles
- **Smart Filtering**: Filter news by specific stocks with toggle button

### 📰 Historical News System
- **4-Day Historical Range**: Access news from the last 4 days
- **Date Grouping**: Organized by Today, Yesterday, 2 days ago, 3 days ago
- **50+ Articles**: Parses up to 50 articles from Google News RSS
- **Multi-Source Aggregation**: Combines data from multiple news sources

### 📊 Live Market Data
- **Real-Time Quotes**: Live stock prices from Yahoo Finance API
- **Multi-Source Fallback**: NSE India → Yahoo Finance → Cached data
- **20+ Stocks**: Support for all major Nifty 50 stocks
- **Price Updates**: Auto-refresh every 2-5 seconds

### 📈 Advanced Charts
- **TradingView Integration**: Professional candlestick charts
- **Multiple Timeframes**: 1m, 5m, 15m, 1h, 4h, 1D, 1W
- **Historical Data**: Up to 1 year of historical price data
- **Technical Indicators**: Moving averages, volume analysis, pattern recognition

### 🎨 User Experience
- **Smooth Scrolling**: Optimized scrollbar with touch support
- **Responsive Design**: Works perfectly on mobile and desktop
- **Dark Mode**: Professional dark theme for reduced eye strain
- **Fast Loading**: Optimized bundle size and code splitting

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/pavankpatil043-source/e-chart_Pr.git
cd e-chart_Pr

# Install dependencies
npm install
# or
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
# Required
HUGGING_FACE_API_KEY=your_hugging_face_api_key

# Optional (for Breeze API integration)
BREEZE_API_KEY=your_breeze_api_key
BREEZE_API_SECRET=your_breeze_api_secret
BREEZE_SESSION_TOKEN=your_session_token
BREEZE_BASE_URL=https://api.icicidirect.com/breezeapi/api/v1
```

### Get API Keys

- **Hugging Face**: Sign up at [huggingface.co](https://huggingface.co/settings/tokens)
- **ICICI Breeze API**: Register at [ICICI Direct API Portal](https://api.icicidirect.com)

---

## 📦 Tech Stack

### Frontend
- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Charts**: TradingView Widgets + Recharts

### Backend & APIs
- **Server**: Next.js API Routes
- **AI Model**: Hugging Face Inference API (BART-large-CNN)
- **Market Data**: Yahoo Finance API
- **News**: Google News RSS Feed
- **Cache**: In-memory caching with TTL

### Development
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Formatting**: Prettier (via ESLint)
- **Type Checking**: TypeScript strict mode

---

## 🏗️ Project Structure

```
e-chart_Pr-Main/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── live-indian-news/     # News API with AI summarization
│   │   ├── summarize-news/       # AI summarization endpoint
│   │   ├── yahoo-quote/          # Stock quotes
│   │   ├── yahoo-chart/          # Historical chart data
│   │   └── multi-source-quote/   # Multi-source data fetching
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   └── globals.css               # Global styles
├── components/                   # React Components
│   ├── enhanced-news-panel.tsx   # AI news panel with 4-day history
│   ├── ui/                       # Reusable UI components
│   └── ...
├── lib/                          # Utilities & Helpers
│   ├── nifty-50-stocks.ts        # Stock definitions
│   ├── breeze-api.ts             # Breeze API integration
│   └── utils.ts                  # Utility functions
├── public/                       # Static assets
├── .env.local                    # Local environment variables
├── .env.production               # Production environment variables
├── next.config.mjs               # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── vercel.json                   # Vercel deployment config
└── package.json                  # Dependencies
```

---

## 🎯 Key Features Implementation

### AI News Summarization
```typescript
// Uses Hugging Face BART model for 30-word summaries
const summary = await hf.summarization({
  model: 'facebook/bart-large-cnn',
  inputs: article.content,
  parameters: {
    max_length: 40,
    min_length: 25,
  }
});
```

### 4-Day Historical News
```typescript
// Date range filtering
const fourDaysAgo = new Date();
fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

const filteredArticles = articles.filter(article => {
  const articleDate = new Date(article.publishedAt);
  return articleDate >= fourDaysAgo;
});
```

### Stock Detection
```typescript
// Detects 20+ Indian companies in article text
const INDIAN_COMPANIES = [
  { name: 'Reliance', variations: ['RELIANCE', 'RIL'] },
  { name: 'TCS', variations: ['TCS', 'TATA CONSULTANCY'] },
  // ... 18 more companies
];
```

### Market Impact Scoring
```typescript
// Keywords-based scoring (0-100)
const keywords = {
  high: ['crash', 'soar', 'record', 'breakthrough'],
  medium: ['gain', 'loss', 'announce', 'deal'],
  low: ['stable', 'maintain', 'continue']
};
```

---

## 🌐 API Endpoints

### News APIs
```
GET /api/live-indian-news?days=4&category=all&sentiment=positive
GET /api/summarize-news (POST)
```

### Market Data APIs
```
GET /api/yahoo-quote?symbol=RELIANCE.NS
GET /api/yahoo-chart?symbol=INFY.NS&range=1mo&interval=1d
GET /api/multi-source-quote?symbol=TCS.NS
GET /api/indian-indices
```

### Technical Analysis APIs
```
GET /api/support-resistance?symbol=HDFCBANK.NS&timeframe=1d
GET /api/ai-pattern-recognition?symbol=ICICIBANK.NS&timeframe=1d
GET /api/ai-volume-analysis?symbol=SBIN.NS
```

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Or use the one-click deployment:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/pavankpatil043-source/e-chart_Pr)

### Environment Variables for Production

Set these in Vercel Dashboard:
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://echart.in
NEXT_PUBLIC_DOMAIN=echart.in
HUGGING_FACE_API_KEY=your_key
```

### Alternative Deployments

- **Docker**: See `Dockerfile`
- **PM2**: See `DEPLOYMENT.md`
- **Traditional VPS**: See `DEPLOYMENT.md`

For detailed deployment instructions, see:
- [PRODUCTION-DEPLOYMENT-GUIDE.md](PRODUCTION-DEPLOYMENT-GUIDE.md)
- [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md)

---

## 📊 Performance

- **Build Time**: ~2-5 minutes
- **Page Load**: <3 seconds (first load)
- **API Response**: 50-500ms
- **AI Summarization**: 1-3 seconds per article
- **Lighthouse Score**: 90+ (Performance, Accessibility, Best Practices)

---

## 🐛 Known Issues & Limitations

- **Session Token Expiry**: Breeze API session tokens expire after 24 hours (manual refresh needed)
- **Rate Limiting**: Yahoo Finance API has rate limits (handled with caching)
- **AI Processing**: Batch summarization takes 10-15 seconds for 10 articles
- **DNS Propagation**: Domain setup takes 5-60 minutes

---

## 🔒 Security

- ✅ API keys stored in environment variables (not in code)
- ✅ CORS configured for production domain
- ✅ Rate limiting on API endpoints
- ✅ Input validation and sanitization
- ✅ HTTPS enforced in production
- ✅ Security headers configured in `vercel.json`

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👨‍💻 Author

**EChart Trading Platform Team**

- Website: [echart.in](https://echart.in)
- GitHub: [@pavankpatil043-source](https://github.com/pavankpatil043-source)

---

## 🙏 Acknowledgments

- [Hugging Face](https://huggingface.co/) - AI models
- [Yahoo Finance](https://finance.yahoo.com/) - Market data
- [TradingView](https://www.tradingview.com/) - Chart widgets
- [Vercel](https://vercel.com/) - Hosting platform
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components

---

## 📞 Support

For support and queries:
- Open an issue on GitHub
- Check [PRODUCTION-DEPLOYMENT-GUIDE.md](PRODUCTION-DEPLOYMENT-GUIDE.md)
- Review [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🗺️ Roadmap

- [ ] Real-time WebSocket integration
- [ ] User authentication and portfolios
- [ ] Advanced technical indicators
- [ ] Mobile app (React Native)
- [ ] Options chain analysis
- [ ] FII/DII data integration
- [ ] Automated trading signals
- [ ] Multi-language support

---

**Built with ❤️ for Indian Stock Market Traders**

⭐ Star this repo if you find it helpful!
