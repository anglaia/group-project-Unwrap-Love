import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Music, Loader2 } from 'lucide-react'

// Spotify API configuration
const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || ''
const SPOTIFY_CLIENT_SECRET = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET || ''

// Cache for Spotify token and recommended tracks
let cachedToken = {
    value: '',
    expiry: 0
}
let cachedRecommendedTracks: SpotifyTrack[] = []

// Track interface definition
interface SpotifyTrack {
    id: string
    name: string
    artists: { name: string }[]
    album: {
        name: string
        images: { url: string }[]
    }
    external_urls: {
        spotify: string
    }
}

interface MediaInputPanelProps {
    onSave: (url: string) => void
    onCancel: () => void
}

// Pagination configuration
const ITEMS_PER_PAGE = 40
// Number of items before end to trigger next load
const LOAD_TRIGGER_THRESHOLD = 5
// Early load threshold in pixels (how far before the end to start loading)
const EARLY_LOAD_MARGIN = 500

// Pre-fetch token and recommendations outside component
const preloadSpotifyData = async () => {
    // Check if we already have a valid token
    if (cachedToken.value && cachedToken.expiry > Date.now()) {
        return cachedToken.value
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
            },
            body: 'grant_type=client_credentials'
        })

        if (!response.ok) {
            throw new Error('Unable to get Spotify access token')
        }

        const data = await response.json()

        // Cache the token with expiry (subtract 5 minutes for safety)
        cachedToken = {
            value: data.access_token,
            expiry: Date.now() + (data.expires_in * 1000) - 300000
        }

        // Pre-fetch recommended tracks
        if (cachedRecommendedTracks.length === 0) {
            fetchAndCacheRecommendedTracks(data.access_token)
        }

        return data.access_token
    } catch (err) {
        console.error('Error in preloading Spotify data:', err)
        return ''
    }
}

// Start preloading as soon as possible
preloadSpotifyData()

// Function to fetch and cache recommended tracks
const fetchAndCacheRecommendedTracks = async (token: string, offset = 0, limit = ITEMS_PER_PAGE) => {
    try {
        const response = await fetch(
            `https://api.spotify.com/v1/browse/new-releases?limit=${limit}&offset=${offset}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        )

        if (!response.ok) {
            throw new Error('Failed to get popular tracks: ' + response.statusText)
        }

        const data = await response.json()

        // If no items at all and this is the first request, that's an error
        // But if this is a pagination request, empty results just mean we've reached the end
        if (!data.albums?.items || data.albums.items.length === 0) {
            if (offset === 0) {
                throw new Error('No popular tracks found')
            } else {
                // Just reached the end of the list, not an error
                return {
                    tracks: [],
                    hasMore: false
                }
            }
        }

        // Convert album format to track format to fit UI display
        const albumsAsTrack = data.albums.items.map((album: any) => ({
            id: album.id,
            name: album.name,
            artists: album.artists || [{ name: "Unknown Artist" }],
            album: {
                name: album.name,
                images: album.images || [{ url: "" }]
            },
            external_urls: {
                spotify: album.external_urls?.spotify || `https://open.spotify.com/album/${album.id}`
            }
        }))

        // Validate data integrity
        const validTracks = albumsAsTrack.filter((track: any) => {
            return track &&
                track.id &&
                track.name &&
                track.artists &&
                track.artists.length > 0 &&
                track.album &&
                track.album.images &&
                track.album.images.length > 0 &&
                track.external_urls &&
                track.external_urls.spotify
        })

        if (offset === 0 && validTracks.length > 0) {
            cachedRecommendedTracks = validTracks
        }

        return {
            tracks: validTracks,
            hasMore: validTracks.length === limit
        }
    } catch (err) {
        console.error('Failed to get recommended tracks:', err)
        return {
            tracks: [],
            hasMore: false
        }
    }
}

