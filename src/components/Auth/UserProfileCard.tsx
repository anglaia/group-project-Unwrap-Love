"use client";

import { useAuth } from "@/context/AuthContext";
import { UserIcon, LogOut } from "lucide-react";
import Link from "next/link";

export default function UserProfileCard() {
    const { user, signOut } = useAuth();

    if (!user) {
        return null;
    }

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Sign out failed:", error);
        }
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-4 w-full max-w-xs">
            <div className="flex items-center mb-4">
                <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden mr-4">
                    {user.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <UserIcon className="h-8 w-8 text-blue-500" />
                    )}
                </div>
                <div>
                    <h3 className="font-medium text-gray-900">
                        {user.displayName || 'User'}
                    </h3>
                    <p className="text-sm text-gray-500 truncate max-w-[180px]">{user.email}</p>
                </div>
            </div>

            <div className="space-y-2">
                <Link
                    href="/dashboard"
                    className="block text-sm text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-md transition"
                >
                    Dashboard
                </Link>

                <Link
                    href="/paper"
                    className="block text-sm text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-md transition"
                >
                    Create Paper
                </Link>

                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-md transition"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                </button>
            </div>
        </div>
    );
} 