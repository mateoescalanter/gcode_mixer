export interface ParsedGCode {
  name: string
  text: string
  lines: string[]
  layerMap: Map<number, [number, number]>
  layerCount: number
}

export interface Segment {
  gcodeId: string
  from: number
  to: number
  segmentId?: string // Optional unique identifier for each segment
}