export const MediaInputPanel: React.FC<MediaInputPanelProps> = ({ onSave, onCancel }) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
    const [recommendedTracks, setRecommendedTracks] = useState<SpotifyTrack[]>(cachedRecommendedTracks)
    const [isSearching, setIsSearching] = useState(false)
    const [isLoading, setIsLoading] = useState(cachedRecommendedTracks.length === 0)
    const [accessToken, setAccessToken] = useState(cachedToken.value)
    const [error, setError] = useState('')

    // Infinite scroll state
    const [searchOffset, setSearchOffset] = useState(0)
    const [recommendedOffset, setRecommendedOffset] = useState(0)
    const [hasMoreSearch, setHasMoreSearch] = useState(true)
    const [hasMoreRecommended, setHasMoreRecommended] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)

    // Refs for intersection observer and content
    const observer = useRef<IntersectionObserver | null>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    // Reference for the panel container
    const panelRef = useRef<HTMLDivElement>(null)

    // Handle clicks outside the panel
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onCancel()
            }
        }

        // Add event listener
        document.addEventListener('mousedown', handleClickOutside)

        // Cleanup
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [onCancel])

    // Get Spotify access token and recommended tracks
    useEffect(() => {
        const initializeSpotifyData = async () => {
            // If we already have both token and tracks, no need to load
            if (accessToken && recommendedTracks.length > 0) {
                setIsLoading(false)
                return
            }

            try {
                setIsLoading(true)

                // Use cached token or get a new one
                const token = await preloadSpotifyData()
                if (!token) {
                    throw new Error('Unable to get Spotify access token')
                }
                setAccessToken(token)

                // Use cached tracks or fetch new ones
                if (cachedRecommendedTracks.length > 0) {
                    setRecommendedTracks(cachedRecommendedTracks)
                } else {
                    const result = await fetchAndCacheRecommendedTracks(token)
                    if (result.tracks.length === 0) {
                        throw new Error('No tracks found')
                    }
                    setRecommendedTracks(result.tracks)
                    setHasMoreRecommended(result.hasMore)
                    setRecommendedOffset(ITEMS_PER_PAGE)
                }

                setError('')
            } catch (err) {
                console.error('Error initializing Spotify data:', err)
                setError('Unable to connect to Spotify service, please check your network connection or API credentials')
            } finally {
                setIsLoading(false)
            }
        }

        initializeSpotifyData()
    }, [accessToken, recommendedTracks.length])

    // Load more recommended tracks
    const loadMoreRecommended = async () => {
        if (loadingMore || !hasMoreRecommended || !accessToken) return

        try {
            setLoadingMore(true)

            const result = await fetchAndCacheRecommendedTracks(
                accessToken,
                recommendedOffset,
                ITEMS_PER_PAGE
            )

            // If no tracks returned, we've reached the end
            if (result.tracks.length === 0) {
                setHasMoreRecommended(false)
                return
            }

            setRecommendedTracks(prev => [...prev, ...result.tracks])
            setHasMoreRecommended(result.hasMore)
            setRecommendedOffset(prev => prev + result.tracks.length)
        } catch (err) {
            console.error('Error loading more recommended tracks:', err)
            // Don't show error to user, just stop loading more
            setHasMoreRecommended(false)
        } finally {
            setLoadingMore(false)
        }
    }

    // Search tracks with pagination support
    const searchTracks = async (offset = 0) => {
        if (!searchQuery.trim()) return

        try {
            setIsSearching(true)
            setError('')

            // Ensure we have a token
            let token = accessToken
            if (!token) {
                token = await preloadSpotifyData()
                if (!token) {
                    throw new Error('No Spotify access token available')
                }
                setAccessToken(token)
            }

            // Use real API with pagination
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=${ITEMS_PER_PAGE}&offset=${offset}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            )

            if (!response.ok) {
                throw new Error('Failed to search tracks: ' + response.statusText)
            }

            const data = await response.json()

            if (!data.tracks?.items) {
                if (offset === 0) {
                    throw new Error('Incorrect data format returned from search')
                } else {
                    // End of pagination, not an error
                    setHasMoreSearch(false)
                    return
                }
            }

            // Validate track data integrity
            const validTracks = data.tracks.items.filter((track: any) => {
                return track &&
                    track.id &&
                    track.name &&
                    track.artists &&
                    track.artists.length > 0 &&
                    track.album &&
                    track.album.images &&
                    track.album.images.length > 0 &&
                    track.external_urls &&
                    track.external_urls.spotify
            })

            // If it's a new search (offset=0), replace results, otherwise append
            if (offset === 0) {
                setSearchResults(validTracks)
            } else {
                setSearchResults(prev => [...prev, ...validTracks])
            }

            // Update pagination info
            setSearchOffset(offset + validTracks.length)
            setHasMoreSearch(validTracks.length === ITEMS_PER_PAGE)

            if (validTracks.length === 0 && offset === 0) {
                setError('No search results, please try other keywords')
            }
        } catch (err) {
            console.error('Failed to search tracks:', err)
            if (offset === 0) {
                // Only show error message for initial search
                setError('Error searching tracks, please try again later')
            } else {
                // For pagination errors, just stop loading more
                setHasMoreSearch(false)
            }
        } finally {
            setIsSearching(false)
        }
    }

    // Load more search results
    const loadMoreSearchResults = async () => {
        if (loadingMore || !hasMoreSearch || !searchQuery.trim()) return

        try {
            setLoadingMore(true)
            await searchTracks(searchOffset)
        } catch (err) {
            console.error('Error loading more search results:', err)
            // Don't show error to user, just stop loading more
            setHasMoreSearch(false)
        } finally {
            setLoadingMore(false)
        }
    }

    // Intersection observer callback for very early loading
    const loadTriggerRef = useCallback((node: HTMLDivElement | null) => {
        if (isSearching || loadingMore) return

        if (observer.current) observer.current.disconnect()

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                if (searchQuery.trim() && hasMoreSearch) {
                    loadMoreSearchResults()
                } else if (!searchQuery.trim() && hasMoreRecommended) {
                    loadMoreRecommended()
                }
            }
        }, {
            // Adjust the root margin to trigger loading much earlier
            // Larger positive bottom value means trigger will happen much sooner
            rootMargin: `0px 0px ${EARLY_LOAD_MARGIN}px 0px`,
            threshold: 0.1 // Trigger when even a small part of the element is visible
        })

        if (node) observer.current.observe(node)
    }, [isSearching, loadingMore, searchQuery, hasMoreSearch, hasMoreRecommended, loadMoreSearchResults, loadMoreRecommended])

    // Effect to check scroll position and preload content
    useEffect(() => {
        // Skip if we're already loading
        if (isSearching || loadingMore) return

        const checkScrollAndPreload = () => {
            const container = contentRef.current?.parentElement
            if (!container) return

            // Calculate how far we are from the bottom of the scrollable area
            const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight)

            // If we're within a large threshold, load more content
            if (distanceToBottom < EARLY_LOAD_MARGIN * 1.5) {
                if (searchQuery.trim() && hasMoreSearch) {
                    loadMoreSearchResults()
                } else if (!searchQuery.trim() && hasMoreRecommended) {
                    loadMoreRecommended()
                }
            }
        }

        // Check immediately after render and content changes
        checkScrollAndPreload()

        // Also attach scroll listener for continuous checking
        const container = contentRef.current?.parentElement
        if (container) {
            container.addEventListener('scroll', checkScrollAndPreload)
            return () => container.removeEventListener('scroll', checkScrollAndPreload)
        }
    }, [
        searchQuery,
        hasMoreSearch,
        hasMoreRecommended,
        isSearching,
        loadingMore,
        loadMoreSearchResults,
        loadMoreRecommended,
        searchResults.length,
        recommendedTracks.length
    ])

    // Handle input change, trigger search automatically
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchQuery(value)

        // Reset pagination when query changes
        setSearchOffset(0)
        setHasMoreSearch(true)

        // Use debounce, only send search request 300ms after input stops
        const debounceSearch = setTimeout(() => {
            if (value.trim()) {
                searchTracks(0) // Always start from first page on new search
            } else if (value === '') {
                // If input is cleared, show recommended content
                setSearchResults([])
            }
        }, 300)

        return () => clearTimeout(debounceSearch)
    }

    // Select a track
    const selectTrack = (track: SpotifyTrack) => {
        onSave(track.external_urls.spotify)
    }

    // Render track grid item
    const renderTrackItem = (track: SpotifyTrack, index: number, array: SpotifyTrack[]) => {
        // Safety check to ensure all necessary properties exist
        if (!track || !track.id || !track.name || !track.artists ||
            !track.album || !track.album.images || !track.album.images[0] ||
            !track.external_urls || !track.external_urls.spotify) {
            console.warn('Invalid track data found:', track)
            return null
        }

        // Create a unique key combining track ID and index to avoid duplicates
        const uniqueKey = `${track.id}-${index}`

        return (
            <div
                key={uniqueKey}
                className="flex items-center bg-gray-100 hover:bg-gray-200 rounded overflow-hidden cursor-pointer transition-all duration-200"
                onClick={() => selectTrack(track)}
            >
                <div className="w-10 h-10 flex-shrink-0">
                    {track.album.images[0]?.url ? (
                        <img
                            src={track.album.images[0].url}
                            alt={track.album.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <Music size={16} className="text-gray-400" />
                        </div>
                    )}
                </div>
                <div className="flex-grow min-w-0 px-2 py-1">
                    <div className="font-medium text-gray-800 text-xs truncate">{track.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                        {track.artists.map(artist => artist.name).join(', ')}
                    </div>
                </div>
            </div>
        )
    }

    // The tracks to display (either search results or recommendations)
    const tracksToDisplay = searchResults.length > 0 ? searchResults : recommendedTracks

    // Determine if we should show the load trigger
    const showLoadTrigger = (searchQuery.trim() && hasMoreSearch) || (!searchQuery.trim() && hasMoreRecommended)

    // Start loading more content right away if we have less than a full page
    useEffect(() => {
        if (tracksToDisplay.length < ITEMS_PER_PAGE && showLoadTrigger && !isLoading && !loadingMore && !isSearching) {
            // Aggressive preloading - immediately load next batch if we don't have enough items
            if (searchQuery.trim() && hasMoreSearch) {
                loadMoreSearchResults()
            } else if (!searchQuery.trim() && hasMoreRecommended) {
                loadMoreRecommended()
            }
        }
    }, [
        tracksToDisplay.length,
        showLoadTrigger,
        isLoading,
        loadingMore,
        isSearching,
        searchQuery,
        hasMoreSearch,
        hasMoreRecommended,
        loadMoreSearchResults,
        loadMoreRecommended
    ])

    return (
        <div className="absolute inset-0 w-full h-full flex flex-col p-4 pb-0">
            {/* Content wrapper with ref for click-outside detection */}
            <div ref={panelRef} className="w-full h-full flex flex-col max-w-5xl mx-auto">
                {/* Search input box */}
                <div className="relative w-full mt-0 mb-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleInputChange}
                        placeholder="Search songs, artists..."
                        className="w-full p-2 pl-9 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-gray-700 placeholder-gray-500"
                        style={{
                            // Ensure browser default outline is removed but keep the ring effect
                            outline: 'none'
                        }}
                    />
                    <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>

                {/* Search results and recommended section - with hidden scrollbar */}
                <div
                    className="flex-grow w-full overflow-auto mt-2 mb-0 hide-scrollbar"
                    style={{
                        scrollbarWidth: 'none', /* Firefox */
                        msOverflowStyle: 'none'  /* IE and Edge */
                    }}
                >
                    {/* For WebKit browsers like Chrome/Safari */}
                    <style jsx global>{`
                        .hide-scrollbar::-webkit-scrollbar {
                            display: none;
                            width: 0;
                            height: 0;
                            background: transparent;
                        }
                    `}</style>

                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-black" />
                        </div>
                    ) : error && searchResults.length === 0 && recommendedTracks.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-red-500">
                            <p>{error}</p>
                        </div>
                    ) : isSearching && searchOffset === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-black" />
                        </div>
                    ) : (
                        <>
                            <div ref={contentRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pb-0">
                                {tracksToDisplay.map((track, index, array) => renderTrackItem(track, index, array))}

                                {/* Early loading triggers - multiple points to ensure content loads in advance */}
                                {showLoadTrigger && (
                                    <>
                                        {/* Super early trigger - positioned halfway through visible content */}
                                        <div
                                            ref={loadTriggerRef}
                                            className="col-span-full h-1 opacity-0"
                                            style={{
                                                position: 'absolute',
                                                top: '30%',
                                                left: 0,
                                                right: 0
                                            }}
                                            aria-hidden="true"
                                        />

                                        {/* Regular trigger at the end */}
                                        <div
                                            className="col-span-full h-1 opacity-0"
                                            aria-hidden="true"
                                        />
                                    </>
                                )}
                            </div>

                            {/* Loading indicator for infinite scroll - with no bottom margin */}
                            {(loadingMore || (isSearching && searchOffset > 0)) && (
                                <div className="flex justify-center pt-2 pb-0">
                                    <Loader2 className="h-6 w-6 animate-spin text-black" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default MediaInputPanel