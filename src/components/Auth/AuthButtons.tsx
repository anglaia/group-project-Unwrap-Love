"use client";

import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import UserProfileCard from "./UserProfileCard";

// 保留定义但不导出
function SignInButton({ className = "" }: { className?: string }) {
    const { signInWithGoogle } = useAuth();

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            // 错误已在AuthContext中处理
        }
    };

    return (
        <button
            onClick={handleGoogleSignIn}
            className={`text-white font-medium hover:text-white/80 transition-colors ${className}`}
        >
            Sign in
        </button>
    );
}

export function SignUpButton({ className = "" }: { className?: string }) {
    const { signInWithGoogle } = useAuth();

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            // 错误已在AuthContext中处理
        }
    };

    return (
        <div className={`relative rounded-full p-[2px] bg-gradient-to-b from-white/30 via-gray-400/20 to-gray-800/40 ${className}`}>
            <button
                onClick={handleGoogleSignIn}
                className="w-full px-8 py-3 text-white font-medium bg-gradient-to-b from-gray-600/30 to-gray-800/40 backdrop-blur-md rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:brightness-105 transition-all duration-200"
            >
                Sign in
            </button>
        </div>
    );
}

export function UserButton({ afterSignOutUrl = "/" }: { afterSignOutUrl?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();

    if (!user) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-white hover:border-blue-200 transition-colors"
            >
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <span className="text-blue-500 font-medium">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 z-50">
                        <UserProfileCard />
                    </div>
                </>
            )}
        </div>
    );
}

export function SignOutButton() {
    const { signOut } = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Sign out failed:", error);
        }
    };

    return (
        <div className="relative rounded-full p-[2px] bg-transparent">
            <div className="w-full px-8 py-3 text-white bg-transparent backdrop-blur-0 rounded-full">
                <span
                    onClick={handleSignOut}
                    className="font-medium cursor-pointer hover:text-white/80 transition-colors"
                >
                    Sign out
                </span>
            </div>
        </div>
    );
} 