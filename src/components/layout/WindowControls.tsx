import React from 'react';
import { X, Minus, Square, Copy } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { usePlayerStore } from '../../store/usePlayerStore';
import { motion } from 'framer-motion';

export const WindowControls: React.FC = () => {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = React.useState(false);
  const { showControls } = usePlayerStore();

  React.useEffect(() => {
    const checkMaximized = async () => {
      setIsMaximized(await appWindow.isMaximized());
    };
    
    checkMaximized();
    
    // Listen for resize events to update the state
    const unlisten = appWindow.onResized(() => {
      checkMaximized();
    });

    return () => {
      unlisten.then(u => {
        if (typeof u === 'function') u();
      }).catch(() => {});
    };
  }, [appWindow]);

  const handleMinimize = () => appWindow.minimize();
  const handleToggleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <motion.div 
      initial={false}
      animate={{ 
        y: showControls ? 0 : -20,
        opacity: showControls ? 0.9 : 0,
        scale: showControls ? 1 : 0.95
      }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20,
        mass: 0.5
      }}
      className="flex items-center gap-1 z-50 pointer-events-auto hover:opacity-100 transition-opacity"
    >
      <div className="flex gap-0.5 p-1">
        <button 
          onClick={handleMinimize}
          className="p-1.5 rounded-lg transition-all text-foreground/80 hover:text-foreground hover:bg-white/10 cursor-pointer"
        >
          <Minus size={14} strokeWidth={2.5} />
        </button>
        <button 
          onClick={handleToggleMaximize}
          className="p-1.5 rounded-lg transition-all text-foreground/80 hover:text-foreground hover:bg-white/10 cursor-pointer"
        >
          {isMaximized ? <Copy size={13} strokeWidth={2.5} /> : <Square size={13} strokeWidth={2.5} />}
        </button>
        <button 
          onClick={handleClose}
          className="p-1.5 rounded-lg transition-all text-foreground/80 hover:text-white hover:bg-red-500 cursor-pointer"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
};
