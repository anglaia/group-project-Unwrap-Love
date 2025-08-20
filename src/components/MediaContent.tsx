"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Loader2, AlertCircle } from "lucide-react"

interface MediaContentProps {
    initialUrl?: string
    isDragging?: boolean
}

// Supported media platforms and their embedding methods
type MediaPlatform = {
    name: string
    regex: RegExp
    getEmbedUrl: (url: string, match: RegExpMatchArray) => string
    width?: number
    height?: number
}

export const MediaContent: React.FC<MediaContentProps> = ({
    initialUrl = "https://open.spotify.com/track/6fCpZU76MwKF2TMsgwwhQj?si=9cab40bf08694615",
    isDragging = false,
}) => {
    const [url, setUrl] = useState(initialUrl)
    const [isLoading, setIsLoading] = useState(true)
    const [iframeSrc, setIframeSrc] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [embedHeight, setEmbedHeight] = useState<number>(152)

    // Define supported media platforms
    const mediaPlatforms: MediaPlatform[] = [
        {
            name: "Spotify",
            regex: /https?:\/\/(?:open\.)?spotify\.com\/(?:track|album|artist|playlist)\/([a-zA-Z0-9]+)(?:\?.*)?/,
            getEmbedUrl: (url) => {
                // For Spotify, we use the oEmbed API
                return ""  // Actual value will be fetched via API
            },
            height: 152
        },
        {
            name: "YouTube",
            regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)(?:\?.*)?/,
            getEmbedUrl: (url, match) => {
                return `https://www.youtube.com/embed/${match[1]}`
            },
            height: 200
        },
        {
            name: "SoundCloud",
            regex: /https?:\/\/(?:www\.)?soundcloud\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)(?:\?.*)?/,
            getEmbedUrl: (url) => {
                return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`
            },
            height: 166
        },
        {
            name: "Vimeo",
            regex: /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/([0-9]+)(?:\?.*)?/,
            getEmbedUrl: (url, match) => {
                return `https://player.vimeo.com/video/${match[1]}`
            },
            height: 200
        }
    ]

    // Detect link platform and get embed URL
    const getMediaEmbed = async (url: string) => {
        // Try to find a matching platform
        for (const platform of mediaPlatforms) {
            const match = url.match(platform.regex)
            if (match) {
                // For Spotify, we need to use the oEmbed API
                if (platform.name === "Spotify") {
                    try {
                        const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
                        if (!response.ok) {
                            throw new Error(`Failed to fetch ${platform.name} embed`)
                        }
                        const data = await response.json()

                        // Extract iframe src from returned HTML
                        const srcMatch = data.html.match(/src="([^"]+)"/)
                        if (!srcMatch) throw new Error("Could not find iframe src")

                        setEmbedHeight(platform.height || 152)
                        return srcMatch[1]
                    } catch (err) {
                        throw err
                    }
                } else {
                    // For other platforms, use predefined embed URL format
                    setEmbedHeight(platform.height || 152)
                    return platform.getEmbedUrl(url, match)
                }
            }
        }

        // If no matching platform, try generic embedding
        if (url.match(/^https?:\/\//)) {
            setEmbedHeight(300)
            return url  // Try to embed the link directly
        }

        throw new Error("Unsupported media link")
    }

    // Load media embed
    useEffect(() => {
        const loadEmbed = async () => {
            setIsLoading(true)
            setError(null)

            try {
                if (!url.trim()) {
                    throw new Error("Please enter a valid URL")
                }

                const embedSrc = await getMediaEmbed(url)
                setIframeSrc(embedSrc)
            } catch (err) {
                console.error("Error loading media:", err)
                setError(err instanceof Error ? err.message : "Error loading media")
            } finally {
                setIsLoading(false)
            }
        }

        loadEmbed()
    }, [url])

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="h-[152px] flex items-center justify-center bg-white rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-black" />
                </div>
            )
        }

        if (error) {
            return (
                <div className="h-[152px] flex flex-col items-center justify-center bg-white rounded-lg text-red-500 text-center p-4">
                    <AlertCircle className="h-6 w-6 mb-2" />
                    <p className="text-sm">{error}</p>
                    <p className="text-xs mt-1 text-gray-500">Supported: Spotify, YouTube, SoundCloud, Vimeo links</p>
                </div>
            )
        }

        if (iframeSrc) {
            return (
                <div className="overflow-hidden rounded-lg relative">
                    <iframe
                        src={iframeSrc}
                        width="100%"
                        height={embedHeight}
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="transform-gpu"
                    />
                    {isDragging && (
                        <div
                            className="absolute inset-0 bg-transparent cursor-grab"
                            aria-hidden="true"
                        />
                    )}
                </div>
            )
        }

        return null
    }

    return (
        <div className={`transition-shadow duration-300 rounded-2xl ${isDragging ? "shadow-2xl" : "shadow-lg hover:shadow-2xl"}`}>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden w-[400px]">
                <div className="p-3">
                    {renderContent()}
                </div>
            </div>
        </div>
    )
}

export default MediaContent