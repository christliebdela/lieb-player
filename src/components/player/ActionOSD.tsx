import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { 
  Subtitles, Maximize, PictureInPicture2, 
  Rewind, FastForward, Repeat, Repeat1, Play, Pause, Camera, Trash2
} from 'lucide-react';

const getIcon = (iconName: string) => {
  const size = 14;
  switch (iconName) {
    case 'subtitles': return <Subtitles size={size} strokeWidth={2.5} />;
    case 'maximize': return <Maximize size={size} strokeWidth={2.5} />;
    case 'pip': return <PictureInPicture2 size={size} strokeWidth={2.5} />;
    case 'rewind': return <Rewind size={size} strokeWidth={2.5} />;
    case 'forward': return <FastForward size={size} strokeWidth={2.5} />;
    case 'repeat': return <Repeat size={size} strokeWidth={2.5} />;
    case 'repeat-1': return <Repeat1 size={size} strokeWidth={2.5} />;
    case 'play': return <Play size={size} strokeWidth={2.5} fill="currentColor" />;
    case 'pause': return <Pause size={size} strokeWidth={2.5} fill="currentColor" />;
    case 'camera': return <Camera size={size} strokeWidth={2.5} />;
    case 'trash': return <Trash2 size={size} strokeWidth={2.5} />;
    default: return <Play size={size} strokeWidth={2.5} />;
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
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none flex items-center gap-2 bg-black/60 backdrop-blur-3xl px-3 py-1.5 rounded-full border border-white/10 shadow-[0_4px_20px_rgb(0,0,0,0.5)]"
        >
          <div className="text-accent drop-shadow-md flex items-center justify-center">
            {getIcon(actionOSD.icon)}
          </div>
          <span className="text-white/90 text-[9px] font-bold tracking-[0.2em] uppercase mt-[0.5px]">
            {actionOSD.message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
