"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { getImageUrl } from "@/config/apiConfig"

interface GridBackgroundProps {
  imageUrl?: string; // 可选，自定义背景图片 URL
  backgroundColor?: string; // 可选，自定义背景颜色
  showGrid?: boolean; // 是否显示网格
}
export const GridBackground: React.FC<GridBackgroundProps> = ({ imageUrl, backgroundColor, showGrid = true }) => {
  const [imageError, setImageError] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | undefined>(undefined);
  const [fadeState, setFadeState] = useState<'in' | 'out' | 'none'>('none');
  const [displayedImageUrl, setDisplayedImageUrl] = useState<string | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    console.log('GridBackground received imageUrl:', imageUrl);

    // 如果URL改变了，执行淡出动画
    if (processedImageUrl && (imageUrl !== processedImageUrl)) {
      setFadeState('out');
      // 让淡出动画完成后再更新URL
      const timer = setTimeout(() => {
        handleImageChange();
      }, 300); // 匹配CSS过渡时间
      return () => clearTimeout(timer);
    } else {
      // 直接处理图片变更
      handleImageChange();
    }
  }, [imageUrl]);

  const handleImageChange = () => {
    // 重置错误状态
    setImageError(false);

    // 如果URL为空字符串或undefined，清除背景
    if (!imageUrl) {
      console.log('URL is empty or undefined, clearing background');
      // 首次加载时不执行清除背景的动画
      if (isInitialLoad) {
        console.log('Initial load, skipping background clearing animation');
        setProcessedImageUrl(undefined);
        setDisplayedImageUrl(undefined);
        setFadeState('none');
        setIsInitialLoad(false);
      } else {
        setFadeState('out');
        const timer = setTimeout(() => {
          setProcessedImageUrl(undefined);
          setDisplayedImageUrl(undefined);
          setFadeState('none');
        }, 300);
        return () => clearTimeout(timer);
      }
      return;
    }

    // 如果是第一次加载且有有效URL，标记初始加载完成
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }

    // 使用API配置处理URL
    const fullImageUrl = getImageUrl(imageUrl);
    console.log('Converted image URL:', fullImageUrl);

    // 设置新的处理URL
    setProcessedImageUrl(fullImageUrl);

    // 只有当不是blob URL时才检查可访问性，避免跨域问题
    if (!fullImageUrl.startsWith('blob:')) {
      // 测试图片URL是否可访问
      const img = new Image();
      img.onload = () => {
        console.log('Background image loaded successfully:', fullImageUrl);
        setImageError(false);
        setFadeState('in');
        setDisplayedImageUrl(fullImageUrl);
      };
      img.onerror = (e) => {
        console.log('Background image failed to load, using fallback:', fullImageUrl);
        setImageError(true);
        setFadeState('none');
      };
      img.src = fullImageUrl;
    } else {
      // 对于blob URL直接设置
      setDisplayedImageUrl(fullImageUrl);
      setFadeState('in');
    }
  };

  return (
    <div
      className="absolute inset-0" // Container for layers
    >
      {/* 背景图片层 */}
      {displayedImageUrl && !imageError && (
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage: `url(${displayedImageUrl})`,
            filter: 'blur(0px)',
            transform: 'scale(1.1)', // 稍微放大以避免模糊边缘
            zIndex: -3, // Image layer at the bottom (negative)
            opacity: fadeState === 'in' ? 1 : fadeState === 'out' ? 0 : 0,
            transition: "opacity 0.3s ease-in-out, transform 0.5s ease-in-out, filter 0.4s ease-in-out",
          }}
        />
      )}

      {/* 背景颜色层 (and default tint) */}
      <div
        className="absolute inset-0 bg-black/3" // Default tint if backgroundColor is transparent/undefined
        style={{
          // If 'backgroundColor' prop is provided, it will be used.
          // If no 'backgroundColor' prop and no (valid) image, default to #F8F8F7.
          // If an image is shown and no 'backgroundColor' prop, this becomes 'undefined',
          // allowing 'bg-black/3' (tint) to apply over the image.
          backgroundColor: backgroundColor || (!displayedImageUrl || imageError ? "#F8F8F7" : undefined),
          transition: "background-color 0.4s ease-in-out", // 添加背景颜色过渡动画
          zIndex: -2, // Color/Tint layer, above image (negative)
        }}
      />

      {/* 网格层 - 只有在showGrid为true时才显示 */}
      {showGrid && (
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.2, position: 'relative', zIndex: -1 }}> {/* Grid layer, on top (negative) */}
          <defs>
            <pattern id="gridPattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 0 0 L 50 0" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.7" />
              <path d="M 0 0 L 0 50" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.7" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gridPattern)" />
        </svg>
      )}
    </div>
  )
}

export default GridBackground

