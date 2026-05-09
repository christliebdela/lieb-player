import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sliders, Monitor, Keyboard, Info, ExternalLink, Activity, Palette, Wrench, Trash2, RotateCcw, Globe } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { setProperty } from 'tauri-plugin-mpv-api';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { showActionOSD } from '../../utils/osd';

const isMainWindow = () => getCurrentWindow().label === 'main';

type Tab = 'general' | 'interface' | 'video' | 'audio' | 'equalizer' | 'shortcuts' | 'about' | 'maintenance';

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
  <div className="flex bg-foreground/[0.04] rounded-lg p-0.5 border border-border-subtle">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`relative px-3 py-1.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
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

/* ─── Quality Slider ─── */
const QualitySlider = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
  const levels = [
    { val: '480', label: '480p' },
    { val: '720', label: '720p' },
    { val: '1080', label: '1080p' },
    { val: '1440', label: '2K' },
    { val: '2160', label: '4K' },
  ];
  
  const currentIndex = levels.findIndex(l => l.val === value);
  const safeIndex = currentIndex === -1 ? 2 : currentIndex;

  return (
    <div className="w-full max-w-[280px] pt-4 pb-8 px-4">
      <div className="relative h-1 bg-foreground/[0.05] rounded-full">
        {/* Track Highlight */}
        <div 
          className="absolute h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(safeIndex / (levels.length - 1)) * 100}%` }}
        />
        
        {/* Snap Points */}
        <div className="absolute inset-0 flex justify-between">
          {levels.map((level, idx) => (
            <button
              key={level.val}
              onClick={() => onChange(level.val)}
              className="relative flex flex-col items-center group"
              style={{ width: '0' }}
            >
              <div className={`w-1.5 h-1.5 rounded-full -translate-y-[1px] transition-all duration-300 ${
                idx <= safeIndex ? 'bg-accent' : 'bg-foreground/10'
              } group-hover:scale-150`} />
              
              <div className={`absolute -bottom-6 flex flex-col items-center transition-all duration-300 ${
                idx === safeIndex ? 'text-accent translate-y-0 opacity-100' : 'text-muted/40 translate-y-1 opacity-100'
              }`}>
                <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                  {level.label}
                </span>
                {idx === safeIndex && (
                  <motion.div layoutId="quality-dot" className="w-1 h-1 rounded-full bg-accent mt-1" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Invisible range for dragging */}
        <input 
          type="range" min="0" max="4" step="1"
          value={safeIndex}
          onChange={(e) => onChange(levels[parseInt(e.target.value)].val)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
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
    clearPlaylist
  } = usePlayerStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [showPicker, setShowPicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isSettingsOpen && !standalone) return null;

  const handleClose = () => {
    if (standalone) {
      getCurrentWindow().close();
    } else {
      setSettingsOpen(false);
    }
  };

  const tabs = [
    { id: 'general', label: t('general'), icon: Sliders },
    { id: 'interface', label: t('interface'), icon: Palette },
    { id: 'video', label: t('video'), icon: Monitor },
    { id: 'equalizer', label: t('equalizer'), icon: Activity },
    { id: 'shortcuts', label: t('shortcuts'), icon: Keyboard },
    { id: 'maintenance', label: t('maintenance'), icon: Wrench },
    { id: 'about', label: t('about'), icon: Info },
  ];

  const shortcuts = [
    { key: 'Space', desc: t('sc.play_pause') },
    { key: 'F', desc: t('sc.fullscreen') },
    { key: 'M', desc: t('sc.mute') },
    { key: 'L', desc: t('sc.library') },
    { key: 'S', desc: t('sc.settings') },
    { key: 'N', desc: t('sc.next') },
    { key: 'P', desc: t('sc.prev') },
    { key: '→', desc: t('sc.seek_fwd') },
    { key: '←', desc: t('sc.seek_bwd') },
    { key: '↑ / ↓', desc: t('sc.volume') },
    { key: 'C', desc: t('sc.subtitles') },
    { key: 'Esc', desc: t('sc.exit') },
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
                <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-muted font-mono">
                  v0.1.0-alpha
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
                      <div className="space-y-8 pt-2">
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
                      <div className="space-y-8 pt-2">
                        <div className="divide-y divide-border-subtle/30">
                          <SettingCard label={t('theme' as any)} description={t('theme.desc' as any)}>
                            <SegmentedControl 
                              options={['Midnight', 'Daylight', 'Aura', 'Sakura']}
                              value={theme.charAt(0).toUpperCase() + theme.slice(1)}
                              onChange={(v) => setTheme(v.toLowerCase() as any)}
                            />
                          </SettingCard>
                          
                          <div className="py-6 border-t border-border-subtle/30">
                            <div className="flex items-center gap-2 mb-5">
                              <Palette size={13} className="text-muted/60" />
                              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{t('accent.color')}</span>
                            </div>
                            
                            <div className="grid grid-cols-6 gap-2 mb-6">
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
                                    Saved {idx + 1}
                                  </span>
                                  <button onClick={(e) => { e.stopPropagation(); removeCustomPreset(color); }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px]">×</button>
                                </button>
                              ))}
                              <button onClick={() => setShowPicker(true)} className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border cursor-pointer ${showPicker ? 'bg-accent/10 border-accent/20' : 'bg-transparent border-border-subtle hover:bg-foreground/[0.04]'}`}>
                                <div className="w-4 h-4 rounded-full shrink-0 ring-1 ring-foreground/10 bg-[conic-gradient(from_0deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)]" />
                                <span className="text-[10px] font-bold tracking-tight text-muted group-hover:text-foreground">{t('mixer')}</span>
                              </button>
                            </div>

                            <AnimatePresence>
                              {showPicker && (
                                <div className="fixed inset-0 flex items-center justify-center z-[110] p-6 pointer-events-none">
                                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPicker(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" />
                                  <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-64 p-3 rounded-xl bg-background border border-border-subtle shadow-2xl pointer-events-auto">
                                    <div className="flex items-center justify-between mb-4 px-1">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                        <h3 className="text-[13px] font-semibold text-foreground/90 capitalize">{t('color.mixer')}</h3>
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
                                        <button onClick={() => { addCustomPreset(accentColor); setShowPicker(false); }} className="flex-1 py-2 rounded-lg bg-foreground/[0.05] text-foreground text-[9px] font-bold uppercase border border-border-subtle">Save</button>
                                        <button onClick={() => setShowPicker(false)} className="flex-1 py-2 rounded-lg bg-accent text-white text-[10px] font-bold uppercase shadow-lg shadow-accent/20">Done</button>
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
                              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">Control Layout</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2.5">
                              {['default', 'centered', 'compact', 'minimal'].map((id) => (
                                <button key={id} onClick={() => setControlBarLayout(id as any)} className={`group flex flex-col items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${controlBarLayout === id ? 'bg-accent/10 border-accent/20 text-accent shadow-[0_4px_12px_rgba(var(--accent-rgb),0.1)]' : 'bg-foreground/[0.02] border-border-subtle text-muted hover:bg-foreground/[0.04] hover:text-foreground'}`}>
                                  <div className={`w-full aspect-[2/1] rounded-lg border flex items-center justify-center ${controlBarLayout === id ? 'bg-accent/10 border-accent/20' : 'bg-foreground/[0.03] border-border-subtle'}`}>
                                    <div className="text-[8px] font-bold uppercase opacity-40">{id}</div>
                                  </div>
                                  <span className="text-[10px] font-bold capitalize">{id}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'video' && (
                      <div className="space-y-8 pt-2">
                        <div className="divide-y divide-border-subtle/30">
                          <SettingCard label={t('rendering.backend' as any)} description={t('rendering.backend.desc' as any)}>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded-[4px] bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase tracking-wider border border-amber-500/20">{t('restart.required' as any)}</span>
                              <SegmentedControl options={['GPU-Next', 'D3D11', 'Vulkan']} value={renderingBackend.toUpperCase()} onChange={(v) => setRenderingBackend(v.toLowerCase() as any)} />
                            </div>
                          </SettingCard>
                          <SettingCard label={t('hardware.accel' as any)} description={t('hardware.accel.desc' as any)}>
                            <Toggle checked={hwAcceleration} onChange={setHwAcceleration} />
                          </SettingCard>
                          <SettingCard label={t('interpolation' as any)} description={t('interpolation.desc' as any)}>
                            <Toggle checked={interpolation} onChange={setInterpolation} />
                          </SettingCard>
                          <SettingCard label={t('deband')} description={t('deband.desc')}>
                            <Toggle checked={deband} onChange={setDeband} />
                          </SettingCard>

                          <div className="pt-6 mt-6 border-t border-border-subtle/30">
                            <div className="flex items-center gap-2 mb-4">
                              <Globe size={13} className="text-accent" />
                              <span className="text-[11px] font-bold uppercase tracking-widest text-accent">Online Streaming</span>
                            </div>
                            <div className="flex items-center justify-between group py-2 mb-4">
                              <div className="space-y-0.5">
                                <h4 className="text-[13px] font-medium text-foreground/90">Streaming Quality</h4>
                                <p className="text-[11px] text-muted leading-relaxed font-medium">Preferred resolution for web videos (YouTube/Twitch)</p>
                              </div>
                            </div>
                            <div className="flex justify-center px-4">
                              <QualitySlider 
                                value={(usePlayerStore.getState() as any).streamingQuality || '1080'}
                                onChange={async (val) => {
                                  await setProperty('ytdl-format', `bestvideo[height<=${val}]+bestaudio/best`);
                                  usePlayerStore.setState({ streamingQuality: val } as any);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'equalizer' && (
                      <div className="space-y-8 pt-[18px]">
                        <div className="flex flex-wrap gap-1.5">
                          {EQ_PRESETS.map((preset) => (
                            <button key={preset.name} onClick={() => applyPreset(preset.bands)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${JSON.stringify(equalizer) === JSON.stringify(preset.bands) ? 'bg-accent text-white' : 'bg-foreground/[0.04] text-muted hover:bg-foreground/[0.08] hover:text-foreground'}`}>{preset.name}</button>
                          ))}
                          <button onClick={resetEqualizer} className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted hover:text-foreground transition-colors cursor-pointer ml-auto">{t('reset')}</button>
                        </div>
                        <div className="flex-1 flex items-stretch gap-1 min-h-[220px] p-4 rounded-xl bg-foreground/[0.01] border border-border-subtle">
                          {BANDS.map((band, idx) => (
                            <div key={band.freq} className="flex-1 flex flex-col items-center gap-2 group relative">
                              <div className="text-[9px] font-mono font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity h-4 flex items-center">{equalizer[idx] > 0 ? '+' : ''}{equalizer[idx]}</div>
                              <div className="flex-1 w-full flex flex-col items-center relative">
                                <div className="w-[6px] h-full bg-foreground/[0.04] rounded-full relative overflow-hidden">
                                  <div className="absolute bottom-0 w-full bg-accent/60 rounded-full transition-all group-hover:bg-accent" style={{ height: `${((equalizer[idx] + 20) / 40) * 100}%` }} />
                                </div>
                                <input type="range" min="-20" max="20" step="0.5" value={equalizer[idx]} onChange={(e) => updateEqualizer(idx, parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" style={{ appearance: 'slider-vertical', writingMode: 'vertical-lr' } as any} />
                              </div>
                              <span className="text-[9px] font-medium text-muted/60 group-hover:text-foreground transition-colors">{band.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'shortcuts' && (
                      <div className="space-y-8 pt-3">
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
                            <div className="flex items-center gap-3 mb-1"><h2 className="text-xl font-black text-foreground tracking-tighter uppercase">Lieb</h2><span className="px-1.5 py-0.5 rounded-[2px] bg-foreground text-background text-[8px] font-black tracking-[0.2em] uppercase">Alpha 0.1</span></div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em]">{t('about.subtitle')}</p>
                          </div>
                        </div>
                        <div className="mb-10 space-y-6">
                          <p className="text-[13px] text-foreground/80 leading-[1.8] font-normal max-w-xl">{t('about.story')}</p>
                          <p className="text-[12px] text-muted leading-[1.8] font-normal max-w-xl">{t('about.tech')}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-8 pt-6 border-t border-white/[0.04]">
                          <div><p className="text-[9px] text-muted font-black uppercase tracking-[0.2em] mb-2">{t('designer')}</p><p className="text-[11px] font-bold text-foreground">Christlieb Dela</p></div>
                          <div><p className="text-[9px] text-muted font-black uppercase tracking-[0.2em] mb-2">{t('repository' as any)}</p><a href="https://github.com/christliebdela/lieb-player" target="_blank" className="text-[11px] font-bold text-foreground hover:text-accent transition-colors flex items-center gap-1.5">{t('source' as any)} <ExternalLink size={10} strokeWidth={3} /></a></div>
                          <div><p className="text-[9px] text-muted font-black uppercase tracking-[0.2em] mb-2">{t('feedback')}</p><a href="https://github.com/christliebdela/lieb-player/issues" target="_blank" className="text-[11px] font-bold text-accent hover:underline decoration-2 underline-offset-4">{t('report.issue')}</a></div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'maintenance' && (
                      <div className="space-y-8 pt-2">
                        <div className="divide-y divide-white/[0.04]">
                          <div className="py-4 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-border-subtle flex items-center justify-center text-muted group-hover:text-red-400 group-hover:bg-red-400/5 transition-all"><Trash2 size={18} /></div>
                              <div className="space-y-0.5"><h4 className="text-[13px] font-medium text-foreground/90">{t('clear.cache')}</h4><p className="text-[11px] text-muted leading-relaxed font-medium">{t('clear.cache.desc')}</p></div>
                            </div>
                            <button onClick={() => { clearPlaylist(); showActionOSD(t('cache.cleared'), 'trash'); }} className="px-4 py-2 rounded-lg bg-foreground/[0.04] hover:bg-red-500/10 text-muted hover:text-red-400 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border border-border-subtle hover:border-red-500/20">{t('clear.cache')}</button>
                          </div>
                          <div className="py-4 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-border-subtle flex items-center justify-center text-muted group-hover:text-red-500 group-hover:bg-red-400/5 transition-all"><RotateCcw size={18} /></div>
                              <div className="space-y-0.5"><h4 className="text-[13px] font-medium text-foreground/90">{t('reset.app')}</h4><p className="text-[11px] text-muted leading-relaxed font-medium">{t('reset.app.desc')}</p></div>
                            </div>
                            <button onClick={() => setShowConfirm(true)} className="px-4 py-2 rounded-lg bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-500/10 hover:brightness-110">{t('reset.app')}</button>
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
                    <h3 className="text-[14px] font-black text-foreground uppercase tracking-tighter mb-2">{t('reset.app')}</h3>
                    <p className="text-[11px] text-muted leading-relaxed mb-6">{t('reset.app.desc')}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.08] text-muted text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border border-border-subtle">{t('cancel')}</button>
                      <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-500/20 hover:brightness-110">{t('reset.app')}</button>
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
