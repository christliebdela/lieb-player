import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { command } from 'tauri-plugin-mpv-api';

interface Metadata {
  title: string;
  description: string;
  episode: string;
  season: string;
}

interface PlayerState {
  isPlaying: boolean;
  volume: number;
  duration: number;
  currentTime: number;
  isMuted: boolean;
  currentTrack: string | null;
  playlist: string[];
  isSettingsOpen: boolean;
  isLibraryOpen: boolean;
  isFullscreen: boolean;
  subsEnabled: boolean;
  loopMode: 'off' | 'one' | 'all';
  showControls: boolean;
  showVolumeOSD: boolean;
  actionOSD: { message: string; icon: string } | null;
  equalizer: number[]; // 10 bands: 31, 62, 125, 250, 500, 1k, 2k, 4k, 8k, 16k
  accentColor: string;
  crossfade: boolean;
  crossfadeDuration: number;
  scrollMode: 'volume' | 'seek';
  hwAcceleration: boolean;
  rememberPosition: boolean;
  autoPlay: boolean;
  renderingBackend: 'gpu-next' | 'd3d11' | 'vulkan';
  interpolation: boolean;
  deband: boolean;
  appLanguage: 'English' | 'French' | 'Spanish';
  metadata: Metadata;
  theme: 'dark' | 'light';
  persistLibrary: boolean;
  
  // Actions
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
  setMuted: (muted: boolean) => void;
  setCurrentTrack: (track: string | null) => void;
  setPlaylist: (playlist: string[]) => void;
  addToPlaylist: (track: string) => void;
  removeFromPlaylist: (track: string) => void;
  clearPlaylist: () => void;
  setSettingsOpen: (open: boolean) => void;
  setLibraryOpen: (open: boolean) => void;
  setFullscreen: (full: boolean) => void;
  setSubsEnabled: (enabled: boolean) => void;
  setLoopMode: (mode: 'off' | 'one' | 'all') => void;
  setShowControls: (show: boolean) => void;
  setShowVolumeOSD: (show: boolean) => void;
  setActionOSD: (osd: { message: string; icon: string } | null) => void;
  setEqualizer: (bands: number[]) => void;
  setAccentColor: (color: string) => void;
  setCrossfade: (enabled: boolean) => void;
  setCrossfadeDuration: (duration: number) => void;
  setScrollMode: (mode: 'volume' | 'seek') => void;
  setHwAcceleration: (enabled: boolean) => void;
  setRememberPosition: (enabled: boolean) => void;
  setAutoPlay: (enabled: boolean) => void;
  setRenderingBackend: (backend: 'gpu-next' | 'd3d11' | 'vulkan') => void;
  setInterpolation: (enabled: boolean) => void;
  setDeband: (enabled: boolean) => void;
  setAppLanguage: (lang: 'English' | 'French' | 'Spanish') => void;
  setMetadata: (metadata: Partial<Metadata>) => void;
  setPersistLibrary: (persist: boolean) => void;
  aspectRatio: number;
  setAspectRatio: (ratio: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      isPlaying: false,
      volume: 100,
      duration: 0,
      currentTime: 0,
      isMuted: false,
      currentTrack: null,
      playlist: [],
      isSettingsOpen: false,
      isLibraryOpen: false,
      isFullscreen: false,
      subsEnabled: true,
      loopMode: 'off',
      showControls: true,
      showVolumeOSD: false,
      actionOSD: null,
      equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      accentColor: '#6366f1',
      crossfade: true,
      crossfadeDuration: 2,
      scrollMode: 'volume',
      hwAcceleration: true,
      rememberPosition: true,
      autoPlay: true,
      renderingBackend: 'gpu-next',
      interpolation: true,
      deband: true,
      appLanguage: 'English',
      theme: 'dark',
      persistLibrary: true,
      aspectRatio: 16/9,
      metadata: {
        title: '',
        description: '',
        episode: '',
        season: '',
      },

      setPlaying: (playing) => set({ isPlaying: playing }),
      setVolume: (volume) => set({ volume }),
      setDuration: (duration) => set({ duration }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setMuted: (muted) => set({ isMuted: muted }),
      setCurrentTrack: (track) => set({ currentTrack: track }),
      setPlaylist: (playlist) => set({ playlist }),
      addToPlaylist: (track) => set((state) => ({ playlist: [...state.playlist, track] })),
      removeFromPlaylist: (track) => {
        const state = get();
        const newPlaylist = state.playlist.filter((t) => t !== track);
        
        // If we remove the current track, stop playback or skip?
        // User says "still keeps it playing", so let's stop it if it's the current one.
        if (state.currentTrack === track) {
          command('stop');
          set({ currentTrack: null, duration: 0, currentTime: 0, isPlaying: false });
        }
        
        set({ playlist: newPlaylist });
      },
      clearPlaylist: () => {
        const state = get();
        if (state.currentTrack) {
          command('stop');
          set({ currentTrack: null, duration: 0, currentTime: 0, isPlaying: false });
        }
        set({ playlist: [] });
      },
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setLibraryOpen: (open) => set({ isLibraryOpen: open }),
      setFullscreen: (full) => set({ isFullscreen: full }),
      setSubsEnabled: (enabled) => set({ subsEnabled: enabled }),
      setLoopMode: (mode) => set({ loopMode: mode }),
      setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
      setShowControls: (show) => set({ showControls: show }),
      setShowVolumeOSD: (show) => set({ showVolumeOSD: show }),
      setActionOSD: (osd) => set({ actionOSD: osd }),
      setEqualizer: (bands) => set({ equalizer: bands }),
      setAccentColor: (color) => set({ accentColor: color }),
      setCrossfade: (enabled) => set({ crossfade: enabled }),
      setCrossfadeDuration: (duration) => set({ crossfadeDuration: duration }),
      setScrollMode: (mode) => set({ scrollMode: mode }),
      setHwAcceleration: (enabled) => set({ hwAcceleration: enabled }),
      setRememberPosition: (enabled) => set({ rememberPosition: enabled }),
      setAutoPlay: (enabled) => set({ autoPlay: enabled }),
      setRenderingBackend: (backend) => set({ renderingBackend: backend }),
      setInterpolation: (enabled) => set({ interpolation: enabled }),
      setDeband: (enabled) => set({ deband: enabled }),
      setAppLanguage: (lang) => set({ appLanguage: lang }),
      setMetadata: (metadata) => set({ metadata: { ...get().metadata, ...metadata } }),
      setTheme: (theme) => set({ theme }),
      setPersistLibrary: (persist) => set({ persistLibrary: persist }),
    }),
    {
      name: 'lieb-player-storage',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        currentTrack: state.currentTrack,
        playlist: state.persistLibrary ? state.playlist : [],
        loopMode: state.loopMode,
        equalizer: state.equalizer,
        accentColor: state.accentColor,
        crossfade: state.crossfade,
        crossfadeDuration: state.crossfadeDuration,
        scrollMode: state.scrollMode,
        hwAcceleration: state.hwAcceleration,
        rememberPosition: state.rememberPosition,
        autoPlay: state.autoPlay,
        renderingBackend: state.renderingBackend,
        interpolation: state.interpolation,
        deband: state.deband,
        appLanguage: state.appLanguage,
        theme: state.theme,
        persistLibrary: state.persistLibrary,
      }),
    }
  )
);

// Cross-window synchronization for Tauri webviews
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'lieb-player-storage') {
      usePlayerStore.persist.rehydrate();
    }
  });
}
