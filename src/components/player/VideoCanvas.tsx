import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { command, init, observeProperties, setProperty } from 'tauri-plugin-mpv-api';
import { getCurrentWindow, PhysicalSize, currentMonitor } from '@tauri-apps/api/window';
import { showActionOSD } from '../../utils/osd';
import { useTranslation } from '../../i18n';

const OBSERVED_PROPERTIES = [
  'pause', 'time-pos', 'duration', 'volume', 'mute', 'filename', 'path', 'media-title',
  'video-params/w', 'video-params/h', 'dwidth', 'dheight', 'eof-reached',
  'track-list', 'core-idle', 'buffering-percentage'
] as const;

export const VideoCanvas: React.FC<{ onToggleFullscreen?: () => void }> = ({ onToggleFullscreen }) => {
  const { 
    setDuration, setCurrentTime, setPlaying, 
    setMetadata, setVolume, setMuted, 
    setAspectRatio, isFullscreen 
  } = usePlayerStore();
  const { t } = useTranslation();
  const initialized = useRef(false);
  const resizeDebounceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Crucial: Set background to transparent for MPV to show through
    document.body.style.setProperty('background-color', 'transparent', 'important');
    document.documentElement.style.setProperty('background-color', 'transparent', 'important');
    document.documentElement.style.setProperty('--body-bg', 'transparent', 'important');



    let lastVideoW = 0;
    let lastVideoH = 0;
    let pendingW = 0;
    let pendingH = 0;

    const resizeWindowToVideo = async (videoW: number, videoH: number) => {
      if (videoW === lastVideoW && videoH === lastVideoH) return;
      
      const performResize = async () => {
        lastVideoW = videoW;
        lastVideoH = videoH;

        try {
          const appWindow = getCurrentWindow();
          setAspectRatio(videoW / videoH);

          if (await appWindow.isMaximized() || isFullscreen) {
            return;
          }

          const monitor = await currentMonitor();
          const scaleFactor = await appWindow.scaleFactor();
          if (!monitor) return;

          const monitorW = monitor.size.width / scaleFactor;
          const monitorH = (monitor.size.height / scaleFactor) - 100;

          let targetW = videoW;
          let targetH = videoH;

          const scale = Math.min(monitorW / targetW, monitorH / targetH, 1.0);
          targetW = Math.round(targetW * scale);
          targetH = Math.round(targetH * scale);

          await appWindow.setSize(new PhysicalSize(
            Math.round(targetW * scaleFactor), 
            Math.round(targetH * scaleFactor)
          ));
          await appWindow.center();
        } catch (err) {
          console.warn(' Lieb: Resize failed:', err);
        }
      };

      // If it's the first resize for this session, do it immediately.
      // If it's a change during playback, debounce to skip momentary glitches.
      if (lastVideoW === 0) {
        performResize();
      } else {
        if (resizeDebounceTimer.current) window.clearTimeout(resizeDebounceTimer.current);
        resizeDebounceTimer.current = window.setTimeout(performResize, 250);
      }
    };

    const appWindow = getCurrentWindow();
    let isInternallyResizing = false;
    let resizeTimeout: any = null;

    const unlistenResize = appWindow.onResized(async () => {
      if (isInternallyResizing) return;
      if (resizeTimeout) return;
      
      resizeTimeout = setTimeout(async () => {
        try {
          const size = await appWindow.innerSize();
          const currentAspect = usePlayerStore.getState().aspectRatio;
          const isMaxed = await appWindow.isMaximized();
          const isFull = await appWindow.isFullscreen();
          
          if (isMaxed || isFull || isFullscreen) {
            resizeTimeout = null;
            return;
          }

          const ratio = currentAspect || (pendingW > 0 && pendingH > 0 ? pendingW / pendingH : 16/9);
          const expectedH = Math.round(size.width / ratio);
          
          if (Math.abs(size.height - expectedH) > 5) {
            isInternallyResizing = true;
            await appWindow.setSize(new PhysicalSize(size.width, expectedH));
            setTimeout(() => { isInternallyResizing = false; }, 100);
          }
        } catch (err) {}
        resizeTimeout = null;
      }, 16);
    });

    const setupEngine = async () => {
      try {
        console.log('Lieb Player: Initializing MPV Engine...');
        const state = usePlayerStore.getState();
        const args = [
          state.hwAcceleration ? '--hwdec=auto-safe' : '--hwdec=no',
          state.rememberPosition ? '--save-position-on-quit=yes' : '--save-position-on-quit=no',
          state.renderingBackend === 'gpu-next' ? '--vo=gpu-next' : '--vo=gpu',
          state.interpolation ? '--interpolation=yes' : '--interpolation=no',
          state.interpolation ? '--video-sync=display-resample' : '--video-sync=audio',
          state.deband ? '--deband=yes' : '--deband=no',
          '--keep-open=yes',
          '--no-osc',
          '--osd-level=0',
          '--no-osd-bar',
          '--osd-playing-msg=',
          '--osd-msg1=',
          '--osd-msg2=',
          '--osd-msg3=',
          '--script-opts=osc-visibility=never',
          '--no-input-default-bindings',
          '--idle=yes',
          '--title=',
          '--no-terminal',
          '--load-scripts=yes',
          '--pause=yes',
          '--ao=wasapi',
          '--audio-stream-silence=yes',
          '--audio-wait-open=0.5',
        ];

        if (state.renderingBackend !== 'gpu-next') {
          args.push(`--gpu-api=${state.renderingBackend}`);
        }

        // 1. Initialize Engine
        await init({
          args,
          observedProperties: OBSERVED_PROPERTIES,
        });
        console.log('Lieb Player: Engine Core Ready');

        // Set engine ready before applying props
        usePlayerStore.getState().setEngineReady(true);

        // 2. Apply Initial Properties Safely
        const quality = state.streamingQuality || '1080';
        await setProperty('ytdl-format', `bestvideo[height<=${quality}]+bestaudio/best`);

        // 3. Load File if needed
        const track = state.currentTrack;
        if (track) {
          await command('loadfile', [track, 'replace']);
          await setProperty('pause', true);
        }

        // 4. Setup Properties Observer
        const unlistenProps = await observeProperties(
          OBSERVED_PROPERTIES,
          async ({ name, data }) => {
            switch (name) {
              case 'time-pos': setCurrentTime((data as number) || 0); break;
              case 'duration': setDuration((data as number) || 0); break;
              case 'pause': setPlaying(!(data as boolean)); break;
              case 'volume': setVolume(data as number); break;
              case 'mute': setMuted(data as boolean); break;
              case 'media-title': 
                if (data) {
                  const title = String(data);
                  setMetadata({ title });
                  const s = usePlayerStore.getState();
                  if (s.currentTrack) {
                    s.updatePlaylistTitle(s.currentTrack, title);
                  }
                }
                break;
              case 'filename': 
                if (data && !usePlayerStore.getState().metadata.title) {
                  setMetadata({ title: String(data) }); 
                }
                break;
              case 'path': 
                if (data) {
                  const newPath = String(data);
                  const s = usePlayerStore.getState();
                  s.setCurrentTrack(newPath);
                  const t = s.playlist.find(it => it.path === newPath);
                  if (t && t.subs && t.subs.length > 0) {
                    for (const sub of t.subs) {
                      await command('sub-add', [sub, 'select']);
                    }
                  }
                }
                break;
              case 'track-list': {
                const tracks = data as any[];
                if (Array.isArray(tracks)) {
                  const hasSubs = tracks.some(t => t.type === 'sub');
                  usePlayerStore.getState().setHasSubtitles(hasSubs);
                }
                break;
              }
              case 'video-params/w':
              case 'dwidth':
                if (typeof data === 'number' && data > 0) {
                  pendingW = data;
                  if (pendingH > 0) resizeWindowToVideo(pendingW, pendingH);
                }
                break;
              case 'video-params/h':
              case 'dheight':
                if (typeof data === 'number' && data > 0) {
                  pendingH = data;
                  if (pendingW > 0) resizeWindowToVideo(pendingW, pendingH);
                }
                break;
              case 'eof-reached':
                if (data === true) {
                  const s = usePlayerStore.getState();
                  if (s.loopMode === 'off') {
                    command('seek', [0, 'absolute']);
                    setProperty('pause', true);
                  }
                }
                break;
              case 'core-idle':
                usePlayerStore.getState().setBuffering(data as boolean);
                break;
            }
          }
        );

        return unlistenProps;
      } catch (err) {
        console.error(' Lieb: Engine Startup Failed:', err);
      }
    };

    // Quality Watcher (only active after component mounts)
    const unsubQuality = usePlayerStore.subscribe(
      (state) => state.streamingQuality,
      async (quality) => {
        try {
          await setProperty('ytdl-format', `bestvideo[height<=${quality}]+bestaudio/best`);
          const s = usePlayerStore.getState();
          
          // Only reload if we are currently playing a network stream
          if (s.currentTrack?.startsWith('http')) {
            const currentPos = s.currentTime;
            console.log(`Lieb Player: Quality Switch -> ${quality}p (Seeking to ${currentPos}s)`);
            // Reload the file at the exact current position to switch quality
            await command('loadfile', [s.currentTrack, 'replace', `start=${currentPos}`]);
            
            // If it was playing, make sure it continues playing
            if (s.isPlaying) {
              await setProperty('pause', false);
            }
          }
        } catch (err) {
          console.error('Lieb Player: Quality Switch Error:', err);
        }
      }
    );

    const cleanupPromise = setupEngine();

    return () => {
      if (resizeDebounceTimer.current) window.clearTimeout(resizeDebounceTimer.current);
      unsubQuality();
      cleanupPromise.then(unlisten => unlisten?.());
      unlistenResize.then(f => f?.());
    };
  }, [setDuration, setCurrentTime, setPlaying, setMetadata, setVolume, setMuted, setAspectRatio]);

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    command('cycle', ['pause']);
    const state = usePlayerStore.getState();
    showActionOSD(!state.isPlaying ? t('play') : t('pause'), !state.isPlaying ? 'play' : 'pause');
  };

  return (
    <div 
      className="absolute inset-0 bg-transparent pointer-events-auto"
      onContextMenu={handleRightClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onToggleFullscreen?.();
      }}
      data-tauri-drag-region={!isFullscreen ? "true" : undefined}
    >
      <video-player 
        class="w-full h-full bg-transparent" 
        data-tauri-drag-region={!isFullscreen ? "true" : undefined}
      />
    </div>
  );
};
