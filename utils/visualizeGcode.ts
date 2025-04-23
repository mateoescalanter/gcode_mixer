import * as THREE from "three"
import type { ParsedGCode } from "../types"
import { useAppStore } from "../store"

// Cache for parsed G-code visualizations - now with separate extrusion and travel paths
const visualizationCache = new Map<string, { extrusion: THREE.Vector3[]; travel: THREE.Vector3[] }>()

// Interface for parsed visualization data
export interface ParsedVis {
  extrusion: THREE.Vector3[]
  travel: THREE.Vector3[]
}

// Parse G-code commands for visualization with caching
export function parseGcodeForVisualization(gcode: ParsedGCode, layerRange: [number, number]): ParsedVis {
  const state = useAppStore.getState()
  const sampleRate = state.sampleRate || 1

  // Create a cache key that includes the layer range and sample rate, but NOT the toggle state
  const cacheKey = `${gcode.name}-${layerRange[0]}-${layerRange[1]}-${sampleRate}`

  // Check if we have a cache for this exact configuration
  if (visualizationCache.has(cacheKey)) {
    console.log("Using cached visualization data")
    return visualizationCache.get(cacheKey)!
  }

  console.log("Generating new visualization data with sample rate:", sampleRate)

  // If not in cache, parse the G-code
  const extrusion: THREE.Vector3[] = []
  const travel: THREE.Vector3[] = []
  let travelMoveCount = 0
  let extrusionMoveCount = 0
  const transitionMoveCount = 0

  // Get the line ranges for the specified layers
  const startLayer = Math.max(0, layerRange[0])
  const endLayer = Math.min(gcode.layerCount - 1, layerRange[1])

  let startLine = 0
  let endLine = gcode.lines.length - 1

  if (gcode.layerMap.has(startLayer)) {
    startLine = gcode.layerMap.get(startLayer)![0]
  }

  if (gcode.layerMap.has(endLayer)) {
    endLine = gcode.layerMap.get(endLayer)![1]
  }

  // Process lines within the layer range
  const linesToProcess = gcode.lines.slice(startLine, endLine + 1)

  // Track extruder state
  let lastE = 0
  let extruderAbsolute = true // Cura's default (M82)
  let inLayerChange = false
  let lastLayerNum = -1

  // Track current position and path
  const current = new THREE.Vector3(0, 0, 0)

  // Track the current extrusion path for each layer
  const currentLayerPaths: {
    layer: number
    extrusionPaths: THREE.Vector3[][]
    travelPaths: THREE.Vector3[][]
  }[] = []

  let currentExtrusionPath: THREE.Vector3[] = []
  let currentTravelPath: THREE.Vector3[] = []
  let currentLayer = startLayer
  let isExtrusion = false
  let lastIsExtrusion = false

  // First pass: collect all paths by layer
  for (let i = 0; i < linesToProcess.length; i++) {
    const raw = linesToProcess[i].trim()

    // Check for layer change
    if (raw.startsWith(";LAYER:")) {
      const layerNum = Number.parseInt(raw.split(":")[1], 10)
      if (!isNaN(layerNum) && layerNum !== lastLayerNum) {
        // Finish current path if any
        if (currentExtrusionPath.length > 0) {
          let layerData = currentLayerPaths.find((l) => l.layer === currentLayer)
          if (!layerData) {
            layerData = { layer: currentLayer, extrusionPaths: [], travelPaths: [] }
            currentLayerPaths.push(layerData)
          }
          layerData.extrusionPaths.push([...currentExtrusionPath])
          currentExtrusionPath = []
        }

        if (currentTravelPath.length > 0) {
          let layerData = currentLayerPaths.find((l) => l.layer === currentLayer)
          if (!layerData) {
            layerData = { layer: currentLayer, extrusionPaths: [], travelPaths: [] }
            currentLayerPaths.push(layerData)
          }
          layerData.travelPaths.push([...currentTravelPath])
          currentTravelPath = []
        }

        inLayerChange = true
        lastLayerNum = layerNum
        currentLayer = layerNum
        lastIsExtrusion = false
      }
      continue
    }

    if (raw === "" || raw.startsWith(";")) continue

    const parts = raw.split(" ")
    const command = parts[0].toUpperCase()

    // Detect extrusion mode switches
    if (command === "M82") {
      extruderAbsolute = true
      continue
    }
    if (command === "M83") {
      extruderAbsolute = false
      continue
    }

    // Only process movement commands
    if (command !== "G0" && command !== "G1") continue

    // Parse coordinates
    let x = current.x
    let y = current.y
    let z = current.z
    let e: number | null = null

    for (let j = 1; j < parts.length; j++) {
      const part = parts[j]
      const code = part.charAt(0).toUpperCase()
      const value = Number.parseFloat(part.substring(1))

      if (isNaN(value)) continue // Skip invalid values

      if (code === "X") x = value
      else if (code === "Y") y = value
      else if (code === "Z") z = value
      else if (code === "E") e = value
    }

    const next = new THREE.Vector3(x, y, z)

    // Skip tiny movements
    if (next.distanceTo(current) < 0.1) {
      current.copy(next)
      continue
    }

    // Calculate extruder delta to determine if this is a travel move
    const dE = e == null ? 0 : extruderAbsolute ? e - lastE : e

    // G0 is always a travel move
    // G1 with no E change or E decrease is a travel move
    isExtrusion = !(command === "G0" || dE <= 0.0001)

    // Update last extruder position if in absolute mode
    if (e != null && extruderAbsolute) lastE = e

    // Fix the axis orientation - map G-code coordinates to proper 3D space
    // For standard 3D printing orientation: X→X, Y→Z, Z→Y
    const p = new THREE.Vector3(x, z, y)

    // Ensure no NaN values
    if (isNaN(p.x) || isNaN(p.y) || isNaN(p.z)) {
      console.warn("Skipping point with NaN values:", p)
      current.copy(next)
      continue
    }

    if (!inLayerChange) {
      // If we switched from extrusion to travel or vice versa, start a new path
      if (isExtrusion !== lastIsExtrusion && (currentExtrusionPath.length > 0 || currentTravelPath.length > 0)) {
        if (lastIsExtrusion) {
          let layerData = currentLayerPaths.find((l) => l.layer === currentLayer)
          if (!layerData) {
            layerData = { layer: currentLayer, extrusionPaths: [], travelPaths: [] }
            currentLayerPaths.push(layerData)
          }
          layerData.extrusionPaths.push([...currentExtrusionPath])
          currentExtrusionPath = []
        } else {
          let layerData = currentLayerPaths.find((l) => l.layer === currentLayer)
          if (!layerData) {
            layerData = { layer: currentLayer, extrusionPaths: [], travelPaths: [] }
            currentLayerPaths.push(layerData)
          }
          layerData.travelPaths.push([...currentTravelPath])
          currentTravelPath = []
        }
      }

      if (isExtrusion) {
        // Add to current extrusion path
        if (currentExtrusionPath.length === 0) {
          // Start a new path with the current position
          currentExtrusionPath.push(new THREE.Vector3(current.x, current.z, current.y))
        }
        currentExtrusionPath.push(p.clone())
      } else {
        // Add to current travel path
        if (currentTravelPath.length === 0) {
          // Start a new path with the current position
          currentTravelPath.push(new THREE.Vector3(current.x, current.z, current.y))
        }
        currentTravelPath.push(p.clone())
      }
    } else {
      // This is a layer transition - don't visualize it
      inLayerChange = false

      // Start fresh paths
      currentExtrusionPath = []
      currentTravelPath = []
    }

    // Update current position and state
    current.copy(next)
    lastIsExtrusion = isExtrusion
  }

  // Add any remaining paths
  if (currentExtrusionPath.length > 0) {
    let layerData = currentLayerPaths.find((l) => l.layer === currentLayer)
    if (!layerData) {
      layerData = { layer: currentLayer, extrusionPaths: [], travelPaths: [] }
      currentLayerPaths.push(layerData)
    }
    layerData.extrusionPaths.push(currentExtrusionPath)
  }

  if (currentTravelPath.length > 0) {
    let layerData = currentLayerPaths.find((l) => l.layer === currentLayer)
    if (!layerData) {
      layerData = { layer: currentLayer, extrusionPaths: [], travelPaths: [] }
      currentLayerPaths.push(layerData)
    }
    layerData.travelPaths.push(currentTravelPath)
  }

  // Second pass: sample the paths based on sample rate
  for (const layerData of currentLayerPaths) {
    // Only process layers in our range
    if (layerData.layer < startLayer || layerData.layer > endLayer) continue

    // Sample extrusion paths
    for (const path of layerData.extrusionPaths) {
      if (path.length < 2) continue

      // Sample the path
      for (let i = 0; i < path.length - 1; i += sampleRate) {
        const p1 = path[i]
        // Get the next point, but don't go beyond the path length
        const p2 = path[Math.min(i + sampleRate, path.length - 1)]

        extrusion.push(p1.clone(), p2.clone())
        extrusionMoveCount++
      }
    }

    // Sample travel paths
    for (const path of layerData.travelPaths) {
      if (path.length < 2) continue

      // Sample the path
      for (let i = 0; i < path.length - 1; i += sampleRate) {
        const p1 = path[i]
        // Get the next point, but don't go beyond the path length
        const p2 = path[Math.min(i + sampleRate, path.length - 1)]

        travel.push(p1.clone(), p2.clone())
        travelMoveCount++
      }
    }
  }

  console.log(
    `Identified ${extrusionMoveCount} extrusion moves, ${travelMoveCount} travel moves, and ${transitionMoveCount} layer transitions (not visualized)`,
  )

  // Store in cache
  const result = { extrusion, travel }
  visualizationCache.set(cacheKey, result)

  return result
}

