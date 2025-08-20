import React, { useState, useRef, useEffect } from "react"
import { Image as ImageIcon, PaintbrushVertical, Cog, Search, Loader, RotateCcw } from "lucide-react"
import { PexelsImage, searchImages, getCuratedImages } from "../services/pexelsApi"
import { motion, useMotionValue, useTransform, PanInfo, animate } from "framer-motion"

// 本地壁纸接口
interface LocalWallpaper {
    id: string;
    src: {
        original: string;
        large: string;
        thumbnail: string;
    };
    alt: string;
    photographer: string;
    photographer_url: string;
}

// 壁纸缓存管理
const wallpaperCache = new Map<string, string>();
const thumbnailsLoaded = new Set<string>(); // 跟踪已加载的缩略图

// 预加载壁纸图片
const preloadWallpaper = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        // 检查缓存中是否已存在
        if (wallpaperCache.has(url)) {
            console.log(`[壁纸] 使用缓存: ${url}`);
            resolve(wallpaperCache.get(url)!);
            return;
        }

        const img = new Image();
        img.src = url;
        img.onload = () => {
            console.log(`[壁纸] 预加载完成: ${url}`);
            wallpaperCache.set(url, url);
            resolve(url);
        };
        img.onerror = () => {
            console.error(`[壁纸] 预加载失败: ${url}`);
            reject(new Error(`Failed to load image: ${url}`));
        };
    });
};

// 预加载缩略图
const preloadThumbnail = (wallpaper: LocalWallpaper): Promise<string> => {
    return new Promise((resolve, reject) => {
        // 检查缩略图是否已加载
        if (thumbnailsLoaded.has(wallpaper.id)) {
            resolve(wallpaper.src.thumbnail);
            return;
        }

        const img = new Image();
        img.src = wallpaper.src.thumbnail;
        img.onload = () => {
            console.log(`[壁纸] 缩略图加载完成: ${wallpaper.src.thumbnail}`);
            thumbnailsLoaded.add(wallpaper.id);
            resolve(wallpaper.src.thumbnail);
        };
        img.onerror = () => {
            console.error(`[壁纸] 缩略图加载失败: ${wallpaper.src.thumbnail}`);
            reject(new Error(`Failed to load thumbnail: ${wallpaper.src.thumbnail}`));
        };
    });
};

// 扫描本地壁纸文件夹
const getLocalWallpapers = (): LocalWallpaper[] => {
    // 目前只有一张图片，可以手动配置
    const wallpapers: LocalWallpaper[] = [
        {
            id: '1',
            src: {
                original: '/wallpaper/01.png',
                large: '/wallpaper/01.png',
                thumbnail: '/wallpaper/thumbnails/01.png'
            },
            alt: 'Local Wallpaper 1',
            photographer: 'Local Collection',
            photographer_url: '#'
        },
        {
            id: '2',
            src: {
                original: '/wallpaper/02.png',
                large: '/wallpaper/02.png',
                thumbnail: '/wallpaper/thumbnails/02.png'
            },
            alt: 'Local Wallpaper 2',
            photographer: 'Local Collection',
            photographer_url: '#'
        },
        {
            id: '3',
            src: {
                original: '/wallpaper/03.png',
                large: '/wallpaper/03.png',
                thumbnail: '/wallpaper/thumbnails/03.png'
            },
            alt: 'Local Wallpaper 3',
            photographer: 'Local Collection',
            photographer_url: '#'
        },
        {
            id: '4',
            src: {
                original: '/wallpaper/04.png',
                large: '/wallpaper/04.png',
                thumbnail: '/wallpaper/thumbnails/04.png'
            },
            alt: 'Local Wallpaper 4',
            photographer: 'Local Collection',
            photographer_url: '#'
        },
        {
            id: '5',
            src: {
                original: '/wallpaper/05.png',
                large: '/wallpaper/05.png',
                thumbnail: '/wallpaper/thumbnails/05.png'
            },
            alt: 'Local Wallpaper 5',
            photographer: 'Local Collection',
            photographer_url: '#'
        },
        {
            id: '6',
            src: {
                original: '/wallpaper/06.png',
                large: '/wallpaper/06.png',
                thumbnail: '/wallpaper/thumbnails/06.png'
            },
            alt: 'Local Wallpaper 6',
            photographer: 'Local Collection',
            photographer_url: '#'
        },
        {
            id: '7',
            src: {
                original: '/wallpaper/07.png',
                large: '/wallpaper/07.png',
                thumbnail: '/wallpaper/thumbnails/07.png'
            },
            alt: 'Local Wallpaper 7',
            photographer: 'Local Collection',
            photographer_url: '#'
        },
        {
            id: '8',
            src: {
                original: '/wallpaper/08.png',
                large: '/wallpaper/08.png',
                thumbnail: '/wallpaper/thumbnails/08.png'
            },
            alt: 'Local Wallpaper 8',
            photographer: 'Local Collection',
            photographer_url: '#'
        },
        {
            id: '9',
            src: {
                original: '/wallpaper/09.png',
                large: '/wallpaper/09.png',
                thumbnail: '/wallpaper/thumbnails/09.png'
            },
            alt: 'Local Wallpaper 9',
            photographer: 'Local Collection',
            photographer_url: '#'
        }
    ];

    return wallpapers;
};

