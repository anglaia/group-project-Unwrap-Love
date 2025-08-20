import React from "react"
import { motion, AnimatePresence } from "framer-motion"

// 创建全局状态管理，用于跟踪是否有菜单打开
const ContextMenuState = {
    anyMenuOpen: false,
    setAnyMenuOpen: (value: boolean) => {
        ContextMenuState.anyMenuOpen = value;
    }
};

interface ContextMenuProps {
    visible: boolean
    position: { x: number; y: number }
    onClose: () => void
    children: React.ReactNode
    /**
     * Allows customizing the z-index of the context menu
     * @default 10000
     */
    zIndex?: number
}

const menuVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30
        }
    },
    exit: {
        opacity: 0,
        scale: 0.8,
        transition: {
            duration: 0.15
        }
    }
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    visible,
    position,
    onClose,
    children,
    zIndex = 10000
}) => {
    // 创建菜单元素的引用
    const menuRef = React.useRef<HTMLDivElement>(null)

    // 当菜单可见状态变化时，更新全局状态
    React.useEffect(() => {
        if (visible) {
            ContextMenuState.setAnyMenuOpen(true);
        } else if (ContextMenuState.anyMenuOpen) {
            // 只有在该菜单关闭并且当前全局状态是打开的情况下才设置为false
            // 因为可能同时有多个菜单实例
            const stillHasOpenMenus = document.querySelectorAll('[data-context-menu="true"]').length > 1;
            if (!stillHasOpenMenus) {
                ContextMenuState.setAnyMenuOpen(false);
            }
        }

        return () => {
            // 组件卸载时，如果没有其他菜单，则设置全局状态为关闭
            if (visible) {
                const stillHasOpenMenus = document.querySelectorAll('[data-context-menu="true"]').length > 1;
                if (!stillHasOpenMenus) {
                    ContextMenuState.setAnyMenuOpen(false);
                }
            }
        };
    }, [visible]);

    React.useEffect(() => {
        if (!visible) return

        // 改进的点击事件处理函数 - 使用捕获阶段和冒泡阶段都监听
        const handleClick = (e: MouseEvent) => {
            // 在捕获阶段捕捉到事件，判断是否点击在菜单外部
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                e.stopPropagation();
                onClose();
            }
        }

        const handleContextMenu = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        }

        // 使用捕获阶段 (true) 确保我们能捕获到所有点击事件
        document.addEventListener("click", handleClick, true);
        document.addEventListener("contextmenu", handleContextMenu);
        // 同时也在冒泡阶段监听，以防有些事件被阻止冒泡
        document.addEventListener("mousedown", handleClick);

        return () => {
            document.removeEventListener("click", handleClick, true);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("mousedown", handleClick);
        }
    }, [visible, onClose])

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    ref={menuRef}
                    data-context-menu="true"
                    className="fixed rounded-md border-2 border-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.10)] bg-white/85 backdrop-blur-md p-2 min-w-[180px]"
                    style={{ left: position.x, top: position.y, zIndex }}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={menuVariants}
                    onClick={e => e.stopPropagation()}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// 导出全局状态管理，用于其他组件检查是否有菜单打开
export const getContextMenuState = () => {
    return {
        anyMenuOpen: ContextMenuState.anyMenuOpen
    };
};

export default ContextMenu 