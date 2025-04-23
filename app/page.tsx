"use client"
import React from "react"
import UploadPanel from "../components/UploadPanel"
import Viewer from "../components/Viewer"
import SimpleViewer from "../components/SimpleViewer"
import Timeline from "../components/Timeline"
import DownloadButton from "../components/DownloadButton"
import GcodeItem from "../components/GcodeItem"
import Header from "../components/Header"
import { useAppStore } from "../store"
import Footer from "../components/Footer"

export default function Home() {
  const uploads = useAppStore((s) => s.uploads)

  return (
    <>
      <Header />
      <main className="grid flex-1 h-[calc(100%-4rem)] grid-cols-4 gap-4 p-4">
        <div className="relative col-span-3 overflow-hidden rounded-2xl bg-gray-900">
          <ErrorBoundary fallback={<SimpleViewer />}>
            <Viewer />
          </ErrorBoundary>
          <Timeline />
        </div>
        <div className="flex flex-col gap-4">
          <UploadPanel />
          <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-gray-700 p-2">
            {Object.entries(uploads).map(([id, up]) => (
              <GcodeItem key={id} id={id} gcode={up} />
            ))}
            {!Object.keys(uploads).length && <p className="text-sm text-gray-400">No G‑code uploaded yet.</p>}
          </div>
          <DownloadButton />
        </div>
      </main>
      <Footer />
    </>
  )
}

// Simple error boundary component
class ErrorBoundary extends React.Component<{
  children: React.ReactNode
  fallback: React.ReactNode
}> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}
