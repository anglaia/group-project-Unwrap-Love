"use client"

import type React from "react"
import { Square } from "lucide-react"

interface RecordingProgressProps {
  isRecording: boolean
  currentTime: number
  maxTime: number
  onStop: () => void
}

export const RecordingProgress: React.FC<RecordingProgressProps> = ({ isRecording, currentTime, maxTime, onStop }) => {
  // Format time as MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // Calculate progress percentage
  const progressPercent = (currentTime / maxTime) * 100

  if (!isRecording) return null

  return (
    <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 fade-in">
      <div className="flex items-center bg-white rounded-full h-12 px-4 shadow-lg">
        {/* Recording indicator light */}
        <div className="w-3 h-3 rounded-full bg-red-500 animate-[pulse_1.5s_ease-in-out_infinite] mr-3"></div>

        {/* Progress bar */}
        <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden mr-3">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-300 ease-linear"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Time display */}
        <div className="w-16 text-center font-mono text-gray-600">{formatTime(currentTime)}</div>

        {/* Stop button */}
        <button
          onClick={onStop}
          className="ml-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <Square className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  )
}

