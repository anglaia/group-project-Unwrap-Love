'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EnvelopeAnimationProps {
  onComplete: () => void;
  userName?: string;
}

export const EnvelopeAnimation = ({ onComplete, userName = 'Someone' }: EnvelopeAnimationProps) => {
  const [animationStage, setAnimationStage] = useState<'closed' | 'opening' | 'opened'>('closed');

  useEffect(() => {
    // 组件挂载时标记
    const isMounted = { current: true };

    // 确保在浏览器环境中执行
    if (typeof window === 'undefined') return;

    // 声明计时器变量，使它们在整个 useEffect 作用域内可访问
    let timer1: NodeJS.Timeout | null = null;
    let timer2: NodeJS.Timeout | null = null;
    let timer3: NodeJS.Timeout | null = null;

    // 在下一帧开始动画，确保渲染完成
    const frameId = requestAnimationFrame(() => {
      // Start the animation sequence
      timer1 = setTimeout(() => {
        if (isMounted.current) setAnimationStage('opening');
      }, 800);

      timer2 = setTimeout(() => {
        if (isMounted.current) setAnimationStage('opened');
      }, 2300);

      timer3 = setTimeout(() => {
        // 确保在组件仍然挂载时调用完成回调
        if (isMounted.current) {
          onComplete();
        }
      }, 3300);
    });

    // 组件卸载时清理
    return () => {
      isMounted.current = false;
      cancelAnimationFrame(frameId);
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      if (timer3) clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {animationStage !== 'opened' && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: "radial-gradient(ellipse at top, #fce7f3 0%, rgba(255, 255, 255, 0.5) 50%, rgba(249, 250, 251, 0.8) 100%)",
            backgroundSize: "200% 200%"
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative w-[350px] h-[220px] perspective-1000">
            {/* Envelope body with texture */}
            <motion.div
              className="absolute inset-0 rounded-lg shadow-xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #f9a8d4 0%, #e879f9 100%)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
              }}
            >
              {/* Envelope texture */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
            </motion.div>

            {/* Envelope bottom flap (always visible) */}
            <motion.div
              className="absolute bottom-0 left-0 w-full h-[110px] rounded-b-lg"
              style={{
                background: "linear-gradient(to bottom, #f9a8d4 0%, #e879f9 100%)",
                clipPath: "polygon(0 0, 50% 30%, 100% 0, 100% 100%, 0 100%)",
                zIndex: 5
              }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
            </motion.div>

            {/* Left flap (always visible) */}
            <motion.div
              className="absolute top-0 left-0 w-[175px] h-full"
              style={{
                background: "linear-gradient(to right, #f9a8d4 0%, #e879f9 100%)",
                clipPath: "polygon(0 0, 100% 0, 0 100%)",
                zIndex: 4,
                opacity: 0.9
              }}
            />

            {/* Right flap (always visible) */}
            <motion.div
              className="absolute top-0 right-0 w-[175px] h-full"
              style={{
                background: "linear-gradient(to left, #f9a8d4 0%, #e879f9 100%)",
                clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                zIndex: 4,
                opacity: 0.9
              }}
            />

            {/* Envelope top flap (animated) */}
            <motion.div
              className="absolute top-0 left-0 w-full h-[110px] origin-top"
              style={{
                background: "linear-gradient(to top, #f9a8d4 0%, #e879f9 100%)",
                clipPath: "polygon(0 0, 50% 100%, 100% 0)",
                zIndex: 10,
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden"
              }}
              initial={{ rotateX: 0 }}
              animate={{
                rotateX: animationStage === 'closed' ? 0 : -180,
              }}
              transition={{
                duration: 1.2,
                delay: 0.3,
                ease: "easeInOut"
              }}
            >
              {/* Texture for the flap */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />

              {/* Wax seal */}
              <motion.div
                className="absolute bottom-1 left-1/2 transform -translate-x-1/2 translate-y-[20px] w-14 h-14 flex items-center justify-center"
                initial={{ scale: 1 }}
                animate={{
                  scale: animationStage === 'closed' ? 1 : [1, 1.2, 0],
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.5
                }}
              >
                <div className="relative">
                  {/* Wax base */}
                  <div className="absolute inset-0 bg-red-500 rounded-full shadow-lg" style={{
                    background: "radial-gradient(circle, #ef4444 0%, #b91c1c 100%)"
                  }}></div>

                  {/* Heart shape */}
                  <svg viewBox="0 0 24 24" className="w-full h-full relative z-10">
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      className="fill-white/90"
                    />
                  </svg>

                  {/* Shine effect */}
                  <div className="absolute top-1 right-1 w-2 h-2 bg-white/60 rounded-full"></div>
                </div>
              </motion.div>
            </motion.div>

            {/* Letter/gift content */}
            <motion.div
              className="absolute inset-0 m-6 bg-white rounded shadow-inner flex items-center justify-center overflow-hidden"
              style={{
                boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
                backgroundImage: "linear-gradient(135deg, #f5f7fa 0%, #f8f9fa 100%)"
              }}
              initial={{ y: 0 }}
              animate={{
                y: animationStage === 'opening' ? [-10, -70] : 0,
                scale: animationStage === 'opening' ? [1, 1.1] : 1,
                rotateZ: animationStage === 'opening' ? [0, -2, 2, 0] : 0
              }}
              transition={{
                duration: 0.8,
                delay: 1.2,
                ease: "easeOut"
              }}
            >
              {/* Paper texture */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                }}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: animationStage === 'opening' ? 1 : 0,
                  scale: animationStage === 'opening' ? 1 : 0.8
                }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="text-center relative z-10"
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{
                    y: animationStage === 'opening' ? 0 : 20,
                    opacity: animationStage === 'opening' ? 1 : 0
                  }}
                  transition={{ delay: 1.7, duration: 0.5 }}
                >
                  <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600">
                    A Gift For You!
                  </span>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Confetti effect */}
            {animationStage === 'opening' && (
              <>
                {[...Array(30)].map((_, i) => {
                  const colors = ['#f9a8d4', '#e879f9', '#f472b6', '#c084fc', '#a855f7'];
                  const shapes = ['circle', 'square', 'rect', 'tri'];
                  const shape = shapes[Math.floor(Math.random() * shapes.length)];
                  const color = colors[Math.floor(Math.random() * colors.length)];

                  return (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{
                        width: Math.random() * 12 + 5,
                        height: shape === 'rect' ? Math.random() * 8 + 5 : shape === 'tri' ? Math.random() * 12 + 8 : Math.random() * 12 + 5,
                        backgroundColor: shape === 'tri' ? 'transparent' : color,
                        borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? '2px' : '0',
                        clipPath: shape === 'tri' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none',
                        border: shape === 'tri' ? `solid ${color}` : 'none',
                        top: '40%',
                        left: '50%',
                        zIndex: 20
                      }}
                      initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
                      animate={{
                        x: (Math.random() - 0.5) * 300,
                        y: (Math.random() - 0.5) * 300,
                        opacity: [0, 1, 1, 0],
                        rotate: Math.random() * 360 * (Math.random() > 0.5 ? 1 : -1),
                        scale: [0, 1, 1, 0.5, 0]
                      }}
                      transition={{
                        duration: 2 + Math.random(),
                        delay: 1.2 + Math.random() * 0.3,
                        ease: ["easeOut", "easeIn"]
                      }}
                    />
                  );
                })}
              </>
            )}

            {/* Envelope shadow */}
            <div
              className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-[80%] h-4 bg-black/10 blur-md rounded-full"
              style={{
                transformOrigin: 'center',
                transform: `translateX(-50%) scaleX(${animationStage === 'opening' ? 0.9 : 1})`
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