// 后台预加载所有壁纸
const preloadAllWallpapers = async () => {
    console.log('[壁纸] 开始后台预加载所有壁纸...');
    const wallpapers = getLocalWallpapers();

    try {
        // 第一步：加载所有缩略图
        console.log('[壁纸] 正在加载所有缩略图...');
        const thumbnailPromises = wallpapers.map(wp => preloadThumbnail(wp));
        await Promise.all(thumbnailPromises);

        // 第二步：缩略图加载完成后，开始加载大图
        console.log('[壁纸] 缩略图加载完成，开始加载大图...');
        const preloadPromises = wallpapers.map(wp => preloadWallpaper(wp.src.large));
        await Promise.allSettled(preloadPromises);

        console.log('[壁纸] 所有壁纸预加载完成');
    } catch (error) {
        console.error('[壁纸] 壁纸预加载过程中发生错误:', error);
    }
};

interface BrushPanelProps {
    onSave: (data: any) => void
    onCancel: () => void
    onColorChange?: (color: string | null) => void
    onGridVisibilityChange?: (visible: boolean) => void
    onCanvasScrollableChange?: (scrollable: boolean, scale?: number) => void
    onPaperCountChange?: (pages: number) => void
    initialPaperCount?: number
    initialBrushColor?: string | null
    initialShowGrid?: boolean
}

// Local storage key
const ACTIVE_TAB_STORAGE_KEY = 'brushPanel_activeTab'

// 移除localStorage相关常量
// const BRUSH_COLOR_STORAGE_KEY = 'brushPanel_brushColor';
// const BRUSH_POSITION_X_STORAGE_KEY = 'brushPanel_brushPositionX';
// const BRUSH_POSITION_Y_STORAGE_KEY = 'brushPanel_brushPositionY';
// const SHOW_GRID_STORAGE_KEY = 'brushPanel_showGrid';

