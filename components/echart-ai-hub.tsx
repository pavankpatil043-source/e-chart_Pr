"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Brain, BarChart3, TrendingUp, Sparkles, Bell, Search } from "lucide-react"
import { VisualAIChartAnalysis } from "./visual-ai-chart-analysis"
import { SocialSentimentHeatmap } from "./social-sentiment-heatmap"
import { SentimentAlertPanel } from "./sentiment-alert-panel"
import { SentimentScreener } from "./sentiment-screener"

interface EChartAIHubProps {
  // Props from parent (stock data)
  symbol: string
  currentPrice: number
  previousClose: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  timeframe: string
}

export function EChartAIHub({
  symbol,
  currentPrice,
  previousClose,
  change,
  changePercent,
  high,
  low,
  volume,
  timeframe
}: EChartAIHubProps) {
  const [activeTab, setActiveTab] = useState("visual-analysis")

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5 backdrop-blur-sm">
      <CardHeader className="border-b border-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Brain className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                EChart AI
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Sparkles className="h-3 w-3 text-purple-400 animate-pulse" />
                Advanced AI-Powered Market Intelligence
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="border-purple-500/30 text-purple-400">
            Powered by Gemini Flash
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-black/20 p-1">
            <TabsTrigger 
              value="visual-analysis"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Visual Analysis
            </TabsTrigger>
            
            <TabsTrigger 
              value="social-sentiment"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Sentiment Heatmap
            </TabsTrigger>

            <TabsTrigger 
              value="alerts"
              className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
            >
              <Bell className="h-4 w-4 mr-2" />
              Alerts & Trends
            </TabsTrigger>

            <TabsTrigger 
              value="screener"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
            >
              <Search className="h-4 w-4 mr-2" />
              Trading Screener
            </TabsTrigger>
          </TabsList>

          {/* Visual Analysis Tab */}
          <TabsContent value="visual-analysis" className="mt-6 space-y-4">
            <VisualAIChartAnalysis
              symbol={symbol}
              currentPrice={currentPrice}
              previousClose={previousClose}
              change={change}
              changePercent={changePercent}
              high={high}
              low={low}
              volume={volume}
              timeframe={timeframe}
              onClose={undefined} // No close button needed in tab view
            />
          </TabsContent>

          {/* Social Sentiment Heatmap Tab */}
          <TabsContent value="social-sentiment" className="mt-6">
            <SocialSentimentHeatmap />
          </TabsContent>

          {/* Alerts & Trends Tab */}
          <TabsContent value="alerts" className="mt-6">
            <SentimentAlertPanel />
          </TabsContent>

          {/* Trading Screener Tab */}
          <TabsContent value="screener" className="mt-6">
            <SentimentScreener />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
