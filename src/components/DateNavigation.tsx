import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import * as socketService from "../services/socketService";

interface DateNavigationProps {
    onDateChange: (date: string) => void;
    currentDate: string;
}

const DateNavigation: React.FC<DateNavigationProps> = ({ onDateChange, currentDate }) => {
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    // 获取可用日期列表
    useEffect(() => {
        // 监听历史日期列表响应
        const handleHistoryDates = (response: {
            success: boolean;
            dates: string[];
            error?: string;
        }) => {
            setLoading(false);
            if (response.success) {
                setAvailableDates(response.dates);
            } else {
                console.error('获取历史日期失败:', response.error);
            }
        };

        // 注册事件监听
        socketService.onEvent('history-dates', handleHistoryDates);

        // 请求日期列表
        setLoading(true);
        socketService.getHistoryDates();

        // 组件卸载时取消监听
        return () => {
            socketService.offEvent('history-dates', handleHistoryDates);
        };
    }, []);

    // 格式化日期为友好显示
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        // 如果日期无效，返回原字符串
        if (isNaN(date.getTime())) return dateStr;

        // 使用本地化格式
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    };

    // 获取今天的日期字符串
    const getTodayString = (): string => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // 判断给定日期是否为今天
    const isToday = (dateStr: string): boolean => {
        return dateStr === getTodayString();
    };

    // 切换到前一个可用日期
    const goToPreviousDate = () => {
        const currentIndex = availableDates.indexOf(currentDate);
        if (currentIndex < availableDates.length - 1) {
            onDateChange(availableDates[currentIndex + 1]);
        }
    };

    // 切换到后一个可用日期
    const goToNextDate = () => {
        const currentIndex = availableDates.indexOf(currentDate);
        if (currentIndex > 0) {
            onDateChange(availableDates[currentIndex - 1]);
        }
    };

    // 是否有前一天
    const hasPreviousDate = (): boolean => {
        const currentIndex = availableDates.indexOf(currentDate);
        return currentIndex < availableDates.length - 1;
    };

    // 是否有后一天
    const hasNextDate = (): boolean => {
        const currentIndex = availableDates.indexOf(currentDate);
        return currentIndex > 0;
    };

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-md shadow-md px-4 py-2">
            <button
                onClick={goToPreviousDate}
                disabled={!hasPreviousDate()}
                className={`p-1 rounded-full ${hasPreviousDate() ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
                title="前一天"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="relative">
                <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
                >
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className={`text-sm font-medium ${loading ? 'text-gray-400' : 'text-gray-800'}`}>
                        {loading ? '加载中...' : isToday(currentDate) ? '今天' : formatDate(currentDate)}
                    </span>
                </button>

                {showDatePicker && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-md shadow-lg z-10 w-64">
                        <div className="max-h-40 overflow-y-auto">
                            {availableDates.length > 0 ? (
                                <div className="space-y-1">
                                    {availableDates.map((date) => (
                                        <button
                                            key={date}
                                            onClick={() => {
                                                onDateChange(date);
                                                setShowDatePicker(false);
                                            }}
                                            className={`w-full text-left px-2 py-1 rounded text-sm ${date === currentDate
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'hover:bg-gray-100'
                                                }`}
                                        >
                                            {isToday(date) ? '今天' : formatDate(date)}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm py-2 text-center">
                                    {loading ? '加载中...' : '没有可用的历史记录'}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={goToNextDate}
                disabled={!hasNextDate()}
                className={`p-1 rounded-full ${hasNextDate() ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
                title="后一天"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
};

export default DateNavigation; 