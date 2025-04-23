"use client"
import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { parseGcode } from "../utils/parseGcode"
import { useAppStore } from "../store"

export default function UploadPanel() {
  const addGcode = useAppStore((s) => s.addGcode)

  const onDrop = useCallback(
    async (accepted: File[]) => {
      for (const file of accepted) {
        if (file.name.endsWith(".gcode")) {
          const parsed = await parseGcode(file)
          addGcode(parsed)
        }
      }
    },
    [addGcode],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "text/plain": [".gcode"],
    },
  })

  return (
    <div
      {...getRootProps()}
      className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-600 p-4 text-center transition hover:bg-gray-800/50"
    >
      <input {...getInputProps()} />
      {isDragActive ? <p>Drop G-code files here…</p> : <p>Drag & drop G-code files here, or click to choose</p>}
    </div>
  )
}
