"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User
} from "firebase/auth";
import { initializeApp } from "firebase/app";

// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyC2WW42FCAViCtcm2L-vgJ2vozZv25MjRY",
    authDomain: "device-streaming-11b8c8eb.firebaseapp.com",
    projectId: "device-streaming-11b8c8eb",
    storageBucket: "device-streaming-11b8c8eb.firebasestorage.app",
    messagingSenderId: "603981178262",
    appId: "1:603981178262:web:03b1b79eccd64e5211e9b7"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 配置Google登录提供者
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

type AuthContextType = {
    user: User | null;
    isLoaded: boolean;
    isSignedIn: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoaded(true);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error: any) {
            // 静默处理用户取消登录的错误
            if (error.code !== 'auth/cancelled-popup-request' &&
                error.code !== 'auth/popup-closed-by-user') {
                console.error("Google sign-in failed:", error);
                throw error;
            }
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    const value = {
        user,
        isLoaded,
        isSignedIn: !!user,
        signInWithGoogle,
        signOut
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
} 