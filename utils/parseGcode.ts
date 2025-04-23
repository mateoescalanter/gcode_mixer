import type { ParsedGCode } from "../types"

export function parseGcode(file: File): Promise<ParsedGCode> {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onerror = () => rej(fr.error)
    fr.onload = () => {
      const text = fr.result as string

      // For very large files, use a more efficient approach
      const isLargeFile = text.length > 5000000 // 5MB threshold

      // Use a more efficient approach for large files
      if (isLargeFile) {
        parseGcodeLargeFile(text, file.name).then(res).catch(rej)
        return
      }

      const lines = text.split(/\r?\n/)
      const layerMap = new Map<number, [number, number]>()
      let current = -1
      lines.forEach((ln, idx) => {
        if (ln.startsWith(";LAYER:")) {
          const n = Number.parseInt(ln.split(":")[1])
          if (!isNaN(n)) {
            if (current >= 0) {
              const prev = layerMap.get(current)
              if (prev) prev[1] = idx - 1
            }
            current = n
            layerMap.set(current, [idx, idx])
          }
        }
      })
      const lastKey = Math.max(...layerMap.keys())
      const lastTuple = layerMap.get(lastKey)
      if (lastTuple) lastTuple[1] = lines.length - 1
      res({ name: file.name, text, lines, layerMap, layerCount: lastKey + 1 })
    }
    fr.readAsText(file)
  })
}

// More efficient parsing for large files
function parseGcodeLargeFile(text: string, fileName: string): Promise<ParsedGCode> {
  return new Promise((resolve) => {
    // Use a worker or setTimeout to avoid blocking the UI
    setTimeout(() => {
      // Split the text into lines more efficiently
      const lines: string[] = []
      let startIndex = 0
      let endIndex = text.indexOf("\n")

      while (endIndex !== -1) {
        lines.push(text.substring(startIndex, endIndex))
        startIndex = endIndex + 1
        endIndex = text.indexOf("\n", startIndex)
      }

      // Add the last line if there is one
      if (startIndex < text.length) {
        lines.push(text.substring(startIndex))
      }

      // Find layer markers
      const layerMap = new Map<number, [number, number]>()
      let current = -1

      // Process in chunks to avoid blocking the UI
      const chunkSize = 10000
      let processedLines = 0

      function processChunk() {
        const endLine = Math.min(processedLines + chunkSize, lines.length)

        for (let idx = processedLines; idx < endLine; idx++) {
          const ln = lines[idx]
          if (ln.startsWith(";LAYER:")) {
            const n = Number.parseInt(ln.split(":")[1])
            if (!isNaN(n)) {
              if (current >= 0) {
                const prev = layerMap.get(current)
                if (prev) prev[1] = idx - 1
              }
              current = n
              layerMap.set(current, [idx, idx])
            }
          }
        }

        processedLines = endLine

        if (processedLines < lines.length) {
          // Process next chunk
          setTimeout(processChunk, 0)
        } else {
          // Finalize
          const lastKey = Math.max(...layerMap.keys())
          const lastTuple = layerMap.get(lastKey)
          if (lastTuple) lastTuple[1] = lines.length - 1

          resolve({
            name: fileName,
            text,
            lines,
            layerMap,
            layerCount: lastKey + 1,
          })
        }
      }

      // Start processing
      processChunk()
    }, 0)
  })
}
