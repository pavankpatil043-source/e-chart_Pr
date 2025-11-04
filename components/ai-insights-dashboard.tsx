"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Brain, 
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface AIInsightsDashboardProps {
  symbol: string
  timeframe?: string
}

interface NewsSentiment {
  score: number
  sentiment: 'positive' | 'negative' | 'neutral'
  impact: 'high' | 'medium' | 'low'
  summary: string
  keywords: string[]
  confidence: number
}

interface VolumeAnalysis {
  volumeTrend: 'increasing' | 'decreasing' | 'stable'
  accumulationDistribution: {
    score: number
    trend: 'accumulation' | 'distribution' | 'neutral'
    strength: 'strong' | 'moderate' | 'weak'
    interpretation: string
  }
  anomalies: Array<{
    date: string
    type: 'spike' | 'drop'
    significance: 'high' | 'medium' | 'low'
    interpretation: string
  }>
  patterns: Array<{
    pattern: string
    description: string
    confidence: number
    bullish: boolean
    significance: 'high' | 'medium' | 'low'
  }>
  recommendation: string
}

interface PatternRecognition {
  detectedPatterns: Array<{
    pattern: string
    type: 'bullish' | 'bearish' | 'neutral' | 'reversal'
    confidence: number
    description: string
    significance: 'high' | 'medium' | 'low'
  }>
  openingAnalysis: {
    gapType: 'gap-up' | 'gap-down' | 'no-gap'
    gapPercentage: number
    prediction: string
    confidence: number
  } | null
  overallSignal: 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell'
  recommendation: string
}

interface SupportResistance {
  levels: Array<{
    price: number
    type: 'support' | 'resistance'
    strength: 'strong' | 'moderate' | 'weak'
    touches: number
    confidence: number
  }>
  nearestSupport: { price: number; strength: string } | null
  nearestResistance: { price: number; strength: string } | null
  recommendation: string
}

