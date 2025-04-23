"use client"
import { useState } from "react"
import { useAppStore } from "../store"
import { mergeGcodes } from "../utils/merge"

export default function DownloadButton() {
  const uploads = useAppStore((s) => s.uploads)
  const timeline = useAppStore((s) => s.timeline)
  const [isGenerating, setIsGenerating] = useState(false)

  const onClick = () => {
    setIsGenerating(true)

    // Use setTimeout to allow the UI to update before the potentially heavy merge operation
    setTimeout(() => {
      try {
        const text = mergeGcodes(timeline, uploads)
        const blob = new Blob([text], { type: "text/plain" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "merged.gcode"
        a.click()
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error("Error generating merged G-code:", error)
        alert("Failed to generate merged G-code. Please try again.")
      } finally {
        setIsGenerating(false)
      }
    }, 10)
  }

  return (
    <button
      className="w-full rounded-xl bg-blue-600 py-2 text-center font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
      onClick={onClick}
      disabled={!timeline.length || isGenerating}
    >
      {isGenerating ? "Generating..." : "Download merged G-code"}
    </button>
  )
}
