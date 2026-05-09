import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Maximize, Minimize, Settings, FolderOpen, Subtitles,
  Rewind, FastForward, Repeat, Repeat1, PictureInPicture2,
  Camera, Film
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentWindow, PhysicalSize, PhysicalPosition, currentMonitor } from '@tauri-apps/api/window';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { command, setProperty } from 'tauri-plugin-mpv-api';
import { emit } from '@tauri-apps/api/event';
import { showActionOSD } from '../../utils/osd';
import { useTranslation } from '../../i18n';

const Tooltip: React.FC<{ children: React.ReactNode; content: string; align?: 'center' | 'right' }> = ({ children, content, align = 'center' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex flex-col items-center group" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={`absolute bottom-full mb-2 px-2 py-1 bg-black/90 backdrop-blur-xl border border-white/5 rounded-md shadow-2xl pointer-events-none whitespace-nowrap z-[100] flex items-center justify-center ${
              align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'
            }`}
          >
            <span className="text-[8px] font-medium uppercase tracking-[0.2em] text-accent leading-none">{content}</span>
            <div className={`absolute top-full border-4 border-transparent border-t-black/90 ${
              align === 'right' ? 'right-2' : 'left-1/2 -translate-x-1/2'
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const MainControls: React.FC = () => {
  const { 
    isPlaying,
    volume,
    currentTime, duration, 
    isMuted,
    isFullscreen, setFullscreen,
    showControls,
    loopMode, setLoopMode,
    playlist, currentTrack, setCurrentTrack,
    scrollMode,
    aspectRatio,
    subsEnabled, setSubsEnabled,
    seekInterval,
    controlBarLayout
  } = usePlayerStore();
  const { t } = useTranslation();

  const appWindow = getCurrentWindow();
  const hasMedia = duration > 0;
  const hasPlaylist = playlist.length > 1;
  const [isSeeking, setIsSeeking] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = async () => {
    try {
      const next = !isFullscreen;
      await appWindow.setFullscreen(next);
      setFullscreen(next);
      showActionOSD(next ? t('fullscreen.on') : t('fullscreen.off'), 'maximize');
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



  const handlePointerUp = () => {
    setIsSeeking(false);
  };

  const handlePointerMoveProgress = (e: React.PointerEvent) => {
    if (!progressRef.current || !hasMedia) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    setHoverTime(progress * duration);
    setHoverPos(x);
    if (isSeeking) seekFromEvent(e);
  };

  const handlePointerLeaveProgress = () => {
    setHoverTime(null);
  };

  const handleWheel = async (e: React.WheelEvent) => {
    if (!hasMedia) return;
    
    if (scrollMode === 'volume') {
      const delta = e.deltaY < 0 ? 5 : -5;
      const newVol = Math.max(0, Math.min(150, volume + delta));
      await setProperty('volume', newVol);
    } else {
      const delta = e.deltaY < 0 ? 5 : -5;
      await command('seek', [delta, 'relative']);
    }
  };

  const handleLoopCycle = async () => {
    if (loopMode === 'off') {
      setLoopMode('all');
      await setProperty('loop-file' as any, 'no');
      await setProperty('loop-playlist' as any, 'inf');
      showActionOSD(t('loop.all'), 'repeat');
    } else if (loopMode === 'all') {
      setLoopMode('one');
      await setProperty('loop-file' as any, 'inf');
      await setProperty('loop-playlist' as any, 'no');
      showActionOSD(t('loop.one'), 'repeat-1');
    } else {
      setLoopMode('off');
      await setProperty('loop-file' as any, 'no');
      await setProperty('loop-playlist' as any, 'no');
      showActionOSD(t('loop.off'), 'repeat');
    }
  };

  const openWindow = async (label: string, title: string, width: number, height: number) => {
    const { setBlocking } = usePlayerStore.getState();

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

      const win = new WebviewWindow(label, {
        url: '/',
        title,
        width,
        height,
        x: centerX,
        y: centerY,
        decorations: false,
        transparent: true,
        alwaysOnTop: false,
        parent: mainWin, 
      });

      // Show blocking overlay on main window
      setBlocking(true);

      // Re-enable when closed
      win.once('tauri://destroyed', () => {
        setBlocking(false);
        mainWin.setFocus();
      });

      win.once('tauri://error', () => {
        setBlocking(false);
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

  useEffect(() => {
    if (hoverTime === null || !currentTrack || !hasMedia) {
      setThumbUrl(null);
      return;
    }

    // Debounce to avoid slamming the generator while moving mouse fast
    const timer = setTimeout(async () => {
      try {
        const path = await invoke<string>('generate_thumbnail', { 
          path: currentTrack, 
          time: hoverTime 
        });
        setThumbUrl(convertFileSrc(path));
      } catch (err) {
        // Silently fail, we just won't show a thumb
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [hoverTime, currentTrack, hasMedia]);

  const isSmall = winWidth < 650;
  const isTiny = winWidth < 450;

  const renderPlaybackGroup = (isCenteredLayout = false) => (
    <div className={`flex items-center ${isSmall ? 'gap-3' : 'gap-6'}`}>
      <div className={`flex items-center ${isSmall ? 'gap-2' : 'gap-4'}`}>
        {hasPlaylist && (
          <Tooltip content="Previous (P)">
            <button 
              onClick={async () => {
                const idx = playlist.findIndex(t => t.path === currentTrack);
                if (idx > 0) {
                  const prev = playlist[idx - 1];
                  await emit('lieb-play', { path: prev.path, subs: prev.subs });
                  setCurrentTrack(prev.path);
                }
              }}
              className={`text-muted hover:text-accent transition-all cursor-pointer group/btn ${playlist.findIndex(t => t.path === currentTrack) <= 0 ? 'opacity-30 cursor-default pointer-events-none' : ''}`}
            >
              <SkipBack size={18} className="group-hover/btn:scale-110 transition-transform" />
            </button>
          </Tooltip>
        )}
        
        <div className={`flex items-center ${isSmall ? 'gap-3' : 'gap-6'} ${!hasMedia ? 'opacity-20 pointer-events-none' : ''}`}>
          <Tooltip content="Rewind">
            <button 
              onClick={() => {
                command('seek', [-seekInterval, 'relative']);
                showActionOSD(`${seekInterval}s`, 'rewind');
              }}
              className="text-muted hover:text-accent transition-all cursor-pointer relative group/btn"
            >
              <Rewind size={isSmall ? 18 : 22} className="group-hover/btn:scale-110 transition-transform" />
            </button>
          </Tooltip>
        </div>
      </div>

      <Tooltip content={isPlaying ? t('pause') : t('play')}>
        <button 
          disabled={!hasMedia}
          onClick={async () => {
            if (duration > 0 && currentTime >= duration - 0.2) {
              await command('seek', [0, 'absolute']);
            }
            await command('cycle', ['pause']);
            showActionOSD(!isPlaying ? t('play') : t('pause'), !isPlaying ? 'play' : 'pause');
          }}
          className={`transition-all duration-300 transform active:scale-95 cursor-pointer group ${hasMedia ? 'text-muted hover:text-accent drop-shadow-md' : 'text-muted/40 cursor-default'}`}
        >
          <div className="group-hover:scale-110 transition-transform flex items-center justify-center">
            {isPlaying ? (
              <Pause size={isCenteredLayout ? (isSmall ? 22 : 28) : (isSmall ? 20 : 24)} strokeWidth={1.5} fill="currentColor" />
            ) : (
              <Play size={isCenteredLayout ? (isSmall ? 22 : 28) : (isSmall ? 20 : 24)} strokeWidth={1.5} fill="currentColor" className="ml-0.5" />
            )}
          </div>
        </button>
      </Tooltip>

      <div className={`flex items-center ${isSmall ? 'gap-2' : 'gap-4'}`}>
        <div className={`flex items-center ${isSmall ? 'gap-3' : 'gap-6'} ${!hasMedia ? 'opacity-20 pointer-events-none' : ''}`}>
          <Tooltip content="Forward">
            <button 
              onClick={() => {
                command('seek', [seekInterval, 'relative']);
                showActionOSD(`${seekInterval}s`, 'forward');
              }}
              className="text-muted hover:text-accent transition-all cursor-pointer relative group/btn"
            >
              <FastForward size={isSmall ? 18 : 22} className="group-hover/btn:scale-110 transition-transform" />
            </button>
          </Tooltip>
        </div>

        {hasPlaylist && (
          <Tooltip content="Next (N)">
            <button 
              onClick={async () => {
                const idx = playlist.findIndex(t => t.path === currentTrack);
                if (idx !== -1 && idx < playlist.length - 1) {
                  const next = playlist[idx + 1];
                  await emit('lieb-play', { path: next.path, subs: next.subs });
                  setCurrentTrack(next.path);
                }
              }}
              className={`text-muted hover:text-accent transition-all cursor-pointer group/btn ${playlist.findIndex(t => t.path === currentTrack) >= playlist.length - 1 ? 'opacity-30 cursor-default pointer-events-none' : ''}`}
            >
              <SkipForward size={18} className="group-hover/btn:scale-110 transition-transform" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );

  const renderVolumeGroup = () => (
    <div className={`flex items-center ${isSmall ? 'gap-2' : 'gap-4'} group/volume relative ${!hasMedia ? 'opacity-20 pointer-events-none' : ''}`}>
      <Tooltip content={isMuted ? 'Unmute (M)' : 'Mute (M)'}>
        <button 
          onClick={() => setProperty('mute', !isMuted)}
          className="text-muted hover:text-accent transition-all cursor-pointer group"
        >
          <div className="group-hover:scale-110 transition-transform">
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </div>
        </button>
      </Tooltip>
      {!isTiny && (
        <div className={`${isSmall ? 'w-16' : 'w-24'} relative flex items-center gap-2`}>
          <div className="relative flex-1 h-1 bg-foreground/10 rounded-full overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-accent"
              initial={false}
              animate={{ width: `${isMuted ? 0 : (volume / 150) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-bold tabular-nums text-muted min-w-[20px]">
            {isMuted ? '0' : Math.round(volume)}
          </span>
          <input 
            type="range"
            min="0"
            max="150"
            value={volume}
            onChange={(e) => setProperty('volume', Number(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer appearance-none"
          />
        </div>
      )}
    </div>
  );

  const renderTimeGroup = () => !isTiny && (
    <div className="flex items-center gap-2 tabular-nums text-[10px] font-bold tracking-tight">
      <span className="text-muted/80">{formatTime(currentTime)}</span>
      <span className="text-muted/40">/</span>
      <span className="text-muted">{formatTime(duration)}</span>
    </div>
  );

  const renderSecondaryUtilities = () => (
    <div className={`flex items-center ${isSmall ? 'gap-3' : 'gap-6'}`}>
      <Tooltip content={`Loop: ${loopMode}`}>
        <button 
          disabled={!hasMedia}
          onClick={handleLoopCycle}
          className={`transition-all cursor-pointer relative group ${
            loopMode !== 'off' ? 'text-accent' : hasMedia ? 'text-muted hover:text-accent' : 'text-muted/40 cursor-default'
          }`}
        >
          <div className="group-hover:scale-110 transition-transform">
            {loopMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </div>
        </button>
      </Tooltip>
      
      <Tooltip content="Library (L)">
        <button 
          onClick={() => openWindow('library', 'Library', 800, 600)}
          className="text-muted hover:text-accent transition-all cursor-pointer group"
        >
          <FolderOpen size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      </Tooltip>

      <Tooltip content="Screenshot">
        <button 
          disabled={!hasMedia}
          onClick={async () => {
            try {
              await command('screenshot');
              showActionOSD('Screenshot Saved', 'camera');
            } catch (err) {
              console.error('Screenshot failed:', err);
            }
          }}
          className={`transition-all cursor-pointer group ${hasMedia ? 'text-muted hover:text-accent' : 'text-muted/40 cursor-default'}`}
        >
          <Camera size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      </Tooltip>

      <Tooltip content={subsEnabled ? "Disable Subtitles" : "Enable Subtitles"}>
        <div className="flex items-center">
          <button 
            disabled={!hasMedia}
            onClick={async () => {
              const state = usePlayerStore.getState();
              if (!state.hasSubtitles) {
                showActionOSD(t('no.captions'), 'subtitles');
                return;
              }
              const next = !subsEnabled;
              setSubsEnabled(next);
              showActionOSD(next ? t('captions.on') : t('captions.off'), 'subtitles');
            }}
            className={`transition-all cursor-pointer group ${subsEnabled ? 'text-accent' : hasMedia ? 'text-muted hover:text-accent' : 'text-muted/40 cursor-default'}`}
          >
            <Subtitles size={18} className="group-hover:scale-110 transition-transform" />
          </button>
          
          {hasMedia && (
            <button 
              onClick={() => openWindow('subtitle-search', 'Online Subtitles', 600, 500)}
              className="ml-2 text-[8px] font-black uppercase tracking-tighter text-muted hover:text-accent transition-colors cursor-pointer border border-white/5 px-1 rounded"
            >
              Search
            </button>
          )}
        </div>
      </Tooltip>
    </div>
  );

  const renderGlobalUtilities = () => (
    <div className={`flex items-center ${isSmall ? 'gap-3' : 'gap-6'}`}>
      <Tooltip content="Settings (S)" align="right">
        <button 
          onClick={() => openWindow('settings', 'Settings', 800, 560)}
          className="text-muted hover:text-accent transition-all cursor-pointer group"
        >
          <Settings size={18} className="group-hover:scale-110 group-hover:rotate-45 transition-all duration-300" />
        </button>
      </Tooltip>

      <Tooltip content={isPinned ? 'Unpin (Always on Top)' : 'Pin (Always on Top)'} align="right">
        <button 
          onClick={async () => {
            const next = !isPinned;
            await appWindow.setAlwaysOnTop(next);
            setIsPinned(next);
            showActionOSD(next ? 'PiP Mode On' : 'PiP Mode Off', 'pip');

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
          className={`transition-all cursor-pointer group ${isPinned ? 'text-accent scale-110' : 'text-muted hover:text-accent'}`}
        >
          <div className="group-hover:scale-110 transition-transform">
            <PictureInPicture2 size={18} strokeWidth={1.5} />
          </div>
        </button>
      </Tooltip>

      <Tooltip content={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'} align="right">
        <button 
          onClick={handleFullscreen}
          className={`transition-all cursor-pointer group ${isFullscreen ? 'text-accent' : 'text-muted hover:text-accent'}`}
        >
          <div className="group-hover:scale-110 transition-transform">
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </div>
        </button>
      </Tooltip>
    </div>
  );

  const renderPlayPauseOnly = () => (
    <Tooltip content={isPlaying ? t('pause') : t('play')}>
      <button 
        disabled={!hasMedia}
        onClick={async () => {
          if (duration > 0 && currentTime >= duration - 0.2) {
            await command('seek', [0, 'absolute']);
          }
          await command('cycle', ['pause']);
          showActionOSD(!isPlaying ? t('play') : t('pause'), !isPlaying ? 'play' : 'pause');
        }}
        className={`transition-all duration-300 transform active:scale-95 cursor-pointer group ${hasMedia ? 'text-muted hover:text-accent drop-shadow-md' : 'text-muted/40 cursor-default'}`}
      >
        <div className="group-hover:scale-110 transition-transform flex items-center justify-center">
          {isPlaying ? (
            <Pause size={24} strokeWidth={1.5} fill="currentColor" />
          ) : (
            <Play size={24} strokeWidth={1.5} fill="currentColor" className="ml-0.5" />
          )}
        </div>
      </button>
    </Tooltip>
  );

  const renderFullscreenOnly = () => (
    <Tooltip content={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'} align="right">
      <button 
        onClick={handleFullscreen}
        className={`transition-all cursor-pointer group ${isFullscreen ? 'text-accent' : 'text-muted hover:text-accent'}`}
      >
        <div className="group-hover:scale-110 transition-transform">
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </div>
      </button>
    </Tooltip>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 10 }}
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      onWheel={handleWheel}
    >
      <div className="w-full pointer-events-auto relative bg-surface/30 backdrop-blur-3xl border-t border-border-subtle shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div 
          ref={progressRef}
          className={`absolute top-0 left-4 right-4 h-1 z-20 group -translate-y-[1px] ${hasMedia ? 'cursor-pointer' : 'cursor-default opacity-0 pointer-events-none'}`}
        >
          <div className="w-full h-full bg-foreground/10 relative overflow-visible group-hover:h-[4px] transition-all rounded-full">
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
            onPointerMove={handlePointerMoveProgress}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeaveProgress}
          />

          <AnimatePresence>
            {hoverTime !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-full mb-4 pointer-events-none"
                style={{ left: hoverPos, x: '-50%' }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-32 h-20 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center relative">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <Film size={24} className="text-accent" />
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 rounded text-[8px] font-black tabular-nums text-white/90">
                      {formatTime(hoverTime)}
                    </div>
                  </div>
                  <div className="w-1 h-1 bg-accent rounded-full shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-4 py-5">
          {controlBarLayout === 'default' && (
            <div className="flex items-center justify-between">
              {/* Left Group: Playback & Volume */}
              <div className={`flex items-center ${isSmall ? 'gap-3' : 'gap-6'}`}>
                {renderPlaybackGroup()}
                {!isSmall && <div className="h-5 w-[1px] bg-border-subtle mx-1" />}
                {renderVolumeGroup()}
                {renderTimeGroup()}
              </div>

              {/* Right Group: Utilities */}
              <div className={`flex items-center ${isSmall ? 'gap-3' : 'gap-6'}`}>
                {!isSmall && renderSecondaryUtilities()}
                {renderGlobalUtilities()}
              </div>
            </div>
          )}

          {controlBarLayout === 'centered' && (
            <div className="flex items-center justify-between">
              {/* Left: Volume & Time */}
              <div className="flex-1 flex items-center gap-6">
                {renderVolumeGroup()}
                {renderTimeGroup()}
              </div>

              {/* Center: Playback */}
              <div className="flex items-center">
                {renderPlaybackGroup(true)}
              </div>

              {/* Right: Utilities */}
              <div className="flex-1 flex items-center justify-end gap-6">
                {!isSmall && renderSecondaryUtilities()}
                {renderGlobalUtilities()}
              </div>
            </div>
          )}

          {controlBarLayout === 'compact' && (
            <div className="flex items-center justify-between">
              {/* Left: Everything essential grouped */}
              <div className="flex items-center gap-4">
                {renderPlaybackGroup()}
                <div className="h-4 w-[1px] bg-border-subtle mx-1" />
                {renderVolumeGroup()}
              </div>

              {/* Center: Time */}
              <div className="absolute left-1/2 -translate-x-1/2">
                {renderTimeGroup()}
              </div>

              {/* Right: Essential Utilities */}
              <div className="flex items-center gap-4">
                {renderGlobalUtilities()}
              </div>
            </div>
          )}

          {controlBarLayout === 'minimal' && (
            <div className="flex items-center justify-between">
              {/* Left: Play/Pause only */}
              <div className="flex items-center">
                {renderPlayPauseOnly()}
              </div>

              {/* Center: Time */}
              <div className="absolute left-1/2 -translate-x-1/2">
                {renderTimeGroup()}
              </div>

              {/* Right: Volume & Fullscreen */}
              <div className="flex items-center gap-6">
                {renderVolumeGroup()}
                {renderFullscreenOnly()}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
