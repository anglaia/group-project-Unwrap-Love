import React, { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'

// Define point interface
interface Point {
  x: number
  y: number
}

// Define stroke interface
interface Stroke {
  type: 'line' | 'dot'
  points: Point[]
  color: string
  width: number
  id?: string // Add id to identify strokes
}

// Define component props interface
interface DoodleCanvasProps {
  onSave: (svgContent: string) => void
  onCancel: () => void
}

export const DoodleCanvas: React.FC<DoodleCanvasProps> = ({ onSave, onCancel }) => {
  // Drawing-related states
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [selectedColor, setSelectedColor] = useState("#555555")
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedStroke, setSelectedStroke] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Brush colors and width
  const colors = ["#555555", "#8B9D83", "#C2A792", "#94A9D0", "#C98474", "#DCC48E", "#AE9EC7"]
  const strokeWidth = 8

  // Get coordinates relative to canvas
  const getCoordinates = (clientX: number, clientY: number): Point | null => {
    if (!canvasRef.current) return null

    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  // Start drawing
  const startDrawing = (clientX: number, clientY: number) => {
    const point = getCoordinates(clientX, clientY)
    if (!point) return

    // Create new stroke
    const newStroke: Stroke = {
      type: 'line', // Default to line type
      points: [point],
      color: selectedColor,
      width: strokeWidth
    }

    setCurrentStroke(newStroke)
    setIsDrawing(true)
  }

  // Drawing process
  const draw = (clientX: number, clientY: number) => {
    if (!isDrawing || !currentStroke) return

    const point = getCoordinates(clientX, clientY)
    if (!point) return

    // Add point to current stroke
    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, point]
    })
  }

  // End drawing
  const endDrawing = () => {
    if (!currentStroke) {
      setIsDrawing(false)
      return
    }

    // Determine if it's a point or a line
    let finalStroke: Stroke
    if (currentStroke.points.length === 1) {
      // If only one point, mark as dot type
      finalStroke = {
        ...currentStroke,
        type: 'dot',
        id: Date.now().toString() // Add unique id
      }
    } else {
      finalStroke = {
        ...currentStroke,
        id: Date.now().toString() // Add unique id
      }
    }

    // Add to strokes array
    setStrokes([...strokes, finalStroke])
    setCurrentStroke(null)
    setIsDrawing(false)
  }

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if click event occurred on control buttons or color picker
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('.color-picker')) {
      return
    }

    e.preventDefault()
    startDrawing(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault()
    draw(e.clientX, e.clientY)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault()
    endDrawing()
  }

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Check if touch event occurred on control buttons or color picker
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('.color-picker')) {
      return
    }

    e.preventDefault()
    if (e.touches[0]) {
      startDrawing(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    if (e.touches[0]) {
      draw(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    endDrawing()
  }

  // Render SVG path for a line
  const renderPath = useCallback((stroke: Stroke) => {
    if (stroke.points.length < 2) return ""

    const start = stroke.points[0]
    let path = `M ${start.x} ${start.y}`

    for (let i = 1; i < stroke.points.length; i++) {
      path += ` L ${stroke.points[i].x} ${stroke.points[i].y}`
    }

    return path
  }, []);

  // Save drawing as SVG
  const handleSaveDoodle = useCallback(() => {
    // If no strokes, exit directly
    if (strokes.length === 0) {
      // Exit drawing mode without saving anything
      onCancel()
      return
    }

    try {
      // Calculate bounding box
      const allPoints = strokes.flatMap(stroke => stroke.points)

      // Check again if there are valid points
      if (allPoints.length === 0) {
        onCancel()
        return
      }

      // Find minimum and maximum coordinates
      const xValues = allPoints.map(p => p.x)
      const yValues = allPoints.map(p => p.y)

      const minX = Math.min(...xValues)
      const maxX = Math.max(...xValues)
      const minY = Math.min(...yValues)
      const maxY = Math.max(...yValues)

      // Add some padding
      const padding = 20
      const viewMinX = Math.max(0, minX - padding)
      const viewMinY = Math.max(0, minY - padding)
      const viewWidth = Math.max(50, maxX - minX + 2 * padding)
      const viewHeight = Math.max(50, maxY - minY + 2 * padding)

      // Create SVG content
      const svgContent = `
        <svg width="${viewWidth}" height="${viewHeight}" viewBox="${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}" xmlns="http://www.w3.org/2000/svg">
          ${strokes.map(stroke => {
        if (stroke.type === 'dot') {
          // Draw dots
          const point = stroke.points[0]
          return `
                <circle
                  cx="${point.x}"
                  cy="${point.y}"
                  r="${stroke.width / 2}"
                  fill="${stroke.color}"
                />
              `
        } else {
          // Draw lines
          return `
                <path
                  d="${renderPath(stroke)}"
                  stroke="${stroke.color}"
                  stroke-width="${stroke.width}"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  vector-effect="non-scaling-stroke"
                />
              `
        }
      }).join('')}
        </svg>
      `

      // Save SVG data
      onSave(svgContent)
    } catch (error) {
      console.error('Error saving doodle:', error)
      // Also exit drawing mode when error occurs
      onCancel()
    }
  }, [strokes, onSave, onCancel, renderPath]);

  // Cancel drawing
  const handleCancelDoodle = useCallback(() => {
    // Clear all drawing data
    setStrokes([])
    setCurrentStroke(null)

    // Exit drawing mode
    onCancel()
  }, [onCancel]);

  // Clear canvas
  const clearCanvas = () => {
    setStrokes([])
    setCurrentStroke(null)
  }

  // Delete a stroke
  const deleteStroke = (id: string) => {
    setStrokes(strokes.filter(stroke => stroke.id !== id))
    setSelectedStroke(null)
  }

  // Handle stroke selection
  const handleStrokeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent canvas drawing
    if (isDrawing) return // Don't select while drawing
    
    setSelectedStroke(id === selectedStroke ? null : id)
  }

  // Handle clicks outside the canvas
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (canvasRef.current && !canvasRef.current.contains(event.target as Node) && !isDrawing) {
        // Clear selection and cancel if clicking outside
        setSelectedStroke(null)
        handleCancelDoodle();
      }
    };

    // 处理触摸事件
    const handleTouchOutside = (event: TouchEvent) => {
      if (event.touches && event.touches[0]) {
        const touch = event.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);

        if (canvasRef.current && element && !canvasRef.current.contains(element) && !isDrawing) {
          // Clear selection and cancel if clicking outside
          setSelectedStroke(null)
          handleCancelDoodle();
        }
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleTouchOutside);

    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleTouchOutside);
    };
  }, [isDrawing, handleCancelDoodle]); // Update dependencies

  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden"
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drawing tool UI */}
      <div className="absolute left-0 right-0 top-4 px-6 flex justify-between items-center">
        {/* Cancel button */}
        <button
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-gray-700 hover:bg-white/30 transition-colors"
          onClick={handleCancelDoodle}
          aria-label="Cancel doodle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Color picker */}
        <div className="flex justify-center items-center p-2 gap-3 bg-white/20 backdrop-blur-md rounded-full color-picker">
          {colors.map((color) => (
            <button
              key={color}
              className={`w-7 h-7 rounded-full transition-all duration-150 relative ${selectedColor === color ? "" : "hover:scale-105"
                }`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
              aria-label={`Select ${color} color`}
            >
              {selectedColor === color && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full border-2 border-white" style={{ width: "22px", height: "22px" }}></div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Save button */}
        <button
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-gray-700 hover:bg-white/30 transition-colors"
          onClick={handleSaveDoodle}
          aria-label="Save doodle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Delete button - only show when a stroke is selected */}
      {selectedStroke && (
        <div className="absolute right-4 bottom-4 z-10">
          <button
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-gray-700 hover:bg-white/30 transition-colors"
            onClick={() => deleteStroke(selectedStroke)}
            aria-label="Delete selected element"
          >
            <Image 
              src="/images/bin.png" 
              alt="Delete" 
              width={24} 
              height={24}
            />
          </button>
        </div>
      )}

      <svg ref={svgRef} width="100%" height="100%" className="w-full h-full">
        {/* Completed strokes */}
        {strokes.map((stroke, index) => (
          <React.Fragment key={stroke.id || index}>
            <g 
              onClick={(e) => handleStrokeClick(e, stroke.id || '')}
              className={`cursor-pointer ${selectedStroke === stroke.id ? 'stroke-2' : ''}`}
            >
              {stroke.type === 'dot' ? (
                <circle
                  cx={stroke.points[0].x}
                  cy={stroke.points[0].y}
                  r={stroke.width / 2}
                  fill={stroke.color}
                  className={selectedStroke === stroke.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                />
              ) : (
                <path
                  d={renderPath(stroke)}
                  stroke={stroke.color}
                  strokeWidth={selectedStroke === stroke.id ? stroke.width + 2 : stroke.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className={selectedStroke === stroke.id ? 'outline-blue-500' : ''}
                />
              )}
            </g>
          </React.Fragment>
        ))}

        {/* Current stroke being drawn */}
        {currentStroke && (
          <React.Fragment>
            {currentStroke.points.length === 1 ? (
              <circle
                cx={currentStroke.points[0].x}
                cy={currentStroke.points[0].y}
                r={currentStroke.width / 2}
                fill={currentStroke.color}
              />
            ) : (
              <path
                d={renderPath(currentStroke)}
                stroke={currentStroke.color}
                strokeWidth={currentStroke.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </React.Fragment>
        )}
      </svg>
    </div>
  )
}
