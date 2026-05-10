import { useEffect, useRef } from 'react';
import { Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoCanvas } from './components/player/VideoCanvas';
import { MainControls } from './components/controls/MainControls';
import { WindowControls } from './components/layout/WindowControls';
import { SettingsModal } from './components/settings/SettingsModal';
import { LibraryModal } from './components/library/LibraryModal';
import { ActionOSD } from './components/player/ActionOSD';
import { SubtitleSearchModal } from './components/settings/SubtitleSearchModal';
import { usePlayerStore } from './store/usePlayerStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTranslation } from './i18n';
import { listen, emit } from '@tauri-apps/api/event';
import { command, setProperty } from 'tauri-plugin-mpv-api';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { showActionOSD } from './utils/osd';
import { Volume2, VolumeX, Volume1, Download } from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

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

function SubtitleSearchWindow() {
  const { accentColor } = usePlayerStore();
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
  }, [accentColor]);
  return <SubtitleSearchModal standalone />;
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

        let rafId: number | null = null;
        const onMove = (ev: PointerEvent) => {
          if (rafId) return;
          rafId = requestAnimationFrame(async () => {
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

            if (position !== 'br') {
              appWindow.setPosition(new PhysicalPosition(
                Math.round(newX), 
                Math.round(newY)
              )).catch(() => {});
            }
            appWindow.setSize(new PhysicalSize(
              Math.round(newW * scaleFactor),
              Math.round(newH * scaleFactor)
            )).catch(() => {});

            rafId = null;
          });
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
    metadata, duration, setPlaylist, volume, isMuted, 
    showVolumeOSD, accentColor, playlist,
    isFullscreen, setFullscreen, setPlaying, setShowControls, isPlaying, showControls,
    isBlocking, currentTrack, setCurrentTrack, isEngineReady, isBuffering, currentTime
  } = usePlayerStore();
  const { t } = useTranslation();
  const hasMedia = duration > 0;
  const hasPrefetched = useRef<string | null>(null);

  // Seamless Prefetching Logic
  useEffect(() => {
    if (duration > 0 && (duration - currentTime) < 30) {
      const currentIndex = playlist.findIndex(p => p.path === currentTrack);
      if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
        const nextTrack = playlist[currentIndex + 1];
        if (hasPrefetched.current !== nextTrack.path) {
          window.console.log('>>> [App] PREFETCH: Seamlessly buffering next track', nextTrack.path);
          command('loadfile', [nextTrack.path, 'append']).catch(() => {});
          hasPrefetched.current = nextTrack.path;
        }
      }
    }
    // Reset prefetch status when a new track starts or we seek back
    if (currentTime < 5) {
      hasPrefetched.current = null;
    }
  }, [currentTime, duration, currentTrack, playlist]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
  }, [accentColor]);

  useEffect(() => {
    // Force transparency as soon as we have a track or are playing to avoid "dark screen"
    const shouldBeTransparent = hasMedia || !!currentTrack || isPlaying;
    
    if (shouldBeTransparent) {
      // Set both the CSS variable and the direct style for maximum compatibility
      document.documentElement.style.setProperty('--body-bg', 'transparent');
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
    } else {
      document.documentElement.style.setProperty('--body-bg', 'var(--background)');
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    }
  }, [hasMedia, isPlaying, currentTrack]);

  const subsEnabled = usePlayerStore(s => s.subsEnabled);
  useEffect(() => {
    if (!isEngineReady) return;
    setProperty('sub-visibility', subsEnabled ? 'yes' : 'no')
      .catch(err => console.warn('Lieb: Subs guard hit:', err));
  }, [subsEnabled, isEngineReady]);
  
  const equalizer = usePlayerStore(s => s.equalizer);
  useEffect(() => {
    if (!isEngineReady) return;
    const applyEq = async () => {
      try {
        const frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        const filterChain = equalizer
          .map((gain, idx) => `equalizer=f=${frequencies[idx]}:width_type=o:w=1:g=${gain}`)
          .join(',');
        await setProperty('af', filterChain);
      } catch (err) {
        console.error('Lieb Player: EQ Sync Error:', err);
      }
    };
    applyEq();
  }, [equalizer, isEngineReady]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  
  useKeyboardShortcuts();
  const timeoutRef = useRef<number | null>(null);

  const { 
    autoUpdateCheck, autoUpdateDownload, autoUpdateInstall, 
    setHasUpdate, setDownloadProgress,
    hasUpdate, setSettingsActiveTab, setSettingsOpen
  } = usePlayerStore();

  const isUpdateAvailable = hasUpdate; 

  useEffect(() => {
    if (!autoUpdateCheck) return;

    const performBackgroundCheck = async () => {
      try {
        const update = await check();
        if (update) {
          setHasUpdate(true);

          if (autoUpdateDownload) {
            let downloaded = 0;
            let total = 0;
            await update.downloadAndInstall((event) => {
              switch (event.event) {
                case 'Started':
                  total = event.data.contentLength || 0;
                  break;
                case 'Progress':
                  downloaded += event.data.chunkLength;
                  if (total > 0) {
                    setDownloadProgress((downloaded / total) * 100);
                  }
                  break;
              }
            });
            window.console.log('>>> [Update] Download finished.');
            
            if (autoUpdateInstall) {
              window.console.log('>>> [Update] Auto-relaunching...');
              await relaunch();
            }
          }
        }
      } catch (err) {
        window.console.error('>>> [Update] Background check failed:', err);
      }
    };

    performBackgroundCheck();
  }, [autoUpdateCheck]);

  useEffect(() => {
    if (!isEngineReady) return;
    setProperty('load-scripts', 'yes')
      .catch(err => console.warn('Lieb: Script guard hit:', err));
    getCurrentWindow().center();

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    const unlistenRefs = {
      play: null as any,
      stop: null as any,
      drop: null as any,
      openFile: null as any,
    };

    const setupListeners = async () => {
      unlistenRefs.play = await listen('lieb-play', async (event: any) => {
        const { path, subs } = event.payload;
        window.console.log('>>> [App] EVENT: lieb-play received for', path);
        if (path) {
          await command('loadfile', [path, 'replace']);
          // Give MPV a moment to initialize the file before adding subs
          if (subs && subs.length > 0) {
            window.console.log('>>> [App] SUB-LOAD: Adding', subs.length, 'subtitles');
            setTimeout(async () => {
              for (const sub of subs) {
                await command('sub-add', [sub, 'select']).catch(() => {});
              }
            }, 500);
          }
          await command('set', ['pause', 'no']);
        }
      });

      unlistenRefs.stop = await listen('lieb-stop', async () => {
        window.console.log('>>> [App] RECEIVED lieb-stop');
        await command('stop');
      });

      unlistenRefs.drop = await listen('tauri://drag-drop', async (event: any) => {
        const paths = event.payload.paths || event.payload;
        window.console.log('>>> [App] RECEIVED drag-drop:', paths);
        
        if (paths && paths.length > 0) {
          const SUB_EXTS = ['srt', 'ass', 'sub', 'vtt', 'ssa'];
          const MEDIA_EXTS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'flv', 'wmv', '3gp', 'ts', 'ogv', 'vob', 'mp3', 'flac', 'wav', 'm4a', 'ogg', 'opus', 'aac', 'wma'];
          const subs = paths.filter((p: string) => SUB_EXTS.some(ext => p.toLowerCase().endsWith(`.${ext}`)));
          const media = paths.filter((p: string) => MEDIA_EXTS.some(ext => p.toLowerCase().endsWith(`.${ext}`)));

          try {
            const currentState = usePlayerStore.getState();
            if (media.length > 0) {
              const pairedPlaylist = media.map((m: string) => {
                const base = m.split(/[\\/]/).pop()?.split('.').slice(0, -1).join('.') || '';
                const attachedSubs = subs.filter((s: string) => {
                  const subBase = s.split(/[\\/]/).pop()?.split('.').slice(0, -1).join('.') || '';
                  return subBase.toLowerCase().includes(base.toLowerCase()) || base.toLowerCase().includes(subBase.toLowerCase());
                });
                return { path: m, subs: attachedSubs, addedAt: Date.now() };
              });

              setPlaylist(pairedPlaylist);
              const firstTrack = pairedPlaylist[0];
              await command('loadfile', [firstTrack.path, 'replace']);
              if (firstTrack.subs && firstTrack.subs.length > 0) {
                setTimeout(async () => {
                  for (const sub of firstTrack.subs) {
                    await command('sub-add', [sub, 'select']).catch(() => {});
                  }
                }, 500);
              }
              await command('set', ['pause', 'no']);
              currentState.setCurrentTrack(firstTrack.path);
              currentState.setPlaying(true);
              
              for (let i = 1; i < pairedPlaylist.length; i++) {
                await command('loadfile', [pairedPlaylist[i].path, 'append']);
              }
              setShowControls(true);
            } else if (subs.length > 0 && currentState.currentTrack) {
              // Handle standalone subtitle drops onto existing media
              window.console.log('>>> [App] Dropped subtitles onto playing media');
              for (const sub of subs) {
                await command('sub-add', [sub, 'select']).catch(() => {});
              }
              // Sync to store so library shows the CC badge
              currentState.attachSubtitlesToTrack(currentState.currentTrack, subs);
            }
          } catch (err) {
            window.console.error('>>> [App] Drag-drop error:', err);
          }
        }
      });

      unlistenRefs.openFile = await listen('open-file', async (event: any) => {
        const filePath = event.payload as string;
        window.console.log('>>> [App] RECEIVED open-file:', filePath);
        if (filePath) {
          setPlaylist([{ path: filePath, subs: [], addedAt: Date.now() }]);
          try {
            await command('loadfile', [filePath, 'replace']);
            await command('set', ['pause', 'no']);
            setCurrentTrack(filePath);
            setPlaying(true);
          } catch (err) {
            window.console.error('>>> [App] Failed to open file:', err);
          }
        }
      });
    };

    setupListeners();

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      if (unlistenRefs.play) unlistenRefs.play();
      if (unlistenRefs.stop) unlistenRefs.stop();
      if (unlistenRefs.drop) unlistenRefs.drop();
      if (unlistenRefs.openFile) unlistenRefs.openFile();
    };
  }, [setPlaylist, setShowControls, setPlaying, isEngineReady]);

  const handleFullscreenToggle = async () => {
    try {
      const next = !isFullscreen;
      await getCurrentWindow().setFullscreen(next);
      setFullscreen(next);
      const { showActionOSD } = await import('./utils/osd');
      showActionOSD(next ? t('fullscreen.on') : t('fullscreen.off'), 'maximize');
    } catch (err) {
      console.error(' Lieb: Fullscreen toggle error:', err);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  return (
    <div 
      className={`relative w-full h-screen overflow-hidden font-inter select-none ${hasMedia ? 'bg-transparent' : 'bg-background'} ${
        !showControls ? 'cursor-none' : (isFullscreen ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing')
      }`}
      onMouseMove={handleMouseMove}
      onContextMenu={async (e) => {
        e.preventDefault();
        const s = usePlayerStore.getState();
        if (s.duration > 0) {
          if (s.currentTime >= s.duration - 0.2) {
            await command('seek', [0, 'absolute']);
          }
          await command('cycle', ['pause']);
          showActionOSD(!s.isPlaying ? t('play') : t('pause'), !s.isPlaying ? 'play' : 'pause');
        } else if (s.playlist.length > 0) {
          const trackToPlay = s.playlist.find(p => p.path === s.currentTrack) || s.playlist[0];
          await emit('lieb-play', { path: trackToPlay.path, subs: trackToPlay.subs });
        }
      }}
    >
      <VideoCanvas 
        onToggleFullscreen={handleFullscreenToggle} 
        onMouseMove={handleMouseMove}
        showControls={showControls}
      />
      
      <ActionOSD />

      <AnimatePresence>
        {((!hasMedia && isPlaying && currentTrack?.startsWith('http')) || (isBuffering && isPlaying && currentTime < 2)) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none"
          >
            <div className="flex flex-col items-center">
              <motion.img 
                src="/lieb-player-icon.png" 
                alt="Loading" 
                className="w-16 h-16 object-contain"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.7, 0.3]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.4em] text-accent/60">
                {currentTrack?.startsWith('http') ? 'Initializing Stream' : 'Loading Media'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  animate={{ height: `${isMuted ? 0 : (volume / 150) * 100}%` }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                />
              </div>
              <div className="mt-4 text-[11px] font-semibold tabular-nums text-white/90">
                {isMuted ? '0' : Math.round(volume)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasMedia && !isPlaying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none">
          <img 
            src="/lieb-player-icon.png" 
            alt="Lieb" 
            className="w-[clamp(48px,6vw,80px)] h-auto object-contain opacity-15 grayscale"
          />
          <div className="mt-8 text-center">
            <h1 className="text-[11px] font-black text-foreground tracking-[0.5em] uppercase opacity-[0.08]">
              Lieb
            </h1>
            <p className="mt-3 text-[9px] text-muted font-bold uppercase tracking-[0.3em]">
              {t('drop.media')}
            </p>
          </div>
        </div>
      )}

      {/* Audio Mode Overlay */}
      {isPlaying && ['MP3', 'WAV', 'FLAC', 'M4A', 'OGG', 'OPUS', 'AAC', 'WMA'].includes(currentTrack?.split('.').pop()?.toUpperCase() || '') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 bg-background/20 backdrop-blur-3xl overflow-hidden">
          {/* Pulsing Aura */}
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.25, 0.15]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute w-[400px] h-[400px] rounded-full bg-accent/20 blur-[100px]"
          />
          
          <div className="relative flex flex-col items-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-32 h-32 rounded-3xl bg-foreground/[0.03] border border-border-subtle flex items-center justify-center text-accent/40 shadow-2xl backdrop-blur-xl"
            >
              <Music size={48} strokeWidth={1} />
            </motion.div>
            
            <div className="mt-8 text-center">
              <h2 className="text-[13px] font-bold text-foreground/80 tracking-tight max-w-[300px] truncate">
                {metadata.title || (currentTrack?.split(/[\\/]/).pop())}
              </h2>
              <p className="text-[9px] text-muted font-bold uppercase tracking-[0.3em] mt-2">
                Audio Playback
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`relative z-10 h-full w-full flex flex-col pointer-events-none transition-opacity duration-500 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <header 
          className={`p-1 flex justify-between items-center transition-all duration-500 relative z-20 ${
            showControls ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-all pointer-events-none">
              <img src="/lieb-player-icon.png" alt="Logo" className="w-3.5 h-3.5 object-contain hue-rotate-[var(--accent-hue)]" />
              <span className="text-accent text-[10px] tracking-[0.15em] font-bold uppercase">
                Lieb
              </span>
            </div>

            <AnimatePresence>
              {isUpdateAvailable && (
                <motion.button
                  initial={{ opacity: 0, x: -10, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -10, scale: 0.8 }}
                  onClick={() => {
                    setSettingsActiveTab('maintenance');
                    setSettingsOpen(true);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-accent/20 text-white transition-all cursor-pointer group shadow-lg shadow-accent/20 hover:brightness-110 active:scale-95 pointer-events-auto"
                >
                  <motion.div
                    animate={{ y: [0, 1.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Download size={8} strokeWidth={4} />
                  </motion.div>
                  <span className="text-[8px] font-black uppercase tracking-widest">Update</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <WindowControls />
        </header>

        <div className="flex-1 w-full" />

        <div className="px-4 pb-12 flex items-end justify-between pointer-events-none relative flex-1">
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
        <MainControls />
      </div>

      <ResizeGrip position="bl" show={showControls && !isBlocking} />
      <ResizeGrip position="br" show={showControls && !isBlocking} />
      {isBlocking && (
        <div 
          className="absolute inset-0 bg-transparent pointer-events-auto"
        />
      )}
    </div>
  );
}

function App() {
  const label = getCurrentWindow().label;
  const { theme } = usePlayerStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const timer = setTimeout(() => {
      getCurrentWindow().show();
    }, 100);
    return () => clearTimeout(timer);
  }, [theme, label]);

  if (label === 'settings') return <SettingsWindow />;
  if (label === 'library') return <LibraryWindow />;
  if (label === 'subtitle-search') return <SubtitleSearchWindow />;
  return <MainPlayer />;
}

export default App;
