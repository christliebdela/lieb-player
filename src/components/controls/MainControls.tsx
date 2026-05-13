import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Maximize, Minimize, Settings, FolderOpen, Subtitles,
  Rewind, FastForward, Search, Repeat, Repeat1, PictureInPicture2,
  Camera, Film
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { command, setProperty } from 'tauri-plugin-mpv-api';
import { emit } from '@tauri-apps/api/event';
import { showActionOSD } from '../../utils/osd';
import { useTranslation } from '../../i18n';
import { openWindow } from '../../utils/window';

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
    playlist, currentTrack, 
    scrollMode,
    subsEnabled, setSubsEnabled,
    seekInterval,
    controlBarLayout,
    hasUpdate,
    playNext, playPrevious
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
      await setProperty('mute', false);
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



  const [winWidth, setWinWidth] = useState(1000);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWinWidth(entry.contentRect.width);
      }
    });
    observer.observe(document.body);
    return () => observer.disconnect();
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

  // Proportional scale factor based on 900px baseline
  // We want it to scale down proportionally, but keep 1.0 as the max
  const uiScale = Math.max(0.4, Math.min(1, winWidth / 900));

  const renderPlaybackGroup = (isCenteredLayout = false) => (
    <div 
      className="flex items-center"
      style={{ 
        gap: `${(isSmall ? 12 : 24) * uiScale}px`,
        transform: `scale(${uiScale})`,
        transformOrigin: 'left center'
      }}
    >
      <div className="flex items-center" style={{ gap: `${(isSmall ? 8 : 16) * uiScale}px` }}>
        {hasPlaylist && (
          <Tooltip content="Previous (P)">
            <button 
              onClick={() => playPrevious()}
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
              <Rewind size={(isSmall ? 18 : 22) * uiScale} className="group-hover/btn:scale-110 transition-transform" />
            </button>
          </Tooltip>
        </div>
      </div>

      <Tooltip content={isPlaying ? t('pause') : t('play')}>
        <button 
          disabled={!hasMedia && playlist.length === 0}
          onClick={async () => {
            if (!hasMedia && playlist.length > 0) {
              const trackToPlay = playlist.find(p => p.path === currentTrack) || playlist[0];
              await emit('lieb-play', { path: trackToPlay.path, subs: trackToPlay.subs });
              return;
            }
            if (duration > 0 && currentTime >= duration - 0.2) {
              await command('seek', [0, 'absolute']);
            }
            await command('cycle', ['pause']);
            showActionOSD(!isPlaying ? t('play') : t('pause'), !isPlaying ? 'play' : 'pause');
          }}
          className={`transition-all duration-150 transform active:scale-95 cursor-pointer group ${hasMedia ? 'text-muted hover:text-accent drop-shadow-md' : 'text-muted/40 cursor-default'}`}
        >
          <div className="group-hover:scale-110 transition-transform flex items-center justify-center">
            {isPlaying ? (
              <Pause size={(isCenteredLayout ? (isSmall ? 22 : 28) : (isSmall ? 20 : 24)) * uiScale} strokeWidth={1.5} fill="currentColor" />
            ) : (
              <Play size={(isCenteredLayout ? (isSmall ? 22 : 28) : (isSmall ? 20 : 24)) * uiScale} strokeWidth={1.5} fill="currentColor" className="ml-0.5" />
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
              <FastForward size={(isSmall ? 18 : 22) * uiScale} className="group-hover/btn:scale-110 transition-transform" />
            </button>
          </Tooltip>
        </div>

        {hasPlaylist && (
          <Tooltip content="Next (N)">
            <button 
              onClick={() => playNext()}
              className={`text-muted hover:text-accent transition-all cursor-pointer group/btn ${playlist.findIndex(t => t.path === currentTrack) >= playlist.length - 1 ? 'opacity-30 cursor-default pointer-events-none' : ''}`}
            >
              <SkipForward size={18 * uiScale} className="group-hover/btn:scale-110 transition-transform" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );

  const renderVolumeGroup = () => (
    <div 
      className={`flex items-center group/volume relative ${!hasMedia ? 'opacity-20 pointer-events-none' : ''}`}
      style={{ 
        gap: `${(isSmall ? 8 : 16) * uiScale}px`,
        transform: `scale(${uiScale})`,
        transformOrigin: 'right center'
      }}
    >
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
            onChange={async (e) => {
              const val = Number(e.target.value);
              window.console.log('>>> [MainControls] Volume slider changed to:', val);
              await setProperty('volume', val);
              await setProperty('mute', false);
            }}
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
    <div 
      className={`flex items-center`}
      style={{ 
        gap: `${(isSmall ? 12 : 24) * uiScale}px`,
        transform: `scale(${uiScale})`,
        transformOrigin: 'right center'
      }}
    >
      <Tooltip content={`${t('loop.mode')}: ${t(`loop.${loopMode}` as any)}`}>
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
      
      <Tooltip content={t('library.tooltip')}>
        <button 
          onClick={() => openWindow('library', 'Library', 800, 600)}
          className="text-muted hover:text-accent transition-all cursor-pointer group"
        >
          <FolderOpen size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      </Tooltip>

      <Tooltip content={t('screenshot.tooltip')}>
        <button 
          disabled={!hasMedia}
          onClick={async (e) => {
            const btn = e.currentTarget;
            btn.classList.add('text-accent');
            setTimeout(() => btn.classList.remove('text-accent'), 300);
            try {
              await command('screenshot');
              showActionOSD(t('screenshot.saved'), 'camera');
            } catch (err) {
              console.error('Screenshot failed:', err);
            }
          }}
          className={`transition-all duration-150 cursor-pointer group ${hasMedia ? 'text-muted hover:text-accent' : 'text-muted/40 cursor-default'}`}
        >
          <Camera size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      </Tooltip>

      <Tooltip content={subsEnabled ? t('subs.disable') : t('subs.enable')}>
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
            className={`transition-all cursor-pointer group ${hasMedia ? (subsEnabled ? 'text-accent' : 'text-muted hover:text-accent') : 'text-muted/40 cursor-default'}`}
          >
            <Subtitles size={18} className="group-hover:scale-110 transition-transform" />
          </button>
          
          {hasMedia && (
            <Tooltip content={t('subs.search')}>
              <button 
                onClick={() => openWindow('subtitle-search', 'Online Subtitles', 600, 500)}
                className="ml-2 p-1 text-muted hover:text-accent transition-all cursor-pointer border border-white/5 rounded-lg hover:bg-white/5 active:scale-90"
              >
                <Search size={12} strokeWidth={3} />
              </button>
            </Tooltip>
          )}
        </div>
      </Tooltip>
    </div>
  );

  const renderGlobalUtilities = () => (
    <div 
      className={`flex items-center`}
      style={{ 
        gap: `${(isSmall ? 12 : 24) * uiScale}px`,
        transform: `scale(${uiScale})`,
        transformOrigin: 'right center'
      }}
    >
      <Tooltip content={hasUpdate ? t('settings.update') : t('settings.tooltip')} align="right">
        <button 
          onClick={() => openWindow('settings', 'Settings', 800, 560)}
          className="text-muted hover:text-accent transition-all cursor-pointer group relative"
        >
          <Settings size={18} className="group-hover:scale-110 group-hover:rotate-45 transition-all duration-300" />
          {hasUpdate && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full border border-surface shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
          )}
        </button>
      </Tooltip>

      <Tooltip content={isPinned ? t('pip.unpin') : t('pip.pin')} align="right">
        <button 
          onClick={async () => {
            const next = !isPinned;
            await appWindow.setAlwaysOnTop(next);
            setIsPinned(next);
            showActionOSD(next ? t('pip.on') : t('pip.off'), 'pip');
          }}
          className={`transition-all cursor-pointer group ${isPinned ? 'text-accent scale-110' : 'text-muted hover:text-accent'}`}
        >
          <div className="group-hover:scale-110 transition-transform">
            <PictureInPicture2 size={18} strokeWidth={1.5} />
          </div>
        </button>
      </Tooltip>

      <Tooltip content={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')} align="right">
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
    <Tooltip content={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')} align="right">
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
      className="w-full z-50 pointer-events-none flex-shrink-0"
      onWheel={handleWheel}
    >
      <div className={`w-full relative bg-surface/70 backdrop-blur-xl border-t border-border-subtle transition-all duration-500 cursor-default ${
        showControls ? 'pointer-events-auto' : 'pointer-events-none'
      }`}>
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

        <div className="px-4 py-4">
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
