"use client"
import { useAppStore } from "../store"
import type React from "react"

import type { ParsedGCode } from "../types"
import { getColorStringForGcode } from "../utils/visualizeGcode"

interface GcodeItemProps {
  id: string
  gcode: ParsedGCode
}

export default function GcodeItem({ id, gcode }: GcodeItemProps) {
  const timeline = useAppStore((s) => s.timeline)
  const updateTimeline = useAppStore((s) => s.updateTimeline)
  const removeGcode = useAppStore((s) => s.removeGcode)
  const addGcodeToTimeline = useAppStore((s) => s.addGcodeToTimeline)

  // Count how many instances of this G-code are in the timeline
  const instanceCount = timeline.filter((seg) => seg.gcodeId === id).length
  const color = getColorStringForGcode(id)

  const addToTimeline = () => {
    addGcodeToTimeline(id)
  }

  const handleRemove = () => {
    if (confirm(`Remove ${gcode.name}?`)) {
      removeGcode(id)
    }
  }

  // Handle drag start
  const handleDragStart = (e: React.DragEvent) => {
    // Set the drag data with the G-code ID
    e.dataTransfer.setData("application/gcode-id", id)

    // Set the drag effect
    e.dataTransfer.effectAllowed = "copy"

    // Add a custom class to the element being dragged
    e.currentTarget.classList.add("dragging")
  }

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    // Remove the custom class
    e.currentTarget.classList.remove("dragging")
  }

  return (
    <div
      className="rounded-xl bg-gray-800 p-2 text-sm cursor-grab active:cursor-grabbing hover:bg-gray-750 transition-colors"
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
          title={`Color for ${gcode.name}`}
        />
        <div className="truncate font-medium">{gcode.name}</div>
      </div>
      <div className="flex justify-between items-center pl-6">
        <div className="text-xs text-gray-400">
          {gcode.layerCount} layers
          {instanceCount > 0 && ` (${instanceCount} in timeline)`}
        </div>
        <div className="flex gap-2">
          {/* Always show the Add button */}
          <button
            onClick={addToTimeline}
            className="text-xs px-2 py-1 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
          <button
            onClick={handleRemove}
            className="text-xs px-2 py-1 bg-red-600 rounded hover:bg-red-700 transition-colors"
            disabled={instanceCount > 0}
            title={instanceCount > 0 ? "Remove all instances from timeline first" : ""}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
