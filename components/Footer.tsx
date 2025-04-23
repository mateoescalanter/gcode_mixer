"use client"

export default function Footer() {
  return (
    <footer className="py-3 text-center text-sm text-gray-500">
      <div className="container mx-auto">
        <a
          href="https://github.com/mateoescalanter/gcode_mixer"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-300 transition-colors"
        >
          GitHub
        </a>
        {" | Made in Berlin by "}
        <a
          href="https://www.mer.bio"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-300 transition-colors"
        >
          mer.bio
        </a>
      </div>
    </footer>
  )
}
