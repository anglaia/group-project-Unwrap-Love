"use client"

import React, { useState, useRef, useEffect } from 'react';

interface NoteContentProps {
  color?: string;
  content?: string;
  isDragging?: boolean;
  width?: string;  // Optional width parameter
  height?: string; // Optional height parameter
  onContentChange?: (content: string) => void;
  onBringToFront?: () => void; // Callback function to notify parent element to bring to front
  readOnly?: boolean; // Whether the note is read-only
  noteSize?: { width: string, height: string }; // 添加便签大小属性
  onColorChange?: (color: string) => void; // 添加颜色变化回调
}

export const NoteContent: React.FC<NoteContentProps> = ({
  color = 'yellow',
  content = '',
  isDragging = false,
  width,
  height,
  onContentChange,
  onBringToFront,
  readOnly = false,
  noteSize, // 使用传入的便签大小
  onColorChange
}) => {
  const [noteContent, setNoteContent] = useState(content);
  const [isEditing, setIsEditing] = useState(false);
  const [randomSize, setRandomSize] = useState({
    width: "",
    height: ""
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNoteContent(content);
  }, [content]);

  // Generate random size when component mounts
  useEffect(() => {
    // 如果传入了noteSize，使用它
    if (noteSize && noteSize.width && noteSize.height) {
      setRandomSize(noteSize);
      return;
    }

    // If external size is provided, use it
    if (width && height) {
      setRandomSize({ width, height });
      return;
    }

    // Otherwise generate random size
    // Width between 192px and 256px (from w-48 to w-64)
    // Height between 192px and 256px (from h-48 to h-64)
    const widthOptions = ['w-48', 'w-52', 'w-56', 'w-60', 'w-64'];
    const heightOptions = ['h-48', 'h-52', 'h-56', 'h-60', 'h-64'];

    const randomWidth = widthOptions[Math.floor(Math.random() * widthOptions.length)];
    const randomHeight = heightOptions[Math.floor(Math.random() * heightOptions.length)];

    setRandomSize({
      width: randomWidth,
      height: randomHeight
    });
  }, [width, height, noteSize]);

  // Get color styles based on the color prop
  const getColorStyles = (color: string) => {
    switch (color) {
      case "blue":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          tape: "bg-blue-200/70",
          text: "text-blue-800",
        }
      case "green":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          tape: "bg-green-200/70",
          text: "text-green-800",
        }
      case "pink":
        return {
          bg: "bg-pink-50",
          border: "border-pink-200",
          tape: "bg-pink-200/70",
          text: "text-pink-800",
        }
      case "purple":
        return {
          bg: "bg-purple-50",
          border: "border-purple-200",
          tape: "bg-purple-200/70",
          text: "text-purple-800",
        }
      case "amber":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          tape: "bg-amber-200/70",
          text: "text-amber-800",
        }
      default: // yellow
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          tape: "bg-yellow-200/70",
          text: "text-yellow-800",
        }
    }
  }

  const colorStyles = getColorStyles(color)

  // Handle note click to enter edit mode
  const handleNoteClick = (e: React.MouseEvent) => {
    // If we're already dragging, don't enter edit mode
    if (isDragging) {
      e.stopPropagation();
      return;
    }

    // If we're already editing or in read-only mode, don't enter edit mode
    if (isEditing || readOnly) return;

    // Enter edit mode
    setIsEditing(true);

    // 更强的事件处理：
    // 1. 调用父组件的回调
    // 2. 同时通过事件冒泡机制触发父组件点击
    // 这种双重保障确保笔记被提升到顶层
    if (onBringToFront) {
      // 调用回调函数
      onBringToFront();

      // 额外保障：延迟再次触发以防止第一次调用失败
      setTimeout(() => {
        onBringToFront();
      }, 10);
    }

    // 始终尝试通过冒泡机制触发父元素的点击事件
    // 这可以激活 DraggableItem 的点击事件
    const customEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    // 获取父元素并触发事件
    const parent = noteRef.current?.parentElement;
    if (parent) {
      // 先立即触发
      parent.dispatchEvent(customEvent);

      // 再延迟触发确保被处理
      setTimeout(() => {
        parent.dispatchEvent(customEvent);
      }, 50);
    }

    e.stopPropagation();

    // Focus the textarea after a short delay to ensure it's ready
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // 如果有内容，将光标放在文本末尾
        if (noteContent) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = noteContent.length;
        }
      }
    }, 10);
  }

  // Handle textarea click to prevent event propagation
  const handleTextareaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  }

  // Handle mouse down on textarea to prevent dragging
  const handleTextareaMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  }

  // Add click outside listener to exit edit mode
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (noteRef.current && !noteRef.current.contains(e.target as Node) && isEditing) {
        setIsEditing(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isEditing]);

  // Track dragging state changes
  useEffect(() => {
    if (isDragging) {
      // If we start dragging while editing, exit edit mode
      if (isEditing) {
        setIsEditing(false);
      }
    }
  }, [isDragging]);

  // Handle textarea change
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setNoteContent(newContent);
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  // 可用的便签颜色
  const noteColors = ["yellow", "blue", "green", "pink", "purple", "amber"];

  // 处理颜色变更
  const handleColorChange = (newColor: string) => {
    if (readOnly || !onColorChange) return;

    // 只有当颜色真的发生变化时才调用
    if (newColor !== color) {
      onColorChange(newColor);
    }
  };

  return (
    <div
      ref={noteRef}
      className={`transition-shadow duration-300 rounded-md overflow-hidden ${isDragging ? "shadow-2xl" : "shadow-lg hover:shadow-2xl"
        }`}
      onClick={handleNoteClick}
    >
      <div className={`${randomSize.width} ${randomSize.height} ${colorStyles.bg} p-3 border ${colorStyles.border} rounded-md relative`}>
        {/* Note tape effect */}
        {/* Removing the tape effect div */}

        {/* 移除颜色选择器 */}

        {isEditing && !readOnly ? (
          /* Editable textarea when in edit mode and not read-only */
          <textarea
            ref={textareaRef}
            className={`w-full h-full bg-transparent resize-none outline-none pt-4 font-caveat text-2xl ${colorStyles.text} placeholder:${colorStyles.text} placeholder:opacity-60 scrollbar-hide`}
            placeholder="Write something..."
            value={noteContent}
            onChange={handleTextareaChange}
            onClick={handleTextareaClick}
            onMouseDown={handleTextareaMouseDown}
            style={{
              overflow: "auto",
              fontFamily: "Caveat, cursive"
            }}
          />
        ) : (
          /* Read-only display when not in edit mode or when read-only is true */
          <div
            className={`w-full h-full pt-4 font-caveat text-2xl ${colorStyles.text} overflow-auto scrollbar-hide whitespace-pre-wrap`}
            style={{
              overflowWrap: "break-word",
              fontFamily: "Caveat, cursive"
            }}
          >
            {noteContent || <span className="opacity-60">Write something...</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default NoteContent

