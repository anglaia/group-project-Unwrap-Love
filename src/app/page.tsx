"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Bird } from "lucide-react"
import { SignUpButton, UserButton, SignOutButton } from "@/components/Auth/AuthButtons"
import { useAuth } from "@/context/AuthContext"
import { v4 as uuidv4 } from "uuid"
import axios from "axios"
import { getApiUrl } from "@/config/apiConfig"

const preloadImage = async () => {
  const CACHE_KEY = 'landingPageImageCache';
  const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  // 检查本地存储中是否有缓存的图片数据
  const cachedData = localStorage.getItem(CACHE_KEY);

  if (cachedData) {
    try {
      const imageData = JSON.parse(cachedData);
      // 检查缓存是否过期
      if (imageData.expiry && imageData.expiry > Date.now()) {
        console.log('Using cached landing page image');
        return; // 使用缓存的图片，不需要重新加载
      }
      // 如果过期，删除缓存
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Error parsing cached image data:', error);
      localStorage.removeItem(CACHE_KEY);
    }
  }

  // 如果没有缓存或缓存已过期，加载图片并缓存
  try {
    const img = new Image();
    img.src = '/images/landing-page.png';

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // 缓存图片信息
    const imageCache = {
      url: '/images/landing-page.png',
      expiry: Date.now() + CACHE_EXPIRY
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(imageCache));
    console.log('Cached landing page image');
  } catch (error) {
    console.error('Failed to preload landing page image:', error);
  }
}

// Star component for the background animation
const Star = ({ style, index, duration }: { style: React.CSSProperties, index: number, duration: number }) => {
  return (
    <motion.div
      className="absolute rounded-full blur-[0.5px]"
      style={{
        ...style,
        backgroundColor: "#88d2d9"
      }}
      animate={{
        opacity: [0.3, 1, 0.3], // Start and end with partial opacity instead of 0
        scale: [0.7, 1, 0.7], // Start and end with partial scale instead of 0
      }}
      transition={{
        duration: duration, // Random duration passed from parent
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut",
        delay: (index % 5) * 0.8, // Reduced stagger delay for faster overall effect
      }}
    />
  );
};

