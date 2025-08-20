"use client"

import type React from "react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { getImageUrl } from "@/config/apiConfig"

interface PolaroidContentProps {
  imageUrl: string
  dateTaken?: string
  isDragging?: boolean
  imageWidth?: number
  imageHeight?: number
  scale?: number
  onDelete?: () => void
  originalBlobUrl?: string
}

export const PolaroidContent: React.FC<PolaroidContentProps> = ({
  imageUrl,
  dateTaken,
  isDragging = false,
  imageWidth,
  imageHeight,
  scale,
  onDelete,
  originalBlobUrl,
}) => {
  // Internal random scale state
  const [internalScale, setInternalScale] = useState<number>(scale || 1)
  const [finalImageUrl, setFinalImageUrl] = useState<string>(imageUrl || "/placeholder.svg")
  const [imageError, setImageError] = useState<boolean>(false)
  const [triedFallback, setTriedFallback] = useState<boolean>(false)

  // 规范化URL的辅助函数
  const normalizeUrl = (url: string): string => {
    if (!url) return "/placeholder.svg";
    return getImageUrl(url);
  }

  // Process URL and generate scale on component mount
  useEffect(() => {
    // Process image URL if needed
    if (imageUrl) {
      setFinalImageUrl(normalizeUrl(imageUrl));
      // Reset error states when URL changes
      setImageError(false);
      setTriedFallback(false);
    } else {
      setFinalImageUrl("/placeholder.svg");
    }

    // If scale is provided externally, use it; otherwise generate a random value
    if (scale !== undefined) {
      setInternalScale(scale)
    } else {
      // Generate a random number between 0.7 and 1.3
      const randomScale = 0.7 + Math.random() * 0.6
      setInternalScale(randomScale)
    }
  }, [imageUrl, scale]) // Only run when inputs change

  // 处理图片加载错误
  const handleImageError = () => {
    console.error('Image failed to load:', finalImageUrl);

    // If we have an originalBlobUrl and haven't tried using it yet, try that
    if (originalBlobUrl && !triedFallback) {
      console.log('Trying fallback to original blob URL:', originalBlobUrl);
      setFinalImageUrl(normalizeUrl(originalBlobUrl));
      setTriedFallback(true);
      return;
    }

    // 如果上面的方法都失败了，使用占位图
    setImageError(true);
    setFinalImageUrl("/placeholder.svg");
  };

  // Format date as YYYY.MM.DD
  const formatDate = (dateString?: string) => {
    try {
      const date = dateString ? new Date(dateString) : new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${year}.${month}.${day}`
    } catch (error) {
      // If date parsing fails, return current date formatted
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const day = String(now.getDate()).padStart(2, "0")
      return `${year}.${month}.${day}`
    }
  }

  // Expand scale range for more randomness (0.7 to 1.3)
  const normalizedScale = Math.max(0.7, Math.min(1.3, internalScale))

  // Set absolute size limits (in rem units), expanded range
  const MIN_WIDTH = 16 // Minimum width 16rem
  const MAX_WIDTH = 28 // Maximum width 28rem

  // Calculate actual width (subject to min and max limits)
  const width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, 20 * normalizedScale))

  // 确定是否禁用优化
  const shouldDisableOptimization = (url: string): boolean => {
    return url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('blob:') ||
      url.startsWith('data:');
  }

  return (
    <div
      className={`transition-shadow duration-300 rounded-md overflow-hidden ${isDragging ? "shadow-2xl" : "shadow-lg hover:shadow-2xl"}`}
    >
      <div
        className="bg-white p-3 border border-stone-200 rounded-md overflow-hidden"
        style={{ width: `${width}rem` }}
      >
        {/* Photo area with inner shadow */}
        <div className="bg-gray-50 overflow-hidden flex items-center justify-center relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] rounded-sm">
          <div className="relative w-full">
            {onDelete && (
              <div className="pointer-events-auto absolute top-2 right-2 z-10">
                <button
                  onClick={onDelete}
                  className="absolute top-2 right-2 bg-white bg-opacity-70 rounded-full p-1 shadow-md hover:bg-opacity-100 transition"
                >
                  ✕
                </button>
              </div>
            )}
            <Image
              src={finalImageUrl}
              alt="Polaroid photo"
              width={imageWidth || 500}
              height={imageHeight || 500}
              className="object-contain w-full rounded-sm"
              onError={handleImageError}
              unoptimized={shouldDisableOptimization(finalImageUrl)}
              priority={true} // 使用priority确保图片优先加载
            />
            {/* Photo area inner shadow overlay */}
            <div className="absolute inset-0 shadow-[inset_0_0_4px_rgba(0,0,0,0.1)]" />
          </div>
        </div>

        {/* Bottom area with subtle gradient and centered date */}
        <div className="mt-2 flex items-center justify-center h-8">
          <span className="text-gray-500 select-none font-caveat text-lg">{formatDate(dateTaken)}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * The component now automatically generates random sizes without needing to manually pass a scale parameter
 * Each Polaroid card will have a different random size
 * If you need a fixed size, you can pass in a fixed scale value
 */

export default PolaroidContent

