import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Paper",
}

export default function PaperLayout({
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