export function AIInsightsDashboard({ symbol, timeframe = '1M' }: AIInsightsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [newsData, setNewsData] = useState<{ overallSentiment: NewsSentiment; recommendation: string } | null>(null)
  const [volumeData, setVolumeData] = useState<VolumeAnalysis | null>(null)
  const [patternData, setPatternData] = useState<PatternRecognition | null>(null)
  const [srData, setSRData] = useState<SupportResistance | null>(null)

  const fetchAIData = async () => {
    try {
      setRefreshing(true)
      
      // Fetch all AI analyses in parallel
      const [newsRes, volumeRes, patternRes, srRes] = await Promise.all([
        fetch(`/api/ai-news-analysis?symbol=${symbol}`).catch(() => null),
        fetch(`/api/ai-volume-analysis?symbol=${symbol}`).catch(() => null),
        fetch(`/api/ai-pattern-recognition?symbol=${symbol}&timeframe=${timeframe}`).catch(() => null),
        fetch(`/api/support-resistance?symbol=${symbol}&timeframe=${timeframe}`).catch(() => null),
      ])

      if (newsRes?.ok) {
        const data = await newsRes.json()
        if (data.success) setNewsData(data.data)
      }

      if (volumeRes?.ok) {
        const data = await volumeRes.json()
        if (data.success) setVolumeData(data.data)
      }

      if (patternRes?.ok) {
        const data = await patternRes.json()
        if (data.success) setPatternData(data.data)
      }

      if (srRes?.ok) {
        const data = await srRes.json()
        if (data.success) setSRData(data.data)
      }

    } catch (error) {
      console.error('Error fetching AI data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAIData()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchAIData, 300000)
    return () => clearInterval(interval)
  }, [symbol, timeframe])

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'positive') return 'text-green-600 bg-green-50'
    if (sentiment === 'negative') return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getSignalColor = (signal: string) => {
    if (signal === 'strong-buy' || signal === 'buy') return 'text-green-600'
    if (signal === 'strong-sell' || signal === 'sell') return 'text-red-600'
    return 'text-gray-600'
  }

  const getSignalIcon = (signal: string) => {
    if (signal === 'strong-buy' || signal === 'buy') return <TrendingUp className="h-5 w-5" />
    if (signal === 'strong-sell' || signal === 'sell') return <TrendingDown className="h-5 w-5" />
    return <Activity className="h-5 w-5" />
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Loading AI insights...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Trading Analysis
            </CardTitle>
            <CardDescription>
              Real-time AI insights for {symbol}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAIData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="sr">S/R Levels</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* News Sentiment */}
              {newsData && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">News Sentiment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getSentimentColor(newsData.overallSentiment.sentiment)}>
                        {newsData.overallSentiment.sentiment.toUpperCase()}
                      </Badge>
                      <span className="text-2xl font-bold">{newsData.overallSentiment.score}/10</span>
                    </div>
                    <Progress value={newsData.overallSentiment.score * 10} className="h-2 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {newsData.overallSentiment.impact} impact · {newsData.overallSentiment.confidence}% confidence
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Volume Analysis */}
              {volumeData && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Volume Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={
                        volumeData.accumulationDistribution.trend === 'accumulation' 
                          ? 'text-green-600 bg-green-50' 
                          : volumeData.accumulationDistribution.trend === 'distribution'
                          ? 'text-red-600 bg-red-50'
                          : 'text-gray-600 bg-gray-50'
                      }>
                        {volumeData.accumulationDistribution.trend.toUpperCase()}
                      </Badge>
                      <span className="text-2xl font-bold">
                        {volumeData.accumulationDistribution.score > 0 ? '+' : ''}
                        {volumeData.accumulationDistribution.score}
                      </span>
                    </div>
                    <Progress 
                      value={((volumeData.accumulationDistribution.score + 10) / 20) * 100} 
                      className="h-2 mb-2" 
                    />
                    <p className="text-xs text-muted-foreground">
                      {volumeData.accumulationDistribution.strength} strength · {volumeData.volumeTrend} trend
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Pattern Recognition */}
              {patternData && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Chart Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`flex items-center gap-2 ${getSignalColor(patternData.overallSignal)}`}>
                        {getSignalIcon(patternData.overallSignal)}
                        <span className="text-sm font-semibold">
                          {patternData.overallSignal.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      <Badge variant="outline">
                        {patternData.detectedPatterns.length} patterns
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {patternData.detectedPatterns.slice(0, 2).map(p => p.pattern).join(', ')}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Support/Resistance */}
              {srData && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Support/Resistance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {srData.nearestResistance && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Resistance</span>
                          <span className="text-sm font-semibold text-red-600">
                            ₹{srData.nearestResistance.price.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {srData.nearestSupport && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Support</span>
                          <span className="text-sm font-semibold text-green-600">
                            ₹{srData.nearestSupport.price.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <Badge variant="outline" className="w-full justify-center">
                        {srData.levels.length} levels detected
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Combined Recommendation */}
            <Card className="bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  AI Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {newsData && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <p className="text-sm">{newsData.recommendation}</p>
                  </div>
                )}
                {volumeData && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <p className="text-sm">{volumeData.recommendation}</p>
                  </div>
                )}
                {patternData && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <p className="text-sm">{patternData.recommendation}</p>
                  </div>
                )}
                {srData && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <p className="text-sm">{srData.recommendation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-4">
            {newsData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Overall Sentiment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sentiment Score</span>
                      <Badge className={getSentimentColor(newsData.overallSentiment.sentiment)}>
                        {newsData.overallSentiment.score}/10
                      </Badge>
                    </div>
                    <Progress value={newsData.overallSentiment.score * 10} className="h-2" />
                    <p className="text-sm text-muted-foreground">{newsData.overallSentiment.summary}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {newsData.overallSentiment.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5">
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium">{newsData.recommendation}</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No news data available
              </div>
            )}
          </TabsContent>

          {/* Volume Tab */}
          <TabsContent value="volume" className="space-y-4">
            {volumeData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Accumulation/Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">A/D Score</span>
                      <span className="text-lg font-bold">
                        {volumeData.accumulationDistribution.score > 0 ? '+' : ''}
                        {volumeData.accumulationDistribution.score}
                      </span>
                    </div>
                    <Progress 
                      value={((volumeData.accumulationDistribution.score + 10) / 20) * 100} 
                      className="h-2" 
                    />
                    <p className="text-sm text-muted-foreground">
                      {volumeData.accumulationDistribution.interpretation}
                    </p>
                  </CardContent>
                </Card>

                {volumeData.patterns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Volume Patterns</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {volumeData.patterns.map((pattern, idx) => (
                        <div key={idx} className="flex items-start gap-2 border-b last:border-0 pb-2 last:pb-0">
                          <Badge 
                            variant="outline" 
                            className={pattern.bullish ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}
                          >
                            {pattern.confidence}%
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{pattern.pattern}</p>
                            <p className="text-xs text-muted-foreground">{pattern.description}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {volumeData.anomalies.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Recent Anomalies</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {volumeData.anomalies.slice(0, 5).map((anomaly, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          {anomaly.type === 'spike' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-muted-foreground">{anomaly.date}</span>
                          <Badge variant="outline" className="text-xs">
                            {anomaly.significance}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No volume data available
              </div>
            )}
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4">
            {patternData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Overall Signal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`flex items-center gap-3 ${getSignalColor(patternData.overallSignal)}`}>
                      {getSignalIcon(patternData.overallSignal)}
                      <span className="text-lg font-bold">
                        {patternData.overallSignal.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">{patternData.recommendation}</p>
                  </CardContent>
                </Card>

                {patternData.openingAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">9:15 AM Opening Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Gap Type</span>
                        <Badge variant={
                          patternData.openingAnalysis.gapType === 'gap-up' ? 'default' :
                          patternData.openingAnalysis.gapType === 'gap-down' ? 'destructive' :
                          'secondary'
                        }>
                          {patternData.openingAnalysis.gapType.replace('-', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Gap %</span>
                        <span className="text-sm font-semibold">
                          {patternData.openingAnalysis.gapPercentage > 0 ? '+' : ''}
                          {patternData.openingAnalysis.gapPercentage.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-2">
                        {patternData.openingAnalysis.prediction}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {patternData.detectedPatterns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Detected Patterns</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {patternData.detectedPatterns.map((pattern, idx) => (
                        <div key={idx} className="border-b last:border-0 pb-3 last:pb-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{pattern.pattern}</span>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline"
                                className={
                                  pattern.type === 'bullish' ? 'text-green-600 border-green-600' :
                                  pattern.type === 'bearish' ? 'text-red-600 border-red-600' :
                                  'text-gray-600 border-gray-600'
                                }
                              >
                                {pattern.type}
                              </Badge>
                              <Badge variant="secondary">{pattern.confidence}%</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{pattern.description}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No pattern data available
              </div>
            )}
          </TabsContent>

          {/* S/R Levels Tab */}
          <TabsContent value="sr" className="space-y-4">
            {srData ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {srData.nearestResistance && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-red-600">Nearest Resistance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">₹{srData.nearestResistance.price.toFixed(2)}</p>
                        <Badge variant="outline" className="mt-2">
                          {srData.nearestResistance.strength} level
                        </Badge>
                      </CardContent>
                    </Card>
                  )}

                  {srData.nearestSupport && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-green-600">Nearest Support</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">₹{srData.nearestSupport.price.toFixed(2)}</p>
                        <Badge variant="outline" className="mt-2">
                          {srData.nearestSupport.strength} level
                        </Badge>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">All Levels ({srData.levels.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {srData.levels.slice(0, 10).map((level, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {level.type === 'resistance' ? (
                            <div className="w-2 h-2 rounded-full bg-red-600" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-green-600" />
                          )}
                          <span className="font-medium">₹{level.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{level.touches} touches</span>
                          <Badge variant="outline" className="text-xs">
                            {level.strength}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-primary/5">
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium">{srData.recommendation}</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No S/R data available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
