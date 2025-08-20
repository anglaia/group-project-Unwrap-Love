"use client"

import type React from "react"
import { useRef, useEffect } from "react"

interface DoodleContentProps {
  svgData: string
  isDragging?: boolean
}

export const DoodleContent: React.FC<DoodleContentProps> = ({ svgData, isDragging = false }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      // Clear the container first
      containerRef.current.innerHTML = ""

      try {
        // Parse SVG content
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(svgData, "image/svg+xml")
        const svgElement = svgDoc.querySelector("svg")

        if (svgElement) {
          // Set SVG rendering quality
          svgElement.setAttribute("shape-rendering", "geometricPrecision")
          svgElement.setAttribute("text-rendering", "optimizeLegibility")
          svgElement.setAttribute("image-rendering", "optimizeQuality")

          // Simple path processing
          const paths = svgElement.querySelectorAll("path")
          paths.forEach(path => {
            // Add basic attributes
            path.setAttribute("stroke-linejoin", "round")
            path.setAttribute("stroke-linecap", "round")

            // If path has no fill, set to none to avoid fill effects
            if (!path.hasAttribute("fill")) {
              path.setAttribute("fill", "none")
            }
          })

          // Ensure SVG attributes are correct
          svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet")
          svgElement.setAttribute("overflow", "visible")

          // Add the modified SVG
          containerRef.current.appendChild(svgElement)
        } else {
          // If parsing fails, fall back to the original method
          containerRef.current.innerHTML = svgData
        }
      } catch (e) {
        // Fall back on error
        containerRef.current.innerHTML = svgData
        console.error("Error parsing SVG:", e)
      }

      // Ensure SVG style is correct regardless
      const svg = containerRef.current.querySelector("svg")
      if (svg) {
        svg.style.display = "block"
        svg.style.maxWidth = "100%"
        svg.style.maxHeight = "100%"
        svg.style.overflow = "visible"
      }
    }
  }, [svgData, isDragging])

  return <div ref={containerRef} className="min-w-[100px] min-h-[100px] p-2" />
}

export default DoodleContent

