"use client"
import { useState } from "react"
import { useAppStore } from "../store"

export default function VisualizationControls() {
  const sampleRate = useAppStore((s) => s.sampleRate)
  const showTravelMoves = useAppStore((s) => s.showTravelMoves)
  const setSampleRate = useAppStore((s) => s.setSampleRate)
  const setShowTravelMoves = useAppStore((s) => s.setShowTravelMoves)
  const clearCache = useAppStore((s) => s.clearCache)

  const [isPerformanceExpanded, setIsPerformanceExpanded] = useState(false)
  const [isVisualizationExpanded, setIsVisualizationExpanded] = useState(false)

  const handleRateChange = (rate: number) => {
    console.log("Changing sample rate to:", rate)
    setSampleRate(rate)
    clearCache()
  }

  const handleTravelMovesToggle = () => {
    console.log("Travel moves toggle clicked, current state:", showTravelMoves, "changing to:", !showTravelMoves)
    setShowTravelMoves(!showTravelMoves)
    // Make sure cache is cleared immediately
    clearCache()
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
      {/* Performance Control */}
      <div
        className="bg-gray-900 bg-opacity-70 backdrop-blur-sm rounded-lg overflow-hidden transition-all duration-200"
        style={{
          width: isPerformanceExpanded ? "220px" : "180px",
          height: isPerformanceExpanded ? "auto" : "36px",
        }}
        onMouseEnter={() => setIsPerformanceExpanded(true)}
        onMouseLeave={() => setIsPerformanceExpanded(false)}
      >
        <div className="p-2 flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-200">Performance</h4>
          <div className="text-xs text-gray-400">Sample: 1:{sampleRate}</div>
        </div>

        {isPerformanceExpanded && (
          <div className="px-2 pb-2">
            <p className="text-xs text-gray-400 mb-2">Higher values improve performance but reduce detail</p>
            <div className="flex flex-col gap-1">
              <button
                className={`text-xs px-2 py-1 rounded text-left ${
                  sampleRate === 1 ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={() => handleRateChange(1)}
              >
                Maximum Detail (1:1)
              </button>
              <button
                className={`text-xs px-2 py-1 rounded text-left ${
                  sampleRate === 2 ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={() => handleRateChange(2)}
              >
                High Detail (1:2)
              </button>
              <button
                className={`text-xs px-2 py-1 rounded text-left ${
                  sampleRate === 5 ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={() => handleRateChange(5)}
              >
                Medium Detail (1:5)
              </button>
              <button
                className={`text-xs px-2 py-1 rounded text-left ${
                  sampleRate === 10 ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={() => handleRateChange(10)}
              >
                Low Detail (1:10)
              </button>
              <button
                className={`text-xs px-2 py-1 rounded text-left ${
                  sampleRate === 20 ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={() => handleRateChange(20)}
              >
                Minimum Detail (1:20)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visualization Control */}
      <div
        className="bg-gray-900 bg-opacity-70 backdrop-blur-sm rounded-lg overflow-hidden transition-all duration-200"
        style={{
          width: isVisualizationExpanded ? "220px" : "180px",
          height: isVisualizationExpanded ? "auto" : "36px",
        }}
        onMouseEnter={() => setIsVisualizationExpanded(true)}
        onMouseLeave={() => setIsVisualizationExpanded(false)}
      >
        <div className="p-2 flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-200">Visualization</h4>
          <div className="text-xs text-gray-400">{showTravelMoves ? "Travel: On" : "Travel: Off"}</div>
        </div>

        {isVisualizationExpanded && (
          <div className="px-2 pb-2">
            <p className="text-xs text-gray-400 mb-2">Configure what elements are visible in the 3D view</p>
            <div className="flex flex-col gap-1">
              <button
                className={`text-xs px-2 py-1 rounded text-left flex items-center justify-between ${
                  showTravelMoves ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={handleTravelMovesToggle}
              >
                <span>Show Travel Moves</span>
                <span className="text-xs">{showTravelMoves ? "✓" : ""}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
