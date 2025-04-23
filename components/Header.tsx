"use client"

export default function Header() {
  return (
    <header className="bg-gray-900 p-4 border-b border-gray-800 text-gray-100">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-100">G-code Mixer</h1>
        <div className="text-sm text-gray-400">Works with Cura files</div>
      </div>
    </header>
  )
}
