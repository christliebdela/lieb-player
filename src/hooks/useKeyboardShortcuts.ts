import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { command, setProperty } from 'tauri-plugin-mpv-api';

const openWindow = async (label: string, title: string, width: number, height: number) => {
  try {
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await existing.close();
      return;
    }
    new WebviewWindow(label, {
      url: '/',
      title,
      width,
      height,
      center: true,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
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
    volume
  } = usePlayerStore();

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
          }
          break;
        case 'KeyF':
          const appWindow = getCurrentWindow();
          const nextFullscreen = !isFullscreen;
          await appWindow.setFullscreen(nextFullscreen);
          setFullscreen(nextFullscreen);
          break;
        case 'KeyM':
          if (hasMedia) await setProperty('mute', !isMuted);
          break;
        case 'KeyL':
          openWindow('library', 'Library', 800, 560);
          break;
        case 'KeyS':
          openWindow('settings', 'Settings', 800, 560);
          break;
        case 'KeyN':
          if (hasMedia) await command('playlist_next');
          break;
        case 'KeyP':
          if (hasMedia) await command('playlist_prev');
          break;
        case 'ArrowRight':
          if (hasMedia) await command('seek', [10, 'relative']);
          break;
        case 'ArrowLeft':
          if (hasMedia) await command('seek', [-10, 'relative']);
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
    scrollMode, volume
  ]);
};