// Predefined distinctive colors
const DISTINCTIVE_COLORS = [
  "#FF5733", // Bright Red
  "#33FF57", // Bright Green
  "#3357FF", // Bright Blue
  "#FF33F5", // Bright Pink
  "#F5FF33", // Bright Yellow
  "#33FFF5", // Bright Cyan
  "#FF8C33", // Orange
  "#8C33FF", // Purple
  "#33FF8C", // Mint
  "#FF338C", // Rose
  "#338CFF", // Sky Blue
  "#FFFF33", // Yellow
]

// Map to store assigned colors
const colorMap = new Map<string, string>()
let colorIndex = 0

// Generate a unique color for a G-code ID
export function getColorForGcode(id: string): THREE.Color {
  // Check if we already assigned a color to this ID
  if (!colorMap.has(id)) {
    // Assign the next distinctive color
    const colorHex = DISTINCTIVE_COLORS[colorIndex % DISTINCTIVE_COLORS.length]
    colorMap.set(id, colorHex)
    colorIndex++
  }

  // Get the assigned color
  const colorHex = colorMap.get(id)!
  return new THREE.Color(colorHex)
}

// Get a CSS color string from a G-code ID (for UI elements)
export function getColorStringForGcode(id: string): string {
  if (!colorMap.has(id)) {
    getColorForGcode(id) // This will assign a color
  }
  return colorMap.get(id)!
}

// Clear the visualization cache
export function clearVisualizationCache() {
  visualizationCache.clear()
}