// Stars background component
const StarsBackground = () => {
  // Use a client component wrapper with useEffect to generate stars
  const [stars, setStars] = useState<Array<{ id: number, style: React.CSSProperties, duration: number }>>([]);

  useEffect(() => {
    // Generate stars only on the client side
    const generatedStars = Array.from({ length: 100 }).map((_, i) => { // Increased from 50 to 100 stars
      const size = Math.random() * 4 + 1;
      const duration = Math.random() * 2 + 2; // Random duration between 3-6 seconds
      return {
        id: i,
        duration,
        style: {
          top: `${Math.random() * 55}%`, // Only in the top half of the screen (0-45%)
          left: `${Math.random() * 100}%`,
          width: `${size}px`,
          height: `${size}px`,
          opacity: Math.random(),
          boxShadow: `0 0 ${Math.random() * 10 + 6}px rgba(136, 210, 217, ${Math.random() * 0.5 + 0.5})`, // Adjusted glow effect
        },
      };
    });

    setStars(generatedStars);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {stars.map((star, index) => (
        <Star key={star.id} style={star.style} index={index} duration={star.duration} />
      ))}
    </div>
  );
};

export default function LandingPage() {
  const { isSignedIn, signInWithGoogle, isLoaded, user } = useAuth();
  const [isRecording, setIsRecording] = useState(false)
  const maxRecordingTime = 10
  const recordingTimerId = useRef<NodeJS.Timeout | null>(null)
  const audioRecorder = useRef<any>({ startRecording: async () => { }, stopRecording: async () => "" })
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [highestZIndex, setHighestZIndex] = useState(10)
  const [isDoodling, setIsDoodling] = useState(false)
  const [isMediaInput, setIsMediaInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isAttemptingLogin, setIsAttemptingLogin] = useState(false)
  // 存储预创建的paper ID
  const [preparedPaperId, setPreparedPaperId] = useState<string | null>(null)
  // 添加本地认证状态
  const [localAuthState, setLocalAuthState] = useState<{
    isSignedIn: boolean;
    user: any | null;
    expiry: number | null;
  } | null>(null);
  // 背景图片URL
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('/images/landing-page.png');

  useEffect(() => {
    preloadImage();

    // 从localStorage获取缓存的图片URL
    const CACHE_KEY = 'landingPageImageCache';
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      try {
        const imageData = JSON.parse(cachedData);
        if (imageData.url && imageData.expiry && imageData.expiry > Date.now()) {
          setBackgroundImageUrl(imageData.url);
        }
      } catch (error) {
        console.error('解析缓存的图片数据失败:', error);
      }
    }

    // 从localStorage加载认证状态
    const storedAuthState = localStorage.getItem('unwrapLoveAuthState');
    if (storedAuthState) {
      try {
        const parsedState = JSON.parse(storedAuthState);
        // 检查存储的认证是否过期（24小时）
        if (parsedState.expiry && parsedState.expiry > Date.now()) {
          setLocalAuthState(parsedState);
        } else {
          // 如果过期，清除本地存储
          localStorage.removeItem('unwrapLoveAuthState');
        }
      } catch (error) {
        console.error('解析存储的认证状态失败:', error);
        localStorage.removeItem('unwrapLoveAuthState');
      }
    }
  }, []);

  // 当Firebase认证状态更新时，更新本地存储
  useEffect(() => {
    if (isLoaded && user) {
      const authStateToStore = {
        isSignedIn: !!isSignedIn,
        user: user ? {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        } : null,
        expiry: Date.now() + (24 * 60 * 60 * 1000) // 24小时过期
      };

      localStorage.setItem('unwrapLoveAuthState', JSON.stringify(authStateToStore));
      setLocalAuthState(authStateToStore);
    } else if (isLoaded && !user) {
      // 如果已加载但用户未登录，清除本地存储
      localStorage.removeItem('unwrapLoveAuthState');
      setLocalAuthState(null);
    }
  }, [isLoaded, isSignedIn, user]);

  // 使用本地认证状态或Firebase认证状态
  const effectiveIsSignedIn = isSignedIn || (localAuthState?.isSignedIn ?? false);
  const effectiveUser = user || (localAuthState?.user ?? null);

  // 监听用户登录状态变化
  useEffect(() => {
    // 只有当用户尝试登录时才自动跳转，而不是每次加载页面都跳转
    if (((isLoaded && isSignedIn) || (localAuthState?.isSignedIn)) && isAttemptingLogin) {
      // 如果有预创建的paper ID，直接跳转到此ID
      if (preparedPaperId) {
        window.location.href = `/paper?id=${preparedPaperId}`;
      } else {
        window.location.href = "/paper";
      }
      setIsAttemptingLogin(false);
    }
  }, [isLoaded, isSignedIn, localAuthState, isAttemptingLogin, preparedPaperId]);

  // 预先创建paper ID - 改为仅在effectiveIsSignedIn为true时创建
  useEffect(() => {
    // 当用户已登录且没有预创建的paperId时，创建一个新paper
    if (effectiveIsSignedIn && effectiveUser && !preparedPaperId) {
      createNewPaper();
    }
  }, [effectiveIsSignedIn, effectiveUser, preparedPaperId]);

  // 创建新paper
  const createNewPaper = async () => {
    const currentUser = user || localAuthState?.user;
    if (!effectiveIsSignedIn || !currentUser) return;

    try {
      const newPaperData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        items: [],
        backgroundImage: null,
        backgroundColor: null,
        showGrid: true,
        canvasScrollable: false,
        canvasScale: 3,
        canvasPages: 1,
        brushColor: null
      };

      console.log('预先创建新paper的数据:', newPaperData);

      const response = await fetch(getApiUrl('/api/papers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPaperData),
      });

      if (!response.ok) {
        throw new Error('Failed to pre-create new paper');
      }

      const data = await response.json();
      setPreparedPaperId(data.paperId);
      console.log('预先创建的Paper ID:', data.paperId);
    } catch (error) {
      console.error('预先创建Paper失败:', error);
    }
  };

  useEffect(() => {
    if (isRecording) {
      recordingTimerId.current = setTimeout(() => {
        handleStopRecording()
      }, maxRecordingTime * 1000)
    } else {
      if (recordingTimerId.current) clearTimeout(recordingTimerId.current)
    }
    return () => {
      if (recordingTimerId.current) clearTimeout(recordingTimerId.current)
    }
  }, [isRecording, maxRecordingTime])

  const handleStopRecording = async () => {
    try {
      const audioUrl = await audioRecorder.current.stopRecording()
      setIsRecording(false)
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      const maxX = canvasRect ? canvasRect.width - 320 : window.innerWidth - 320
      const maxY = canvasRect ? canvasRect.height - 300 : window.innerHeight - 300
      const randomX = Math.max(50, Math.random() * maxX)
      const randomY = Math.max(50, Math.random() * (maxY - 100))
      const newZIndex = highestZIndex + 1
      setHighestZIndex(newZIndex)
      const rotation = Math.random() * 10 - 5

      const newItem = {
        id: uuidv4(),
        position: { x: randomX, y: randomY },
        zIndex: newZIndex,
        rotation,
        type: "audio",
        data: { audioUrl },
      }

      setItems(prev => [...prev, newItem])
    } catch (error) {
      console.error("停止录音失败:", error)
    }
  }

  const handleStartRecording = async () => {
    try {
      await audioRecorder.current.startRecording()
      setIsRecording(true)
    } catch (error) {
      console.error("开始录音失败:", error)
    }
  }

  const handleRecordVoice = () => {
    if (isRecording) {
      handleStopRecording()
    } else {
      handleStartRecording()
    }
  }

  const handleWrapButtonClick = async () => {
    if (effectiveIsSignedIn) {
      // 如果有预创建的paper ID，直接跳转到此ID
      if (preparedPaperId) {
        window.location.href = `/paper?id=${preparedPaperId}`;
      } else {
        window.location.href = "/paper";
      }
    } else {
      try {
        setIsAttemptingLogin(true);
        await signInWithGoogle();
        // 不在这里跳转，而是依靠useEffect监听状态变化来处理
      } catch (error) {
        console.error("Google sign-in failed:", error);
        setIsAttemptingLogin(false);
      }
    }
  };

  return (
    <>
      <div className="from-[#f0f4ff] to-white min-h-screen w-full">
        <motion.div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.95)"
          }}
        />

        {/* Stars animation overlay */}
        <StarsBackground />

        <header className="flex items-center justify-between px-[8%] py-6 relative z-20">
          <div className="flex items-center gap-2">
            <Bird className="h-8 w-8 text-white -mt-1" />
            <span className="text-2xl font-bold text-white font-sans tracking-wider rounded-lg" style={{ fontFamily: "'Nunito', 'Caveat', 'Comic Sans MS', sans-serif" }}>Unwrap Love</span>
          </div>
          <div>
            {!effectiveIsSignedIn ? (
              <div className="flex items-center gap-6">
                <SignUpButton />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/moodboard" className="text-white hover:text-gray-200 transition-colors">
                  Moodboard
                </Link>
                <SignOutButton />
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center pt-20 px-4 text-center relative z-20">
          <div className="max-w-3xl space-y-8">
            <motion.h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white whitespace-nowrap">
              Where Every Click is a Hug
            </motion.h1>
            <div className="space-y-2">
              <motion.p className="text-xl text-white opacity-70">
                Send interactive canvas gifts they'll never forget.
              </motion.p>
              <motion.p className="text-xl text-white opacity-70">
                Customize with photos, messages, and pure imagination.
              </motion.p>
            </div>
            <motion.div>
              {effectiveIsSignedIn ? (
                <div className="group" onClick={handleWrapButtonClick}>
                  <div className="relative mt-8 inline-block rounded-full p-[2px] bg-gradient-to-b from-white/30 via-gray-400/20 to-gray-800/40">
                    <button className="w-full px-8 py-3 text-base md:text-lg font-medium text-white bg-gradient-to-b from-gray-600/30 to-gray-800/40 backdrop-blur-md rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] z-10 flex items-center justify-center gap-2 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:brightness-105 transition-all duration-200">
                      <span className="relative z-10 text-white">Wrap Your Love</span>
                      <div className="relative z-10">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-white">
                          <path d="M4.16669 10H15.8334" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 4.16669L15.8333 10L10 15.8334" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group" onClick={handleWrapButtonClick}>
                  <div className="relative mt-8 inline-block rounded-full p-[2px] bg-gradient-to-b from-white/30 via-gray-400/20 to-gray-800/40">
                    <button className="w-full px-8 py-3 text-base md:text-lg font-medium text-white bg-gradient-to-b from-gray-600/30 to-gray-800/40 backdrop-blur-md rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] z-10 flex items-center justify-center gap-2 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:brightness-105 transition-all duration-200">
                      <span className="relative z-10 text-white">Wrap Your Love</span>
                      <div className="relative z-10">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-white">
                          <path d="M4.16669 10H15.8334" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 4.16669L15.8333 10L10 15.8334" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </>
  )
}
