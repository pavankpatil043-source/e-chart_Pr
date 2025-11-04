'use client'

import { useLivePrice } from '@/hooks/use-live-price'
import { Badge } from '@/components/ui/badge'
import { Activity, TrendingUp, TrendingDown } from 'lucide-react'

interface LivePriceTickerProps {
  symbol: string
  enabled?: boolean
}

export function LivePriceTicker({ symbol, enabled = true }: LivePriceTickerProps) {
  const { liveData, isConnected, error } = useLivePrice(symbol, enabled)

  if (!liveData) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700">
        <div className="h-2 w-2 rounded-full bg-slate-500 animate-pulse"></div>
        <span className="text-sm text-slate-400">Connecting...</span>
      </div>
    )
  }

  const isPositive = liveData.change >= 0
  const isMarketOpen = liveData.marketState === 'REGULAR' || liveData.marketState === 'PRE'

  return (
    <div className="flex flex-col gap-2">
      {/* Live Status Badge */}
      <div className="flex items-center gap-2">
        {isConnected && isMarketOpen && (
          <Badge variant="default" className="bg-red-600 hover:bg-red-600 animate-pulse">
            <div className="h-2 w-2 rounded-full bg-white mr-1.5 animate-ping"></div>
            LIVE
          </Badge>
        )}
        {isConnected && !isMarketOpen && (
          <Badge variant="secondary" className="bg-slate-600">
            Market Closed
          </Badge>
        )}
        {error && (
          <Badge variant="destructive">
            {error}
          </Badge>
        )}
      </div>

      {/* Price Display */}
      <div className="flex items-baseline gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">
            ₹{liveData.price.toFixed(2)}
          </span>
          <div className={`flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span className="text-sm font-medium">
              {isPositive ? '+' : ''}{liveData.change.toFixed(2)} ({isPositive ? '+' : ''}{liveData.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Market State & Time */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          <span>Last updated: {liveData.time}</span>
        </div>
        {isMarketOpen && (
          <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
            Auto-updating every 5s
          </Badge>
        )}
      </div>

      {/* OHLC Summary */}
      <div className="grid grid-cols-4 gap-2 mt-2 p-2 bg-slate-900/30 rounded">
        <div>
          <div className="text-xs text-slate-500">Open</div>
          <div className="text-sm font-medium text-white">₹{liveData.open.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">High</div>
          <div className="text-sm font-medium text-green-400">₹{liveData.high.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Low</div>
          <div className="text-sm font-medium text-red-400">₹{liveData.low.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Volume</div>
          <div className="text-sm font-medium text-white">
            {(liveData.volume / 1000000).toFixed(2)}M
          </div>
        </div>
      </div>
    </div>
  )
}
