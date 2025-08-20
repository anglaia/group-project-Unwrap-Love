/** @type {import('next').NextConfig} */
const nextConfig = {
    devIndicators: false,
    experimental: {
        forceSwcTransforms: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '5001',
                pathname: '/upload/**',
            },
            {
                protocol: 'https',
                hostname: 'unwraplove-production.up.railway.app',
                pathname: '/upload/**',
            },
            {
                protocol: 'https',
                hostname: 'i.scdn.co',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.spotifycdn.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'media.giphy.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i.giphy.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'giphy.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'loremflickr.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
                pathname: '/**',
            },
        ],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 1024],
    },
    async headers() {
        return [
            {
                source: '/images/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/upload/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET' },
                ],
            },
        ];
    },
    serverRuntimeConfig: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    }
};

module.exports = nextConfig;