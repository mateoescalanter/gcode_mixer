import type { Segment, ParsedGCode } from "../types"

// Helper function to extract header from G-code
function extractHeader(gcode: ParsedGCode): string[] {
  const headerLines: string[] = []
  let inHeader = true

  for (const line of gcode.lines) {
    // Consider everything before the first layer as header
    if (line.startsWith(";LAYER:")) {
      inHeader = false
      break
    }

    if (inHeader) {
      headerLines.push(line)
    }
  }

  return headerLines
}

// Helper function to extract important settings from G-code
function extractSettings(gcode: ParsedGCode): string[] {
  const settingsLines: string[] = []
  const settingsToExtract = [
    // Temperature settings
    "M104",
    "M109", // Extruder temperature
    "M140",
    "M190", // Bed temperature
    // Flow rate settings
    "M221", // Set flow rate
    // Fan speed settings
    "M106",
    "M107", // Fan control
    // Retraction settings - these are usually in the slicer comments
    ";retraction_",
    ";retract_",
  ]

  // Look for settings in the header section
  let inHeader = true

  for (const line of gcode.lines) {
    if (line.startsWith(";LAYER:")) {
      inHeader = false
      break
    }

    if (inHeader) {
      // Check if this line contains any of the settings we want to extract
      if (settingsToExtract.some((setting) => line.includes(setting))) {
        settingsLines.push(line)
      }
    }
  }

  return settingsLines
}

export function mergeGcodes(segments: Segment[], uploads: Record<string, ParsedGCode>): string {
  if (segments.length === 0) return ""

  // Sort segments by layer
  const ordered = [...segments].sort((a, b) => a.from - b.from)
  const output: string[] = []
  const extruderRe = /([Gg][01][^\n]*?\sE)([-+]?\d*\.?\d+)/

  // Get the first G-code to extract header
  const firstGcode = uploads[ordered[0].gcodeId]
  if (!firstGcode) return ""

  // Add header from the first G-code
  const header = extractHeader(firstGcode)
  output.push(...header)

  // Add a comment indicating this is a merged file
  output.push(";MERGED G-CODE FILE - Created with G-code Mixer by mer.bio")
  output.push(";Original files:")

  // List all the G-codes used in this merge
  const usedGcodes = new Set<string>()
  ordered.forEach((seg) => usedGcodes.add(seg.gcodeId))

  usedGcodes.forEach((id) => {
    const gcode = uploads[id]
    if (gcode) {
      output.push(`;  - ${gcode.name}`)
    }
  })

  output.push("")

  // Process each segment
  let lastGcodeId: string | null = null

  ordered.forEach((seg, idx) => {
    const g = uploads[seg.gcodeId]
    if (!g) return

    const [startIdx] = g.layerMap.get(seg.from) ?? [0]
    const [, endIdx] = g.layerMap.get(seg.to) ?? [0, g.lines.length - 1]

    // If this is a different G-code than the previous segment, add settings
    if (seg.gcodeId !== lastGcodeId) {
      output.push(`;SWITCHING TO ${g.name} - LAYER ${seg.from} to ${seg.to}`)

      // Extract and add important settings
      const settings = extractSettings(g)
      output.push(...settings)

      // Reset extruder position
      output.push("G92 E0 ;Reset extruder position")

      lastGcodeId = seg.gcodeId
    } else {
      // Same G-code, just add a comment
      output.push(`;CONTINUING ${g.name} - LAYER ${seg.from} to ${seg.to}`)
    }

    // Reset extruder for each segment
    if (idx !== 0) output.push("G92 E0 ;Reset extruder position")

    let rebasing = true
    let baseline: number | null = null

    for (let i = startIdx; i <= endIdx; i++) {
      let line = g.lines[i]

      // Skip header lines if we're not at the first segment
      if (idx !== 0 && line.startsWith(";") && !line.startsWith(";LAYER:")) {
        continue
      }

      if (rebasing) {
        const up = line.trim().toUpperCase()
        if (up.startsWith("G92 E")) {
          rebasing = false
          baseline = null
          output.push(line + "\n")
          continue
        }
        const m = extruderRe.exec(line)
        if (m) {
          const eVal = Number.parseFloat(m[2])
          if (baseline === null) baseline = eVal
          const newE = (eVal - baseline).toFixed(5)
          line = line.replace(extruderRe, `$1${newE}`)
        }
      }
      output.push(line)
    }
  })

  return output.join("\n")
}
