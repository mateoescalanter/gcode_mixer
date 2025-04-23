"use client"
import { Canvas, useThree } from "@react-three/fiber"
import type React from "react"

import { OrbitControls, Grid } from "@react-three/drei"
import { Suspense, useEffect, useMemo, useState, useRef } from "react"
import { useAppStore } from "../store"
import { parseGcodeForVisualization, getColorForGcode } from "../utils/visualizeGcode"
// Import THREE only once to avoid multiple instances warning
import * as THREE from "three"
import VisualizationControls from "./VisualizationControls"

// Separate component for each G-code segment to avoid re-rendering all segments
function GCodeSegment({ segment, gcode }) {
  const showTravelMoves = useAppStore((s) => s.showTravelMoves)
  const sampleRate = useAppStore((s) => s.sampleRate)

  const { extrusion, travel } = useMemo(() => {
    return parseGcodeForVisualization(gcode, [segment.from, segment.to])
  }, [gcode, segment.from, segment.to, sampleRate]) // Add sampleRate as a dependency

  const color = useMemo(() => getColorForGcode(segment.gcodeId), [segment.gcodeId])

  // Create separate geometries for extrusion and travel
  const extrusionGeometry = useMemo(() => {
    if (extrusion.length === 0) return null
    const geo = new THREE.BufferGeometry()
    geo.setFromPoints(extrusion)
    return geo
  }, [extrusion])

  const travelGeometry = useMemo(() => {
    if (travel.length === 0) return null
    const geo = new THREE.BufferGeometry()
    geo.setFromPoints(travel)
    return geo
  }, [travel])

  return (
    <>
      {/* Extrusion lines - always visible */}
      {extrusionGeometry && (
        <lineSegments>
          <bufferGeometry attach="geometry" {...extrusionGeometry} />
          <lineBasicMaterial attach="material" color={color} linewidth={2} transparent={true} opacity={0.4} />
        </lineSegments>
      )}

      {/* Travel lines - toggled by showTravelMoves */}
      {travelGeometry && showTravelMoves && (
        <lineSegments>
          <bufferGeometry attach="geometry" {...travelGeometry} />
          <lineBasicMaterial
            attach="material"
            color={new THREE.Color(0xaaaaaa)}
            linewidth={1}
            transparent={true}
            opacity={0.2}
          />
        </lineSegments>
      )}
    </>
  )
}

// Camera controller to handle auto-centering
function CameraController({ gcodeObjects }) {
  const { camera } = useThree()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (gcodeObjects.length > 0 && !initialized) {
      try {
        // Calculate bounding box of all objects
        const box = new THREE.Box3()

        gcodeObjects.forEach((obj) => {
          if (!obj.geometry) return

          // Safely compute bounding box
          try {
            obj.geometry.computeBoundingBox()
            if (obj.geometry.boundingBox) {
              box.union(obj.geometry.boundingBox)
            }
          } catch (error) {
            console.warn("Error computing bounding box:", error)
          }
        })

        // Only proceed if we have a valid bounding box
        if (
          box.min.x !== Number.POSITIVE_INFINITY &&
          !isNaN(box.min.x) &&
          !isNaN(box.min.y) &&
          !isNaN(box.min.z) &&
          !isNaN(box.max.x) &&
          !isNaN(box.max.y) &&
          !isNaN(box.max.z)
        ) {
          // Center camera on the bounding box
          const center = new THREE.Vector3()
          box.getCenter(center)

          const size = new THREE.Vector3()
          box.getSize(size)

          const maxDim = Math.max(size.x, size.y, size.z)
          const fov = camera.fov * (Math.PI / 180)
          const cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2 // Add some padding

          // Position camera to view the model from a standard 3D printing perspective
          camera.position.set(center.x, center.y + cameraZ * 0.5, center.z + cameraZ * 0.8)
          camera.lookAt(center)
          camera.updateProjectionMatrix()

          setInitialized(true)
        } else {
          console.warn("Invalid bounding box, using default camera position")
          setInitialized(true) // Mark as initialized to avoid retrying
        }
      } catch (error) {
        console.error("Error setting up camera:", error)
        setInitialized(true) // Mark as initialized to avoid retrying
      }
    }
  }, [camera, gcodeObjects, initialized])

  return null
}

