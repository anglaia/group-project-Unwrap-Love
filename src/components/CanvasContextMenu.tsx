import React, { useEffect } from "react";
import ContextMenu from "./ContextMenu";

interface CanvasContextMenuProps {
    visible: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
    visible,
    position,
    onClose,
    onUndo,
    onRedo,
    canUndo,
    canRedo
}) => {
    const handleUndo = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUndo();
        onClose();
    };

    const handleRedo = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRedo();
        onClose();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            console.log('Key pressed:', e.key, 'Meta:', e.metaKey, 'Shift:', e.shiftKey);

            // macOS用户使用Command+Z
            if (e.metaKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                // 无论是否可以撤销，都阻止浏览器默认行为
                e.preventDefault();

                // 只有在可以撤销的情况下执行撤销操作
                if (canUndo) {
                    onUndo();
                    console.log('Executing undo');
                } else {
                    console.log('Cannot undo - at beginning of history');
                }
            }

            // macOS用户使用Command+Shift+Z
            if (e.metaKey && e.key.toLowerCase() === 'z' && e.shiftKey) {
                // 无论是否可以重做，都阻止浏览器默认行为
                e.preventDefault();

                // 只有在可以重做的情况下执行重做操作
                if (canRedo) {
                    onRedo();
                    console.log('Executing redo');
                } else {
                    console.log('Cannot redo - at end of history');
                }
            }

            // Windows用户使用Ctrl+Z
            if (e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();

                if (canUndo) {
                    onUndo();
                    console.log('Executing undo (Windows)');
                }
            }

            // Windows用户使用Ctrl+Y或Ctrl+Shift+Z
            if ((e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'y') ||
                (e.ctrlKey && !e.metaKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
                e.preventDefault();

                if (canRedo) {
                    onRedo();
                    console.log('Executing redo (Windows)');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onUndo, onRedo, canUndo, canRedo]);

    return (
        <ContextMenu
            visible={visible}
            position={position}
            onClose={onClose}
        >
            <div
                className={`px-2 py-1 hover:bg-black/5 rounded cursor-pointer flex items-center justify-between text-xs min-w-[120px] ${!canUndo ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={canUndo ? handleUndo : undefined}
            >
                <span className="text-left flex-1">Undo</span>
                <span className="text-[10px] ml-2 text-gray-500">⌘Z</span>
            </div>
            <div
                className={`px-2 py-1 hover:bg-black/5 rounded cursor-pointer flex items-center justify-between text-xs min-w-[120px] ${!canRedo ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={canRedo ? handleRedo : undefined}
            >
                <span className="text-left flex-1">Redo</span>
                <span className="text-[10px] ml-2 text-gray-500">⌘⇧Z</span>
            </div>
        </ContextMenu>
    );
};

export default CanvasContextMenu; 