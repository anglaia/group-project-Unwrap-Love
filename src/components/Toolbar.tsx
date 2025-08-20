"use client"

import React, { useState, useEffect, useRef } from "react"
import { Polaroid } from "./Polaroid"
import { MicrophoneIcon } from "./MicrophoneIcon"
import { MediaIcon } from "./MediaIcon";
import { PencilIcon } from "./PencilIcon"
import { BrushIcon } from "./BrushIcon"
import { DoodleCanvas } from "./DoodleCanvas"
import { MediaInputPanel } from "./MediaInputPanel"
import { RecordingPanel } from "./RecordingPanel"
import { PhotoUploadPanel } from "./PhotoUploadPanel"
import { BrushPanel } from "./BrushPanel"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, Image, FileText, Music, X, Pencil, Palette, ExternalLink, CornerRightDown } from "lucide-react"
import { NoteContent } from "./NoteContent"
import { cn } from "@/lib/utils"
import * as socketService from '@/services/socketService'

interface Point {
  x: number
  y: number
}

interface Stroke {
  type: 'line' | 'dot'
  points: Point[]
  color: string
  width: number
}

interface AIImage {
  id: string
  src: string
  initialPosition: { x: number, y: number }
  zIndex: number
}

interface ToolbarProps {
  onAddPhoto: (file: File) => void
  onAddNote: (color: string) => void
  onRecordVoice: () => void
  onAddMedia: (url: string) => void
  onAddDoodle: () => void
  onSaveDoodle: (svgData: string) => void
  isRecording: boolean
  isDoodling: boolean
  isMediaInput: boolean
  isPhotoUpload: boolean
  isBrushPanel: boolean
  onToggleMediaInput: () => void
  onTogglePhotoUpload: () => void
  onToggleBrushPanel: () => void
  onStopRecording: () => void
  onCancelRecording: () => void
  onAddAIImage?: (image: AIImage) => void
  onAddBackgroundRemover?: (item: {
    id: string
    src: string
    initialPosition: { x: number, y: number }
    zIndex: number
  }) => void
  onUploadBackground?: (file: File, preserveColor?: boolean) => void
  onSaveGif?: (file: File, originalUrl: string, isSticker?: boolean, isLoading?: boolean) => void
  onColorChange?: (color: string | null) => void
  onGridVisibilityChange?: (visible: boolean) => void
  onCanvasScrollableChange?: (scrollable: boolean, scale?: number) => void
  onPaperCountChange?: (pages: number) => void
  initialCanvasPages?: number
  initialBrushColor?: string | null
  initialShowGrid?: boolean
  showBrushButton?: boolean
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onAddPhoto,
  onAddNote,
  onRecordVoice,
  onAddMedia,
  onAddDoodle,
  onSaveDoodle,
  isRecording,
  isDoodling = false,
  isMediaInput = false,
  isPhotoUpload = false,
  isBrushPanel = false,
  onToggleMediaInput = () => { },
  onTogglePhotoUpload = () => { },
  onToggleBrushPanel = () => { },
  onStopRecording = () => { },
  onCancelRecording = () => { },
  onSaveGif,
  onUploadBackground,
  onColorChange,
  onGridVisibilityChange,
  onCanvasScrollableChange,
  onPaperCountChange,
  initialCanvasPages,
  initialBrushColor,
  initialShowGrid = true,
  showBrushButton = true,
}) => {
  // 可用的便签颜色
  const noteColors = ["yellow", "blue", "green", "pink", "purple", "amber"]

  // Track the state of three colors
  const [colorIndices, setColorIndices] = useState([0, 1, 2])

  // Control whether tools are displayed
  const [showTools, setShowTools] = useState(true)

  // Handle tool display status when drawing mode, media input mode, or recording mode changes
  useEffect(() => {
    if (isDoodling || isMediaInput || isRecording || isPhotoUpload || isBrushPanel) {
      setShowTools(false)
    } else {
      setShowTools(true)
    }
  }, [isDoodling, isMediaInput, isRecording, isPhotoUpload, isBrushPanel])

  // Handle note creation and color rotation
  const handleAddNote = () => {
    const currentColor = noteColors[colorIndices[0]]
    const newIndices = [
      (colorIndices[0] + 1) % noteColors.length,
      (colorIndices[1] + 1) % noteColors.length,
      (colorIndices[2] + 1) % noteColors.length,
    ]
    setColorIndices(newIndices)
    onAddNote(currentColor)
  }

  // Handle media link saving
  const handleSaveMedia = (url: string) => {
    onAddMedia(url)
    onToggleMediaInput()
  }

  // Handle photo file saving
  const handleSavePhoto = (file: File) => {
    onAddPhoto(file)
    onTogglePhotoUpload()
  }

  // Handle brush panel data
  const handleSaveBrushData = (data: any) => {
    if (data.type === 'image' && data.image && data.image.src && data.image.src.original) {
      // Scenario 1: Image selected
      fetch(data.image.src.original)
        .then(response => response.blob())
        .then(blob => {
          const extension = blob.type.split('/')[1] || 'jpg';
          const filename = `background-${Date.now()}.${extension}`;
          const file = new File([blob], filename, { type: blob.type });

          if (onUploadBackground) {
            // Set new image; preserveColor is false as color is being cleared.
            onUploadBackground(file, false);
          }
          if (onColorChange) {
            // Clear background color for mutual exclusion
            onColorChange(null);
          }
          // Assuming parent component handles socketService.updateBackground for this path
          // based on onUploadBackground and onColorChange calls.
        })
        .catch(error => {
          console.error('Error fetching image:', error);
        });

    } else if (data.type === 'brush' && data.color) {
      // Scenario 2: Color selected
      if (onColorChange) {
        // Set new background color
        onColorChange(data.color);
      }
      if (onUploadBackground) {
        // Clear background image for mutual exclusion
        const emptyBlob = new Blob([""], { type: "text/plain" });
        // Using a consistent name for the signal file
        const emptyFile = new File([emptyBlob], "clear_background_signal.txt", { type: "text/plain" });
        // preserveColor is false as the new color is the focus.
        onUploadBackground(emptyFile, false);
      }
      // Assuming parent component handles socketService.updateBackground for this path.

    } else if (data.type === 'background' && data.image === null) {
      // Scenario 3: Clear background explicitly (from BrushPanel's clear button)
      // This case already existed and had a direct socket call.
      socketService.updateBackground({
        backgroundImage: "",
        backgroundColor: data.preserveColor ? undefined : ""
      });

      if (onUploadBackground) {
        const emptyBlob = new Blob([""], { type: "text/plain" });
        const emptyFile = new File([emptyBlob], "clear_background_signal.txt", { type: "text/plain" });
        onUploadBackground(emptyFile, data.preserveColor);
      }
      // If not preserving color, also clear it locally via onColorChange.
      if (!data.preserveColor && onColorChange) {
        onColorChange(null);
      }
    }

    // Close the panel after any save-like operation handled above.
    // This was the original placement in the provided code.
    onToggleBrushPanel();
  }

  // 根据颜色名称获取颜色样式
  const getColorStyles = (colorName: string) => {
    switch (colorName) {
      case "blue":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
        }
      case "green":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
        }
      case "pink":
        return {
          bg: "bg-pink-50",
          border: "border-pink-200",
        }
      case "purple":
        return {
          bg: "bg-purple-50",
          border: "border-purple-200",
        }
      case "amber":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
        }
      default: // yellow
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
        }
    }
  }

  // Get color styles for the current three notes
  const topNoteStyles = getColorStyles(noteColors[colorIndices[0]])
  const middleNoteStyles = getColorStyles(noteColors[colorIndices[1]])
  const bottomNoteStyles = getColorStyles(noteColors[colorIndices[2]])

  // Toolbar background animation variables
  const backgroundVariants = {
    initial: { y: 150, opacity: 0 },
    normal: {
      y: 0,
      opacity: 1,
      height: "8rem",
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 25,
        duration: 0.2,
        delay: 0
      }
    },
    expanded: {
      y: 0,
      opacity: 1,
      height: "336px",
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 25,
        duration: 0.2,
        delay: 0
      }
    }
  }

  // Tool button animation variables
  const toolButtonVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: (custom: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 25,
        duration: 0.2,
        delay: custom * 0.03,
      }
    }),
    exit: {
      y: 50,
      opacity: 0,
      transition: {
        duration: 0.15
      }
    }
  }

  // Note stack animation variables
  const noteStackVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 25,
        duration: 0.2,
        delay: 0.09,
      }
    },
    exit: {
      y: 50,
      opacity: 0,
      transition: {
        duration: 0.15
      }
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-5xl px-4 z-10">
      {/* Background layer */}
      <motion.div
        className="relative rounded-t-2xl border-2 border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.15)] bg-white/85 backdrop-blur-md"
        variants={backgroundVariants}
        initial="initial"
        animate={isDoodling || isMediaInput || isRecording || isPhotoUpload || isBrushPanel ? "expanded" : "normal"}
      >
        {/* Drawing canvas */}
        {isDoodling && (
          <DoodleCanvas onSave={onSaveDoodle} onCancel={onAddDoodle} />
        )}

        {/* Media input panel */}
        {isMediaInput && (
          <MediaInputPanel onSave={handleSaveMedia} onCancel={onToggleMediaInput} />
        )}

        {/* Recording panel */}
        {isRecording && (
          <RecordingPanel onStopRecording={onStopRecording} onCancelRecording={onCancelRecording} />
        )}

        {/* Photo upload panel */}
        {isPhotoUpload && (
          <PhotoUploadPanel onSave={handleSavePhoto} onCancel={onTogglePhotoUpload} onSaveGif={onSaveGif} />
        )}

        {/* Brush Panel */}
        {isBrushPanel && (
          <BrushPanel
            onSave={handleSaveBrushData}
            onCancel={onToggleBrushPanel}
            onColorChange={onColorChange}
            onGridVisibilityChange={onGridVisibilityChange}
            onCanvasScrollableChange={onCanvasScrollableChange}
            onPaperCountChange={onPaperCountChange}
            initialPaperCount={initialCanvasPages}
            initialBrushColor={initialBrushColor}
            initialShowGrid={initialShowGrid}
          />
        )}
      </motion.div>

      {/* Tools layer */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 w-full px-8 h-32 flex justify-between items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {/* Polaroid component */}
            <motion.div
              custom={0}
              variants={toolButtonVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Polaroid onClick={onTogglePhotoUpload} />
            </motion.div>

            {/* Three-layer stacked note component */}
            <motion.div
              variants={noteStackVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="px-6"
            >
              <div
                className="group z-10 transform translate-y-2 transition-all duration-300 ease-in-out hover:-translate-y-12 hover:scale-110 relative w-32 h-40 cursor-pointer"
                onClick={handleAddNote}
              >
                {/* Bottom note */}
                <div
                  className={`absolute inset-0 ${bottomNoteStyles.bg} ${bottomNoteStyles.border} shadow-md rounded-sm border transform rotate-12 group-hover:rotate-32 group-hover:translate-x-2 group-hover:translate-y-2 group-hover:shadow-xl transition-all duration-500 z-10`}
                  style={{ transition: "background-color 0.5s, border-color 0.5s, transform 0.5s, box-shadow 0.5s" }}
                />

                {/* Middle note */}
                <div
                  className={`absolute inset-0 ${middleNoteStyles.bg} ${middleNoteStyles.border} shadow-md rounded-sm border transform rotate-0 group-hover:rotate-6 group-hover:shadow-lg transition-all duration-500 z-20`}
                  style={{ transition: "background-color 0.5s, border-color 0.5s, transform 0.5s, box-shadow 0.5s" }}
                />

                {/* Top note */}
                <div
                  className={`absolute inset-0 ${topNoteStyles.bg} ${topNoteStyles.border} shadow-md rounded-sm border transform -rotate-12 group-hover:-rotate-24 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:shadow-xl transition-all duration-500 z-30`}
                  style={{ transition: "background-color 0.5s, border-color 0.5s, transform 0.5s, box-shadow 0.5s" }}
                />

                <button
                  type="button"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-40"
                  aria-label="Add note"
                ></button>
              </div>
            </motion.div>

            {/* Microphone icon */}
            <motion.div
              custom={2}
              variants={toolButtonVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <MicrophoneIcon isRecording={isRecording} onClick={onRecordVoice} />
            </motion.div>

            {/* Media CD icon */}
            <motion.div
              custom={3}
              variants={toolButtonVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <MediaIcon onAddMedia={onToggleMediaInput} />
            </motion.div>

            {/* Brush Icon */}
            {showBrushButton && (
              <motion.div
                custom={4}
                variants={toolButtonVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <BrushIcon onClick={onToggleBrushPanel} />
              </motion.div>
            )}

            {/* Pencil Icon */}
            <motion.div
              custom={5}
              variants={toolButtonVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <PencilIcon onClick={onAddDoodle} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};