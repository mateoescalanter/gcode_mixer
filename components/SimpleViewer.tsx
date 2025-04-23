"use client"

export default function SimpleViewer() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-gray-900">
      <div className="text-center p-4">
        <h3 className="text-xl font-semibold mb-2">G-code Viewer</h3>
        <p className="text-gray-400">Upload G-code files to visualize them</p>
        <p className="text-gray-400 mt-4">Use the timeline on the right to adjust layer ranges</p>
      </div>
    </div>
  )
}
