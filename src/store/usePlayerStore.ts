import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { emit } from '@tauri-apps/api/event';

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
  playlist: { path: string; subs: string[] }[];
  isSettingsOpen: boolean;
  isLibraryOpen: boolean;
  isSubSearchOpen: boolean;
  isFullscreen: boolean;
  subsEnabled: boolean;
  loopMode: 'off' | 'one' | 'all';
  showControls: boolean;
  showVolumeOSD: boolean;
  actionOSD: { message: string; icon: string } | null;
  controlBarLayout: 'default' | 'centered' | 'compact' | 'minimal';
  equalizer: number[]; // 10 bands: 31, 62, 125, 250, 500, 1k, 2k, 4k, 8k, 16k
  accentColor: string;
  scrollMode: 'volume' | 'seek';
  hwAcceleration: boolean;
  rememberPosition: boolean;
  autoPlay: boolean;
  renderingBackend: 'gpu-next' | 'd3d11' | 'vulkan';
  interpolation: boolean;
  deband: boolean;
  appLanguage: 'English' | 'French' | 'Spanish';
  metadata: Metadata;
  theme: 'midnight' | 'daylight' | 'aura' | 'sakura';
  persistLibrary: boolean;
  thumbnailCacheDays: number;
  customPresets: string[];
  isBlocking: boolean;
  seekInterval: number;
  hasSubtitles: boolean;
  
  // Actions
  setBlocking: (blocking: boolean) => void;
  setSeekInterval: (interval: number) => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
  setMuted: (muted: boolean) => void;
  setCurrentTrack: (track: string | null) => void;
  setPlaylist: (playlist: { path: string; subs: string[] }[]) => void;
  addToPlaylist: (path: string, subs?: string[]) => void;
  removeFromPlaylist: (track: string) => void;
  clearPlaylist: () => void;
  setSettingsOpen: (open: boolean) => void;
  setLibraryOpen: (open: boolean) => void;
  setSubSearchOpen: (open: boolean) => void;
  setFullscreen: (full: boolean) => void;
  setSubsEnabled: (enabled: boolean) => void;
  setLoopMode: (mode: 'off' | 'one' | 'all') => void;
  setShowControls: (show: boolean) => void;
  setShowVolumeOSD: (show: boolean) => void;
  setActionOSD: (osd: { message: string; icon: string } | null) => void;
  setControlBarLayout: (layout: 'default' | 'centered' | 'compact' | 'minimal') => void;
  setEqualizer: (bands: number[]) => void;
  setAccentColor: (color: string) => void;
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
  setHasSubtitles: (has: boolean) => void;
  aspectRatio: number;
  setAspectRatio: (ratio: number) => void;
  setTheme: (theme: 'midnight' | 'daylight' | 'aura' | 'sakura') => void;
  addCustomPreset: (color: string) => void;
  removeCustomPreset: (color: string) => void;
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
      isSubSearchOpen: false,
      isFullscreen: false,
      subsEnabled: true,
      loopMode: 'off',
      showControls: true,
      showVolumeOSD: false,
      actionOSD: null,
      controlBarLayout: 'default',
      equalizer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      accentColor: '#6366f1',
      scrollMode: 'volume',
      hwAcceleration: true,
      rememberPosition: true,
      autoPlay: true,
      renderingBackend: 'gpu-next',
      interpolation: true,
      deband: true,
      appLanguage: 'English',
      theme: 'midnight',
      persistLibrary: true,
      thumbnailCacheDays: 30,
      aspectRatio: 16/9,
      customPresets: [],
      isBlocking: false,
      seekInterval: 10,
      hasSubtitles: false,
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
      addToPlaylist: (path, subs = []) => set((state) => {
        // Prevent duplicates
        if (state.playlist.find(p => p.path === path)) return state;
        return { playlist: [...state.playlist, { path, subs }] };
      }),
      removeFromPlaylist: (path) => {
        const state = get();
        const newPlaylist = state.playlist.filter((t) => t.path !== path);
        
        if (state.currentTrack === path) {
          emit('lieb-stop');
          set({ currentTrack: null, duration: 0, currentTime: 0, isPlaying: false });
        }
        
        set({ playlist: newPlaylist });
      },
      clearPlaylist: () => {
        const state = get();
        if (state.currentTrack) {
          emit('lieb-stop');
          set({ currentTrack: null, duration: 0, currentTime: 0, isPlaying: false });
        }
        set({ playlist: [] });
      },
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setLibraryOpen: (open) => set({ isLibraryOpen: open }),
      setSubSearchOpen: (open) => set({ isSubSearchOpen: open }),
      setFullscreen: (full) => set({ isFullscreen: full }),
      setSubsEnabled: (enabled) => set({ subsEnabled: enabled }),
      setLoopMode: (mode) => set({ loopMode: mode }),
      setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
      setShowControls: (show) => set({ showControls: show }),
      setShowVolumeOSD: (show) => set({ showVolumeOSD: show }),
      setActionOSD: (osd) => set({ actionOSD: osd }),
      setControlBarLayout: (layout) => set({ controlBarLayout: layout }),
      setEqualizer: (bands) => set({ equalizer: bands }),
      setAccentColor: (color) => set({ accentColor: color }),
      setScrollMode: (mode) => set({ scrollMode: mode }),
      setHwAcceleration: (enabled) => set({ hwAcceleration: enabled }),
      setRememberPosition: (enabled) => set({ rememberPosition: enabled }),
      setAutoPlay: (enabled) => set({ autoPlay: enabled }),
      setRenderingBackend: (backend) => set({ renderingBackend: backend }),
      setInterpolation: (enabled) => set({ interpolation: enabled }),
      setDeband: (enabled) => set({ deband: enabled }),
      setAppLanguage: (lang) => set({ appLanguage: lang }),
      setMetadata: (metadata) => set({ metadata: { ...get().metadata, ...metadata } }),
      setTheme: (theme) => {
        const defaultAccents = {
          midnight: '#6366f1',
          daylight: '#3b82f6',
          aura: '#a78bfa',
          sakura: '#f472b6'
        };
        set({ theme, accentColor: defaultAccents[theme] });
      },
      addCustomPreset: (color) => {
        const current = get().customPresets;
        if (!current.includes(color)) {
          set({ customPresets: [...current, color].slice(-8) }); // Keep last 8
        }
      },
      removeCustomPreset: (color) => {
        set({ customPresets: get().customPresets.filter(p => p !== color) });
      },
      setBlocking: (blocking) => set({ isBlocking: blocking }),
      setSeekInterval: (interval) => set({ seekInterval: interval }),
      setPersistLibrary: (persist) => set({ persistLibrary: persist }),
      setHasSubtitles: (has) => set({ hasSubtitles: has }),
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
        controlBarLayout: state.controlBarLayout,
        accentColor: state.accentColor,
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
        customPresets: state.customPresets,
        seekInterval: state.seekInterval,
        metadata: state.metadata,
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
