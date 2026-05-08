import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoCanvas } from './components/player/VideoCanvas';
import { MainControls } from './components/controls/MainControls';
import { WindowControls } from './components/layout/WindowControls';
import { SettingsModal } from './components/settings/SettingsModal';
import { LibraryModal } from './components/library/LibraryModal';
import { usePlayerStore } from './store/usePlayerStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { listen } from '@tauri-apps/api/event';
import { command, setProperty } from 'tauri-plugin-mpv-api';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getAllWebviewWindows } from '@tauri-apps/api/webviewWindow';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

// ── Lightweight shell for secondary windows (no MPV, no player hooks) ──
function SettingsWindow() {
  const { accentColor } = usePlayerStore();
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
  }, [accentColor]);
  return <SettingsModal standalone />;
}

function LibraryWindow() {
  const { accentColor } = usePlayerStore();
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
  }, [accentColor]);
  return <LibraryModal standalone />;
}

// ── Proportional Resize Grip (All Corners) ──
const ResizeGrip: React.FC<{ position: 'tl' | 'tr' | 'bl' | 'br', show: boolean }> = ({ position, show }) => {
  const getCursor = () => {
    if (position === 'tl' || position === 'br') return 'cursor-nwse-resize';
    return 'cursor-nesw-resize';
  };
  
  const getPositionClass = () => {
    switch (position) {
      case 'tl': return 'top-0 left-0';
      case 'tr': return 'top-0 right-0';
      case 'bl': return 'bottom-0 left-0';
      case 'br': return 'bottom-0 right-0';
    }
  };

  const getRotationClass = () => {
    switch (position) {
      case 'tl': return 'rotate-180';
      case 'tr': return '-rotate-90';
      case 'bl': return 'rotate-90';
      case 'br': return '';
    }
  };

  return (
    <div 
      className={`fixed z-[60] p-2 ${getPositionClass()} ${getCursor()} transition-opacity duration-500 ${
        show ? 'opacity-20 hover:opacity-50' : 'opacity-0 pointer-events-none'
      }`}
      onPointerDown={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const appWindow = getCurrentWindow();
        const startX = e.screenX;
        const startY = e.screenY;
        const startSize = await appWindow.innerSize();
        const startPos = await appWindow.outerPosition();
        const scaleFactor = await appWindow.scaleFactor();
        const ratio = usePlayerStore.getState().aspectRatio || 16 / 9;

        const onMove = async (ev: PointerEvent) => {
          const dx = ev.screenX - startX;
          const dy = ev.screenY - startY;

          let delta = 0;
          if (position === 'br') delta = dx > dy * ratio ? dx : dy * ratio;
          else if (position === 'bl') delta = -dx > dy * ratio ? -dx : dy * ratio;
          else if (position === 'tr') delta = dx > -dy * ratio ? dx : -dy * ratio;
          else if (position === 'tl') delta = -dx > -dy * ratio ? -dx : -dy * ratio;

          const newW = Math.max(640, startSize.width / scaleFactor + delta);
          const newH = Math.round(newW / ratio);

          const { PhysicalSize, PhysicalPosition } = await import('@tauri-apps/api/window');
          
          let newX = startPos.x;
          let newY = startPos.y;

          if (position === 'tl' || position === 'bl') {
            newX = startPos.x + (startSize.width - newW * scaleFactor);
          }
          if (position === 'tl' || position === 'tr') {
            newY = startPos.y + (startSize.height - newH * scaleFactor);
          }

          // If dragging from top/left, we must adjust position to anchor the opposite corner
          if (position !== 'br') {
            await appWindow.setPosition(new PhysicalPosition(newX, newY));
          }
          await appWindow.setSize(new PhysicalSize(
            Math.round(newW * scaleFactor),
            Math.round(newH * scaleFactor)
          ));
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" className={`text-white/40 ${getRotationClass()}`}>
        <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="6" x2="6" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="10" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};

// ── Main player (all MPV hooks live here) ──
function MainPlayer() {
  const { 
    isPlaying, showControls, setShowControls, setPlaying, 
    metadata, duration, setPlaylist, volume, isMuted, 
    showVolumeOSD, accentColor, crossfade, crossfadeDuration 
  } = usePlayerStore();
  const hasMedia = duration > 0;

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
  }, [accentColor]);

  // Sync Crossfade Settings to MPV
  useEffect(() => {
    setProperty('user-data/lieb/crossfade', crossfade ? 'yes' : 'no');
  }, [crossfade]);

  useEffect(() => {
    setProperty('user-data/lieb/crossfade-duration', crossfadeDuration);
  }, [crossfadeDuration]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  
  useKeyboardShortcuts();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setProperty('load-scripts', 'yes');
    
    // Initial window center
    getCurrentWindow().center();

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    // Cascading close: when main closes, close everything
    const unlistenClose = getCurrentWindow().onCloseRequested(async () => {
      if (getCurrentWindow().label === 'main') {
        const windows = await getAllWebviewWindows();
        for (const win of windows) {
          if (win.label !== 'main') await win.close();
        }
      }
    });

    console.log(' Lieb Player: App Mounted and Listening...');
    
    const unlisten = listen('tauri://drag-drop', async (event: any) => {
      const paths = event.payload.paths || event.payload;
      if (paths && paths.length > 0) {
        setPlaylist(paths);
        try {
          console.log(' Lieb Player: Loading playlist:', paths.length, 'files');
          await command('loadfile', [paths[0], 'replace']);
          for (let i = 1; i < paths.length; i++) {
            await command('loadfile', [paths[i], 'append']);
          }
          await setProperty('pause', false);
          setPlaying(true);
          setShowControls(true);
        } catch (err) {
          console.error(' Lieb Player: Critical load error:', err);
        }
      }
    });

    const unlistenOpenFile = listen('open-file', async (event: any) => {
      const filePath = event.payload as string;
      if (filePath) {
        console.log(' Lieb Player: Opened via file association:', filePath);
        setPlaylist([filePath]);
        try {
          await command('loadfile', [filePath, 'replace']);
          await setProperty('pause', false);
          setPlaying(true);
          setShowControls(true);
        } catch (err) {
          console.error(' Lieb Player: Failed to open file:', err);
        }
      }
    });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      unlistenClose.then(u => u());
      unlisten.then(u => u());
      unlistenOpenFile.then(u => u());
    };
  }, [setPlaylist, setShowControls, setPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  return (
    <div 
      className={`relative w-full h-screen overflow-hidden font-inter select-none ${hasMedia ? 'bg-transparent' : 'bg-black'}`}
      style={{ cursor: !showControls && hasMedia ? 'none' : 'auto' }}
      onMouseMove={handleMouseMove}
    >
      <VideoCanvas />

      {/* Modern Vertical Volume OSD (Right Aligned) */}
      <AnimatePresence>
        {showVolumeOSD && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed right-8 top-1/2 -translate-y-1/2 z-[100] pointer-events-none"
          >
            <div className="bg-black/40 backdrop-blur-3xl rounded-full w-14 h-64 flex flex-col items-center py-6 border border-white/5 shadow-2xl">
              <div className="mb-4 text-white/40">
                {isMuted || volume === 0 ? <VolumeX size={18} /> : volume < 50 ? <Volume1 size={18} /> : <Volume2 size={18} />}
              </div>
              
              <div className="flex-1 w-1 bg-white/5 rounded-full relative overflow-hidden">
                <motion.div 
                  className="absolute bottom-0 w-full bg-accent rounded-full shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]"
                  initial={false}
                  animate={{ height: `${isMuted ? 0 : volume}%` }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                />
              </div>

              <div className="mt-4 text-[11px] font-black tabular-nums text-white/90">
                {isMuted ? '0' : Math.round(volume)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center Logo Overlay (No Media) */}
      {!hasMedia && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none">
          <img 
            src="/lieb-player-icon.png" 
            alt="Lieb Player" 
            className="w-[clamp(64px,9vw,110px)] h-auto object-contain opacity-20 grayscale"
          />
          <div className="mt-[clamp(16px,3vw,28px)] text-center">
            <h1 className="text-[clamp(11px,1.2vw,16px)] font-black text-white tracking-[0.4em] uppercase opacity-10">
              Lieb Player
            </h1>
            <p className="mt-[clamp(8px,1vw,14px)] text-[clamp(8px,0.9vw,11px)] text-white/10 font-bold uppercase tracking-[0.3em]">
              Drop media to play
            </p>
          </div>
        </div>
      )}

      <div className={`relative z-10 h-full w-full flex flex-col pointer-events-none transition-opacity duration-500 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Header - Transparent and Draggable */}
        <header 
          className="p-1 flex justify-between items-center pointer-events-auto"
          data-tauri-drag-region
        >
          <div className="flex items-center gap-2 px-3 py-1.5 opacity-20 hover:opacity-100 transition-opacity pointer-events-none">
            <img src="/lieb-player-icon.png" alt="Logo" className="w-3.5 h-3.5 object-contain grayscale" />
            <span className="text-white text-[10px] tracking-[0.2em] font-bold uppercase">
              lieb player
            </span>
          </div>

          <WindowControls />
        </header>

        {/* Draggable spacer area */}
        <div className="flex-1 w-full" data-tauri-drag-region />

        {/* Bottom Area: Metadata & Controls */}
        <div className="p-12 flex items-end justify-between pointer-events-none relative flex-1">
          {/* Metadata Overlay (Bottom Left) */}
          <div className="max-w-md pb-4">
            {!isPlaying && duration > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="pointer-events-none"
              >
                <h2 className="text-sm font-medium tracking-tight text-white/80 mb-1">
                  {metadata.title || 'Unknown Title'}
                </h2>
                <div className="flex items-center gap-2 text-white/40 text-[9px] font-semibold uppercase tracking-[0.2em] mb-4">
                  {metadata.season && <span>Season {metadata.season}</span>}
                  {metadata.season && metadata.episode && <span className="w-1 h-1 rounded-full bg-white/10" />}
                  {metadata.episode && <span>Episode {metadata.episode}</span>}
                  {(metadata.season || metadata.episode) && <span className="w-1 h-1 rounded-full bg-white/10" />}
                  <span>{formatDuration(duration)}</span>
                </div>
                {metadata.description && (
                  <p className="text-white/50 text-xs leading-relaxed max-w-sm font-medium">
                    {metadata.description}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Cinematic Controls Overlay */}
        <MainControls />
      </div>

      {/* Resize Grips (Bottom Corners Only) */}
      <ResizeGrip position="bl" show={showControls} />
      <ResizeGrip position="br" show={showControls} />
    </div>
  );
}

// ── App Router: picks the right component based on window label ──
function App() {
  const label = getCurrentWindow().label;

  if (label === 'settings') return <SettingsWindow />;
  if (label === 'library') return <LibraryWindow />;
  return <MainPlayer />;
}

export default App;
