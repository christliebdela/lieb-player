import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { 
  Subtitles, Maximize, PictureInPicture2, 
  RotateCcw, RotateCw, Repeat, Repeat1, Play, Pause
} from 'lucide-react';

const getIcon = (iconName: string) => {
  const size = 16;
  switch (iconName) {
    case 'subtitles': return <Subtitles size={size} strokeWidth={2} />;
    case 'maximize': return <Maximize size={size} strokeWidth={2} />;
    case 'pip': return <PictureInPicture2 size={size} strokeWidth={2} />;
    case 'rewind': return <RotateCcw size={size} strokeWidth={2} />;
    case 'forward': return <RotateCw size={size} strokeWidth={2} />;
    case 'repeat': return <Repeat size={size} strokeWidth={2} />;
    case 'repeat-1': return <Repeat1 size={size} strokeWidth={2} />;
    case 'play': return <Play size={size} strokeWidth={2} fill="currentColor" />;
    case 'pause': return <Pause size={size} strokeWidth={2} fill="currentColor" />;
    default: return <Play size={size} strokeWidth={2} />;
  }
};

export const ActionOSD: React.FC = () => {
  const { actionOSD } = usePlayerStore();

  return (
    <AnimatePresence>
      {actionOSD && (
        <motion.div
          key={actionOSD.message}
          initial={{ opacity: 0, scale: 0.7, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ 
            type: 'spring', 
            damping: 18, 
            stiffness: 350, 
            mass: 0.8 
          }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none flex items-center gap-2.5 bg-black/50 backdrop-blur-3xl px-4 py-2 rounded-full border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
        >
          <div className="text-accent drop-shadow-md">
            {getIcon(actionOSD.icon)}
          </div>
          <span className="text-white/90 text-[11px] font-semibold tracking-widest uppercase mt-[1px]">
            {actionOSD.message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
