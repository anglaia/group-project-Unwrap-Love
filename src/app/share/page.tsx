"use client"

import React, { useState, KeyboardEvent, useEffect, useRef, Suspense } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { CornerDownLeft, Clock, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 创建一个包含useSearchParams的组件
function SharePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const toastIdRef = useRef<string | null>(null);
    const [showTimeSelector, setShowTimeSelector] = useState(false);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const timeSelectorRef = useRef<HTMLDivElement>(null);
    const clockButtonRef = useRef<HTMLButtonElement>(null);
    const [selectedTimeValue, setSelectedTimeValue] = useState<{ value: number, unit: string } | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);

    const paperId = searchParams.get('id');
    const path = searchParams.get('path');
    // 优先使用Firebase用户名，如果没有则使用URL参数或默认值
    const usernameFromParams = searchParams.get('username');
    const username = user?.displayName || usernameFromParams || 'Your Friend';

    const isValidEmail = email.includes('@') && email.includes('.');

    useEffect(() => {
        if (!paperId || !path) {
            toast.error('Invalid share link parameters');
            setIsLoading(false);
            return;
        }

        // Build share URL
        const fullUrl = `${window.location.origin}/shared/${path}`;
        setShareUrl(fullUrl);
        setIsLoading(false);
    }, [paperId, path]);

    // Clean up toast on unmount
    useEffect(() => {
        return () => {
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
            }
        };
    }, []);

    // 点击外部关闭时间选择器
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                timeSelectorRef.current &&
                !timeSelectorRef.current.contains(event.target as Node) &&
                (!clockButtonRef.current || !clockButtonRef.current.contains(event.target as Node))
            ) {
                setShowTimeSelector(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleGoBack = () => {
        router.back();
    };

    const handleSend = async () => {
        if (isValidEmail) {
            try {
                setIsSending(true);

                // 判断是否有选择定时发送
                if (selectedTime) {
                    // 使用后端API进行定时发送
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/emails/schedule`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            shareUrl,
                            recipientEmail: email,
                            senderName: username,
                            scheduledTime: selectedTime,
                        }),
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('API error response:', errorText);
                        throw new Error(`API error: ${response.status} ${response.statusText}`);
                    }

                    const result = await response.json();

                    setEmail(''); // 清除输入
                    setSelectedTime(null); // 清除选择的时间
                    setSelectedTimeValue(null);

                    // 显示成功消息
                    // toast.success('Scheduled successfully.');

                    // Create a countdown toast for scheduled email
                    let secondsLeft = 5;

                    // Dismiss any existing toast
                    if (toastIdRef.current) {
                        toast.dismiss(toastIdRef.current);
                    }

                    // Create a new countdown toast
                    toastIdRef.current = toast.success(
                        `Scheduled. Redirect in ${secondsLeft}s.`,
                        {
                            duration: 6000 // Slightly longer than our countdown
                        }
                    );

                    // Update the toast every second
                    const countdownInterval = setInterval(() => {
                        secondsLeft -= 1;

                        if (secondsLeft <= 0) {
                            clearInterval(countdownInterval);
                            toast.dismiss(toastIdRef.current!);
                            // router.push('/'); // Redirect is handled by setTimeout below
                        } else {
                            // Update the existing success toast's content
                            toast.success(
                                `Scheduled. Redirect in ${secondsLeft}s.`,
                                {
                                    id: toastIdRef.current!
                                }
                            );
                        }
                    }, 1000);

                    // 5秒后重定向
                    setTimeout(() => {
                        router.push('/');
                        setIsRedirecting(false); // Reset after redirect
                    }, 5000);

                    setIsRedirecting(true); // Start disabling button

                } else {
                    // 使用直接发送API
                    const response = await fetch('/api/send-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            shareUrl,
                            recipientEmail: email,
                            senderName: username,
                        }),
                    });

                    // First check if the response is ok and then try to parse JSON
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('API error response:', errorText);
                        throw new Error(`API error: ${response.status} ${response.statusText}`);
                    }

                    const result = await response.json();

                    setEmail(''); // Clear the input

                    // Create a countdown toast
                    let secondsLeft = 5;

                    // Dismiss any existing toast
                    if (toastIdRef.current) {
                        toast.dismiss(toastIdRef.current);
                    }

                    // Create a new countdown toast
                    toastIdRef.current = toast.success(
                        `Sent successfully. Redirect in ${secondsLeft}s.`,
                        {
                            duration: 6000 // Slightly longer than our countdown
                        }
                    );

                    // Update the toast every second
                    const countdownInterval = setInterval(() => {
                        secondsLeft -= 1;

                        if (secondsLeft <= 0) {
                            clearInterval(countdownInterval);
                            toast.dismiss(toastIdRef.current!);
                            router.push('/');
                            setIsRedirecting(false); // Reset after redirect
                        } else {
                            // Update the existing success toast's content
                            toast.success(
                                `Sent successfully. Redirect in ${secondsLeft}s.`,
                                {
                                    id: toastIdRef.current!
                                }
                            );
                        }
                    }, 1000);

                    setIsRedirecting(true); // Start disabling button
                }
            } catch (error) {
                console.error('Error sending email:', error);
                toast.error('Something went wrong. Please try again.');
            } finally {
                setIsSending(false);
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && isValidEmail) {
            handleSend();
        }
    };

    const toggleTimeSelector = () => {
        setShowTimeSelector(!showTimeSelector);
    };

    const handleTimeSelection = (value: number, timeUnit: string) => {
        const now = new Date();
        let targetDate = new Date(now);

        if (timeUnit === 'hours') {
            targetDate.setHours(now.getHours() + value);
        } else if (timeUnit === 'minutes') {
            targetDate.setMinutes(now.getMinutes() + value);
        } else if (timeUnit === 'days') {
            targetDate.setDate(now.getDate() + value);
        }

        setSelectedTime(targetDate.toISOString());
        setSelectedTimeValue({ value, unit: timeUnit });
        setShowTimeSelector(false);
    };

    const resetTimeSelection = () => {
        setSelectedTime(null);
        setSelectedTimeValue(null);
        setShowTimeSelector(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-[#F8F8F7] p-6 flex flex-col"
            style={{
                backgroundImage: 'radial-gradient(circle, rgba(0, 0, 0, 0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
            }}
        >
            <Toaster position="top-center" />

            {/* Top navigation */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={handleGoBack}
                    className="text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isRedirecting}
                >
                    Cancel
                </button>
                <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                    Preview
                </a>
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-start justify-center pt-32">
                <div className="max-w-2xl w-full">
                    <div className="space-y-6 flex flex-col items-center">
                        {/* Animation */}
                        <div className="w-64 h-64 mb-4">
                            <DotLottieReact
                                src="https://lottie.host/1c095b10-5c2c-4385-8756-78a20c7ae976/wlSTVmSHC5.lottie"
                                loop
                                autoplay
                            />
                        </div>

                        {/* Email input */}
                        <div className="w-full relative mt-4">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button
                                    ref={clockButtonRef}
                                    onClick={toggleTimeSelector}
                                    className="focus:outline-none"
                                >
                                    <Clock
                                        size={20}
                                        className={`${selectedTime ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-200`}
                                    />
                                </button>
                            </div>

                            {/* 时间选择器弹出框 */}
                            <AnimatePresence>
                                {showTimeSelector && (
                                    <motion.div
                                        ref={timeSelectorRef}
                                        className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4 z-10 w-64"
                                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="text-sm font-medium text-gray-700">Select Time</h3>
                                                {selectedTime && (
                                                    <button
                                                        onClick={resetTimeSelection}
                                                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                                    >
                                                        <RotateCcw size={14} />
                                                        Reset
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-4 gap-2">
                                                {[5, 15, 30, 45].map(value => (
                                                    <button
                                                        key={`min-${value}`}
                                                        onClick={() => handleTimeSelection(value, 'minutes')}
                                                        className={`py-2 px-2 rounded text-sm transition-colors ${selectedTimeValue?.value === value && selectedTimeValue?.unit === 'minutes'
                                                            ? 'bg-black text-white'
                                                            : 'bg-gray-100 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {value}m
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-4 gap-2">
                                                {[1, 2, 3, 6].map(value => (
                                                    <button
                                                        key={`hour-${value}`}
                                                        onClick={() => handleTimeSelection(value, 'hours')}
                                                        className={`py-2 px-2 rounded text-sm transition-colors ${selectedTimeValue?.value === value && selectedTimeValue?.unit === 'hours'
                                                            ? 'bg-black text-white'
                                                            : 'bg-gray-100 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {value}h
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-4 gap-2">
                                                {[1, 2, 3, 7].map(value => (
                                                    <button
                                                        key={`day-${value}`}
                                                        onClick={() => handleTimeSelection(value, 'days')}
                                                        className={`py-2 px-2 rounded text-sm transition-colors ${selectedTimeValue?.value === value && selectedTimeValue?.unit === 'days'
                                                            ? 'bg-black text-white'
                                                            : 'bg-gray-100 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {value}d
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <input
                                type="email"
                                placeholder="Enter email address"
                                className="w-full px-4 py-4 pl-12 pr-24 border border-gray-300 rounded-full focus:outline-none focus:ring-0"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isSending}
                            />
                            {isValidEmail && (
                                <button
                                    className="absolute right-1 top-1/2 -translate-y-1/2 px-8 py-3.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm"
                                    style={{ marginRight: '0.075rem' }}
                                    onClick={handleSend}
                                    disabled={isSending}
                                >
                                    {isSending ? 'Sending...' : (
                                        <span className="flex items-center gap-1">
                                            Send <CornerDownLeft size={16} />
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* 显示已选择的时间 */}
                        {selectedTime && (
                            <div className="text-sm text-gray-400 mt-2">
                                Scheduled: {new Date(selectedTime).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 加载时的占位内容
function SharePageFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
        </div>
    );
}

export default function SharePage() {
    return (
        <Suspense fallback={<SharePageFallback />}>
            <SharePageContent />
        </Suspense>
    );
} 