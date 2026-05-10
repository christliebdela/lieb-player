import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sliders, Monitor, Keyboard, Info, ExternalLink, Activity, Palette, Moon, Wrench, Trash2, RotateCcw, Globe, History } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { setProperty } from 'tauri-plugin-mpv-api';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';
import { showActionOSD } from '../../utils/osd';
import { changelog } from '../../data/changelog';

const isMainWindow = () => getCurrentWindow().label === 'main';

type Tab = 'general' | 'interface' | 'video' | 'audio' | 'equalizer' | 'shortcuts' | 'about' | 'maintenance' | 'changelog';

const BANDS = [
  { freq: '31', label: '31' },
  { freq: '62', label: '62' },
  { freq: '125', label: '125' },
  { freq: '250', label: '250' },
  { freq: '500', label: '500' },
  { freq: '1k', label: '1k' },
  { freq: '2k', label: '2k' },
  { freq: '4k', label: '4k' },
  { freq: '8k', label: '8k' },
  { freq: '16k', label: '16k' },
];

const PRESET_COLORS = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Lavender', color: '#a78bfa' },
  { name: 'Pink', color: '#f472b6' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Sky', color: '#0ea5e9' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Crimson', color: '#e11d48' },
  { name: 'Gold', color: '#d4af37' },
  { name: 'Teal', color: '#14b8a6' },
];

const EQ_PRESETS = [
  { name: 'Flat', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost', bands: [8, 6, 4, 2, 0, 0, 0, 0, 1, 2] },
  { name: 'Electronic', bands: [5, 4, 1, 0, -2, 0, 1, 4, 5, 6] },
  { name: 'Rock', bands: [4, 3, 2, 1, -1, -1, 1, 2, 3, 4] },
  { name: 'Pop', bands: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2] },
  { name: 'Classical', bands: [5, 4, 3, 2, -1, -1, 0, 2, 3, 4] },
  { name: 'Jazz', bands: [4, 3, 1, 2, -2, -2, 0, 1, 3, 4] },
  { name: 'Voice', bands: [-4, -3, -1, 2, 4, 5, 4, 2, 0, -2] },
];

/* ─── Segmented Control ─── */
const SegmentedControl = ({ options, value, onChange }: { 
  options: string[]; value: string; onChange: (v: string) => void 
}) => (
  <div className="flex bg-foreground/[0.04] rounded-lg p-0.5 border border-border-subtle h-8">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`relative px-3 flex items-center h-full text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
          value === opt
            ? 'text-white'
            : 'text-muted hover:text-foreground'
        }`}
      >
        {value === opt && (
          <div className="absolute inset-0 bg-accent rounded-md shadow-sm" />
        )}
        <span className="relative z-10">{opt}</span>
      </button>
    ))}
  </div>
);

/* ─── Toggle Switch ─── */
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative w-10 h-[22px] rounded-full transition-colors cursor-pointer ${checked ? 'bg-accent' : 'bg-foreground/[0.08] hover:bg-foreground/[0.12]'}`}
  >
    <div
      className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 ${checked ? 'left-[22px]' : 'left-[3px]'}`}
    />
  </button>
);

/* ─── Setting Card ─── */
const SettingCard = ({ label, description, children }: { 
  label: string; description?: string; children: React.ReactNode 
}) => (
  <div className="flex items-center justify-between py-4 group">
    <div className="space-y-0.5">
      <h4 className="text-[13px] font-medium text-foreground/90">{label}</h4>
      {description && <p className="text-[11px] text-muted leading-relaxed font-medium">{description}</p>}
    </div>
    {children}
  </div>
);

