"use client"
import { useAppStore } from "../store"
import { useMemo, useRef, useEffect, useState, useCallback } from "react"
import { getColorStringForGcode } from "../utils/visualizeGcode"
import { resolveOverlaps } from "../utils/timeline-helpers"

// Intersection pointer component
function IntersectionPointer({
  layer,
  totalLayers,
  timelineRef,
  index,
  onDragStart,
  onDrag,
  onDragEnd,
  isEndpoint = false,
}) {
  const pointerRef = useRef(null)

  // Convert layer to percentage position
  const layerToPercent = (layer) => {
    // Invert so layer 0 is at the bottom
    return 1 - layer / totalLayers
  }

  const position = layerToPercent(layer) * 100

  // Simple event handlers with no state
  const handleMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()

    // Call the drag start handler
    onDragStart(index, e.clientY)

    // Add global event listeners
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
  }

  const handleMouseMove = (e) => {
    onDrag(index, e.clientY)
  }

  const handleMouseUp = (e) => {
    onDragEnd(index, e.clientY)

    // Remove global event listeners
    window.removeEventListener("mousemove", handleMouseMove)
    window.removeEventListener("mouseup", handleMouseUp)
  }

  return (
    <div
      ref={pointerRef}
      className="absolute -left-3 h-4 w-8 cursor-ns-resize z-10 group"
      style={{
        top: `${position}%`,
        transform: "translateY(-50%)",
        touchAction: "none", // Prevent scrolling while dragging on touch devices
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Triangle pointer */}
      <div
        className={`w-0 h-0 border-solid ${
          isEndpoint
            ? "border-t-8 border-t-white border-x-8 border-x-transparent"
            : "border-b-8 border-b-white border-x-8 border-x-transparent"
        }`}
        style={{
          position: "absolute",
          left: "50%",
          top: isEndpoint ? "auto" : "0",
          bottom: isEndpoint ? "0" : "auto",
          transform: "translateX(-50%)",
        }}
      />
      {/* Horizontal line */}
      <div
        className="absolute w-full h-0.5 bg-white"
        style={{
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />

      {/* Layer number indicator - always visible on the left side */}
      <div
        className="absolute right-full mr-2 px-1.5 py-0.5 bg-gray-800 rounded text-xs text-white whitespace-nowrap"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {layer}
      </div>
    </div>
  )
}

export default function Timeline() {
  const timeline = useAppStore((s) => s.timeline)
  const uploads = useAppStore((s) => s.uploads)
  const updateTimeline = useAppStore((s) => s.updateTimeline)
  const removeSegment = useAppStore((s) => s.removeSegment)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [trackHeight, setTrackHeight] = useState(300)

  // Local state for visual feedback during dragging
  const [draggedIntersection, setDraggedIntersection] = useState<{
    index: number
    layer: number
  } | null>(null)

  // State for segment dragging
  const [draggedSegment, setDraggedSegment] = useState<{
    index: number
    clientY: number
  } | null>(null)

  // State for drop target
  const [dropTarget, setDropTarget] = useState<number | null>(null)

  // Throttle timer to limit state updates
  const throttleTimerRef = useRef<number | null>(null)

  // Update track height when component mounts
  useEffect(() => {
    if (timelineRef.current) {
      const updateHeight = () => {
        if (timelineRef.current) {
          setTrackHeight(timelineRef.current.clientHeight)
        }
      }

      updateHeight()

      // Also update on window resize
      window.addEventListener("resize", updateHeight)
      return () => window.removeEventListener("resize", updateHeight)
    }
  }, [])

  const totalLayers = useMemo(() => {
    let max = 0
    Object.values(uploads).forEach((u) => (max = Math.max(max, u.layerCount)))
    return max || 100 // Default to 100 if no layers
  }, [uploads])

  // Convert layer to percentage (for CSS positioning)
  const layerToPercent = useCallback(
    (layer: number) => {
      // Invert so layer 0 is at the bottom
      return 1 - layer / totalLayers
    },
    [totalLayers],
  )

  // Calculate intersection points between segments
  const intersections = useMemo(() => {
    if (timeline.length === 0) return []

    // Sort segments by 'from' value
    const sortedSegments = [...timeline].sort((a, b) => a.from - b.from)

    // Create array of intersection points
    const points = []

    // Add the start point (first segment's 'from')
    points.push({
      layer: sortedSegments[0].from,
      isStart: true,
    })

    // Add intersection points between segments
    for (let i = 0; i < sortedSegments.length - 1; i++) {
      points.push({
        layer: sortedSegments[i].to,
        isIntersection: true,
      })
    }

    // Add the end point (last segment's 'to')
    points.push({
      layer: sortedSegments[sortedSegments.length - 1].to,
      isEnd: true,
    })

    return points
  }, [timeline])

  // Handle drag start for intersection points
  const handleIntersectionDragStart = useCallback(
    (intersectionIndex: number, initialY: number) => {
      if (intersectionIndex >= 0 && intersectionIndex < intersections.length) {
        const intersection = intersections[intersectionIndex]

        // Set local state for visual feedback
        setDraggedIntersection({
          index: intersectionIndex,
          layer: intersection.layer,
        })
      }
    },
    [intersections],
  )

  // Calculate new layer based on current position
  const calculateNewLayer = useCallback(
    (currentY: number) => {
      if (!timelineRef.current) return 0

      const rect = timelineRef.current.getBoundingClientRect()

      // Calculate the percentage of the timeline where the pointer is
      const pointerPercent = (currentY - rect.top) / rect.height

      // Clamp to 0-1 range
      const clampedPercent = Math.max(0, Math.min(1, pointerPercent))

      // Convert to layer (invert because 0% is at the top but layer 0 is at the bottom)
      return Math.round(totalLayers * (1 - clampedPercent))
    },
    [totalLayers],
  )

  // Handle drag movement for intersection points
  const handleIntersectionDrag = useCallback(
    (intersectionIndex: number, currentY: number) => {
      // Calculate the new layer directly from the current position
      const newLayer = calculateNewLayer(currentY)

      // Update local state for visual feedback
      setDraggedIntersection({
        index: intersectionIndex,
        layer: newLayer,
      })

      // Throttle global state updates to improve performance
      if (throttleTimerRef.current === null) {
        throttleTimerRef.current = window.setTimeout(() => {
          throttleTimerRef.current = null

          // Create a copy of the timeline
          const newTimeline = [...timeline].sort((a, b) => a.from - b.from)
          // Update the affected segments based on which intersection is being dragged
          if (intersectionIndex === 0) {
            // Dragging the start point - update the first segment's 'from'
            if (newTimeline.length > 0) {
              newTimeline[0] = {
                ...newTimeline[0],
                from: newLayer,
              }
            }
          } else if (intersectionIndex === intersections.length - 1) {
            // Dragging the end point - update the last segment's 'to'
            if (newTimeline.length > 0) {
              newTimeline[newTimeline.length - 1] = {
                ...newTimeline[newTimeline.length - 1],
                to: newLayer,
              }
            }
          } else {
            // Dragging an intersection - update the 'to' of one segment and 'from' of the next
            if (newTimeline.length > intersectionIndex) {
              // Update the current segment's 'to'
              newTimeline[intersectionIndex - 1] = {
                ...newTimeline[intersectionIndex - 1],
                to: newLayer,
              }

              // Update the next segment's 'from'
              newTimeline[intersectionIndex] = {
                ...newTimeline[intersectionIndex],
                from: newLayer,
              }
            }
          }

          // Resolve any overlaps that might have occurred
          const resolvedTimeline = resolveOverlaps(newTimeline, totalLayers)
          updateTimeline(resolvedTimeline)
        }, 16) // Reduced throttle time for more responsive updates (60fps)
      }
    },
    [timeline, calculateNewLayer, updateTimeline, totalLayers, intersections.length],
  )

  // Handle drag end for intersection points
  const handleIntersectionDragEnd = useCallback(
    (intersectionIndex: number, finalY: number) => {
      // Clear any pending throttled updates
      if (throttleTimerRef.current !== null) {
        clearTimeout(throttleTimerRef.current)
        throttleTimerRef.current = null
      }

      // Calculate the final layer directly from the final position
      const newLayer = calculateNewLayer(finalY)

      // Create a copy of the timeline
      const newTimeline = [...timeline].sort((a, b) => a.from - b.from)

      // Update the affected segments based on which intersection is being dragged
      if (intersectionIndex === 0) {
        // Dragging the start point - update the first segment's 'from'
        if (newTimeline.length > 0) {
          newTimeline[0] = {
            ...newTimeline[0],
            from: newLayer,
          }
        }
      } else if (intersectionIndex === intersections.length - 1) {
        // Dragging the end point - update the last segment's 'to'
        if (newTimeline.length > 0) {
          newTimeline[newTimeline.length - 1] = {
            ...newTimeline[newTimeline.length - 1],
            to: newLayer,
          }
        }
      } else {
        // Dragging an intersection - update the 'to' of one segment and 'from' of the next
        if (newTimeline.length > intersectionIndex) {
          // Update the current segment's 'to'
          newTimeline[intersectionIndex - 1] = {
            ...newTimeline[intersectionIndex - 1],
            to: newLayer,
          }

          // Update the next segment's 'from'
          newTimeline[intersectionIndex] = {
            ...newTimeline[intersectionIndex],
            from: newLayer,
          }
        }
      }

      // Resolve any overlaps that might have occurred
      const resolvedTimeline = resolveOverlaps(newTimeline, totalLayers)
      updateTimeline(resolvedTimeline)
      setDraggedIntersection(null)
    },
    [timeline, calculateNewLayer, updateTimeline, totalLayers, intersections.length],
  )

  // Handle segment drag start
  const handleSegmentDragStart = useCallback((index: number, clientY: number) => {
    setDraggedSegment({ index, clientY })
    document.addEventListener("mousemove", handleSegmentDragMove)
    document.addEventListener("mouseup", handleSegmentDragEnd)
  }, [])

  // Handle segment drag move
  const handleSegmentDragMove = useCallback(
    (e: MouseEvent) => {
      if (!draggedSegment || !timelineRef.current) return

      const { clientY } = e
      const rect = timelineRef.current.getBoundingClientRect()

      // Find which segment we're hovering over
      const sortedTimeline = [...timeline].sort((a, b) => a.from - b.from)
      const pointerPercent = (clientY - rect.top) / rect.height
      const pointerLayer = Math.round(totalLayers * (1 - pointerPercent))

      // Find the segment that contains this layer
      let targetIndex = null
      for (let i = 0; i < sortedTimeline.length; i++) {
        const segment = sortedTimeline[i]
        if (pointerLayer >= segment.from && pointerLayer <= segment.to) {
          targetIndex = i
          break
        }
      }

      // Don't allow dropping on self
      if (targetIndex !== null && targetIndex !== draggedSegment.index) {
        setDropTarget(targetIndex)
      } else {
        setDropTarget(null)
      }
    },
    [draggedSegment, timeline, totalLayers],
  )

  // Handle segment drag end
  const handleSegmentDragEnd = useCallback(
    (e: MouseEvent) => {
      document.removeEventListener("mousemove", handleSegmentDragMove)
      document.removeEventListener("mouseup", handleSegmentDragEnd)

      // If we have a valid drop target, swap the G-codes
      if (draggedSegment !== null && dropTarget !== null) {
        const sortedTimeline = [...timeline].sort((a, b) => a.from - b.from)
        const sourceSegment = sortedTimeline[draggedSegment.index]
        const targetSegment = sortedTimeline[dropTarget]

        // Create a new timeline with the swapped G-code
        const newTimeline = sortedTimeline.map((segment, i) => {
          if (i === dropTarget) {
            // Replace the target segment's G-code with the source segment's G-code
            return {
              ...segment,
              gcodeId: sourceSegment.gcodeId,
            }
          }
          return segment
        })

        updateTimeline(newTimeline)
      }

      setDraggedSegment(null)
      setDropTarget(null)
    },
    [draggedSegment, dropTarget, timeline, updateTimeline],
  )

  // Handle removing a segment from the timeline
  const handleRemoveSegment = useCallback(
    (segmentIndex: number) => {
      const sortedTimeline = [...timeline].sort((a, b) => a.from - b.from)
      const segment = sortedTimeline[segmentIndex]
      if (!segment) return

      if (confirm(`Remove this segment from the timeline?`)) {
        // Create a copy of the timeline
        const newTimeline = [...sortedTimeline]

        // Get the segment to remove
        const removedSegment = newTimeline[segmentIndex]
        const removedFrom = removedSegment.from
        const removedTo = removedSegment.to

        // Remove the segment
        newTimeline.splice(segmentIndex, 1)

        // If there are no segments left, we're done
        if (newTimeline.length === 0) {
          updateTimeline(newTimeline)
          return
        }

        // Fill the gap by extending adjacent segments
        if (segmentIndex === 0) {
          // If we removed the first segment, extend the next segment down
          if (newTimeline.length > 0) {
            newTimeline[0] = {
              ...newTimeline[0],
              from: removedFrom,
            }
          }
        } else if (segmentIndex === sortedTimeline.length - 1) {
          // If we removed the last segment, extend the previous segment up
          if (newTimeline.length > 0) {
            newTimeline[newTimeline.length - 1] = {
              ...newTimeline[newTimeline.length - 1],
              to: removedTo,
            }
          }
        } else {
          // If we removed a middle segment, extend the previous segment up
          newTimeline[segmentIndex - 1] = {
            ...newTimeline[segmentIndex - 1],
            to: removedTo,
          }
        }

        updateTimeline(newTimeline)
      }
    },
    [timeline, updateTimeline],
  )

  // Render optimized layer markers - only render a subset based on screen size
  const renderLayerMarkers = useMemo(() => {
    // Determine how many markers to show based on height
    const markerCount = Math.min(11, Math.max(5, Math.floor(trackHeight / 50)))

    return Array.from({ length: markerCount }).map((_, i) => {
      const percent = i / (markerCount - 1)
      // Invert the layer number to match the visualization
      const layerNum = Math.round((1 - percent) * totalLayers)
      return (
        <div
          key={`layer-${i}`}
          className="absolute left-0 w-6 border-t border-gray-600"
          style={{ top: `${percent * 100}%` }}
        >
          <span className="absolute -left-14 -top-3 text-xs text-gray-400">{layerNum}</span>
        </div>
      )
    })
  }, [trackHeight, totalLayers])

  if (totalLayers === 0) return null

  // Get the sorted timeline for rendering
  const sortedTimeline = [...timeline].sort((a, b) => a.from - b.from)

  return (
    <div className="absolute right-4 top-4 bottom-4 flex w-12 flex-col items-center">
      <div ref={timelineRef} className="relative h-full w-1 bg-gray-700">
        {/* Layer markers */}
        {renderLayerMarkers}

        {/* Colored segments */}
        {sortedTimeline.map((segment, i) => {
          const color = getColorStringForGcode(segment.gcodeId)
          const gcode = uploads[segment.gcodeId]
          if (!gcode) return null

          // Use dragged layer if this segment is affected by a dragged intersection
          let fromLayer = segment.from
          let toLayer = segment.to

          if (draggedIntersection) {
            // If dragging the start intersection and this is the first segment
            if (draggedIntersection.index === 0 && i === 0) {
              fromLayer = draggedIntersection.layer
            }
            // If dragging the end intersection and this is the last segment
            else if (draggedIntersection.index === intersections.length - 1 && i === sortedTimeline.length - 1) {
              toLayer = draggedIntersection.layer
            }
            // If dragging an intersection between segments
            else if (draggedIntersection.index === i + 1) {
              toLayer = draggedIntersection.layer
            } else if (draggedIntersection.index === i) {
              fromLayer = draggedIntersection.layer
            }
          }

          // Calculate percentages for positioning
          const fromPercent = layerToPercent(fromLayer)
          const toPercent = layerToPercent(toLayer)

          // Ensure topPercent is always less than bottomPercent (for proper rendering)
          const topPercent = Math.min(fromPercent, toPercent)
          const heightPercent = Math.abs(toPercent - fromPercent)

          // Determine if this segment is being dragged or is a drop target
          const isDragging = draggedSegment?.index === i
          const isDropTarget = dropTarget === i

          return (
            <div
              key={`segment-${i}`}
              className={`absolute left-0 w-6 -ml-3 group ${isDragging ? "opacity-50" : ""} ${
                isDropTarget ? "ring-2 ring-white" : ""
              }`}
              style={{
                top: `${topPercent * 100}%`,
                height: `${heightPercent * 100}%`,
                backgroundColor: color,
                opacity: isDropTarget ? 0.9 : 0.7,
                borderRadius: "4px",
                cursor: "grab",
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                handleSegmentDragStart(i, e.clientY)
              }}
            >
              {/* Add a remove button for each segment */}
              <button
                className="absolute right-0 top-0 -mr-4 mt-1 h-4 w-4 rounded-full bg-red-600 text-white opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveSegment(i)
                }}
                title="Remove segment"
              >
                <span className="text-xs font-bold">×</span>
              </button>

              {/* G-code name label */}
              <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 text-xs text-white bg-gray-800 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                {gcode.name}
              </div>

              {/* Layer range label */}
              <div className="absolute left-full ml-2 bottom-0 transform translate-y-full text-xs text-white bg-gray-800 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                Layers {fromLayer} - {toLayer}
              </div>

              {/* Drag indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="w-4 h-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="white"
                    className="w-4 h-4 opacity-70"
                  >
                    <path d="M8 5a1 1 0 100 2h1a1 1 0 100-2H8zm6 0a1 1 0 100 2h1a1 1 0 100-2h-1zm-6 6a1 1 0 100 2h1a1 1 0 100-2H8zm6 0a1 1 0 100 2h1a1 1 0 100-2h-1zm-6 6a1 1 0 100 2h1a1 1 0 100-2H8zm6 0a1 1 0 100 2h1a1 1 0 100-2h-1z" />
                  </svg>
                </div>
              </div>
            </div>
          )
        })}

        {/* Intersection pointers */}
        {intersections.map((intersection, i) => {
          // Use dragged layer if this is the dragged intersection
          let layer = intersection.layer
          if (draggedIntersection && draggedIntersection.index === i) {
            layer = draggedIntersection.layer
          }

          return (
            <IntersectionPointer
              key={`intersection-${i}-${layer}`}
              layer={layer}
              totalLayers={totalLayers}
              timelineRef={timelineRef}
              index={i}
              onDragStart={handleIntersectionDragStart}
              onDrag={handleIntersectionDrag}
              onDragEnd={handleIntersectionDragEnd}
              isEndpoint={intersection.isStart || intersection.isEnd}
            />
          )
        })}
      </div>
    </div>
  )
}