function GCodeVisualization() {
  const uploads = useAppStore((s) => s.uploads)
  const timeline = useAppStore((s) => s.timeline)
  const sampleRate = useAppStore((s) => s.sampleRate)

  // Force re-render when sample rate changes
  const [, forceUpdate] = useState({})

  useEffect(() => {
    // Force a re-render when sample rate changes
    forceUpdate({})
  }, [sampleRate])

  // Pre-process G-code objects for the camera controller
  const gcodeObjects = useMemo(() => {
    return timeline
      .map((segment) => {
        const gcode = uploads[segment.gcodeId]
        if (!gcode) return null

        try {
          const { extrusion } = parseGcodeForVisualization(gcode, [segment.from, segment.to])

          if (extrusion.length === 0) return null

          const geometry = new THREE.BufferGeometry()
          geometry.setFromPoints(extrusion)

          return {
            geometry,
            id: segment.gcodeId,
          }
        } catch (error) {
          console.error("Error processing G-code for camera:", error)
          return null
        }
      })
      .filter(Boolean)
  }, [uploads, timeline, sampleRate]) // Add sampleRate as a dependency

  return (
    <>
      <CameraController gcodeObjects={gcodeObjects} />

      {/* Render each segment as a separate component */}
      {timeline.map((segment, index) => {
        const gcode = uploads[segment.gcodeId]
        if (!gcode) return null

        return <GCodeSegment key={`${segment.gcodeId}-${index}-${sampleRate}`} segment={segment} gcode={gcode} />
      })}

      {/* Add a horizontal grid to represent the print bed */}
      <Grid
        position={[0, 0, 0]}
        args={[200, 200]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#9d4b4b"
        fadeDistance={400}
        infiniteGrid={true}
      />
    </>
  )
}

// Fallback component when 3D viewer can't load
function ViewerFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-gray-900">
      <div className="text-center p-4">
        <h3 className="text-xl font-semibold mb-2">3D Viewer</h3>
        <p className="text-gray-400">Upload G-code files to visualize them</p>
      </div>
    </div>
  )
}

export default function Viewer() {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const addGcodeToTimeline = useAppStore((s) => s.addGcodeToTimeline)

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    // Prevent default to allow drop
    e.preventDefault()

    // Check if the dragged item is a G-code
    if (e.dataTransfer.types.includes("application/gcode-id")) {
      setIsDragOver(true)
      e.dataTransfer.dropEffect = "copy"
    }
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    // Get the G-code ID from the drop data
    const gcodeId = e.dataTransfer.getData("application/gcode-id")
    if (gcodeId) {
      // Add the G-code to the timeline
      addGcodeToTimeline(gcodeId)
    }
  }

  return (
    <div
      ref={canvasContainerRef}
      className={`relative h-full w-full ${isDragOver ? "ring-4 ring-blue-500" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Suspense fallback={<ViewerFallback />}>
        <Canvas camera={{ position: [0, 50, 100], near: 0.1, far: 10000 }} className="h-full w-full">
          <ambientLight intensity={0.8} />
          <pointLight position={[20, 30, 10]} intensity={1} />
          <GCodeVisualization />
          <OrbitControls makeDefault />
        </Canvas>
      </Suspense>

      {/* Visualization Controls */}
      <VisualizationControls />

      {/* Drag overlay with instructions */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-900 bg-opacity-30 flex items-center justify-center pointer-events-none">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
            <p className="text-xl font-bold text-white">Drop to Add G-code</p>
            <p className="text-gray-300">Release to add this G-code to the timeline</p>
          </div>
        </div>
      )}
    </div>
  )
}
