import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "G‑code Mixer",
  description: "Merge multiple Cura G‑codes visually in your browser",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-gray-950 text-gray-100 dark">
      <body className={`${inter.className} h-full flex flex-col bg-gray-950 text-gray-100`}>{children}</body>
    </html>
  )
}
