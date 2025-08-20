"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, useMotionValue, PanInfo, AnimatePresence } from "framer-motion"
import ContextMenu, { getContextMenuState } from "./ContextMenu"

interface DraggableItemProps {
  id: string
  initialPosition: { x: number; y: number }
  zIndex: number
  onPositionChange: (id: string, position: { x: number; y: number }, shouldSaveHistory: boolean) => void
  onDragStart: (id: string) => void
  children: React.ReactNode
  rotation?: number
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
  isEditable?: boolean
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  initialPosition,
  zIndex,
  onPositionChange,
  onDragStart,
  children,
  rotation = 0,
  onDelete,
  onDuplicate,
  isEditable = true
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(true) // 用于控制组件的可见性
  const x = useMotionValue(initialPosition.x)
  const y = useMotionValue(initialPosition.y)
  const hasDraggedRef = useRef(false)
  const currentZIndexRef = useRef(zIndex)

  // Set initial position when component mounts
  useEffect(() => {
    x.set(initialPosition.x)
    y.set(initialPosition.y)
  }, [initialPosition.x, initialPosition.y])

  // Update ref when zIndex property changes
  useEffect(() => {
    currentZIndexRef.current = zIndex
  }, [zIndex])

  // Add click outside event listener to close context menu
  useEffect(() => {
    const handleClickOutside = () => {
      if (showContextMenu) {
        setShowContextMenu(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [showContextMenu])

  // 处理删除动画
  const animatedDelete = () => {
    setIsVisible(false);
    // 等待动画完成后再实际删除
    setTimeout(() => {
      if (onDelete) {
        onDelete(id);
      }
    }, 300); // 与动画持续时间匹配
  };

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true)
    onDragStart(id)  // Notify parent component to update layer
    hasDraggedRef.current = false
  }

  // Handle drag end
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)

    // 确保位置获取是有效的数值
    const newX = x.get();
    const newY = y.get();

    // 检查获取的位置值是否有效
    if (typeof newX !== 'number' || typeof newY !== 'number' || isNaN(newX) || isNaN(newY)) {
      console.error(`拖拽位置无效: x=${newX}, y=${newY}`);
      return;
    }

    const newPosition = { x: newX, y: newY };
    console.log(`项目 ${id} 拖拽结束位置: (${newPosition.x}, ${newPosition.y})`);

    // 通知父组件位置变化，并标记为应保存历史
    onPositionChange(id, newPosition, true);

    // If drag distance exceeds threshold, consider it a drag not a click
    if (Math.abs(info.offset.x) > 5 || Math.abs(info.offset.y) > 5) {
      hasDraggedRef.current = true

      // Add short delay to prevent subsequent click events
      setTimeout(() => {
        hasDraggedRef.current = false
      }, 100)
    }
  }

  // Handle click event, bring element to top layer
  const handleClick = (e: React.MouseEvent) => {
    // If just finished dragging, prevent click
    if (hasDraggedRef.current) {
      e.stopPropagation()
      e.preventDefault()
      return
    }

    // Trigger onDragStart callback to notify parent component this element should be brought to top
    onDragStart(id)
  }

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowContextMenu(false);
    // 使用动画删除而不是立即删除
    animatedDelete();
  };

  // Handle right click to show context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 检查是否已有菜单打开
    const { anyMenuOpen } = getContextMenuState();

    // 如果已有菜单打开，则不打开新菜单
    if (anyMenuOpen) {
      return;
    }

    // Calculate position relative to the document
    setContextMenuPosition({
      x: e.clientX,
      y: e.clientY
    });

    setShowContextMenu(true);
  };

  // 复制功能
  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDuplicate) {
      onDuplicate(id);
    }
    setShowContextMenu(false);
  };

  // Clone child components and pass isDragging property
  const childrenWithProps = React.Children.map(children, (child) => {
    //&& typeof child.type === "function")was addec to avoid passing isDragging to native HTML tags like <div> Clark
    if (React.isValidElement(child) && typeof child.type === "function") {
      return React.cloneElement(child, { isDragging } as { isDragging: boolean })
    }
    return child
  })

  // 动画变体
  const itemVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
    },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: rotation,
      transition: {
        damping: 15,
        stiffness: 200,
        duration: 0.1
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.2,
        ease: "backOut"
      }
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            style={{
              x,
              y,
              // Use higher z-index while dragging to ensure it stays on top
              zIndex: isDragging ? 9999 : zIndex,  // Use extremely high z-index value while dragging
              rotate: rotation,
              cursor: isEditable ? (isDragging ? "grabbing" : "grab") : "default",
              position: "absolute",
              touchAction: "none"
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={itemVariants}
            drag={isEditable}
            dragMomentum={false}
            dragElastic={0.1}
            whileDrag={{
              scale: isEditable ? 1.02 : 1,
              transition: { duration: 0.1 }
            }}
            onDragStart={isEditable ? handleDragStart : undefined}
            onDragEnd={isEditable ? handleDragEnd : undefined}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onContextMenu={isEditable ? handleContextMenu : undefined}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 400,
              duration: 0.2
            }}
            className="relative"
          >
            {childrenWithProps}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <ContextMenu
        visible={showContextMenu}
        position={contextMenuPosition}
        onClose={() => setShowContextMenu(false)}
      >
        <div
          className="px-2 py-1 hover:bg-black/5 rounded cursor-pointer flex items-center justify-between text-xs min-w-[120px]"
          onClick={handleDuplicate}
        >
          <span className="text-left flex-1">Duplicate</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 ml-2 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
            <rect x="3" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
        <div
          className="px-2 py-1 hover:bg-black/5 rounded cursor-pointer flex items-center justify-between text-xs min-w-[120px]"
          onClick={handleDelete}
        >
          <span className="text-left flex-1 text-red-500">Delete</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 ml-2 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
      </ContextMenu>
    </>
  )
}

export default DraggableItem
