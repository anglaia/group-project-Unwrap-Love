"use client"

import React, { useState, useEffect, useRef } from "react"

interface RecordingPanelProps {
    onStopRecording: () => void
    onCancelRecording?: () => void
}

export const RecordingPanel: React.FC<RecordingPanelProps> = ({
    onStopRecording,
    onCancelRecording
}) => {
    const [seconds, setSeconds] = useState(0)
    const panelRef = useRef<HTMLDivElement>(null)

    // Handle cancel recording - either use the provided handler or do nothing
    const handleCancel = () => {
        if (onCancelRecording) {
            onCancelRecording()
        }
        // No fallback to stop recording when canceling
    }

    // Start timer when component mounts
    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(prev => prev + 1)
        }, 1000)

        // Clear interval when component unmounts
        return () => clearInterval(interval)
    }, [])

    // Handle outside click/touch - will cancel recording
    useEffect(() => {
        // Handle mouse clicks outside
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                // Click is outside the panel - cancel recording
                handleCancel()
            }
        }

        // Handle touch events outside for mobile
        const handleTouchOutside = (event: TouchEvent) => {
            if (event.touches && event.touches[0]) {
                const touch = event.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);

                if (panelRef.current && element && !panelRef.current.contains(element)) {
                    // Touch is outside the panel - cancel recording
                    handleCancel();
                }
            }
        }

        // Add event listeners
        document.addEventListener("mousedown", handleClickOutside)
        document.addEventListener("touchstart", handleTouchOutside)

        // Clean up
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            document.removeEventListener("touchstart", handleTouchOutside)
        }
    }, [onCancelRecording])

    // Format seconds to MM:SS or HH:MM:SS for longer recordings
    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    return (
        <div className="w-full h-full flex items-center justify-center relative" ref={panelRef}>
            {/* Controls in top bar, matching DoodleCanvas style */}
            <div className="absolute left-0 right-0 top-4 px-6 flex justify-between items-center">
                {/* Cancel button (X) */}
                <button
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-gray-700 hover:bg-white/30 transition-colors"
                    onClick={handleCancel}
                    aria-label="Cancel recording"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>

                {/* Recording status in center of top bar with subtle breathing light effect */}
                <div className="flex items-center justify-center gap-3 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                    <div className="relative flex items-center justify-center w-2 h-2">
                        {/* Subtle breathing effect */}
                        <div
                            className="absolute rounded-full bg-red-500/40"
                            style={{
                                width: '100%',
                                height: '100%',
                                animation: "subtleBreathe 3s ease-in-out infinite",
                            }}
                        ></div>
                        {/* Inner solid dot */}
                        <div className="absolute rounded-full bg-red-500"
                            style={{
                                width: '100%',
                                height: '100%',
                                animation: "dotPulse 3s ease-in-out infinite",
                            }}
                        ></div>

                        {/* Custom keyframe animation in style tag */}
                        <style jsx>{`
                            @keyframes subtleBreathe {
                                0% { transform: scale(1); opacity: 0.4; }
                                50% { transform: scale(1.3); opacity: 0.1; }
                                100% { transform: scale(1); opacity: 0.4; }
                            }
                            @keyframes dotPulse {
                                0% { opacity: 0.95; }
                                50% { opacity: 0.8; }
                                100% { opacity: 0.95; }
                            }
                        `}</style>
                    </div>
                    <span className="text-xs text-gray-700 uppercase tracking-wider font-medium">Recording</span>
                </div>

                {/* Save/Complete button (✓) */}
                <button
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-gray-700 hover:bg-white/30 transition-colors"
                    onClick={onStopRecording}
                    aria-label="Complete recording"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {/* Center content */}
            <div className="flex flex-col items-center">
                {/* Large, centered digital timer display */}
                <div
                    className="text-9xl font-light text-gray-800 tracking-wider"
                    style={{ fontFamily: "DSEG7Classic" }}
                >
                    {formatTime(seconds)}
                </div>
            </div>
        </div>
    )
} 