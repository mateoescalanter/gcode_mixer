"use client"
import { create } from "zustand"
import type { ParsedGCode, Segment } from "./types"
import { nanoid } from "nanoid"
import { clearVisualizationCache } from "./utils/visualizeGcode"
import { resolveOverlaps } from "./utils/timeline-helpers"

interface State {
  uploads: Record<string, ParsedGCode>
  timeline: Segment[]
  sampleRate: number
  showTravelMoves: boolean
  addGcode: (g: ParsedGCode) => string
  removeGcode: (id: string) => void
  updateTimeline: (segments: Segment[]) => void
  removeSegment: (index: number) => void
  clearCache: () => void
  addGcodeToTimeline: (gcodeId: string) => void
  setSampleRate: (rate: number) => void
  setShowTravelMoves: (show: boolean) => void
}

export const useAppStore = create<State>((set, get) => ({
  uploads: {},
  timeline: [],
  sampleRate: 1, // Default sample rate
  showTravelMoves: false, // Travel moves off by default
  addGcode: (g) => {
    const id = nanoid()
    set((s) => ({ uploads: { ...s.uploads, [id]: g } }))
    return id
  },
  removeGcode: (id) =>
    set((s) => {
      // Check if the G-code is still in use in the timeline
      const isInUse = s.timeline.some((seg) => seg.gcodeId === id)
      if (isInUse) {
        alert(
          "Cannot remove G-code that is still in use in the timeline. Remove all instances from the timeline first.",
        )
        return s
      }

      const { [id]: _, ...rest } = s.uploads
      clearVisualizationCache() // Clear cache when removing a G-code
      return { uploads: rest }
    }),
  updateTimeline: (timeline) => set({ timeline }),
  removeSegment: (index) =>
    set((s) => {
      const newTimeline = [...s.timeline]
      newTimeline.splice(index, 1)
      return { timeline: newTimeline }
    }),
  clearCache: clearVisualizationCache,
  addGcodeToTimeline: (gcodeId) =>
    set((s) => {
      const gcode = s.uploads[gcodeId]
      if (!gcode) return s

      // Create a copy of the current timeline
      let newTimeline = [...s.timeline]
      const maxLayers = gcode.layerCount

      if (newTimeline.length === 0) {
        // If this is the first G-code, it takes the full range
        const newSegment = {
          gcodeId,
          from: 0,
          to: maxLayers - 1,
          segmentId: `${gcodeId}-${Date.now()}`, // Add unique segmentId
        }

        newTimeline.push(newSegment)
      } else {
        // Sort the timeline by 'from' value
        newTimeline.sort((a, b) => a.from - b.from)

        // Find the bottom-most segment (the one with the lowest 'from' value)
        const bottomSegment = newTimeline[0]

        // Calculate the midpoint of just the bottom segment
        const midpoint = Math.floor(bottomSegment.from + (bottomSegment.to - bottomSegment.from) / 2)

        // Only adjust the bottom segment
        newTimeline[0] = {
          ...bottomSegment,
          from: midpoint + 1, // Start just after the midpoint
        }

        // Add the new segment below the adjusted bottom segment
        const newSegment = {
          gcodeId,
          from: 0, // Start from the bottom
          to: midpoint, // Go up to the midpoint
          segmentId: `${gcodeId}-${Date.now()}`, // Add unique segmentId
        }

        newTimeline.push(newSegment)

        // Resolve any overlaps that might have occurred
        newTimeline = resolveOverlaps(newTimeline, maxLayers)
      }

      return { timeline: newTimeline }
    }),
  setSampleRate: (rate) => {
    set({ sampleRate: rate })
    clearVisualizationCache() // Clear cache when changing sample rate
  },
  setShowTravelMoves: (show) => {
    console.log("Setting showTravelMoves to:", show)
    set({ showTravelMoves: show })
    clearVisualizationCache() // Clear cache when changing travel moves visibility
  },
}))
