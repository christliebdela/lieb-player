import React from 'react';
import { X, Minus, Square, Copy } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { usePlayerStore } from '../../store/usePlayerStore';
import { motion } from 'framer-motion';

export const WindowControls: React.FC = () => {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = React.useState(false);
  const { showControls, isFullscreen } = usePlayerStore();

    const unlistenRef = React.useRef<(() => void) | null>(null);
    
    React.useEffect(() => {
      const checkMaximized = async () => {
        try {
          setIsMaximized(await appWindow.isMaximized());
        } catch (e) {
          window.console.error('>>> [WindowControls] Error checking maximize state:', e);
        }
      };
      
      checkMaximized();
      
      const setupListener = async () => {
        const unlisten = await appWindow.onResized(() => {
          checkMaximized();
        });
        unlistenRef.current = unlisten;
      };

      setupListener();

      return () => {
        if (unlistenRef.current) unlistenRef.current();
      };
    }, [appWindow]);

  const handleMinimize = () => appWindow.minimize();
  const handleToggleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  // Any of these states should show the "restore" icon
  const isExpanded = isMaximized || isFullscreen;

  return (
    <motion.div 
      initial={false}
      animate={{ 
        y: showControls ? 0 : -20,
        opacity: showControls ? 1 : 0,
        scale: showControls ? 1 : 0.95
      }}
      transition={{ 
        type: "spring",
        stiffness: 500,
        damping: 35,
        mass: 0.5
      }}
      className="z-50 pointer-events-auto p-1.5"
    >
      <div className="flex items-center gap-1">
        <motion.button 
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          onClick={handleMinimize}
          className="p-1.5 rounded-lg transition-colors text-accent hover:text-foreground cursor-pointer group"
        >
          <Minus size={14} strokeWidth={2.5} />
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          onClick={handleToggleMaximize}
          className="p-1.5 rounded-lg transition-colors text-accent hover:text-foreground cursor-pointer group"
        >
          {isExpanded ? (
            <Copy size={13} strokeWidth={2.5} />
          ) : (
            <Square size={13} strokeWidth={2.5} />
          )}
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          onClick={handleClose}
          className="p-1.5 rounded-lg transition-colors text-accent hover:text-foreground cursor-pointer group"
        >
          <X size={14} strokeWidth={2.5} />
        </motion.button>
      </div>
    </motion.div>
  );
};
