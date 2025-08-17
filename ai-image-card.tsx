"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Download, RefreshCw } from "lucide-react"

export function AIImageCard() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentImage, setCurrentImage] = useState<string | null>(null)

  const generateImage = async () => {
    setIsGenerating(true)

    // Simulate AI image generation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Use a placeholder image for demo
    const imageUrl = `/placeholder.svg?height=200&width=300&query=abstract+trading+chart+visualization+with+candlesticks+and+trend+lines`
    setCurrentImage(imageUrl)
    setIsGenerating(false)
  }

  const downloadImage = () => {
    if (currentImage) {
      const link = document.createElement("a")
      link.href = currentImage
      link.download = "ai-market-visualization.png"
      link.click()
    }
  }

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Badge className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 border-pink-400/30">
            AI Generated
          </Badge>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateImage}
              disabled={isGenerating}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            </Button>
            {currentImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadImage}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="aspect-video bg-black/20 rounded-lg border border-white/10 flex items-center justify-center mb-3">
          {isGenerating ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400 mx-auto mb-2"></div>
              <p className="text-sm text-gray-400">Generating visualization...</p>
            </div>
          ) : currentImage ? (
            <img
              src={currentImage || "/placeholder.svg"}
              alt="AI Generated Market Visualization"
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="text-center">
              <Sparkles className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Click to generate AI visualization</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-white text-sm">Market Pattern Analysis</h4>
          <p className="text-xs text-gray-300 leading-relaxed">
            AI-powered visualization of current market trends, support/resistance levels, and pattern recognition for
            enhanced trading insights.
          </p>
        </div>
      </div>
    </div>
  )
}
