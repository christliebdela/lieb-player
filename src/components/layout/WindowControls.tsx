import React from 'react';
import { X, Minus, Square, Copy } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { usePlayerStore } from '../../store/usePlayerStore';
import { motion } from 'framer-motion';

export interface WindowControlsProps {
  showMinimize?: boolean;
  showMaximize?: boolean;
  showClose?: boolean;
  closeVariant?: 'default' | 'danger';
}

export const WindowControls: React.FC<WindowControlsProps> = ({ 
  showMinimize = true, 
  showMaximize = true, 
  showClose = true,
  closeVariant = 'default'
}) => {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = React.useState(false);
  const { showControls, isFullscreen } = usePlayerStore();
  
  // Sub-windows (Settings, Library, Info) should always show their controls
  const isMainWindow = appWindow.label === 'main';
  const forceShow = !isMainWindow || showControls;

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
  const handleClose = () => {
    console.log(`>>> [WindowControls] Closing window: ${appWindow.label}`);
    appWindow.close();
  };

  // Any of these states should show the "restore" icon
  const isExpanded = isMaximized || isFullscreen;

  return (
    <motion.div 
      initial={false}
      animate={{ 
        y: forceShow ? 0 : -20,
        opacity: forceShow ? 1 : 0,
        scale: forceShow ? 1 : 0.95
      }}
      transition={{ 
        type: "spring",
        stiffness: 500,
        damping: 35,
        mass: 0.5
      }}
      className="z-[70] pointer-events-auto p-1.5"
      data-tauri-drag-region="false"
    >
      <div className="flex items-center gap-1">
        {showMinimize && (
          <motion.button 
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={handleMinimize}
            className="p-1.5 rounded-lg transition-colors text-accent hover:text-foreground cursor-pointer group"
          >
            <Minus size={14} strokeWidth={2.5} />
          </motion.button>
        )}
        {showMaximize && (
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
        )}
        {showClose && (
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClose}
            className={`flex items-center justify-center rounded-lg transition-all cursor-pointer ${
              closeVariant === 'danger'
                ? 'h-8 w-8 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'
                : 'p-1.5 text-accent hover:text-foreground'
            }`}
          >
            <X size={closeVariant === 'danger' ? 16 : 14} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
