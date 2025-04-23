import type { Segment } from "../types"

// Helper function to check if two segments overlap
export const segmentsOverlap = (a: Segment, b: Segment) => {
  return a.from <= b.to && a.to >= b.from
}

// Helper function to ensure segments don't overlap
export const resolveOverlaps = (segments: Segment[], totalLayers: number): Segment[] => {
  if (segments.length <= 1) return segments

  // Sort segments by 'from' value
  const sorted = [...segments].sort((a, b) => a.from - b.from)

  // First pass: check for and resolve overlaps by pushing up or down
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]

    if (segmentsOverlap(current, next)) {
      // Calculate the overlap amount
      const overlapAmount = current.to - next.from + 1

      // Determine if we should push up or down
      // We'll choose the direction that requires the smallest change
      const pushUpSpace = totalLayers - 1 - next.to // Space available above
      const pushDownSpace = current.from // Space available below

      const currentSize = current.to - current.from + 1
      const nextSize = next.to - next.from + 1

      // Option 1: Push the upper segment up
      const pushUpChange = Math.min(overlapAmount, pushUpSpace)

      // Option 2: Push the lower segment down
      const pushDownChange = Math.min(overlapAmount, pushDownSpace)

      // Choose the option that preserves more of the original sizes
      if (pushUpChange >= overlapAmount || (pushUpChange >= pushDownChange && next.to + pushUpChange < totalLayers)) {
        // Push up - shift the upper segment up by the overlap amount
        sorted[i + 1] = {
          ...next,
          from: next.from + overlapAmount,
          to: Math.min(totalLayers - 1, next.to + overlapAmount),
        }
      } else {
        // Push down - shift the lower segment down by the overlap amount
        sorted[i] = {
          ...current,
          from: Math.max(0, current.from - overlapAmount),
          to: current.to - overlapAmount,
        }
      }
    }
  }

  // Second pass: ensure minimum segment size and no remaining overlaps
  for (let i = 0; i < sorted.length; i++) {
    const segment = sorted[i]

    // Ensure minimum segment size (at least 1 layer)
    if (segment.to < segment.from) {
      sorted[i] = {
        ...segment,
        to: segment.from,
      }
    }

    // Check for overlaps with the next segment
    if (i < sorted.length - 1) {
      const next = sorted[i + 1]
      if (segmentsOverlap(segment, next)) {
        // If still overlapping, force a 1-layer gap
        sorted[i + 1] = {
          ...next,
          from: segment.to + 1,
          to: Math.max(segment.to + 1, next.to),
        }
      }
    }
  }

  return sorted
}

// Helper function to distribute segments evenly
export const distributeSegments = (segments: Segment[], totalLayers: number): Segment[] => {
  if (segments.length <= 1) return segments

  // Sort segments by 'from' value
  const sorted = [...segments].sort((a, b) => a.from - b.from)

  // Calculate total space needed (sum of all segment sizes)
  const totalSize = sorted.reduce((sum, segment) => sum + (segment.to - segment.from + 1), 0)

  // If total size exceeds available layers, we need to scale down
  const scaleFactor = totalSize > totalLayers ? totalLayers / totalSize : 1

  let currentLayer = 0
  const result: Segment[] = []

  // Distribute segments with even spacing
  for (let i = 0; i < sorted.length; i++) {
    const segment = sorted[i]
    const originalSize = segment.to - segment.from + 1
    const newSize = Math.max(1, Math.floor(originalSize * scaleFactor))

    result.push({
      ...segment,
      from: currentLayer,
      to: currentLayer + newSize - 1,
    })

    currentLayer += newSize
  }

  return result
}
