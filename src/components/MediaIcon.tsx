"use client"

import type React from "react"
import Image from "next/image"

interface MediaIconProps {
    onAddMedia: () => void
}

export const MediaIcon: React.FC<MediaIconProps> = ({ onAddMedia }) => {
    return (
        <div className="group z-10 transform translate-y-4 transition-all duration-300 ease-in-out hover:-translate-y-8">
            <div
                className="w-44 h-44 relative rounded-full hover:shadow-2xl cursor-pointer transition-all duration-300 ease-in-out group-hover:-translate-y-1 group-hover:scale-110"
                onClick={onAddMedia}
            >
                {/* CD image with animation */}
                <div className="absolute inset-0 rounded-full overflow-hidden animate-cd-spin">
                    <Image
                        src="/images/cd.png"
                        alt="CD"
                        width={176}
                        height={176}
                        priority={true}
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
            <style jsx>{`
                @keyframes cd-spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
                
                .animate-cd-spin {
                    animation: cd-spin 30s linear infinite;
                }
            `}</style>
        </div>
    )
}

export default MediaIcon 