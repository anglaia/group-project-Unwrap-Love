import axios from 'axios';

// API key from your query
const API_KEY = '3KRPEEEX9QT5MpubZQrdupE8CZN7N6rcxCCmwyjvl0WudSSgaf7CzVAT';

// Define the image structure
export interface PexelsImage {
    id: number;
    width: number;
    height: number;
    url: string;
    photographer: string;
    photographer_url: string;
    photographer_id: number;
    avg_color: string;
    src: {
        original: string;
        large2x: string;
        large: string;
        medium: string;
        small: string;
        portrait: string;
        landscape: string;
        tiny: string;
    };
    liked: boolean;
    alt: string;
}

export interface SearchResult {
    total_results: number;
    page: number;
    per_page: number;
    photos: PexelsImage[];
    next_page: string;
}

// Create API instance with auth headers
const pexelsClient = axios.create({
    baseURL: 'https://api.pexels.com/v1',
    headers: {
        Authorization: API_KEY
    }
});

// Search for images
export const searchImages = async (query: string, page: number = 1, perPage: number = 20): Promise<SearchResult> => {
    try {
        const response = await pexelsClient.get('/search', {
            params: {
                query,
                page,
                per_page: perPage
            }
        });
        return response.data as SearchResult;
    } catch (error) {
        console.error('Error searching Pexels images:', error);
        throw error;
    }
};

// Get curated images
export const getCuratedImages = async (page: number = 1, perPage: number = 20): Promise<SearchResult> => {
    try {
        const response = await pexelsClient.get('/curated', {
            params: {
                page,
                per_page: perPage
            }
        });
        return response.data as SearchResult;
    } catch (error) {
        console.error('Error fetching curated images:', error);
        throw error;
    }
}; 