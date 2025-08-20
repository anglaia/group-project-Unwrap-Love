import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Shared Love",
    description: "Where Every Click is a Hug",
    openGraph: {
        title: "Shared Love",
        description: "Where Every Click is a Hug",
        images: [
            {
                url: "/images/landing-page.png",
                width: 1200,
                height: 630,
                alt: "Unwrap Love - Digital Story Sharing"
            }
        ],
        type: "website"
    },
    twitter: {
        card: "summary_large_image",
        title: "Shared Love",
        description: "Where Every Click is a Hug",
        images: ["/images/landing-page.png"]
    }
}

export default function SharedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            {children}
        </>
    )
} 