import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { showActionOSD } from '../utils/osd';
import { useTranslation } from '../i18n';
import { openWindow, closeWindow } from '../utils/window';
import { command, setProperty } from 'tauri-plugin-mpv-api';
import { emit } from '@tauri-apps/api/event';

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
        case 'Space': {
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
          break;
        }
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
          usePlayerStore.getState().playNext();
          break;
        }
        case 'KeyP': {
          usePlayerStore.getState().playPrevious();
          break;
        }
        case 'ArrowRight':
          if (hasMedia) {
            const interval = usePlayerStore.getState().seekInterval;
            await command('seek', [interval, 'relative']);
            showActionOSD(`${interval}s`, 'forward');
          }
          break;
        case 'ArrowLeft':
          if (hasMedia) {
            const interval = usePlayerStore.getState().seekInterval;
            await command('seek', [-interval, 'relative']);
            showActionOSD(`${interval}s`, 'rewind');
          }
          break;
        case 'ArrowUp': {
          e.preventDefault();
          const currentVol = usePlayerStore.getState().volume;
          const newVol = Math.min(150, currentVol + 5);
          await setProperty('volume', newVol);
          await setProperty('mute', false);
          showVolumeOSD();
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const currentVol = usePlayerStore.getState().volume;
          const newVol = Math.max(0, currentVol - 5);
          await setProperty('volume', newVol);
          await setProperty('mute', false);
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
        case 'KeyI':
          if (hasMedia) {
            const s = usePlayerStore.getState();
            s.setMediaInfoOpen(!s.isMediaInfoOpen);
          }
          break;
      }
    };

    const handleWheel = async (e: WheelEvent) => {
      const state = usePlayerStore.getState();
      if (state.duration <= 0) return;

      const delta = e.deltaY < 0 ? 5 : -5;

      if (state.scrollMode === 'volume') {
        const newVol = Math.max(0, Math.min(150, state.volume + delta));
        await setProperty('volume', newVol);
        await setProperty('mute', false);
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
