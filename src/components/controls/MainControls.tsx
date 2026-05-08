import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Maximize, Minimize, Settings, Library, Subtitles,
  RotateCcw, RotateCw, Repeat, Repeat1, PictureInPicture2
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { motion } from 'framer-motion';
import { getCurrentWindow, PhysicalSize, PhysicalPosition, currentMonitor } from '@tauri-apps/api/window';
import { command, setProperty } from 'tauri-plugin-mpv-api';

export const MainControls: React.FC = () => {
  const { 
    isPlaying,
    volume,
    currentTime, duration, 
    isMuted,
    isFullscreen, setFullscreen,
    showControls,
    loopMode, setLoopMode,
    playlist,
    scrollMode,
    aspectRatio
  } = usePlayerStore();

  const appWindow = getCurrentWindow();
  const hasMedia = duration > 0;
  const hasPlaylist = playlist.length > 1;
  const [isSeeking, setIsSeeking] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = async () => {
    try {
      const next = !isFullscreen;
      await appWindow.setFullscreen(next);
      setFullscreen(next);
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const seekFromEvent = async (e: React.PointerEvent | PointerEvent) => {
    if (!progressRef.current || !hasMedia) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    await command('seek', [progress * duration, 'absolute']);
  };

  const handlePointerDown = async (e: React.PointerEvent) => {
    setIsSeeking(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    await seekFromEvent(e);
  };

  const handlePointerMove = async (e: React.PointerEvent) => {
    if (!isSeeking) return;
    await seekFromEvent(e);
  };

  const handlePointerUp = () => {
    setIsSeeking(false);
  };

  const handleWheel = async (e: React.WheelEvent) => {
    if (!hasMedia) return;
    
    if (scrollMode === 'volume') {
      const delta = e.deltaY < 0 ? 5 : -5;
      const newVol = Math.max(0, Math.min(100, volume + delta));
      await setProperty('volume', newVol);
    } else {
      const delta = e.deltaY < 0 ? 5 : -5;
      await command('seek', [delta, 'relative']);
    }
  };

  const handleLoopCycle = async () => {
    if (loopMode === 'off') {
      setLoopMode('one');
      await setProperty('loop-file' as any, 'inf');
      await setProperty('loop-playlist' as any, 'no');
    } else if (loopMode === 'one') {
      setLoopMode('all');
      await setProperty('loop-file' as any, 'no');
      await setProperty('loop-playlist' as any, 'inf');
    } else {
      setLoopMode('off');
      await setProperty('loop-file' as any, 'no');
      await setProperty('loop-playlist' as any, 'no');
    }
  };

  const openWindow = async (label: string, title: string, width: number, height: number) => {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const existing = await WebviewWindow.getByLabel(label);
      if (existing) {
        await existing.setFocus();
        return;
      }

      const mainWin = getCurrentWindow();
      const outerSize = await mainWin.outerSize();
      const outerPos = await mainWin.outerPosition();
      const scaleFactor = await mainWin.scaleFactor();

      // Calculate center position in logical pixels
      const centerX = (outerPos.x + (outerSize.width / 2)) / scaleFactor - (width / 2);
      const centerY = (outerPos.y + (outerSize.height / 2)) / scaleFactor - (height / 2);

      new WebviewWindow(label, {
        url: '/',
        title,
        width,
        height,
        x: centerX,
        y: centerY,
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
      });
    } catch (err) {
      console.error(`Failed to open ${label} window:`, err);
    }
  };


  const [winWidth, setWinWidth] = useState(1000);

  useEffect(() => {
    const updateWidth = async () => {
      const size = await appWindow.innerSize();
      const scaleFactor = await appWindow.scaleFactor();
      setWinWidth(size.width / scaleFactor);
    };
    updateWidth();
    const unlisten = appWindow.onResized(updateWidth);
    return () => { unlisten.then(f => f?.()); };
  }, []);

  const isSmall = winWidth < 650;
  const isTiny = winWidth < 450;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 10 }}
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      onWheel={handleWheel}
    >
      <div className="w-full pointer-events-auto relative bg-black/40 backdrop-blur-3xl border-t border-white/5 shadow-[0_-15px_40px_rgba(0,0,0,0.5)]">
        <div 
          ref={progressRef}
          className={`absolute top-0 left-4 right-4 h-1 z-20 group -translate-y-[1px] ${hasMedia ? 'cursor-pointer' : 'cursor-default opacity-0 pointer-events-none'}`}
        >
          <div className="w-full h-full bg-white/10 relative overflow-visible group-hover:h-[4px] transition-all rounded-full">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.6)] rounded-full"
              style={{ width: `${hasMedia ? (currentTime / duration) * 100 : 0}%` }}
            />
            <motion.div 
              className="absolute w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-2 border-accent top-1/2 -translate-y-1/2"
              style={{ left: `${(currentTime / duration) * 100}%`, x: '-50%' }}
            />
          </div>
          <div 
            className="absolute -top-2 left-0 right-0 h-6 z-10"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>

        <div className="px-4 py-5 flex items-center justify-between">
          <div className={`flex items-center ${isSmall ? 'gap-3' : 'gap-6'}`}>
            <button 
              disabled={!hasMedia}
              onClick={async () => {
                if (duration > 0 && currentTime >= duration - 0.2) {
                  await command('seek', [0, 'absolute']);
                }
                await command('cycle', ['pause']);
              }}
              className={`transition-all duration-300 transform active:scale-95 cursor-pointer group ${hasMedia ? 'text-black dark:text-white hover:text-accent drop-shadow-md' : 'text-white/30 cursor-default'}`}
            >
              <div className="group-hover:scale-110 transition-transform flex items-center justify-center">
                {isPlaying ? (
                  <Pause size={isSmall ? 20 : 24} strokeWidth={1.5} fill="currentColor" />
                ) : (
                  <Play size={isSmall ? 20 : 24} strokeWidth={1.5} fill="currentColor" className="ml-0.5" />
                )}
              </div>
            </button>

            {hasPlaylist && (
              <div className={`flex items-center ${isSmall ? 'gap-2' : 'gap-4'}`}>
                <button 
                  onClick={() => command('playlist_prev')}
                  className="text-white/30 hover:text-accent transition-all cursor-pointer group/btn"
                  title="Previous (P)"
                >
                  <SkipBack size={18} className="group-hover/btn:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={() => command('playlist_next')}
                  className="text-white/30 hover:text-accent transition-all cursor-pointer group/btn"
                  title="Next (N)"
                >
                  <SkipForward size={18} className="group-hover/btn:scale-110 transition-transform" />
                </button>
              </div>
            )}
            
            <div className={`flex items-center ${isSmall ? 'gap-3' : 'gap-6'} ${!hasMedia ? 'opacity-20 pointer-events-none' : ''}`}>
              <button 
                onClick={() => command('seek', [-10, 'relative'])}
                className="text-white/30 hover:text-accent transition-all cursor-pointer relative group/btn"
              >
                <RotateCcw size={isSmall ? 18 : 22} className="group-hover/btn:scale-110 transition-transform" />
                <span className={`absolute inset-0 flex items-center justify-center font-black mt-0.5 ml-[-1px] ${isSmall ? 'text-[5px]' : 'text-[7px]'}`}>10</span>
              </button>

              <button 
                onClick={() => command('seek', [10, 'relative'])}
                className="text-white/30 hover:text-accent transition-all cursor-pointer relative group/btn"
              >
                <RotateCw size={isSmall ? 18 : 22} className="group-hover/btn:scale-110 transition-transform" />
                <span className={`absolute inset-0 flex items-center justify-center font-black mt-0.5 mr-[-1px] ${isSmall ? 'text-[5px]' : 'text-[7px]'}`}>10</span>
              </button>
            </div>

            {!isSmall && <div className="h-5 w-[1px] bg-white/10 mx-1" />}

            <div className={`flex items-center ${isSmall ? 'gap-2' : 'gap-4'} group/volume relative ${!hasMedia ? 'opacity-20 pointer-events-none' : ''}`}>
              <button 
                onClick={() => setProperty('mute', !isMuted)}
                className="text-white/30 hover:text-accent transition-all cursor-pointer group"
              >
                <div className="group-hover:scale-110 transition-transform">
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </div>
              </button>
              {!isTiny && (
                <div className={`${isSmall ? 'w-16' : 'w-24'} h-[3px] bg-white/10 rounded-full relative group-hover/volume:bg-white/10 transition-all`}>
                  <div 
                    className="absolute top-0 left-0 h-full bg-white/10 rounded-full"
                    style={{ width: `${isMuted ? 0 : volume}%` }}
                  />
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setProperty('volume', Number(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-pointer appearance-none"
                  />
                </div>
              )}
            </div>

            {!isTiny && (
              <div className="text-[10px] font-bold font-mono text-white/30 tracking-widest pl-1">
                {hasMedia ? `${formatTime(currentTime)} / ${formatTime(duration)}` : '0:00 / 0:00'}
              </div>
            )}
          </div>

          <div className={`flex items-center ${isSmall ? 'gap-3' : 'gap-6'}`}>
            {!isSmall && (
              <>
                <button 
                  disabled={!hasMedia}
                  onClick={handleLoopCycle}
                  className={`transition-all cursor-pointer relative group ${
                    loopMode !== 'off' ? 'text-accent' : hasMedia ? 'text-white/30 hover:text-accent' : 'text-white/30 cursor-default'
                  }`}
                  title={`Loop: ${loopMode}`}
                >
                  <div className="group-hover:scale-110 transition-transform">
                    {loopMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                  </div>
                </button>
                
                <button 
                  onClick={() => openWindow('library', 'Library', 800, 560)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-accent transition-all cursor-pointer group"
                  title="Library (L)"
                >
                  <Library size={18} className="group-hover:scale-110 transition-transform" />
                </button>

                <button 
                  disabled={!hasMedia}
                  className={`transition-all cursor-pointer group ${hasMedia ? 'text-white/30 hover:text-accent' : 'text-white/30 cursor-default'}`}
                  title="Subtitles"
                >
                  <Subtitles size={18} className="group-hover:scale-110 transition-transform" />
                </button>
              </>
            )}
            
            <button 
              onClick={() => openWindow('settings', 'Settings', 800, 560)}
              className="text-white/30 hover:text-accent transition-all cursor-pointer group"
              title="Settings (S)"
            >
              <Settings size={18} className="group-hover:scale-110 group-hover:rotate-45 transition-all duration-300" />
            </button>

            <button 
              onClick={async () => {
                const next = !isPinned;
                await appWindow.setAlwaysOnTop(next);
                setIsPinned(next);

                if (next) {
                  try {
                    const monitor = await currentMonitor();
                    if (monitor) {
                      const scaleFactor = await appWindow.scaleFactor();
                      const targetW = Math.round((monitor.size.width / scaleFactor) * 0.3);
                      const targetH = Math.round(targetW / aspectRatio);
                      await appWindow.setSize(new PhysicalSize(Math.round(targetW * scaleFactor), Math.round(targetH * scaleFactor)));
                      await new Promise(r => setTimeout(r, 100));
                      const posX = monitor.size.width - Math.round(targetW * scaleFactor) - Math.round(20 * scaleFactor);
                      const posY = Math.round(20 * scaleFactor);
                      await appWindow.setPosition(new PhysicalPosition(posX, posY));
                    }
                  } catch (err) {
                    console.error(' Lieb Player: Failed to snap window:', err);
                  }
                }
              }}
              className={`transition-all cursor-pointer group ${isPinned ? 'text-accent scale-110' : 'text-white/30 hover:text-accent'}`}
              title={isPinned ? 'Unpin (Always on Top)' : 'Pin (Always on Top)'}
            >
              <div className="group-hover:scale-110 transition-transform">
                <PictureInPicture2 size={18} strokeWidth={1.5} />
              </div>
            </button>

            <button 
              onClick={handleFullscreen}
              className={`transition-all cursor-pointer group ${isFullscreen ? 'text-accent' : 'text-white/30 hover:text-accent'}`}
            >
              <div className="group-hover:scale-110 transition-transform">
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
