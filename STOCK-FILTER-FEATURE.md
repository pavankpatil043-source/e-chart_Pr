# Stock-Specific News Filter Feature

## Overview
The news panel now supports filtering news articles by specific stock symbols. When viewing a particular stock on the trading chart, you can filter the news to show only articles related to that stock.

## How It Works

### 1. **Automatic Stock Detection**
When a stock is selected in the main trading view, the news panel automatically receives the stock symbol (e.g., `RELIANCE.NS`, `TCS.NS`).

### 2. **Filter Toggle Button**
A purple gradient button appears below the category and sentiment filters:
- **OFF State**: "Filter by RELIANCE" - Shows all news articles
- **ON State**: "Showing RELIANCE News Only" - Shows only relevant articles

### 3. **Smart Matching Algorithm**
The filter uses multiple strategies to find relevant news:

```typescript
// 1. Check if stock is in AI-detected affectedStocks array
if (article.affectedStocks && article.affectedStocks.length > 0) {
  return article.affectedStocks.some(stock => 
    stock.toLowerCase().includes(cleanSymbol)
  )
}

// 2. Fallback: Search title and description
const searchText = `${article.title} ${article.description}`.toLowerCase()
return searchText.includes(cleanSymbol)
```

### 4. **Symbol Cleaning**
- Removes `.NS` or `.BO` suffix for better matching
- Example: `RELIANCE.NS` → `reliance` for text matching

## Usage Example

### Viewing Reliance Stock
1. Select **Reliance** from the stock selector
2. News panel shows all Indian business news
3. Click **"Filter by RELIANCE"** button
4. Panel now shows only news mentioning Reliance or with Reliance in `affectedStocks`

### Switching Stocks
1. Select **TCS** from stock selector
2. Filter automatically updates to show **"Filter by TCS"**
3. Toggle ON to see TCS-specific news
4. Toggle OFF to see all news again

## Technical Implementation

### Component Props
```typescript
interface EnhancedNewsPanelProps {
  stockSymbol?: string // Optional: filter news by specific stock
}

export function EnhancedNewsPanel({ stockSymbol }: EnhancedNewsPanelProps = {})
```

### State Management
```typescript
const [filterByStock, setFilterByStock] = useState(!!stockSymbol)
```

### Filter Effect
```typescript
useEffect(() => {
  if (filterByStock && stockSymbol) {
    setFilteredArticles(articles.filter(article => 
      isArticleRelatedToStock(article, stockSymbol)
    ))
  } else {
    setFilteredArticles(articles)
  }
}, [filterByStock, stockSymbol, articles])
```

### UI Integration
```typescript
// In app/page.tsx
<EnhancedNewsPanel stockSymbol={selectedStock.symbol} />
```

## Benefits

### For Traders
1. **Focus**: See only news relevant to your current position
2. **Speed**: Quickly assess stock-specific sentiment and market impact
3. **Context**: Understand why a stock is moving

### For Analysis
1. **AI Integration**: Works with AI-detected affected stocks
2. **Market Impact**: Filter by high-impact news for specific stocks
3. **Sentiment Analysis**: See positive/negative news for your stock

## Visual Design
- **Purple Gradient**: Active filter (matching AI summary theme)
- **Outline Style**: Inactive filter (subtle, non-intrusive)
- **Target Icon**: Indicates precision filtering
- **Dynamic Text**: Shows current stock symbol and status

## Future Enhancements
1. **Multi-Stock Filter**: Filter by multiple stocks simultaneously
2. **Sector Filter**: Show news for all stocks in a sector
3. **Watchlist Integration**: Filter news for watchlist stocks
4. **Notification**: Alert when high-impact news for filtered stock appears
5. **Historical Filter**: See how news affected stock price historically

## Testing
```bash
# 1. Start the server
npm run dev

# 2. Open browser at http://localhost:3002
# 3. Select different stocks from dropdown
# 4. Toggle filter button ON/OFF
# 5. Verify filtered articles are relevant
```

## Example Matched Stocks
- Reliance Industries → "RELIANCE", "RIL"
- Tata Consultancy Services → "TCS", "Tata"
- HDFC Bank → "HDFC", "HDFCBANK"
- Infosys → "INFY", "Infosys"
- ICICI Bank → "ICICI", "ICICIBANK"

## Notes
- Filter persists when switching between stocks
- Works with all existing filters (category, sentiment)
- Compatible with AI summarization feature
- Zero performance impact (client-side filtering)
