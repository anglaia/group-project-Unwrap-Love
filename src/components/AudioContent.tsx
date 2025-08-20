"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import { getApiUrl } from "@/config/apiConfig"

interface AudioContentProps {
  audioUrl: string
  isDragging?: boolean
  waveColor?: string
  isBase64Audio?: boolean
  originalBlobUrl?: string  // 添加原始Blob URL属性
}

export const AudioContent: React.FC<AudioContentProps> = ({
  audioUrl,
  isDragging = false,
  waveColor: initialWaveColor,
  isBase64Audio = false,
  originalBlobUrl
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [waveColor, setWaveColor] = useState<string>(initialWaveColor || "")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [finalAudioUrl, setFinalAudioUrl] = useState<string>(audioUrl)
  const [isProcessing, setIsProcessing] = useState(true)
  const [usedFallback, setUsedFallback] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [breathPhase, setBreathPhase] = useState(0); // 呼吸动画进度 0~1
  const lastBreathTimeRef = useRef<number | null>(null);

  // 获取当前路径，用来判断是否在demo页面
  const pathname = usePathname()
  const isDemo = pathname?.includes('/moodboard')

  // 组件初始化时记录传入的参数
  useEffect(() => {
    console.log(`[AudioContent] 组件初始化 - ID: ${Math.random().toString(36).substr(2, 9)}`);
    console.log(`[AudioContent] 初始参数:`, {
      audioUrl,
      isDragging,
      initialWaveColor,
      isBase64Audio,
      hasOriginalBlobUrl: !!originalBlobUrl
    });
  }, []);

  // References
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const localBlobUrlRef = useRef<string | null>(null)

  // 处理音频URL
  useEffect(() => {
    console.log(`[AudioContent] audioUrl变更: ${audioUrl?.substring(0, 50)}${audioUrl?.length > 50 ? '...' : ''}`);

    if (!audioUrl) {
      console.warn('[AudioContent] 没有提供audioUrl');
      return;
    }

    setIsProcessing(true)
    setLoadError(null)

    // 清理之前创建的本地Blob URL
    if (localBlobUrlRef.current) {
      console.log('[AudioContent] 清理之前的本地Blob URL');
      URL.revokeObjectURL(localBlobUrlRef.current);
      localBlobUrlRef.current = null;
    }

    // 检测是否为Safari浏览器
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    console.log(`[AudioContent] 浏览器检测: ${isSafari ? 'Safari' : '其他浏览器'}`);

    // 处理不同类型的音频URL
    const processAudioUrl = async () => {
      try {
        console.log(`[AudioContent] 开始处理音频URL类型: ${audioUrl.substring(0, 20)}...`);

        // 如果是Base64格式音频数据
        if ((isBase64Audio && audioUrl.startsWith('data:')) ||
          // 也处理通过WebSocket传输的data:音频格式
          (!isBase64Audio && audioUrl.startsWith('data:audio/'))) {
          console.log('[AudioContent] 处理Base64格式音频数据');

          // 将Base64转换为Blob
          try {
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            console.log(`[AudioContent] Base64转换为Blob成功, 大小: ${blob.size} 字节`);

            // 创建本地Blob URL
            const localBlobUrl = URL.createObjectURL(blob);
            localBlobUrlRef.current = localBlobUrl;
            blobRef.current = blob;

            console.log(`[AudioContent] 创建本地Blob URL: ${localBlobUrl}`);
            setFinalAudioUrl(localBlobUrl);
            setIsProcessing(false);
            setLoadError(null);
            return;
          } catch (err) {
            console.error('[AudioContent] Base64音频处理失败:', err);
            // 继续尝试其他方法
          }
        }

        // 处理服务器URL
        if (audioUrl.startsWith('/upload/') ||
          (audioUrl.startsWith('/') && !audioUrl.startsWith('//'))) {

          let processedUrl = getApiUrl(audioUrl);
          console.log(`[AudioContent] 处理服务器URL: ${processedUrl}`);

          // 先尝试加载服务器URL
          try {
            const testAudio = new Audio();
            testAudio.src = processedUrl;
            console.log('[AudioContent] 测试加载服务器URL');

            // 设置加载超时
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('音频加载超时')), 5000);
            });

            // 加载音频或超时
            await Promise.race([
              new Promise((resolve) => {
                testAudio.onloadedmetadata = resolve;
              }),
              timeoutPromise
            ]);

            // 如果成功加载，使用服务器URL
            console.log('[AudioContent] 服务器URL加载成功');
            setFinalAudioUrl(processedUrl);
            setIsProcessing(false);
            return;
          } catch (err) {
            console.warn('[AudioContent] 服务器音频加载失败，尝试使用本地blob URL:', err);
            // 失败后尝试使用本地blob URL
            if (originalBlobUrl && !usedFallback) {
              setUsedFallback(true);
              console.log('[AudioContent] 尝试使用原始blob URL:', originalBlobUrl);
              try {
                const response = await fetch(originalBlobUrl);
                const blob = await response.blob();
                console.log(`[AudioContent] 原始blob URL加载成功, 大小: ${blob.size} 字节`);

                // 创建本地Blob URL
                const localBlobUrl = URL.createObjectURL(blob);
                localBlobUrlRef.current = localBlobUrl;

                setFinalAudioUrl(localBlobUrl);
                setIsProcessing(false);
                return;
              } catch (blobErr) {
                console.error('[AudioContent] 原始blob URL也无法加载:', blobErr);
              }
            }

            // 仍然使用服务器URL，让音频元素处理错误
            console.log('[AudioContent] 继续使用服务器URL，尽管测试加载失败');
            setFinalAudioUrl(processedUrl);
            setIsProcessing(false);
            return;
          }
        }

        // 处理Blob URL
        if (audioUrl.startsWith('blob:')) {
          console.log('[AudioContent] 处理Blob URL音频:', audioUrl);

          // 针对Safari的特殊处理
          if (isSafari) {
            console.log('[AudioContent] 在Safari中处理Blob URL需要特殊处理');

            // 尝试获取Blob内容，转换格式
            try {
              console.log('[AudioContent] 尝试获取Blob内容并尝试使用audio元素直接加载');

              // 先使用fetch获取blob数据
              const response = await fetch(audioUrl);
              const blob = await response.blob();
              console.log(`[AudioContent] 获取Blob成功, 大小: ${blob.size} 字节, 类型: ${blob.type}`);
              blobRef.current = blob;

              // 创建一个新的Blob URL
              const localBlobUrl = URL.createObjectURL(blob);
              localBlobUrlRef.current = localBlobUrl;
              console.log(`[AudioContent] 创建新的本地Blob URL在Safari中: ${localBlobUrl}`);

              // 使用新创建的本地URL，这样能提高在Safari中解码的成功率
              setFinalAudioUrl(localBlobUrl);
              setIsProcessing(false);

              return;
            } catch (err) {
              console.warn('[AudioContent] Safari中处理blob URL失败:', err);

              // 失败后使用原始URL
              setFinalAudioUrl(audioUrl);
              setIsProcessing(false);
              return;
            }
          } else {
            // 非Safari浏览器的处理
            // 尝试获取Blob内容
            try {
              console.log('[AudioContent] 尝试获取Blob内容');
              const response = await fetch(audioUrl);
              const blob = await response.blob();
              console.log(`[AudioContent] 获取Blob成功, 大小: ${blob.size} 字节`);
              blobRef.current = blob;
              setFinalAudioUrl(audioUrl);
              setLoadError(null);
              setIsProcessing(false);
            } catch (err) {
              console.warn('[AudioContent] 无法获取blob音频:', err);
            }
          }

          // 尝试使用原始blob URL（如果有）
          if (originalBlobUrl && originalBlobUrl !== audioUrl && !usedFallback) {
            setUsedFallback(true);
            console.log('[AudioContent] 尝试使用原始blob URL:', originalBlobUrl);
            try {
              const response = await fetch(originalBlobUrl);
              const blob = await response.blob();
              console.log(`[AudioContent] 原始blob URL加载成功, 大小: ${blob.size} 字节`);

              // 创建新的Blob URL
              const localBlobUrl = URL.createObjectURL(blob);
              localBlobUrlRef.current = localBlobUrl;
              console.log(`[AudioContent] 创建新的本地Blob URL: ${localBlobUrl}`);

              setFinalAudioUrl(localBlobUrl);
              setIsProcessing(false);
              setLoadError(null);
              return;
            } catch (blobErr) {
              console.error('[AudioContent] 原始blob URL也无法加载:', blobErr);
            }
          }

          // 保持原始URL，音频元素会处理错误
          if (finalAudioUrl !== audioUrl) {
            console.log('[AudioContent] 继续使用原始Blob URL，尽管获取失败');
            setFinalAudioUrl(audioUrl);
          }

          setIsProcessing(false);
          return;
        }

        // 其他URL类型
        console.log(`[AudioContent] 使用其他类型URL: ${audioUrl}`);
        setFinalAudioUrl(audioUrl);
        setIsProcessing(false);
      } catch (err) {
        console.error('[AudioContent] 处理音频URL时出错:', err);
        setFinalAudioUrl(audioUrl);
        setIsProcessing(false);
        setLoadError('Failed to process audio URL');
      }
    };

    processAudioUrl();

    // 组件卸载时清理
    return () => {
      console.log('[AudioContent] 组件卸载，清理资源');
      if (localBlobUrlRef.current) {
        console.log(`[AudioContent] 释放本地Blob URL: ${localBlobUrlRef.current}`);
        URL.revokeObjectURL(localBlobUrlRef.current);
        localBlobUrlRef.current = null;
      }
    };
  }, [audioUrl, isDemo, isBase64Audio, originalBlobUrl, usedFallback]);

  // 加载和分析音频数据
  useEffect(() => {
    if (!finalAudioUrl || isProcessing) return;

    console.log(`[AudioContent] 开始加载和分析音频: ${finalAudioUrl.substring(0, 50)}${finalAudioUrl.length > 50 ? '...' : ''}`);

    // 如果没有初始颜色，则选择一个随机颜色
    if (!waveColor) {
      const colors = [
        "#ec4899", // Pink
        "#3b82f6", // Blue
        "#10b981", // Green
        "#f59e0b", // Amber
        "#8b5cf6", // Purple
        "#ef4444", // Red
        "#06b6d4", // Cyan
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      console.log(`[AudioContent] 随机选择波形颜色: ${color}`);
      setWaveColor(color);
    }

    // 检测是否为Safari浏览器
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    console.log(`[AudioContent] 浏览器检测: ${isSafari ? 'Safari' : '其他浏览器'}`);

    const loadAudio = async () => {
      try {
        console.log('[AudioContent] 开始使用AudioContext解码音频');
        // 创建 AudioContext（如果尚未创建）
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // 获取音频数据
        const response = await fetch(finalAudioUrl);
        const arrayBuffer = await response.arrayBuffer();
        console.log(`[AudioContent] 获取到音频ArrayBuffer, 大小: ${arrayBuffer.byteLength} 字节`);

        // 解码音频数据
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        console.log(`[AudioContent] 音频解码成功, 时长: ${audioBuffer.duration}秒`);
        setAudioBuffer(audioBuffer);
        setDuration(audioBuffer.duration);
        setLoadError(null);

        // 绘制波形
        if (canvasRef.current) {
          console.log('[AudioContent] 绘制波形');
          drawWaveform(audioBuffer);
        }
      } catch (err) {
        console.error('[AudioContent] 音频加载或解码失败:', err);

        // Safari 特定错误更详细日志
        if (isSafari) {
          console.warn('[AudioContent] Safari中AudioContext解码失败细节:', err);
          if (err instanceof DOMException) {
            console.warn(`[AudioContent] DOMException: ${err.name}, ${err.message}`);
          }
        }

        setLoadError('Cannot load audio');

        // 在demo页面中，当blob URL无法加载时，可能是因为其他用户的录音
        if (isDemo && finalAudioUrl.startsWith('blob:')) {
          console.info('[AudioContent] 这是另一个用户通过WebSocket共享的录音，无法直接访问其blob URL');
        }
      } finally {
        setIsProcessing(false);
      }
    };

    // 加载音频元素
    if (audioRef.current) {
      // Safari 兼容性修复: 设置多种音频类型的源（如果需要）
      if (isSafari && finalAudioUrl.startsWith('blob:')) {
        console.log('[AudioContent] 在Safari中使用blob URL，可能需要特殊处理');
        // Safari 中直接加载 blob URL（后面会有额外错误处理）
      }

      audioRef.current.src = finalAudioUrl;
      console.log(`[AudioContent] 设置audio元素src: ${finalAudioUrl.substring(0, 50)}${finalAudioUrl.length > 50 ? '...' : ''}`);

      // Safari 兼容性修复: 确保加载
      audioRef.current.load();

      const handleCanPlay = () => {
        if (audioRef.current) {
          console.log(`[AudioContent] 音频可以播放, 时长: ${audioRef.current.duration}秒`);
          setDuration(audioRef.current.duration);
          setLoadError(null);
        }
      };

      const handleError = (e: Event) => {
        const target = e.target as HTMLAudioElement;
        const errorObj = target?.error;
        const errorMessage = errorObj ? (errorObj.message || `Error code: ${errorObj.code || 'Unknown'}`) : 'Unknown error';

        console.warn(`[AudioContent] 音频加载错误: ${errorMessage}`, finalAudioUrl);

        // Safari 兼容性修复: 对 blob URL 的特殊处理
        if (isSafari && finalAudioUrl.startsWith('blob:') && !usedFallback) {
          console.log('[AudioContent] Safari中blob URL加载失败，尝试转换格式');

          // Safari 可能无法直接处理 WebM 格式
          // 检查是否有原始的 blob URL 或者其他备选
          if (originalBlobUrl && finalAudioUrl !== originalBlobUrl) {
            setUsedFallback(true);
            console.log('[AudioContent] 尝试使用原始blob URL:', originalBlobUrl);
            return; // 让上面的useEffect处理回退逻辑
          }
        }

        // 如果是服务器URL加载失败，而且我们还没有尝试过回退到原始blob URL
        if (!usedFallback && originalBlobUrl && finalAudioUrl !== originalBlobUrl) {
          setUsedFallback(true);
          console.log('[AudioContent] 音频加载失败，尝试回退到原始blob URL');
          return; // 让上面的useEffect处理回退逻辑
        }

        setLoadError(`Cannot load audio`);
      };

      const handleTimeUpdate = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          drawProgress();
        }
      };

      const handleEnded = () => {
        console.log('[AudioContent] 音频播放结束');
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          setCurrentTime(0);
          drawProgress();
        }
      };

      audioRef.current.addEventListener('canplay', handleCanPlay);
      audioRef.current.addEventListener('error', handleError);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('ended', handleEnded);

      // 音频加载策略改变：必须先尝试使用AudioContext解码并生成波形
      // 对于所有浏览器(包括Safari)都先尝试AudioContext解码
      loadAudio().then(() => {
        console.log('[AudioContent] AudioContext解码成功, 已生成波形图');
        // 只有在AudioContext成功解码后才尝试依赖音频元素的播放
      }).catch(err => {
        // 记录错误但不改变loadError状态，因为即使解码失败，audio元素仍可能能够播放
        console.warn('[AudioContent] 使用AudioContext解码失败，将依赖音频元素:', err);

        // Safari中特殊处理，如果是blob URL，尝试直接使用audio元素
        if (isSafari && finalAudioUrl.startsWith('blob:')) {
          console.log('[AudioContent] Safari对blob URL使用audio元素播放');
        }
      });

      return () => {
        console.log('[AudioContent] 清理音频元素事件监听器');
        if (audioRef.current) {
          audioRef.current.removeEventListener('canplay', handleCanPlay);
          audioRef.current.removeEventListener('error', handleError);
          audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
          audioRef.current.removeEventListener('ended', handleEnded);
          audioRef.current.pause();
          audioRef.current.src = '';
        }

        // 清理 AudioContext
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          console.log('[AudioContent] 关闭AudioContext');
          audioContextRef.current.close().catch(e => console.error(e));
        }

        // 取消动画帧
        if (animationFrameRef.current !== null) {
          console.log('[AudioContent] 取消动画帧');
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [finalAudioUrl, isProcessing, waveColor, isDemo, originalBlobUrl, usedFallback]);

  // 播放时启动呼吸动画帧
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // When playback stops (paused or finished), ensure waveform is drawn at full opacity
      if (audioBuffer && canvasRef.current) {
        drawWaveform(audioBuffer); // phase will be undefined, resulting in t = 1
      }
      return;
    }
    let running = true;
    const duration = 2.2; // 呼吸周期（秒）
    function animateBreath(now: number) {
      if (!running) return;
      if (lastBreathTimeRef.current === null) lastBreathTimeRef.current = now;
      const elapsed = (now - lastBreathTimeRef.current) / 1000;
      const phase = (elapsed % duration) / duration; // 0~1
      setBreathPhase(phase);
      if (audioBuffer) drawWaveform(audioBuffer, phase);
      animationFrameRef.current = requestAnimationFrame(animateBreath);
    }
    animationFrameRef.current = requestAnimationFrame(animateBreath);
    return () => {
      running = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastBreathTimeRef.current = null;
    };
  }, [isPlaying, audioBuffer]);

  // drawWaveform 支持呼吸动画（单色）
  const drawWaveform = (buffer: AudioBuffer, phase?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Safari 兼容性：确保canvas尺寸设置正确
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // 先清除之前可能存在的内容
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // 重新设置canvas尺寸
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 确保再次清除，基于新的尺寸
    ctx.clearRect(0, 0, width, height);

    // 获取音频数据
    try {
      const channelData = buffer.getChannelData(0);
      if (!channelData || channelData.length === 0) {
        console.warn('[AudioContent] 波形绘制：通道数据为空');
        return;
      }

      const rawData = channelData;
      const barWidth = 2;
      const barGap = 3;
      const samples = Math.floor(width / (barWidth + barGap));
      const blockSize = Math.floor(rawData.length / samples);
      const rmsAmplitudes = [];

      // Safari 兼容性：更健壮的数据处理
      for (let i = 0; i < samples; i++) {
        let sumOfSquares = 0;
        const start = i * blockSize;
        const end = Math.min(start + blockSize, rawData.length);

        if (start >= rawData.length) break;

        for (let j = start; j < end; j++) {
          const sample = rawData[j] || 0;
          sumOfSquares += sample * sample;
        }

        const actualBlockSize = end - start;
        if (actualBlockSize > 0) {
          const meanSquare = sumOfSquares / actualBlockSize;
          const rms = Math.sqrt(meanSquare);
          rmsAmplitudes.push(rms);
        } else {
          rmsAmplitudes.push(0);
        }
      }

      const maxRmsAmplitude = Math.max(...rmsAmplitudes, 0.01); // 防止除以0

      // 呼吸动画：透明度/亮度随 phase 变化，单色
      let t = typeof phase === 'number' ? 0.6 + 0.4 * Math.sin(phase * 2 * Math.PI) : 1;

      // 解析 waveColor 为 rgb
      let color = waveColor;

      // 支持 hex 格式
      if (/^#([0-9a-fA-F]{6})$/.test(waveColor)) {
        const hex = waveColor.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        color = `rgba(${r},${g},${b},${t})`;
      } else if (waveColor.startsWith('rgb')) {
        // rgb/rgba 直接替换 alpha
        color = waveColor.replace(/rgba?\(([^)]+)\)/, (m: string, c: string) => {
          const parts = c.split(',').map((x: string) => x.trim());
          if (parts.length === 3) return `rgba(${parts[0]},${parts[1]},${parts[2]},${t})`;
          if (parts.length === 4) return `rgba(${parts[0]},${parts[1]},${parts[2]},${t})`;
          return m;
        });
      }

      ctx.fillStyle = color;

      // 绘制波形
      rmsAmplitudes.forEach((rms, index) => {
        const normalizedHeight = (rms / maxRmsAmplitude) * (height * 0.7);
        const barHeight = Math.max(1, normalizedHeight);
        const x = index * (barWidth + barGap);
        const y = (height - barHeight) / 2;

        // Safari 兼容性：确保坐标都是有效数字
        if (isNaN(x) || isNaN(y) || isNaN(barHeight)) {
          console.warn(`[AudioContent] 无效坐标: x=${x}, y=${y}, height=${barHeight}`);
          return;
        }

        ctx.fillRect(x, y, barWidth, barHeight);
      });
    } catch (err) {
      console.error('[AudioContent] 波形绘制错误:', err);

      // 绘制一个简单的占位符波形
      ctx.fillStyle = waveColor;
      const placeholderHeight = height * 0.3;
      const y = (height - placeholderHeight) / 2;

      // 简单波形
      for (let i = 0; i < width; i += 10) {
        const randomHeight = Math.random() * placeholderHeight;
        ctx.fillRect(i, y + (placeholderHeight - randomHeight) / 2, 2, randomHeight);
      }
    }
  };

  // 绘制进度
  const drawProgress = () => {
    const canvas = canvasRef.current;
    // 需要 audioBuffer 来重新绘制波形
    if (!canvas || !audioRef.current || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 获取当前进度比例
    const progress = duration > 0 ? currentTime / duration : 0; // 防止 duration 为 0

    // 设置绘图尺寸 (需要与 drawWaveform 一致)
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // 注意：这里不需要重新设置 canvas.width/height 或 ctx.scale，除非它们可能被外部改变
    // 但为了保险起见，保留清空操作
    ctx.clearRect(0, 0, width, height);

    // 重新绘制完整的波形 (背景)
    drawWaveform(audioBuffer);

    // 绘制进度遮罩 (已播放部分)
    const progressWidth = width * progress;
    ctx.fillStyle = `${waveColor}80`; // 进度颜色，添加透明度
    ctx.fillRect(0, 0, progressWidth, height);

    // 绘制播放头光标 ("扫针")
    const cursorWidth = 2;
    const cursorX = progressWidth - (cursorWidth / 2);
    ctx.fillStyle = waveColor; // 使用主波形颜色作为光标颜色
    ctx.fillRect(cursorX, 0, cursorWidth, height);
  };

  // 切换播放/暂停
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[AudioContent] 切换播放/暂停, 当前状态:', isPlaying ? '播放中' : '已暂停');

    // 拖动时不要播放音频
    if (isDragging) {
      console.log('[AudioContent] 拖动中，忽略播放请求');
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        console.log('[AudioContent] 暂停播放');
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // 总是从头开始播放
        console.log('[AudioContent] 开始播放');
        audioRef.current.currentTime = 0;
        setCurrentTime(0);

        // Safari 兼容性修复: 检测是否为 Safari
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        // Safari 兼容性修复: 在 Safari 中，有时需要先加载音频
        if (isSafari) {
          audioRef.current.load();
        }

        // 播放音频
        audioRef.current.play().then(() => {
          console.log('[AudioContent] 播放成功');
          setIsPlaying(true);
        }).catch((err) => {
          console.error('[AudioContent] 播放错误:', err);
          setLoadError(`Failed to play: ${err.message || 'Unknown error'}`);

          // Safari 兼容性修复: 如果自动播放失败，可能是因为没有用户交互
          if (isSafari && err.name === 'NotAllowedError') {
            console.log('[AudioContent] Safari自动播放限制，尝试再次播放');
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.play().catch(e =>
                  console.error('[AudioContent] 第二次播放尝试也失败:', e)
                );
              }
            }, 100);
          }
        });
      }
    }
  };

  return (
    <div
      className={`transition-shadow duration-300 rounded-lg overflow-hidden ${isDragging ? "shadow-2xl" : "shadow-lg hover:shadow-2xl"
        }`}
    >
      <div className="w-64 bg-white p-3 border border-gray-200 rounded-lg">
        {/* 波形容器 */}
        <div
          className={`relative h-20 bg-gray-50 rounded-md overflow-hidden ${isDragging ? "cursor-grabbing" : "cursor-pointer"} shadow-[inset_0_0_4px_rgba(0,0,0,0.1)]`}
          onClick={togglePlay}
          ref={containerRef}
        >
          {/* 添加微妙的顶部高光效果 */}
          <div className="absolute inset-x-0 top-0 h-[6px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-10"></div>

          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="animate-pulse text-gray-400 text-xs">Processing audio...</div>
            </div>
          )}

          {/* Canvas 波形图 */}
          {!isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center px-2">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ width: '110%', margin: '0 -5%' }}
              />

              {/* 隐藏的音频元素 */}
              <audio ref={audioRef} preload="metadata" style={{ display: 'none' }} />

              {/* 显示错误信息 - 在demo页面上对blob URL错误更宽容 */}
              {loadError && !(isDemo && finalAudioUrl.startsWith('blob:')) && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 text-red-600 text-xs p-2 text-center">
                  <p>Cannot load audio</p>
                </div>
              )}

              {/* 在demo页面上，对于blob URL显示更友好的消息 */}
              {loadError && isDemo && finalAudioUrl.startsWith('blob:') && (
                <div className="absolute inset-0 flex items-center justify-center bg-yellow-50/80 text-yellow-600 text-xs p-2 text-center">
                  <p>Audio from another user</p>
                </div>
              )}

              {/* 当Canvas无法渲染但audio加载成功时显示简单的播放UI */}
              {loadError && audioRef.current && !audioBuffer && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPlaying ? 'bg-red-100' : 'bg-blue-100'}`}>
                    {isPlaying ? (
                      <div className="w-4 h-4 bg-red-500" /> // 暂停图标
                    ) : (
                      <div className="w-0 h-0 border-y-8 border-y-transparent border-l-[16px] border-l-blue-500 ml-1" /> // 播放图标
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AudioContent