/* ─── Quality Slider (Rectangle Strip) ─── */
const QualitySlider = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
  const levels = [
    { val: '144', label: '144p' },
    { val: '240', label: '240p' },
    { val: '360', label: '360p' },
    { val: '480', label: '480p' },
    { val: '720', label: '720p' },
    { val: '1080', label: '1080p' },
    { val: '1440', label: '2K' },
    { val: '2160', label: '4K' },
  ];
  
  const currentIndex = levels.findIndex(l => l.val === value);
  const safeIndex = currentIndex === -1 ? 5 : currentIndex;

  return (
    <div className="w-full pt-4 pb-12">
      <div className="flex gap-1.5 h-3.5 w-full relative">
        {levels.map((level, idx) => (
          <button
            key={level.val}
            onClick={() => onChange(level.val)}
            className="flex-1 relative group cursor-pointer"
          >
            {/* Segment Rectangle */}
            <div 
              className={`h-full w-full rounded-sm transition-all duration-500 ease-out ${
                idx <= safeIndex 
                  ? 'bg-accent shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]' 
                  : 'bg-foreground/[0.05] hover:bg-foreground/[0.1]'
              }`} 
            />
            
            {/* Active Label (Only for selected) */}
            {idx === safeIndex && (
              <motion.div 
                layoutId="active-quality"
                className="absolute top-full mt-4 left-1/2 -translate-x-1/2 flex flex-col items-center"
              >
                <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em] whitespace-nowrap">
                  {level.label}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1 shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
              </motion.div>
            )}

            {/* Hover Tooltip */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none -translate-y-1 group-hover:translate-y-0">
              <div className="px-2 py-1 rounded bg-foreground text-background text-[8px] font-black uppercase tracking-tighter shadow-xl">
                {level.label}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export const SettingsModal: React.FC<{ standalone?: boolean }> = ({ standalone }) => {
  const { 
    isSettingsOpen, setSettingsOpen, 
    equalizer, setEqualizer,
    accentColor, setAccentColor,
    controlBarLayout, setControlBarLayout,
    scrollMode, setScrollMode,
    hwAcceleration, setHwAcceleration,
    rememberPosition, setRememberPosition,
    autoPlay, setAutoPlay,
    renderingBackend, setRenderingBackend,
    interpolation, setInterpolation,
    persistLibrary, setPersistLibrary,
    deband, setDeband,
    appLanguage, setAppLanguage,
    theme, setTheme,
    customPresets, addCustomPreset, removeCustomPreset,
    seekInterval, setSeekInterval,
    streamingQuality, setStreamingQuality,
    clearPlaylist,
    settingsActiveTab
  } = usePlayerStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>(settingsActiveTab as Tab);
  
  React.useEffect(() => {
    if (isSettingsOpen) {
      setActiveTab(settingsActiveTab as Tab);
    }
  }, [isSettingsOpen, settingsActiveTab]);

  const [showPicker, setShowPicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'uptodate' | 'error'>('idle');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('0.1.0-alpha');
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);

  React.useEffect(() => {
    getVersion().then(v => setAppVersion(v));
  }, []);

  const handleCheckUpdate = async () => {
    // If update is ready to install
    if (updateStatus === 'ready') {
      await relaunch();
      return;
    }

    // If update is available but not downloaded, and user clicks "Download Update"
    if (updateStatus === 'available' && pendingUpdate && downloadProgress === null) {
      try {
        let downloaded = 0;
        let total = 0;
        await pendingUpdate.downloadAndInstall((event) => {
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
        setUpdateStatus('ready');
      } catch (err: any) {
        console.error('Download error:', err);
        setUpdateStatus('error');
        const msg = err.toString().toLowerCase();
        if (msg.includes('signature')) {
          setErrorMsg('Security Error: Signature verification failed');
        } else if (msg.includes('connection') || msg.includes('timeout')) {
          setErrorMsg('Network Error: Connection timed out');
        } else {
          setErrorMsg(`Download failed: ${err.toString()}`);
        }
      }
      return;
    }

    setUpdateStatus('checking');
    setErrorMsg(null);
    try {
      const update = await check();
      if (update) {
        setHasUpdate(true);
        setUpdateStatus('available');
        setPendingUpdate(update);
        
        // Auto-download if enabled
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
          setUpdateStatus('ready');
          
          if (autoUpdateInstall) {
            await relaunch();
          }
        }
      } else {
        setHasUpdate(false);
        setUpdateStatus('uptodate');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      }
    } catch (err: any) {
      console.error('Update error:', err);
      setUpdateStatus('error');
      
      // Simplify the error message for the user
      const msg = err.toString().toLowerCase();
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('connection') || msg.includes('request')) {
        setErrorMsg('Connection Error: Unable to reach update server');
      } else if (msg.includes('permission') || msg.includes('allow')) {
        setErrorMsg('Permission Error: Updater access denied');
      } else {
        setErrorMsg('Update Error: Something went wrong');
      }

      setTimeout(() => {
        setUpdateStatus('idle');
        setErrorMsg(null);
      }, 5000);
    }
  };

  const {
    autoUpdateCheck, setAutoUpdateCheck,
    autoUpdateDownload, setAutoUpdateDownload,
    autoUpdateInstall, setAutoUpdateInstall,
    downloadProgress, setDownloadProgress,
    setHasUpdate
  } = usePlayerStore();

  if (!isSettingsOpen && !standalone) return null;

  const handleClose = () => {
    if (standalone) {
      getCurrentWindow().close();
    } else {
      setSettingsOpen(false);
    }
  };

  const tabs = [
    { id: 'general', label: t('general' as any), icon: Sliders },
    { id: 'interface', label: t('interface' as any), icon: Palette },
    { id: 'video', label: t('video' as any), icon: Monitor },
    { id: 'equalizer', label: t('equalizer' as any), icon: Activity },
    { id: 'shortcuts', label: t('shortcuts' as any), icon: Keyboard },
    { id: 'maintenance', label: t('maintenance' as any), icon: Wrench },
    { id: 'changelog', label: t('changelog' as any), icon: History },
    { id: 'about', label: t('about' as any), icon: Info },
  ];

  const shortcuts = [
    { key: 'Space', desc: t('sc.play_pause' as any) },
    { key: 'F', desc: t('sc.fullscreen' as any) },
    { key: 'M', desc: t('sc.mute' as any) },
    { key: 'L', desc: t('sc.library' as any) },
    { key: 'S', desc: t('sc.settings' as any) },
    { key: 'N', desc: t('sc.next' as any) },
    { key: 'P', desc: t('sc.prev' as any) },
    { key: '→', desc: t('sc.seek_fwd' as any) },
    { key: '←', desc: t('sc.seek_bwd' as any) },
    { key: '↑ / ↓', desc: t('sc.volume' as any) },
    { key: 'C', desc: t('sc.subtitles' as any) },
    { key: 'Esc', desc: t('sc.exit' as any) },
  ];

  const updateEqualizer = async (index: number, value: number) => {
    const newBands = [...equalizer];
    newBands[index] = value;
    setEqualizer(newBands);
    applyEqFilter(newBands);
  };

  const applyPreset = async (presetBands: number[]) => {
    setEqualizer(presetBands);
    applyEqFilter(presetBands);
  };

  const applyEqFilter = async (bands: number[]) => {
    try {
      const frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      const filterChain = bands
        .map((gain, idx) => `equalizer=f=${frequencies[idx]}:width_type=o:w=1:g=${gain}`)
        .join(',');
      await setProperty('af', filterChain);
    } catch (err) {
      if (isMainWindow()) console.error('Lieb Player: EQ Error:', err);
    }
  };

  const resetEqualizer = async () => {
    const resetBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    setEqualizer(resetBands);
    try {
      await setProperty('af', '');
    } catch {}
  };

  const panel = (
    <div className={`bg-background overflow-hidden flex relative ${
      standalone 
        ? 'w-full h-screen' 
        : 'w-full max-w-[780px] h-[520px] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-border-subtle'
    }`}>
            <div className="w-48 bg-white/[0.015] border-r border-border-subtle p-3 flex flex-col">
              <div className="px-3 py-4 mb-2 flex items-center gap-2.5">
                <img src="/lieb-player-icon.png" alt="Lieb Player" className="w-6 h-6 rounded-lg" />
                <div>
                  <h1 className="text-[13px] font-semibold text-foreground leading-tight tracking-tight">Lieb Player</h1>
                  <p className="text-[9px] text-muted font-medium uppercase tracking-[0.15em]">preferences</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                      activeTab === tab.id 
                      ? 'bg-accent/10 text-accent' 
                      : 'text-muted hover:text-foreground hover:bg-foreground/[0.04]'
                    }`}
                  >
                    <tab.icon size={15} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-auto pt-3 border-t border-border-subtle">
                <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-muted/60 font-medium">
                  Version: v{appVersion}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <header className="h-12 flex items-center justify-between px-6 border-b border-border-subtle shrink-0" data-tauri-drag-region>
                <h2 className="text-[13px] font-semibold text-foreground/80 capitalize">{t(activeTab as any)}</h2>
                <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-muted hover:text-foreground cursor-pointer">
                  <X size={16} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {activeTab === 'general' && (
                      <div className="space-y-8 pt-6">
                        <div className="divide-y divide-border-subtle/30">
                          <SettingCard label={t('language' as any)} description={t('language.desc' as any)}>
                            <SegmentedControl 
                              options={['English', 'French', 'Spanish']}
                              value={appLanguage}
                              onChange={(v) => setAppLanguage(v as any)}
                            />
                          </SettingCard>
                          <SettingCard label={t('remember.position' as any)} description={t('remember.position.desc' as any)}>
                            <Toggle checked={rememberPosition} onChange={setRememberPosition} />
                          </SettingCard>
                          <SettingCard label={t('auto.play' as any)} description={t('auto.play.desc' as any)}>
                            <Toggle checked={autoPlay} onChange={setAutoPlay} />
                          </SettingCard>
                          <SettingCard label={t('persist.library' as any)} description={t('persist.library.desc' as any)}>
                            <Toggle checked={persistLibrary} onChange={setPersistLibrary} />
                          </SettingCard>
                          <SettingCard label={t('scroll.mode' as any)} description={t('scroll.mode.desc' as any)}>
                            <SegmentedControl 
                              options={['Volume', 'Seek']}
                              value={scrollMode.charAt(0).toUpperCase() + scrollMode.slice(1)}
                              onChange={(v) => setScrollMode(v.toLowerCase() as any)}
                            />
                          </SettingCard>
                          <SettingCard label={t('seek.interval' as any)} description={t('seek.interval.desc' as any)}>
                            <SegmentedControl 
                              options={['5s', '10s', '30s', '60s']}
                              value={`${seekInterval}s`}
                              onChange={(v) => setSeekInterval(parseInt(v))}
                            />
                          </SettingCard>
                        </div>
                      </div>
                    )}

                    {activeTab === 'interface' && (
                      <div className="space-y-8 pt-6">
                        <div className="divide-y divide-border-subtle/30">
                          <div className="py-6">
                            <div className="flex items-center gap-2 mb-5">
                              <Moon size={13} className="text-muted/60" />
                              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{t('theme' as any)}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                              {(['midnight', 'daylight', 'aura', 'sakura'] as const).map((id) => (
                                <button 
                                  key={id} 
                                  onClick={() => setTheme(id)} 
                                  className={`group flex flex-col items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${theme === id ? 'bg-accent/10 border-accent/20 text-accent shadow-[0_4px_12px_rgba(var(--accent-rgb),0.1)]' : 'bg-foreground/[0.02] border-border-subtle text-muted hover:bg-foreground/[0.04] hover:text-foreground'}`}
                                >
                                  <div className={`w-full aspect-video rounded-lg border relative overflow-hidden p-1.5 flex flex-col gap-1 ${
                                    id === 'midnight' ? 'bg-[#0a0a0a] border-white/5' :
                                    id === 'daylight' ? 'bg-[#f8f9fa] border-black/5' :
                                    id === 'aura' ? 'bg-[#0f0b1a] border-violet-500/10' :
                                    'bg-[#fff5f7] border-pink-500/10'
                                  }`}>
                                    {/* Mini Window Mockup */}
                                    <div className="flex justify-between w-full">
                                      <div className="w-4 h-1 rounded-full opacity-40" style={{ backgroundColor: id === 'daylight' || id === 'sakura' ? '#000' : '#fff' }} />
                                      <div className="flex gap-0.5">
                                        <div className="w-1 h-1 rounded-full bg-[#ff5f56]" />
                                        <div className="w-1 h-1 rounded-full bg-[#ffbd2e]" />
                                        <div className="w-1 h-1 rounded-full bg-[#27c93f]" />
                                      </div>
                                    </div>
                                    <div className="flex-1 rounded-sm border border-current/5 bg-current/5 flex items-center justify-center">
                                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ 
                                        backgroundColor: 
                                          id === 'midnight' ? '#6366f1' : // Indigo
                                          id === 'daylight' ? '#0ea5e9' : // Sky
                                          id === 'aura' ? '#8b5cf6' :     // Violet
                                          '#f43f5e'                        // Rose
                                      }} />
                                    </div>
                                    <div className="h-2 w-full rounded-sm bg-current/10 mt-auto" />
                                  </div>
                                  <span className="text-[10px] font-bold">{t(`theme.${id}` as any)}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          
                            <div className="py-6 border-t border-border-subtle/30">
                              <div className="flex items-center gap-2 mb-5">
                                <Palette size={13} className="text-muted/60" />
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{t('accent.color' as any)}</span>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-2 mb-6">
                                {PRESET_COLORS.map((preset) => (
                                  <button
                                    key={preset.color}
                                    onClick={() => setAccentColor(preset.color)}
                                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer border ${
                                      accentColor === preset.color 
                                      ? 'bg-accent/10 border-accent/20' 
                                      : 'bg-transparent border-border-subtle hover:bg-foreground/[0.04]'
                                    }`}
                                  >
                                    <div className="w-4 h-4 rounded-full shrink-0 ring-1 ring-foreground/10" style={{ backgroundColor: preset.color }} />
                                    <span className={`text-[10px] font-bold tracking-tight transition-colors ${
                                      accentColor === preset.color ? 'text-accent' : 'text-muted group-hover:text-foreground'
                                    }`}>
                                      {preset.name}
                                    </span>
                                  </button>
                                ))}
                                {customPresets.map((color, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setAccentColor(color)}
                                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer border ${
                                      accentColor === color 
                                      ? 'bg-accent/10 border-accent/20' 
                                      : 'bg-transparent border-border-subtle hover:bg-foreground/[0.04]'
                                    }`}
                                  >
                                    <div className="w-4 h-4 rounded-full shrink-0 ring-1 ring-foreground/10" style={{ backgroundColor: color }} />
                                    <span className={`text-[10px] font-bold tracking-tight transition-colors ${
                                      accentColor === color ? 'text-accent' : 'text-muted group-hover:text-foreground'
                                    }`}>
                                      {t('custom' as any)} {idx + 1}
                                    </span>
                                    <button onClick={(e) => { e.stopPropagation(); removeCustomPreset(color); }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px]">×</button>
                                  </button>
                                ))}
                                <button onClick={() => setShowPicker(true)} className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border cursor-pointer ${showPicker ? 'bg-accent/10 border-accent/20' : 'bg-transparent border-border-subtle hover:bg-foreground/[0.04]'}`}>
                                  <div className="w-4 h-4 rounded-full shrink-0 ring-1 ring-foreground/10 bg-[conic-gradient(from_0deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)]" />
                                  <span className="text-[10px] font-bold tracking-tight text-muted group-hover:text-foreground">{t('mixer' as any)}</span>
                                </button>
                              </div>

                              {/* ... Picker Modal stays same ... */}
                              <AnimatePresence>
                                {showPicker && (
                                  <div className="fixed inset-0 flex items-center justify-center z-[110] p-6 pointer-events-none">
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPicker(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" />
                                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-64 p-3 rounded-xl bg-background border border-border-subtle shadow-2xl pointer-events-auto">
                                      <div className="flex items-center justify-between mb-4 px-1">
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                          <h3 className="text-[13px] font-semibold text-foreground/90 capitalize">{t('color.mixer' as any)}</h3>
                                        </div>
                                        <button onClick={() => setShowPicker(false)} className="text-muted hover:text-foreground p-1"><X size={14} /></button>
                                      </div>
                                      <div className="space-y-3">
                                        <div className="flex flex-col items-center gap-3">
                                          <div className="w-full h-14 rounded-lg shadow-xl border border-white/10" style={{ backgroundColor: accentColor }} />
                                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.03] border border-border-subtle">
                                            <span className="text-[9px] font-bold text-muted uppercase">HEX</span>
                                            <input type="text" value={accentColor.toUpperCase()} onChange={(e) => setAccentColor(e.target.value)} className="w-16 bg-transparent border-none text-[10px] font-mono font-bold text-accent uppercase focus:ring-0 p-0 text-center" />
                                          </div>
                                        </div>
                                        <div className="space-y-2.5">
                                          <input type="range" min="0" max="360" className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[linear-gradient(to_right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)]" onChange={(e) => setAccentColor(`hsl(${e.target.value}, 70%, 60%)`)} />
                                          <input type="range" min="20" max="90" className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, #000, ${accentColor}, #fff)` }} onChange={(e) => {
                                            const matches = accentColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                                            if (matches) setAccentColor(`hsl(${matches[1]}, ${matches[2]}%, ${e.target.value}%)`);
                                          }} />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                          <button onClick={() => { addCustomPreset(accentColor); setShowPicker(false); }} className="flex-1 py-2 rounded-lg bg-foreground/[0.05] text-foreground text-[9px] font-bold uppercase border border-border-subtle">{t('save' as any)}</button>
                                          <button onClick={() => setShowPicker(false)} className="flex-1 py-2 rounded-lg bg-accent text-white text-[10px] font-bold uppercase shadow-lg shadow-accent/20">{t('done' as any)}</button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  </div>
                                )}
                              </AnimatePresence>
                            </div>

                            <div className="py-6 border-t border-border-subtle/30">
                              <div className="flex items-center gap-2 mb-5">
                                <Monitor size={13} className="text-muted/60" />
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{t('control.layout' as any)}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-3">
                                {(['default', 'centered', 'compact', 'minimal'] as const).map((id) => (
                                  <button key={id} onClick={() => setControlBarLayout(id)} className={`group flex flex-col items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${controlBarLayout === id ? 'bg-accent/10 border-accent/20 text-accent shadow-[0_4px_12px_rgba(var(--accent-rgb),0.1)]' : 'bg-foreground/[0.02] border-border-subtle text-muted hover:bg-foreground/[0.04] hover:text-foreground'}`}>
                                    <div className={`w-full aspect-[2/1] rounded-lg border relative overflow-hidden p-1 ${controlBarLayout === id ? 'bg-accent/10 border-accent/20' : 'bg-foreground/[0.03] border-border-subtle'}`}>
                                      {/* Mini Layout Preview */}
                                      <div className="absolute inset-0 flex flex-col justify-end p-1 gap-1">
                                        {id === 'default' && (
                                          <div className="flex items-center gap-1 w-full">
                                            <div className="flex gap-0.5 shrink-0">
                                              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                            </div>
                                            <div className="h-0.5 flex-1 bg-current opacity-20 rounded-full" />
                                            <div className="w-2 h-1.5 rounded-full bg-current opacity-60" />
                                          </div>
                                        )}
                                        {id === 'centered' && (
                                          <div className="flex flex-col gap-1 w-full">
                                            <div className="h-0.5 w-full bg-current opacity-20 rounded-full" />
                                            <div className="flex justify-center gap-1">
                                              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                            </div>
                                          </div>
                                        )}
                                        {id === 'compact' && (
                                          <div className="flex items-center gap-1 w-full px-1 py-0.5 bg-current/5 rounded-full">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                            <div className="h-0.5 flex-1 bg-current opacity-20 rounded-full" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                          </div>
                                        )}
                                        {id === 'minimal' && (
                                          <div className="flex flex-col gap-0.5 w-full items-center">
                                            <div className="h-0.5 w-3/4 bg-current opacity-20 rounded-full" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-bold">{t(`layout.${id}` as any)}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'video' && (
                      <div className="space-y-8 pt-6">
                        <div className="divide-y divide-border-subtle/30">
                          <SettingCard label={t('rendering.backend' as any)} description={t('rendering.backend.desc' as any)}>
                            <div className="flex items-center gap-2">
                              <span className="px-3 h-8 flex items-center rounded-lg bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase tracking-wider border border-amber-500/20 shrink-0">{t('restart.required' as any)}</span>
                              <SegmentedControl options={['GPU-Next', 'D3D11', 'Vulkan']} value={renderingBackend.toUpperCase()} onChange={(v) => setRenderingBackend(v.toLowerCase() as any)} />
                            </div>
                          </SettingCard>
                          <SettingCard label={t('hardware.accel' as any)} description={t('hardware.accel.desc' as any)}>
                            <Toggle checked={hwAcceleration} onChange={setHwAcceleration} />
                          </SettingCard>
                          <SettingCard label={t('interpolation' as any)} description={t('interpolation.desc' as any)}>
                            <Toggle checked={interpolation} onChange={setInterpolation} />
                          </SettingCard>
                          <SettingCard label={t('deband' as any)} description={t('deband.desc' as any)}>
                            <Toggle checked={deband} onChange={setDeband} />
                          </SettingCard>

                          <div className="pt-6 mt-6 border-t border-border-subtle/30">
                            <div className="flex items-center gap-2 mb-4">
                              <Globe size={13} className="text-accent" />
                              <span className="text-[11px] font-bold uppercase tracking-widest text-accent">{t('online.streaming' as any)}</span>
                            </div>
                            <div className="flex flex-col gap-4 py-2">
                              <div className="space-y-0.5">
                                <h4 className="text-[13px] font-medium text-foreground/90">{t('streaming.quality' as any)}</h4>
                                <p className="text-[11px] text-muted leading-relaxed font-medium">{t('streaming.desc' as any)}</p>
                              </div>
                              <QualitySlider 
                                value={streamingQuality}
                                onChange={(val) => {
                                  setStreamingQuality(val);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'equalizer' && (
                      <div className="flex flex-col h-[500px] space-y-4 pt-6">
                        <div className="flex justify-between w-full">
                          {EQ_PRESETS.map((preset) => {
                            const isActive = JSON.stringify(equalizer) === JSON.stringify(preset.bands);
                            return (
                              <button 
                                key={preset.name} 
                                onClick={() => applyPreset(preset.bands)} 
                                className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all cursor-pointer border ${
                                  isActive
                                  ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' 
                                  : 'bg-foreground/[0.03] border-border-subtle text-muted hover:bg-foreground/[0.06] hover:text-foreground'
                                }`}
                              >
                                {preset.name}
                              </button>
                            );
                          })}
                        </div>
                        

                        <div className="flex-1 flex items-stretch gap-1.5 p-6 rounded-2xl bg-foreground/[0.015] border border-border-subtle shadow-inner">
                          {BANDS.map((band, idx) => (
                            <div key={band.freq} className="flex-1 flex flex-col items-center gap-3 group relative">
                              <div className="text-[9px] font-mono font-bold text-accent opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 h-4 flex items-center">
                                {equalizer[idx] > 0 ? '+' : ''}{equalizer[idx]}
                              </div>
                              <div className="flex-1 w-full flex flex-col items-center relative">
                                <div className="w-2 h-full bg-foreground/[0.04] rounded-full relative overflow-hidden ring-1 ring-inset ring-black/5">
                                  <div 
                                    className="absolute bottom-0 w-full bg-gradient-to-t from-accent to-accent/40 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]" 
                                    style={{ height: `${((equalizer[idx] + 20) / 40) * 100}%` }} 
                                  />
                                </div>
                                <input 
                                  type="range" 
                                  min="-20" 
                                  max="20" 
                                  step="0.5" 
                                  value={-equalizer[idx]} 
                                  onChange={(e) => updateEqualizer(idx, -parseFloat(e.target.value))} 
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                  style={{ appearance: 'slider-vertical', writingMode: 'vertical-lr' } as any} 
                                />
                              </div>
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[10px] font-bold text-foreground/80">{band.label}</span>
                                <span className="text-[8px] font-medium text-muted/40 uppercase tracking-tighter">Hz</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Custom Presets Section */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">Your Presets</span>
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                id="eq-preset-name"
                                placeholder="Preset Name"
                                className="bg-foreground/[0.04] border border-border-subtle rounded-lg px-3 h-[32px] text-[12px] w-40 focus:outline-none focus:border-accent/30 transition-all placeholder:text-muted/40"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const input = e.target as HTMLInputElement;
                                    if (input.value) {
                                      usePlayerStore.getState().addCustomEqPreset(input.value, [...equalizer]);
                                      input.value = '';
                                    }
                                  }
                                }}
                              />
                              <button 
                                onClick={() => {
                                  const input = document.getElementById('eq-preset-name') as HTMLInputElement;
                                  if (input.value) {
                                    usePlayerStore.getState().addCustomEqPreset(input.value, [...equalizer]);
                                    input.value = '';
                                  }
                                }}
                                className="px-4 h-[32px] bg-accent/10 hover:bg-accent/20 text-accent text-[10px] font-bold uppercase rounded-lg border border-accent/20 transition-all shadow-sm active:scale-95 flex items-center justify-center"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {usePlayerStore.getState().customEqPresets.map((preset) => (
                              <div key={preset.name} className="group relative">
                                <button 
                                  onClick={() => applyPreset(preset.bands)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                                    JSON.stringify(equalizer) === JSON.stringify(preset.bands)
                                    ? 'bg-accent/20 border-accent/30 text-accent'
                                    : 'bg-foreground/[0.02] border-border-subtle text-muted hover:text-foreground'
                                  }`}
                                >
                                  {preset.name}
                                </button>
                                <button 
                                  onClick={() => usePlayerStore.getState().removeCustomEqPreset(preset.name)}
                                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px]"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {usePlayerStore.getState().customEqPresets.length === 0 && (
                              <p className="text-[10px] text-muted italic font-medium">No custom presets saved yet...</p>
                            )}

                            <button 
                              onClick={resetEqualizer} 
                              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-500/60 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all cursor-pointer"
                            >
                              <RotateCcw size={10} />
                              {t('reset' as any)}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'shortcuts' && (
                      <div className="space-y-8 pt-6">
                        <div className="divide-y divide-border-subtle/30">
                        {shortcuts.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between py-3">
                            <span className="text-[12px] text-muted font-medium">{s.desc}</span>
                            <kbd className="px-2.5 py-1 bg-foreground/[0.05] rounded-md text-[11px] font-mono text-foreground/60 border border-border-subtle min-w-[42px] text-center">{s.key}</kbd>
                          </div>
                        ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'about' && (
                      <div className="space-y-8 pt-6">
                        <div className="flex items-start gap-8 mb-8">
                          <div className="w-16 h-16 flex-shrink-0"><img src="/lieb-player-icon.png" alt="Lieb Player" className="w-full h-full object-contain" /></div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center gap-3 mb-1"><h2 className="text-xl font-bold text-foreground tracking-tighter uppercase">Lieb Media Player</h2></div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em]">{t('about.subtitle' as any)}</p>
                          </div>
                        </div>
                        <div className="mb-10 space-y-6">
                          <p className="text-[13px] text-foreground/80 leading-[1.8] font-normal max-w-xl">{t('about.story' as any)}</p>
                          <p className="text-[12px] text-muted leading-[1.8] font-normal max-w-xl">{t('about.tech' as any)}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-8 pt-6 border-t border-white/[0.04]">
                          <div><p className="text-[9px] text-muted font-black uppercase tracking-[0.2em] mb-2">{t('designer' as any)}</p><p className="text-[11px] font-bold text-foreground">Christlieb Dela</p></div>
                          <div><p className="text-[9px] text-muted font-black uppercase tracking-[0.2em] mb-2">{t('repository' as any)}</p><a href="https://github.com/christliebdela/lieb-player" target="_blank" className="text-[11px] font-bold text-foreground hover:text-accent transition-colors flex items-center gap-1.5">{t('source' as any)} <ExternalLink size={10} strokeWidth={3} /></a></div>
                          <div><p className="text-[9px] text-muted font-black uppercase tracking-[0.2em] mb-2">{t('feedback' as any)}</p><a href="https://github.com/christliebdela/lieb-player/issues" target="_blank" className="text-[11px] font-bold text-accent hover:underline decoration-2 underline-offset-4">{t('report.issue' as any)}</a></div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'maintenance' && (
                      <div className="space-y-8 pt-6">
                        <div className="divide-y divide-white/[0.04]">
                          {/* Updates Section */}
                          <div className="py-4 space-y-4">
                            <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4">Updates</h4>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between group">
                                <div className="space-y-0.5">
                                  <h4 className="text-[13px] font-medium text-foreground/90">{t('update.auto_check' as any)}</h4>
                                  <p className="text-[11px] text-muted leading-relaxed font-medium">{t('update.auto_check.desc' as any)}</p>
                                </div>
                                <button 
                                  onClick={() => setAutoUpdateCheck(!autoUpdateCheck)}
                                  className={`w-10 h-5 rounded-full relative transition-all duration-300 cursor-pointer ${autoUpdateCheck ? 'bg-accent' : 'bg-foreground/10'}`}
                                >
                                  <motion.div 
                                    animate={{ x: autoUpdateCheck ? 22 : 2 }}
                                    className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
                                  />
                                </button>
                              </div>

                              <div className="flex items-center justify-between group">
                                <div className="space-y-0.5">
                                  <h4 className="text-[13px] font-medium text-foreground/90">{t('update.auto_download' as any)}</h4>
                                  <p className="text-[11px] text-muted leading-relaxed font-medium">{t('update.auto_download.desc' as any)}</p>
                                </div>
                                <button 
                                  onClick={() => setAutoUpdateDownload(!autoUpdateDownload)}
                                  className={`w-10 h-5 rounded-full relative transition-all duration-300 cursor-pointer ${autoUpdateDownload ? 'bg-accent' : 'bg-foreground/10'}`}
                                >
                                  <motion.div 
                                    animate={{ x: autoUpdateDownload ? 22 : 2 }}
                                    className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
                                  />
                                </button>
                              </div>

                              <div className="flex items-center justify-between group">
                                <div className="space-y-0.5">
                                  <h4 className="text-[13px] font-medium text-foreground/90">{t('update.auto_install' as any)}</h4>
                                  <p className="text-[11px] text-muted leading-relaxed font-medium">{t('update.auto_install.desc' as any)}</p>
                                </div>
                                <button 
                                  onClick={() => setAutoUpdateInstall(!autoUpdateInstall)}
                                  className={`w-10 h-5 rounded-full relative transition-all duration-300 cursor-pointer ${autoUpdateInstall ? 'bg-accent' : 'bg-foreground/10'}`}
                                >
                                  <motion.div 
                                    animate={{ x: autoUpdateInstall ? 22 : 2 }}
                                    className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
                                  />
                                </button>
                              </div>
                            </div>

                            <div className="pt-2">
                              <button 
                                onClick={handleCheckUpdate}
                                disabled={updateStatus === 'checking' || (updateStatus === 'available' && downloadProgress !== null)}
                                className={`w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                                  updateStatus === 'checking' ? 'bg-accent/10 border-accent/20 text-accent animate-pulse' :
                                  updateStatus === 'available' ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20 cursor-pointer' :
                                  updateStatus === 'ready' ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20 cursor-pointer' :
                                  updateStatus === 'uptodate' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                  updateStatus === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500 cursor-pointer' :
                                  'bg-foreground/[0.03] border-border-subtle text-muted hover:text-accent hover:border-accent/20 cursor-pointer'
                                }`}
                              >
                                {updateStatus === 'checking' ? t('update.checking' as any) :
                                 updateStatus === 'available' ? (downloadProgress !== null ? `${Math.round(downloadProgress)}%` : 'Download Update') :
                                 updateStatus === 'ready' ? 'Relaunch & Install' :
                                 updateStatus === 'uptodate' ? t('update.uptodate' as any) :
                                 updateStatus === 'error' ? 'Error' :
                                 'Check for Update'}
                              </button>

                              <AnimatePresence>
                                {updateStatus === 'error' && errorMsg && (
                                  <motion.p 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mt-2 text-[10px] text-red-400 font-medium leading-relaxed bg-red-400/5 p-2 rounded-lg border border-red-400/10"
                                  >
                                    {errorMsg}
                                  </motion.p>
                                )}
                              </AnimatePresence>

                              <AnimatePresence>
                                {downloadProgress !== null && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 space-y-2"
                                  >
                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted">
                                      <span>{t('update.downloading' as any)}</span>
                                      <span className="text-accent">{Math.round(downloadProgress)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                                      <motion.div 
                                        className="h-full bg-accent shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${downloadProgress}%` }}
                                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                                      />
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          <div className="py-4 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-border-subtle flex items-center justify-center text-muted group-hover:text-red-400 group-hover:bg-red-400/5 transition-all"><Trash2 size={18} /></div>
                              <div className="space-y-0.5"><h4 className="text-[13px] font-medium text-foreground/90">{t('clear.cache' as any)}</h4><p className="text-[11px] text-muted leading-relaxed font-medium">{t('clear.cache.desc' as any)}</p></div>
                            </div>
                            <button onClick={() => { clearPlaylist(); showActionOSD(t('cache.cleared' as any), 'trash'); }} className="px-4 py-2 rounded-lg bg-foreground/[0.04] hover:bg-red-500/10 text-muted hover:text-red-400 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border border-border-subtle hover:border-red-500/20">{t('clear.cache' as any)}</button>
                          </div>
                          <div className="py-4 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-border-subtle flex items-center justify-center text-muted group-hover:text-red-500 group-hover:bg-red-400/5 transition-all"><RotateCcw size={18} /></div>
                              <div className="space-y-0.5"><h4 className="text-[13px] font-medium text-foreground/90">{t('reset.app' as any)}</h4><p className="text-[11px] text-muted leading-relaxed font-medium">{t('reset.app.desc' as any)}</p></div>
                            </div>
                            <button onClick={() => setShowConfirm(true)} className="px-4 py-2 rounded-lg bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-500/10 hover:brightness-110">{t('reset.app' as any)}</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'changelog' && (
                      <div className="space-y-8 pt-6">
                        <div className="relative">
                          {/* Vertical Line */}
                          <div className="absolute left-[11px] top-2 bottom-4 w-0.5 bg-foreground/5 rounded-full" />
                          
                          <div className="space-y-10">
                            {changelog.map((entry, idx) => (
                              <div key={idx} className="relative pl-10 group">
                                {/* Dot */}
                                <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 bg-background flex items-center justify-center z-10 transition-colors ${
                                  idx === 0 ? 'border-accent shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]' : 'border-border-subtle group-hover:border-accent/40'
                                }`}>
                                  <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-accent' : 'bg-muted/40 group-hover:bg-accent/40'}`} />
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <h3 className={`text-[15px] font-black tracking-tight ${idx === 0 ? 'text-foreground' : 'text-foreground/70'}`}>
                                      v{entry.version}
                                    </h3>
                                    <span className="text-[10px] text-muted font-bold tracking-widest uppercase py-0.5 px-2 bg-foreground/[0.03] rounded-md border border-border-subtle/30">
                                      {entry.date}
                                    </span>
                                    {idx === 0 && (
                                      <span className="text-[9px] font-black text-accent uppercase tracking-widest bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
                                        {t('latest' as any)}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <ul className="space-y-2.5">
                                    {(entry.changes[appLanguage as keyof typeof entry.changes] || entry.changes.English).map((change, cIdx) => (
                                      <li key={cIdx} className="flex items-start gap-3 text-[12px] text-muted leading-relaxed font-medium">
                                        <div className="w-1 h-1 rounded-full bg-accent/40 mt-2 shrink-0" />
                                        {change}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence>
              {showConfirm && (
                <div className="absolute inset-0 z-[300] flex items-center justify-center p-8 bg-black/40 backdrop-blur-md">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-[320px] bg-background border border-border-subtle rounded-2xl p-6 shadow-2xl">
                    <h3 className="text-[14px] font-black text-foreground uppercase tracking-tighter mb-2">{t('reset.app' as any)}</h3>
                    <p className="text-[11px] text-muted leading-relaxed mb-6">{t('reset.app.desc' as any)}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.08] text-muted text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border border-border-subtle">{t('cancel' as any)}</button>
                      <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-500/20 hover:brightness-110">{t('reset.app' as any)}</button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
    </div>
  );

  if (standalone) return panel;

  const overlay = (
    <AnimatePresence>
      {isSettingsOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/70 backdrop-blur-xl"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
          >
            {panel}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
};
