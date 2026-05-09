import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { command, setProperty } from 'tauri-plugin-mpv-api';
import { emit } from '@tauri-apps/api/event';
import { showActionOSD } from '../utils/osd';
import { useTranslation } from '../i18n';

const openWindow = async (label: string, title: string, width: number, height: number) => {
  try {
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
      alwaysOnTop: true,
    });

    // Show blocking overlay on main window
    usePlayerStore.getState().setBlocking(true);

    // Re-enable when closed
    win.once('tauri://destroyed', () => {
      usePlayerStore.getState().setBlocking(false);
      mainWin.setFocus();
    });

    win.once('tauri://error', () => {
      usePlayerStore.getState().setBlocking(false);
    });
  } catch (err) {
    console.error(`Failed to open ${label} window:`, err);
  }
};

const closeWindow = async (label: string) => {
  try {
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) await existing.close();
  } catch {}
};

let volumeOSDTimer: number | null = null;

const showVolumeOSD = () => {
  usePlayerStore.getState().setShowVolumeOSD(true);
  if (volumeOSDTimer) window.clearTimeout(volumeOSDTimer);
  volumeOSDTimer = window.setTimeout(() => {
    usePlayerStore.getState().setShowVolumeOSD(false);
  }, 1500);
};

export const useKeyboardShortcuts = () => {
  const { 
    isPlaying,
    isMuted,
    isFullscreen, setFullscreen,
    duration,
    scrollMode,
    volume,
    subsEnabled, setSubsEnabled
  } = usePlayerStore();
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const hasMedia = duration > 0;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (hasMedia) {
            const state = usePlayerStore.getState();
            if (state.duration > 0 && state.currentTime >= state.duration - 0.2) {
              await command('seek', [0, 'absolute']);
            }
            await command('cycle', ['pause']);
            showActionOSD(!state.isPlaying ? t('play') : t('pause'), !state.isPlaying ? 'play' : 'pause');
          }
          break;
        case 'KeyF': {
          const appWindow = getCurrentWindow();
          const nextFullscreen = !isFullscreen;
          await appWindow.setFullscreen(nextFullscreen);
          setFullscreen(nextFullscreen);
          showActionOSD(nextFullscreen ? t('fullscreen.on') : t('fullscreen.off'), 'maximize');
          break;
        }
        case 'KeyM':
          if (hasMedia) await setProperty('mute', !isMuted);
          break;
        case 'KeyL':
          openWindow('library', 'Library', 800, 560);
          break;
        case 'KeyS':
          openWindow('settings', 'Settings', 800, 560);
          break;
        case 'KeyN': {
          const { playlist, currentTrack, setCurrentTrack } = usePlayerStore.getState();
          const idx = playlist.findIndex(t => t.path === currentTrack);
          if (idx !== -1 && idx < playlist.length - 1) {
            const next = playlist[idx + 1];
            await emit('lieb-play', { path: next.path, subs: next.subs });
            setCurrentTrack(next.path);
          }
          break;
        }
        case 'KeyP': {
          const { playlist, currentTrack, setCurrentTrack } = usePlayerStore.getState();
          const idx = playlist.findIndex(t => t.path === currentTrack);
          if (idx > 0) {
            const prev = playlist[idx - 1];
            await emit('lieb-play', { path: prev.path, subs: prev.subs });
            setCurrentTrack(prev.path);
          }
          break;
        }
        case 'ArrowRight':
          if (hasMedia) {
            await command('seek', [10, 'relative']);
            showActionOSD(t('seek.fwd'), 'forward');
          }
          break;
        case 'ArrowLeft':
          if (hasMedia) {
            await command('seek', [-10, 'relative']);
            showActionOSD(t('seek.bwd'), 'rewind');
          }
          break;
        case 'ArrowUp': {
          e.preventDefault();
          const currentVol = usePlayerStore.getState().volume;
          const newVol = Math.min(100, currentVol + 5);
          await setProperty('volume', newVol);
          showVolumeOSD();
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const currentVol = usePlayerStore.getState().volume;
          const newVol = Math.max(0, currentVol - 5);
          await setProperty('volume', newVol);
          showVolumeOSD();
          break;
        }
        case 'Escape':
          if (isFullscreen) {
            const win = getCurrentWindow();
            await win.setFullscreen(false);
            setFullscreen(false);
          }
          closeWindow('settings');
          closeWindow('library');
          break;
        case 'KeyC':
          if (hasMedia) {
            const next = !subsEnabled;
            await setProperty('sub-visibility', next);
            setSubsEnabled(next);
            showActionOSD(next ? t('captions.on') : t('captions.off'), 'subtitles');
          }
          break;
      }
    };

    const handleWheel = async (e: WheelEvent) => {
      const state = usePlayerStore.getState();
      if (state.duration <= 0) return;

      const delta = e.deltaY < 0 ? 5 : -5;

      if (state.scrollMode === 'volume') {
        const newVol = Math.max(0, Math.min(100, state.volume + delta));
        await setProperty('volume', newVol);
        showVolumeOSD();
      } else {
        await command('seek', [delta, 'relative']);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [
    isPlaying, isMuted, isFullscreen, duration, setFullscreen,
    scrollMode, volume, subsEnabled, setSubsEnabled
  ]);
};
