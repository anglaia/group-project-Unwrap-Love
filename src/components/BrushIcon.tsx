"use client"

import type React from "react"
import Image from "next/image"
import { useEffect } from "react"

interface BrushIconProps {
    onClick: () => void
}

export const BrushIcon: React.FC<BrushIconProps> = ({ onClick }) => {
    // Preload image
    useEffect(() => {
        const preloadImages = async () => {
            const src = '/images/brush.png'
            const imgElement = document.createElement('img')
            imgElement.src = src
        }
        preloadImages()
    }, [])

    return (
        <div className="group z-10 transform translate-y-6 transition-all duration-300 ease-in-out drop-shadow-lg hover:drop-shadow-2xl hover:-translate-y-1 hover:scale-105 hover:rotate-6">
            <div className="relative flex flex-col items-center transition-all duration-300 ease-in-out group-hover:-translate-y-2 group-hover:rotate-6">
                <Image
                    src="/images/brush.png"
                    alt="Brush"
                    width={120}
                    height={1000}
                    className="object-contain"
                    priority
                />
            </div>
            <button
                onClick={onClick}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Use brush"
            ></button>
        </div>
    )
}

export default BrushIcon 