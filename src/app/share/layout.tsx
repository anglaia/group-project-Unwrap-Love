import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Share",
    description: "Where Every Click is a Hug",
    openGraph: {
        title: "Share Your Unwrap Love Creation",
        description: "Where Every Click is a Hug",
        images: [
            {
                url: "/images/landing-page.png",
                width: 1200,
                height: 630,
                alt: "Unwrap Love - Share Your Story"
            }
        ],
        type: "website"
    },
    twitter: {
        card: "summary_large_image",
        title: "Share Your Unwrap Love Creation",
        description: "Where Every Click is a Hug",
        images: ["/images/landing-page.png"]
    }
}

export default function ShareLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <>
            {children}
        </>
    )
} 