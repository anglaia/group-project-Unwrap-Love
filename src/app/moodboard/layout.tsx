import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Moodboard",
}

export default function MoodboardLayout({
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