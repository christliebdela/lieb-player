import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { emit } from '@tauri-apps/api/event';

interface Metadata {
  title: string;
  description: string;
  episode?: string;
  season?: string;
  hasArtwork?: boolean;
}

interface PlaylistItem {
  path: string; 
  subs: string[]; 
  title?: string; 
  addedAt: number;
}

interface PlayerState {
  isPlaying: boolean;
  volume: number;
  duration: number;
  currentTime: number;
  isMuted: boolean;
  currentTrack: string | null;
  playlist: PlaylistItem[];
  isSettingsOpen: boolean;
  isLibraryOpen: boolean;
  isSubSearchOpen: boolean;
  streamingQuality: string;
  isFullscreen: boolean;
  isEngineReady: boolean;
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
  autoResize: boolean;
  osApiKey: string;
  setOsApiKey: (key: string) => void;
  setAutoResize: (autoResize: boolean) => void;
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
  autoUpdateCheck: boolean;
  autoUpdateDownload: boolean;
  autoUpdateInstall: boolean;
  downloadProgress: number | null;
  hasUpdate: boolean;
  settingsActiveTab: string;
  
  // Actions
  setBlocking: (blocking: boolean) => void;
  setSeekInterval: (interval: number) => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
  setMuted: (muted: boolean) => void;
  setCurrentTrack: (track: string | null) => void;
  setPlaylist: (playlist: PlaylistItem[]) => void;
  addToPlaylist: (path: string, subs?: string[], title?: string) => void;
  removeFromPlaylist: (track: string) => void;
  clearPlaylist: () => void;
  setSettingsOpen: (open: boolean) => void;
  setLibraryOpen: (open: boolean) => void;
  setSubSearchOpen: (open: boolean) => void;
  setStreamingQuality: (quality: string) => void;
  setFullscreen: (full: boolean) => void;
  setEngineReady: (ready: boolean) => void;
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
  isBuffering: boolean;
  setBuffering: (buffering: boolean) => void;
  setSettingsActiveTab: (tab: string) => void;
  updatePlaylistTitle: (path: string, title: string) => void;
  setAutoUpdateCheck: (check: boolean) => void;
  setAutoUpdateDownload: (download: boolean) => void;
  setAutoUpdateInstall: (install: boolean) => void;
  setDownloadProgress: (progress: number | null) => void;
  setHasUpdate: (has: boolean) => void;
  attachSubtitlesToTrack: (path: string, subPaths: string[]) => void;
  customEqPresets: { name: string; bands: number[] }[];
  addCustomEqPreset: (name: string, bands: number[]) => void;
  removeCustomEqPreset: (name: string) => void;
  playNext: (isAuto?: boolean) => void;
  playPrevious: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  subscribeWithSelector(
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
      streamingQuality: '1080',
      isFullscreen: false,
      isEngineReady: false,
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
      autoResize: false,
      osApiKey: '',
      setOsApiKey: (osApiKey) => set({ osApiKey }),
      setAutoResize: (autoResize) => set({ autoResize }),
      renderingBackend: 'gpu-next',
      interpolation: true,
      deband: true,
      appLanguage: 'English',
      theme: 'midnight',
      persistLibrary: true,
      thumbnailCacheDays: 30,
      aspectRatio: 16/9,
      autoUpdateCheck: true,
      autoUpdateDownload: false,
      autoUpdateInstall: false,
      downloadProgress: null,
      hasUpdate: false,
      settingsActiveTab: 'general',
      customEqPresets: [],

      setSettingsActiveTab: (tab) => set({ settingsActiveTab: tab }),
      customPresets: [],
      isBlocking: false,
      seekInterval: 10,
      hasSubtitles: false,
      isBuffering: false,
      metadata: {
        title: '',
        description: '',
        episode: '',
        season: '',
        hasArtwork: false,
      },

      setPlaying: (playing) => set({ isPlaying: playing }),
      setVolume: (volume) => set({ volume }),
      setDuration: (duration) => set({ duration }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setMuted: (muted) => set({ isMuted: muted }),
      setCurrentTrack: (track) => set({ currentTrack: track }),
      setPlaylist: (playlist) => set({ playlist }),
      addToPlaylist: (path, subs = [], title) => set((state) => {
        // Prevent duplicates
        if (state.playlist.find(p => p.path === path)) return state;
        return { playlist: [...state.playlist, { path, subs, title, addedAt: Date.now() }] };
      }),
      removeFromPlaylist: (path) => {
        const state = get();
        const newPlaylist = state.playlist.filter((t) => t.path !== path);
        
        if (state.currentTrack === path) {
          emit('lieb-stop');
          set({ currentTrack: null, duration: 0, currentTime: 0, isPlaying: false, hasSubtitles: false });
        }
        
        set({ playlist: newPlaylist });
      },
      clearPlaylist: () => {
        const state = get();
        if (state.currentTrack) {
          emit('lieb-stop');
        }
        set({ 
          playlist: [], 
          currentTrack: null, 
          duration: 0, 
          currentTime: 0, 
          isPlaying: false,
          hasSubtitles: false,
          metadata: { title: '', description: '', episode: '', season: '' }
        });
      },
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setLibraryOpen: (open) => set({ isLibraryOpen: open }),
      setSubSearchOpen: (open) => set({ isSubSearchOpen: open }),
      setStreamingQuality: (quality) => set({ streamingQuality: quality }),
      setFullscreen: (full) => set({ isFullscreen: full }),
      setEngineReady: (ready) => set({ isEngineReady: ready }),
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
      setBuffering: (buffering) => set({ isBuffering: buffering }),
      updatePlaylistTitle: (path, title) => set((state) => ({
        playlist: state.playlist.map((item) => 
          item.path === path ? { ...item, title } : item
        )
      })),
      setAutoUpdateCheck: (autoUpdateCheck) => set({ autoUpdateCheck }),
      setAutoUpdateDownload: (autoUpdateDownload) => set({ autoUpdateDownload }),
      setAutoUpdateInstall: (autoUpdateInstall) => set({ autoUpdateInstall }),
      setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
      setHasUpdate: (hasUpdate) => set({ hasUpdate }),
      attachSubtitlesToTrack: (path, subPaths) => set((state) => ({
        playlist: state.playlist.map((item) => {
          if (item.path === path) {
            const existing = item.subs || [];
            const combined = Array.from(new Set([...existing, ...subPaths]));
            return { ...item, subs: combined };
          }
          return item;
        })
      })),
      addCustomEqPreset: (name, bands) => set((state) => ({
        customEqPresets: [...state.customEqPresets, { name, bands }].slice(-10)
      })),
      removeCustomEqPreset: (name) => set((state) => ({
        customEqPresets: state.customEqPresets.filter(p => p.name !== name)
      })),
      playNext: (isAuto = false) => {
        const { playlist, currentTrack, loopMode } = get();
        if (playlist.length === 0) return;
        
        const currentIndex = playlist.findIndex(p => p.path === currentTrack);
        let nextIndex = currentIndex + 1;
        
        if (nextIndex >= playlist.length) {
          if (loopMode === 'all') {
            nextIndex = 0;
          } else {
            // End of playlist and loop is off
            if (isAuto) {
              emit('lieb-stop');
              set({ isPlaying: false });
            }
            return; 
          }
        }
        
        const nextTrack = playlist[nextIndex];
        emit('lieb-play', { path: nextTrack.path, subs: nextTrack.subs });
      },
      playPrevious: () => {
        const { playlist, currentTrack, loopMode } = get();
        if (playlist.length === 0) return;
        
        const currentIndex = playlist.findIndex(p => p.path === currentTrack);
        let prevIndex = currentIndex - 1;
        
        if (prevIndex < 0) {
          if (loopMode === 'all') {
            prevIndex = playlist.length - 1;
          } else {
            return;
          }
        }
        
        const prevTrack = playlist[prevIndex];
        emit('lieb-play', { path: prevTrack.path, subs: prevTrack.subs });
      },
    }),
    {
      name: import.meta.env.DEV ? 'lieb-player-storage-dev' : 'lieb-player-storage',
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
        autoResize: state.autoResize,
        osApiKey: state.osApiKey,
        setAutoResize: state.setAutoResize,
        renderingBackend: state.renderingBackend,
        interpolation: state.interpolation,
        deband: state.deband,
        appLanguage: state.appLanguage,
        theme: state.theme,
        persistLibrary: state.persistLibrary,
        customPresets: state.customPresets,
        seekInterval: state.seekInterval,
        metadata: state.metadata,
        streamingQuality: state.streamingQuality,
        customEqPresets: state.customEqPresets,
      }),
    }
  )
)
);

// Cross-window synchronization for Tauri webviews
if (typeof window !== 'undefined') {
  const isDev = import.meta.env.DEV;
  const storageKey = isDev ? 'lieb-player-storage-dev' : 'lieb-player-storage';
  window.console.log(`>>> [Store] Initializing with key: ${storageKey} (isDev: ${isDev})`);

  window.addEventListener('storage', (e) => {
    if (e.key === storageKey) {
      window.console.log(`>>> [Store] Storage Event Received for: ${e.key} | New Value detected`);
      usePlayerStore.persist.rehydrate();
    }
  });
}
