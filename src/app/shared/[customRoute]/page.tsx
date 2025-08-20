"use client"

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from "@/context/AuthContext"
import GridBackground from "@/components/GridBackground"
import DraggableItem from "@/components/DraggableItem"
import PolaroidContent from "@/components/PolaroidContent"
import NoteContent from "@/components/NoteContent"
import AudioContent from "@/components/AudioContent"
import MediaContent from "@/components/MediaContent"
import DoodleContent from "@/components/DoodleContent"
import GifContent from "@/components/GifContent"
import Link from "next/link"
import { Bird } from 'lucide-react'
import confetti from 'canvas-confetti'
import { getApiUrl } from "@/config/apiConfig"

// 定义Item接口（从paper/page.tsx复制）
interface Item {
    id: string
    position: { x: number; y: number }
    zIndex: number
    rotation: number
    type: "photo" | "note" | "audio" | "media" | "doodle" | "gif"
    data: {
        imageUrl?: string
        dateTaken?: string
        color?: string
        content?: string
        audioUrl?: string
        spotifyUrl?: string
        svgData?: string
        isGif?: boolean
        originalGifUrl?: string
        sizeFactor?: number
        isSticker?: boolean
        isLoading?: boolean
        waveColor?: string
        noteSize?: { width: string, height: string }
        scale?: number
    }
}

export default function SharedPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()

    const { isSignedIn, user, isLoaded: authLoaded } = useAuth()
    const [error, setError] = useState<string | null>(null)
    const [contentLoaded, setContentLoaded] = useState(false)

    // Paper数据状态
    const [items, setItems] = useState<Item[]>([])
    const [backgroundImage, setBackgroundImage] = useState<string | undefined>()
    const [backgroundColor, setBackgroundColor] = useState<string | null>(null)
    const [showGrid, setShowGrid] = useState<boolean>(true)
    const [highestZIndex, setHighestZIndex] = useState(10)

    // 滚动和缩放设置
    const [canvasScrollable, setCanvasScrollable] = useState<boolean>(false)
    const [canvasScale, setCanvasScale] = useState<number>(3)
    const [canvasPages, setCanvasPages] = useState<number>(1)

    const canvasRef = useRef<HTMLDivElement>(null)

    const customRoute = params.customRoute as string
    const idFromQuery = searchParams.get('id')

    // 彩带效果函数
    const fireConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100000 };

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
        }

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            // 发射彩带
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    };

    // 获取共享链接并加载paper数据 - 合并到一个useEffect中
    useEffect(() => {
        const loadSharedContent = async () => {
            try {
                let paperId = idFromQuery;

                // 如果URL中没有直接包含ID参数，通过自定义路由查询
                if (!paperId) {
                    // 通过自定义路由名查询关联的paperId
                    const linkResponse = await fetch(getApiUrl(`/api/shared-links/by-route/${customRoute}`));

                    if (!linkResponse.ok) {
                        if (linkResponse.status === 404) {
                            setError('Preview Ended');
                            return;
                        }
                        setError('Preview Ended');
                        return;
                    }

                    const linkData = await linkResponse.json();
                    paperId = linkData.paperId;
                }

                // 有了paperId后，加载paper数据
                if (paperId) {
                    const paperResponse = await fetch(getApiUrl(`/api/papers/${paperId}`));

                    if (!paperResponse.ok) {
                        setError('Preview Ended');
                        return;
                    }

                    const paperData = await paperResponse.json();
                    console.log('加载到的paper数据:', paperData);

                    // 设置paper内容
                    setItems(paperData.items || []);
                    setBackgroundImage(paperData.backgroundImage || undefined);
                    setBackgroundColor(paperData.backgroundColor || null);
                    setShowGrid(paperData.showGrid !== undefined ? paperData.showGrid : true);

                    // 设置滚动和缩放属性
                    setCanvasScrollable(paperData.canvasScrollable || false);
                    setCanvasScale(paperData.canvasScale || 3);
                    setCanvasPages(paperData.canvasPages || 1);

                    // 找出最高的z-index
                    if (paperData.items && paperData.items.length > 0) {
                        const maxZ = Math.max(...paperData.items.map((item: Item) => item.zIndex), 10);
                        setHighestZIndex(maxZ);
                    }

                    // 标记加载完成
                    setContentLoaded(true);

                    // 触发彩带效果，使用setTimeout让UI先渲染
                    setTimeout(() => {
                        fireConfetti();
                    }, 500);
                }
            } catch (err) {
                console.error('加载分享内容失败:', err);
                setError(err instanceof Error ? err.message : '加载内容失败');
            }
        };

        loadSharedContent();
    }, [customRoute, idFromQuery]);

    // 错误状态
    if (error) {
        return (
            <div
                className="min-h-screen bg-[#F8F8F7] flex items-center justify-center"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(0, 0, 0, 0.1) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                }}
            >
                <div className="text-center">
                    <p className="text-3xl font-bold text-gray-700 mb-6">Preview Ended</p>
                    <button
                        onClick={() => window.close()}
                        className="px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                    >
                        Close Page
                    </button>
                </div>
            </div>
        )
    }

    // 直接显示内容，没有加载中状态
    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            <GridBackground
                imageUrl={backgroundImage}
                backgroundColor={backgroundColor || undefined}
                showGrid={showGrid}
            />

            {/* Close button */}
            <div className="fixed top-4 left-4 z-50 flex gap-2">
                <button
                    onClick={() => window.close()}
                    className="p-3 bg-white/80 backdrop-blur-sm rounded-md shadow-sm hover:shadow hover:bg-white transition-all duration-300 ease-in-out transform hover:scale-[1.05]"
                    aria-label="Close page"
                >
                    <Bird className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Canvas area - 只读模式，根据原paper设置适配滚动 */}
            <div
                ref={canvasRef}
                className={`absolute inset-0 z-0 ${canvasScrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}
            >
                <div
                    className="relative w-full h-full"
                    style={canvasScrollable ? {
                        minHeight: canvasPages === 1 ? '100vh' : `${canvasPages * 1500}px`
                    } : {}}
                >
                    {items.map((item, index) => (
                        <div
                            key={`${item.id}-${index}`}
                            style={{
                                position: 'absolute',
                                left: `${item.position.x}px`,
                                top: `${item.position.y}px`,
                                zIndex: item.zIndex,
                                transform: `rotate(${item.rotation}deg)`,
                            }}
                            className="transition-transform duration-100 ease-in-out"
                        >
                            {item.type === "photo" ? (
                                <PolaroidContent imageUrl={item.data.imageUrl || ""} dateTaken={item.data.dateTaken} scale={item.data.scale} />
                            ) : item.type === "gif" ? (
                                <GifContent
                                    imageUrl={item.data.imageUrl || ""}
                                    sizeFactor={item.data.sizeFactor}
                                    isDragging={false}
                                    isSticker={item.data.isSticker}
                                    forcedLoading={false}
                                />
                            ) : item.type === "note" ? (
                                <NoteContent
                                    color={item.data.color || "yellow"}
                                    content={item.data.content || ""}
                                    onContentChange={() => { }}
                                    onBringToFront={() => { }}
                                    noteSize={item.data.noteSize}
                                    readOnly={true}
                                />
                            ) : item.type === "media" ? (
                                <MediaContent initialUrl={item.data.spotifyUrl} />
                            ) : item.type === "doodle" ? (
                                <DoodleContent svgData={item.data.svgData || ""} />
                            ) : (
                                <AudioContent audioUrl={item.data.audioUrl || ""} waveColor={item.data.waveColor} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
} 