export const BrushPanel: React.FC<BrushPanelProps> = ({
    onSave,
    onCancel,
    onColorChange,
    onGridVisibilityChange,
    onCanvasScrollableChange,
    onPaperCountChange,
    initialPaperCount,
    initialBrushColor,
    initialShowGrid
}) => {
    // Get initial tab from localStorage
    const getInitialTab = (): 'image' | 'brush' | 'settings' => {
        try {
            const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)
            return (savedTab as 'image' | 'brush' | 'settings') || 'image'
        } catch (error) {
            console.error('Failed to get saved tab:', error)
            return 'image'
        }
    }

    // 测试模式
    const [testMode, setTestMode] = useState<boolean>(false)

    // 初始化选项卡状态
    const [activeTab, setActiveTab] = useState<'image' | 'brush' | 'settings'>(getInitialTab());

    const panelRef = useRef<HTMLDivElement>(null)
    const imageContainerRef = useRef<HTMLDivElement>(null)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Image Panel states
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [images, setImages] = useState<PexelsImage[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [loadingMore, setLoadingMore] = useState<boolean>(false)
    const [page, setPage] = useState<number>(1)
    const [selectedImage, setSelectedImage] = useState<PexelsImage | null>(null)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [gridWidth, setGridWidth] = useState<number>(600)
    const [useLocalWallpapers, setUseLocalWallpapers] = useState<boolean>(true)

    // 用于搜索防抖的状态
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("")

    // Color picker states
    const [selectedColor, setSelectedColor] = useState('#ff0000')
    const [showColorPicker, setShowColorPicker] = useState(false) // 控制是否显示颜色选择器
    const dotGridRef = useRef<HTMLDivElement>(null)
    const isInitializing = useRef(true); // Ref to track initialization phase

    // Motion values
    const x = useMotionValue(50)
    const y = useMotionValue(50)

    // Settings panel states
    // 使用服务器提供的值初始化showGrid，而不是从localStorage读取
    const [showGrid, setShowGrid] = useState<boolean>(initialShowGrid !== undefined ? initialShowGrid : true);

    // 新增：画布页数，替代之前的画布可滚动状态和缩放比例
    const [paperCount, setPaperCount] = useState<number>(initialPaperCount || 1); // 确保使用props中的initialPaperCount

    // 监听initialPaperCount的变化
    useEffect(() => {
        if (initialPaperCount && initialPaperCount !== paperCount) {
            console.log('[BrushPanel] Updating paperCount from initialPaperCount:', initialPaperCount);
            setPaperCount(initialPaperCount);
        }
    }, [initialPaperCount]); // 移除paperCount依赖，防止循环渲染

    // 监听initialShowGrid的变化
    useEffect(() => {
        if (initialShowGrid !== undefined && initialShowGrid !== showGrid) {
            console.log('[BrushPanel] Updating showGrid from initialShowGrid:', initialShowGrid);
            setShowGrid(initialShowGrid);
        }
    }, [initialShowGrid]); // 移除showGrid依赖，防止循环渲染

    // Update color based on position
    useEffect(() => {
        const unsubscribeX = x.on("change", updateColor)
        const unsubscribeY = y.on("change", updateColor)

        return () => {
            unsubscribeX()
            unsubscribeY()
        }
    }, [])

    // 修改：从props接收初始颜色
    useEffect(() => {
        if (initialBrushColor) {
            setSelectedColor(initialBrushColor);
            setShowColorPicker(true);
        }
    }, [initialBrushColor]);

    // Set default position
    useEffect(() => {
        // 设置默认位置
        x.set(50);
        y.set(50);
        // 完成初始化
        isInitializing.current = false;
    }, []);

    // Save selectedColor to localStorage
    useEffect(() => {
        if (isInitializing.current) {
            // Don't save during the initial loading phase
            return;
        }

        // 不再需要记录日志
    }, [selectedColor, showColorPicker]);

    // Save brush position (x, y) to localStorage
    useEffect(() => {
        const savePosition = () => {
            // 只有当颜色选择器显示时才保存位置
            if (!showColorPicker) {
                return;
            }

            try {
                // 不再保存到localStorage
                // localStorage.setItem(BRUSH_POSITION_X_STORAGE_KEY, x.get().toString());
                // localStorage.setItem(BRUSH_POSITION_Y_STORAGE_KEY, y.get().toString());
            } catch (error) {
                console.error('Failed to save brush position to localStorage:', error);
            }
        };

        const unsubscribeX = x.on("change", savePosition);
        const unsubscribeY = y.on("change", savePosition);

        return () => {
            unsubscribeX();
            unsubscribeY();
        };
    }, [x, y, showColorPicker]);

    // Calculate color based on position
    const updateColor = () => {
        if (dotGridRef.current) {
            const rect = dotGridRef.current.getBoundingClientRect();

            // 如果面板尚未完全渲染或尺寸为0，则不进行计算
            if (!rect || rect.width === 0 || rect.height === 0) {
                return;
            }

            const currentX = x.get();
            const currentY = y.get();

            // 计算色相，并确保其在 [0, 359] 范围内
            const rawHue = Math.floor((currentX / rect.width) * 360);
            const hue = Math.max(0, Math.min(359, rawHue));

            // 计算亮度，并确保其在 [70, 95] 范围内
            // 首先将 normalizedY 限制在 [0, 1] 以确保计算的稳定性
            const normalizedY = currentY / rect.height;
            const clampedNormalizedY = Math.max(0, Math.min(1, normalizedY));
            const rawLightness = Math.floor(95 - (clampedNormalizedY * (95 - 70)));
            const lightness = Math.max(70, Math.min(95, rawLightness));

            const newColor = `hsl(${hue}, 100%, ${lightness}%)`;

            setSelectedColor(prevSelectedColor => {
                if (prevSelectedColor === newColor) {
                    return prevSelectedColor; // 颜色未变，不更新状态
                }
                return newColor; // 颜色改变，更新状态
            });
        }
    };

    // 页面加载后预加载壁纸
    useEffect(() => {
        // 延迟500ms后开始预加载，避免影响页面加载性能
        const timer = setTimeout(() => {
            preloadAllWallpapers();
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    // 加载本地壁纸
    const loadLocalWallpapers = () => {
        setLoading(true);
        try {
            const localWallpapers = getLocalWallpapers();
            // 将本地壁纸转换为与PexelsImage兼容的格式
            const wallpaperImages = localWallpapers.map(wp => ({
                ...wp,
                width: 0,
                height: 0,
                url: wp.src.original,
                photographer_id: 0,
                avg_color: '',
                liked: false
            })) as unknown as PexelsImage[];

            setImages(wallpaperImages);
            setHasMore(false); // 本地壁纸没有更多内容可加载
            setUseLocalWallpapers(true);
        } catch (error) {
            console.error("Error loading local wallpapers:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handles loading the initial batch of curated images
    const loadCuratedImages = async () => {
        if (loading) return;

        if (useLocalWallpapers) {
            loadLocalWallpapers();
            return;
        }

        setLoading(true);
        try {
            const result = await getCuratedImages(page);

            // Ensure unique images
            const uniquePhotos = Array.from(
                new Map(result.photos.map(photo => [photo.id, photo])).values()
            );

            setImages(uniquePhotos);
            setHasMore(result.photos.length > 0 && result.page < Math.ceil(result.total_results / result.per_page));
        } catch (error) {
            console.error("Error loading curated images:", error);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    // Performs search when query changes
    const performSearch = async (query: string) => {
        if (!query.trim() || loading) {
            // If query is empty, load local wallpapers
            if (!query.trim() && !loading) {
                loadLocalWallpapers();
            }
            return;
        }

        setLoading(true);
        try {
            const result = await searchImages(query, 1);

            // Ensure unique images
            const uniquePhotos = Array.from(
                new Map(result.photos.map(photo => [photo.id, photo])).values()
            );

            setImages(uniquePhotos);
            setPage(1);
            setHasMore(result.photos.length > 0 && result.page < Math.ceil(result.total_results / result.per_page));
            setUseLocalWallpapers(false);
        } catch (error) {
            console.error("Error searching images:", error);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    // Loads more images (next page) for infinite scroll
    const loadMoreImages = async () => {
        if (loadingMore || !hasMore) return;

        // 本地壁纸没有分页，不需要加载更多
        if (useLocalWallpapers) {
            setHasMore(false);
            return;
        }

        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const result = debouncedSearchQuery
                ? await searchImages(debouncedSearchQuery, nextPage)
                : await getCuratedImages(nextPage);

            // Filter out duplicates before adding new images
            const currentIds = new Set(images.map(img => img.id));
            const uniqueNewImages = result.photos.filter(img => !currentIds.has(img.id));

            if (uniqueNewImages.length === 0) {
                // If we didn't get any new unique images, stop pagination
                setHasMore(false);
            } else {
                setImages(prev => [...prev, ...uniqueNewImages]);
                setPage(nextPage);
                setHasMore(uniqueNewImages.length > 0 && nextPage < Math.ceil(result.total_results / result.per_page));
            }
        } catch (error) {
            console.error("Error loading more images:", error);
            setHasMore(false);
        } finally {
            setLoadingMore(false);
        }
    };

    // 处理选择图片时优先使用缓存版本
    const handleSelectImage = (image: PexelsImage) => {
        setSelectedImage(image);

        // 检查是否有缓存版本可用
        let imageToSave = { ...image };

        // 如果是本地壁纸且有缓存
        if ('src' in image && wallpaperCache.has(image.src.large)) {
            console.log(`[壁纸] 使用缓存的壁纸: ${image.src.large}`);
            // 使用缓存版本
            imageToSave = {
                ...image
            };
        }

        onSave({
            type: 'image',
            image: imageToSave
        });
        onCancel();
    }

    // Save selected image
    const handleSaveImage = () => {
        if (selectedImage) {
            onSave({
                type: 'image',
                image: selectedImage
            })
            onCancel()
        }
    }

    // Handle search input change
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        // If the search query is empty, load local wallpapers
        if (value === '') {
            setDebouncedSearchQuery(''); // Reset debounced query immediately
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            loadLocalWallpapers();
            return;
        }

        // Debounce search to avoid too many API calls
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearchQuery(value);
        }, 500);
    };

    // Handle tab change
    const handleTabChange = (tab: 'image' | 'brush' | 'settings') => {
        setActiveTab(tab)
    }

    // Update localStorage when activeTab changes
    useEffect(() => {
        try {
            localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab)
        } catch (error) {
            console.error('Failed to save active tab:', error)
        }
    }, [activeTab])

    // Load initial local wallpapers when tab is 'image' and no images are loaded
    useEffect(() => {
        if (activeTab === 'image' && images.length === 0 && !loading) {
            loadLocalWallpapers();
        }
    }, [activeTab, images.length, loading]);

    // 使用单独的 useEffect 处理搜索防抖
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => {
            clearTimeout(timerId);
        };
    }, [searchQuery]);

    // 单独处理 debounced 搜索查询的变化
    useEffect(() => {
        if (debouncedSearchQuery === '') {
            loadLocalWallpapers();
        } else {
            performSearch(debouncedSearchQuery);
        }
    }, [debouncedSearchQuery]);

    // Update grid width based on container size
    useEffect(() => {
        const updateGridWidth = () => {
            if (imageContainerRef.current) {
                const containerWidth = imageContainerRef.current.clientWidth
                setGridWidth(containerWidth - 20) // Subtract padding
            }
        }

        // Initial measurement
        updateGridWidth()

        // Update on resize
        window.addEventListener('resize', updateGridWidth)
        return () => window.removeEventListener('resize', updateGridWidth)
    }, [activeTab])

    // Handle clicks outside the panel
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onCancel()
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [onCancel])

    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (activeTab !== 'image' || loadingMore || !hasMore) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreImages()
                }
            },
            { threshold: 0.1, rootMargin: "50px" }
        )

        const loadingElement = document.getElementById('loading-indicator')
        if (loadingElement) {
            observer.observe(loadingElement)
        }

        return () => {
            if (loadingElement) {
                observer.unobserve(loadingElement)
            }
            observer.disconnect()
        }
    }, [activeTab, loadingMore, hasMore])

    // Handle drag end - 在拖动结束时立即更新背景色
    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // 在拖动结束时立即更新背景色
        if (onColorChange && showColorPicker) {
            onColorChange(selectedColor);
        }
    }

    // Handle color picker position constraints
    const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (dotGridRef.current) {
            const rect = dotGridRef.current.getBoundingClientRect()

            let newX = x.get() + info.delta.x
            let newY = y.get() + info.delta.y

            // 圆的直径是32px (w-8 class)
            // 我们允许圆形的一半可以超出边界
            const halfDiameter = 16 // 允许一半直径超出边界

            // 四个方向都约束，但允许圆形一半超出边界
            newX = Math.max(-halfDiameter, Math.min(newX, rect.width - halfDiameter))
            newY = Math.max(-halfDiameter, Math.min(newY, rect.height - halfDiameter))

            x.set(newX)
            y.set(newY)
        }
    }

    // Handle saving the selected color
    const handleSaveColor = () => {
        onSave({
            type: 'brush',
            color: selectedColor
        })
    }

    // 向父组件传递颜色变化 - 使用防抖来减少更新频率
    useEffect(() => {
        // 只有当组件初始化完成后才处理颜色更新
        if (!isInitializing.current && onColorChange && showColorPicker) {
            // 创建一个防抖函数，延迟200ms更新背景色
            const debounceTimeout = setTimeout(() => {
                onColorChange(selectedColor);
            }, 200);

            // 清理防抖计时器
            return () => clearTimeout(debounceTimeout);
        }
    }, [selectedColor, showColorPicker, onColorChange]);

    // Reset color and position to default
    const handleRevertColor = () => {
        // 重置为默认值
        const defaultX = 50;
        const defaultY = 50;

        // 设置位置
        animate(x, defaultX, {
            type: "spring",
            damping: 20,
            stiffness: 300
        });

        animate(y, defaultY, {
            type: "spring",
            damping: 20,
            stiffness: 300
        });

        // 默认红色
        setSelectedColor('#ff0000');

        // 清除本地存储已不再需要
        try {
            // 不再使用localStorage，不需要移除这些键值
            // localStorage.removeItem(BRUSH_COLOR_STORAGE_KEY);
            // localStorage.removeItem(BRUSH_POSITION_X_STORAGE_KEY);
            // localStorage.removeItem(BRUSH_POSITION_Y_STORAGE_KEY);
        } catch (error) {
            console.error('Failed to remove brush settings from localStorage:', error);
        }

        // 隐藏颜色选择器
        setShowColorPicker(false);

        // 立即通知颜色变化为null，不依赖于useEffect
        if (onColorChange) {
            onColorChange(null);
        }
    }

    // Handle grid visibility toggle
    const handleGridVisibilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.checked;
        setShowGrid(newValue);

        // 不再使用localStorage保存设置
        // 直接通知父组件，由父组件保存到服务器
        if (onGridVisibilityChange) {
            onGridVisibilityChange(newValue);
        }
    };

    // 新增：处理页数变化
    const handlePaperCountChange = (newCount: number) => {
        // 避免重复设置相同的值
        if (paperCount === newCount) return;

        console.log(`[BrushPanel] 更新页数: ${paperCount} -> ${newCount}`);

        // 仅更新本地状态，减少不必要的渲染
        setPaperCount(newCount);

        // 同时更新滚动状态 - 当页数大于1时启用滚动
        if (onCanvasScrollableChange) {
            const shouldScroll = newCount > 1;
            onCanvasScrollableChange(shouldScroll); // 不再传递newCount作为scale参数
        }

        // 使用专用的onPaperCountChange回调，传递增量更新
        if (onPaperCountChange) {
            onPaperCountChange(newCount);
        }
    };

    // 清除背景图片功能
    const handleClearBackground = (e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止事件冒泡，避免触发其他事件

        console.log("清除背景图片但保留背景颜色");

        // 调用onSave传递清除背景的指令，同时保留当前背景颜色
        onSave({
            type: 'background',
            image: null,
            preserveColor: true // 添加标志，指示保留当前背景颜色
        });

        // 可选：清除搜索框内容
        setSearchQuery('');

        // 如果需要，可以关闭面板
        // onCancel();
    }

    // 新增：处理增加页数的点击
    const handleIncreasePage = () => {
        if (paperCount >= 10) return; // 如果已达最大值，直接返回
        const newCount = paperCount + 1;
        handlePaperCountChange(newCount);
    };

    // 新增：处理减少页数的点击
    const handleDecreasePage = () => {
        if (paperCount <= 1) return; // 如果已达最小值，直接返回
        const newCount = paperCount - 1;
        handlePaperCountChange(newCount);
    };

    return (
        <div ref={panelRef} className="w-full h-full flex flex-row">
            {/* Left Side Navigation */}
            <div className="border-r flex flex-col justify-between h-full">
                <button
                    onClick={() => handleTabChange('image')}
                    className={`flex items-center justify-center py-4 px-4 flex-1 ${activeTab === 'image'
                        ? 'text-black'
                        : 'text-gray-400 hover:text-gray-600'
                        } transition-colors duration-200`}
                    aria-label="Image"
                >
                    <ImageIcon size={24} />
                </button>

                <button
                    onClick={() => handleTabChange('brush')}
                    className={`flex items-center justify-center py-4 px-4 flex-1 ${activeTab === 'brush'
                        ? 'text-black'
                        : 'text-gray-400 hover:text-gray-600'
                        } transition-colors duration-200`}
                    aria-label="Brush"
                >
                    <PaintbrushVertical size={24} />
                </button>

                <button
                    onClick={() => handleTabChange('settings')}
                    className={`flex items-center justify-center py-4 px-4 flex-1 ${activeTab === 'settings'
                        ? 'text-black'
                        : 'text-gray-400 hover:text-gray-600'
                        } transition-colors duration-200`}
                    aria-label="Settings"
                >
                    <Cog size={24} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 h-full overflow-hidden flex flex-col">
                {activeTab === 'image' && (
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchInputChange}
                                    placeholder="Search for Images..."
                                    className="w-full px-4 py-2 pl-10 pr-10 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <RotateCcw
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600"
                                    size={18}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearBackground(e);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Selected Image Preview */}
                        {selectedImage && (
                            <div className="px-4 py-3 border-b">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium">Selected Image</p>
                                    <button
                                        onClick={handleSaveImage}
                                        className="px-3 py-1 bg-black text-white text-sm rounded-md hover:bg-gray-800"
                                    >
                                        Use This Image
                                    </button>
                                </div>
                                <div className="relative aspect-video rounded-md overflow-hidden">
                                    <img
                                        src={selectedImage.src.large}
                                        alt={selectedImage.alt || "Selected image"}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Photo by <a href={selectedImage.photographer_url} target="_blank" rel="noopener noreferrer" className="underline">{selectedImage.photographer}</a> on Pexels
                                </p>
                            </div>
                        )}

                        {/* Image Grid */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide">
                            <div ref={imageContainerRef} className="p-2 pb-0 h-full">
                                {loading && images.length === 0 ? (
                                    <div className="flex justify-center items-center h-40">
                                        <Loader className="animate-spin text-gray-400" size={32} />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-3">
                                        {images.map((image, index) => {
                                            // 判断是否为本地壁纸（具有缩略图字段）
                                            const isLocalWallpaper = 'src' in image && 'thumbnail' in (image as any).src;
                                            // 获取适当的缩略图URL
                                            const thumbnailSrc = isLocalWallpaper
                                                ? (image as any).src.thumbnail
                                                : image.src.small || image.src.medium;

                                            return (
                                                <div
                                                    key={`image-${image.id}-${index}`}
                                                    onClick={() => handleSelectImage(image)}
                                                    className={`aspect-video rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-all ${selectedImage?.id === image.id
                                                        ? 'ring-2 ring-black'
                                                        : ''
                                                        }`}
                                                    style={{
                                                        minHeight: "120px",
                                                        backgroundColor: "#f3f4f6" // 保留背景色
                                                    }}
                                                >
                                                    <img
                                                        src={thumbnailSrc}
                                                        alt={image.alt || "Pexels image"}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Loading Indicator for Infinite Scroll */}
                                {hasMore && (
                                    <div
                                        id="loading-indicator"
                                        className="flex justify-center items-center h-8"
                                    >
                                        {loadingMore && (
                                            <Loader className="animate-spin text-gray-400" size={20} />
                                        )}
                                    </div>
                                )}

                                {/* 额外的底部空间 */}
                                <div className="h-2"></div>

                                {/* No Results Message */}
                                {!loading && images.length === 0 && !useLocalWallpapers && debouncedSearchQuery && (
                                    <p className="text-center my-4 text-gray-500">No images found for &quot;{debouncedSearchQuery}&quot;. Try a different search.</p>
                                )}
                                {!loading && images.length === 0 && useLocalWallpapers && (
                                    <p className="text-center my-4 text-gray-500">No local wallpapers found or loaded.</p>
                                )}
                                {!loading && images.length === 0 && !useLocalWallpapers && !debouncedSearchQuery && (
                                    <p className="text-center my-4 text-gray-500">Curated images are loading or failed to load.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'brush' && (
                    <div className="h-full flex flex-col">
                        <div
                            className="flex-1 relative overflow-hidden"
                            ref={dotGridRef}
                            onClick={(e) => {
                                // 防止点击圆形时触发背景点击事件
                                // 只有当点击的是背景而不是圆形时才移动圆形
                                const target = e.target as HTMLElement;
                                const isColorPicker = target.closest('.color-picker-circle');
                                const isRevertButton = target.closest('.revert-button');

                                if (isColorPicker || isRevertButton) {
                                    return; // 如果点击的是颜色选择器或重置按钮，不执行移动
                                }

                                // 第一次点击时显示颜色选择器
                                if (!showColorPicker) {
                                    setShowColorPicker(true);
                                }

                                if (dotGridRef.current) {
                                    const rect = dotGridRef.current.getBoundingClientRect();

                                    // 计算相对于点阵的点击坐标
                                    const clickX = e.clientX - rect.left;
                                    const clickY = e.clientY - rect.top;

                                    // 处理边界约束
                                    const halfDiameter = 16;
                                    const constrainedX = Math.max(-halfDiameter, Math.min(clickX, rect.width - halfDiameter));
                                    const constrainedY = Math.max(-halfDiameter, Math.min(clickY, rect.height - halfDiameter));

                                    // 使用animate方法实现平滑过渡
                                    animate(x, constrainedX, {
                                        type: "spring",
                                        damping: 20,
                                        stiffness: 300,
                                        mass: 0.5
                                    });

                                    animate(y, constrainedY, {
                                        type: "spring",
                                        damping: 20,
                                        stiffness: 300,
                                        mass: 0.5
                                    });
                                }
                            }}
                        >
                            <div className="absolute inset-0 grid" style={{
                                backgroundImage: 'radial-gradient(circle, #cccccc 1px, transparent 1px)',
                                backgroundSize: '10px 10px',
                                backgroundPosition: '0 0',
                            }}>
                            </div>

                            {/* Revert button - float at the top right corner */}
                            {showColorPicker && (
                                <div className="absolute top-3 right-3 z-10 revert-button">
                                    <button
                                        onClick={handleRevertColor}
                                        className="flex items-center justify-center gap-1 px-3 py-2 bg-white hover:bg-gray-100 rounded-md text-sm font-medium transition-colors shadow-sm"
                                    >
                                        <RotateCcw size={16} /> Revert
                                    </button>
                                </div>
                            )}

                            {/* Color Picker Circle - only show if showColorPicker is true */}
                            {showColorPicker && (
                                <motion.div
                                    className="absolute w-8 h-8 rounded-full cursor-grab border-2 border-white color-picker-circle"
                                    style={{
                                        backgroundColor: selectedColor,
                                        x,
                                        y,
                                    }}
                                    drag
                                    dragMomentum={false}
                                    dragElastic={0}
                                    onDrag={handleDrag}
                                    onDragEnd={handleDragEnd}
                                    whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
                                    whileHover={{ scale: 1.05 }}
                                    transition={{
                                        type: "spring",
                                        damping: 20,
                                        stiffness: 300,
                                        mass: 0.5
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="h-full flex flex-col">
                        {/* 顶部标题区域 - 模仿PhotoUploadPanel的样式 */}
                        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-lg font-medium text-gray-900">
                                Canvas Settings
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                {/* Grid Settings */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base font-medium text-gray-800">Show Background Grid</h3>
                                            <p className="text-sm text-gray-500 mt-1">Display helper grid in the background</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showGrid}
                                                onChange={handleGridVisibilityChange}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                                        </label>
                                    </div>
                                </div>

                                {/* Canvas Pages */}
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <div>
                                            <h3 className="text-base font-medium text-gray-800">Paper Count</h3>
                                            <p className="text-sm text-gray-500">One sheet means no scrolling</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleDecreasePage}
                                                aria-label="减少纸张数量"
                                                className={`w-8 h-8 flex items-center justify-center rounded-md text-base font-medium transition-colors
                                                    ${paperCount <= 1
                                                        ? 'bg-gray-100 text-gray-300'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'}`}
                                                disabled={paperCount <= 1}
                                            >
                                                -
                                            </button>

                                            <div className="min-w-[36px] h-8 bg-white border border-gray-200 rounded-md flex items-center justify-center text-base font-medium">
                                                {paperCount}
                                            </div>

                                            <button
                                                onClick={handleIncreasePage}
                                                aria-label="增加纸张数量"
                                                className={`w-8 h-8 flex items-center justify-center rounded-md text-base font-medium transition-colors
                                                    ${paperCount >= 10
                                                        ? 'bg-gray-100 text-gray-300'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'}`}
                                                disabled={paperCount >= 10}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 