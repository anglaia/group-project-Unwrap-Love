"use client"

export default function NotFound() {
    return (
        <div
            className="min-h-screen bg-[#F8F8F7] flex items-center justify-center"
            style={{
                backgroundImage: 'radial-gradient(circle, rgba(0, 0, 0, 0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
            }}
        >
            <div className="text-center">
                <p className="text-3xl font-bold text-gray-700 mb-6">Page Not Found</p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                    Back to Home
                </button>
            </div>
        </div>
    )
} 