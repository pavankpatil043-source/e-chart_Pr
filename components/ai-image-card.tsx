"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react"

interface AIImage {
  id: string
  title: string
  description: string
  url: string
  category: string
}

export function AIImageCard() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [images] = useState<AIImage[]>([
    {
      id: "1",
      title: "Ascending Triangle Pattern",
      description: "Technical analysis showing bullish continuation pattern with strong support and resistance levels",
      url: "/ascending-triangle-stock-chart.png",
      category: "Technical Analysis",
    },
    {
      id: "2",
      title: "Market Sentiment Dashboard",
      description: "AI-generated visualization of current market sentiment across different sectors and timeframes",
      url: "/sentiment-analysis-dashboard.png",
      category: "Sentiment Analysis",
    },
    {
      id: "3",
      title: "Banking Sector Volume Analysis",
      description: "Deep dive into banking sector volume patterns and institutional flow analysis",
      url: "/banking-volume-analysis.png",
      category: "Volume Analysis",
    },
    {
      id: "4",
      title: "Futuristic Price Prediction",
      description: "AI-powered price prediction model showing potential future price movements and probability zones",
      url: "/futuristic-price-prediction.png",
      category: "Price Prediction",
    },
  ])

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      nextImage()
    }, 8000) // Auto-advance every 8 seconds

    return () => clearInterval(interval)
  }, [])

  const currentImage = images[currentIndex]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="bg-pink-500/20 text-pink-400 border-pink-500/30">
          AI Generated
        </Badge>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" onClick={prevImage}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-white/70">
            {currentIndex + 1} / {images.length}
          </span>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" onClick={nextImage}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Display */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-pink-900/20 to-pink-800/20 border border-pink-500/20">
        <img
          src={currentImage.url || "/placeholder.svg"}
          alt={currentImage.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement
            target.src = `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(currentImage.title)}`
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-4 w-4 text-pink-400" />
            <Badge variant="secondary" className="bg-pink-500/20 text-pink-400 border-pink-500/30 text-xs">
              {currentImage.category}
            </Badge>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">{currentImage.title}</h3>
          <p className="text-xs text-white/80 line-clamp-2">{currentImage.description}</p>
        </div>
      </div>

      {/* Indicators */}
      <div className="flex justify-center space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? "bg-pink-400" : "bg-white/30"
            }`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="text-xs text-white/50 text-center">AI-powered market visualization • Updates every 8 seconds</div>
    </div>
  )
}
