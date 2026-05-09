import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sliders, Monitor, Keyboard, Info, ExternalLink, Activity, Palette, FastForward } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslation } from '../../i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { setProperty } from 'tauri-plugin-mpv-api';
import { getCurrentWindow } from '@tauri-apps/api/window';

const isMainWindow = () => getCurrentWindow().label === 'main';

type Tab = 'general' | 'interface' | 'video' | 'audio' | 'equalizer' | 'shortcuts' | 'about';

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

export const SettingsModal: React.FC<{ standalone?: boolean }> = ({ standalone }) => {
  const { 
    isSettingsOpen, setSettingsOpen, 
    equalizer, setEqualizer,
    accentColor, setAccentColor,
    crossfade, setCrossfade,
    crossfadeDuration, setCrossfadeDuration,
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
    seekInterval, setSeekInterval
  } = usePlayerStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [showPicker, setShowPicker] = useState(false);

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
      // MPV not available in standalone windows — settings are saved to store
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

  // The inner panel that contains sidebar + content
  const panel = (
    <div className={`bg-background overflow-hidden flex ${
      standalone 
        ? 'w-full h-screen' 
        : 'w-full max-w-[780px] h-[520px] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-border-subtle'
    }`}>

            {/* Sidebar */}
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

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <header className="h-12 flex items-center justify-between px-6 border-b border-border-subtle shrink-0" data-tauri-drag-region>
                <h2 className="text-[13px] font-semibold text-foreground/80 capitalize">{t(activeTab as any)}</h2>
                <button 
                  onClick={handleClose}
                  className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-muted hover:text-foreground cursor-pointer"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    {/* ... (rest of the content remains same) */}
                    {activeTab === 'general' && (
                      <div className="space-y-8">
                        <div className="divide-y divide-white/[0.04]">
                          <SettingCard label={t('hardware.accel')} description={t('hardware.accel.desc')}>
                            <Toggle checked={hwAcceleration} onChange={(v) => {
                              setHwAcceleration(v);
                            }} />
                          </SettingCard>
                          <SettingCard label={t('remember.pos')} description={t('remember.pos.desc')}>
                            <Toggle checked={rememberPosition} onChange={(v) => {
                              setRememberPosition(v);
                            }} />
                          </SettingCard>
                          <SettingCard label={t('auto.play')} description={t('auto.play.desc')}>
                            <Toggle checked={autoPlay} onChange={(v) => {
                              setAutoPlay(v);
                            }} />
                          </SettingCard>
                          <SettingCard label={t('scroll.wheel')} description={t('scroll.wheel.desc')}>
                            <SegmentedControl 
                              options={['Volume', 'Seek']}
                              value={scrollMode === 'volume' ? 'Volume' : 'Seek'}
                              onChange={(v) => setScrollMode(v.toLowerCase() as 'volume' | 'seek')}
                            />
                          </SettingCard>
                          <SettingCard label={t('app.language')} description={t('app.language.desc')}>
                            <SegmentedControl 
                              options={['English', 'French', 'Spanish']}
                              value={appLanguage}
                              onChange={(v) => setAppLanguage(v as 'English' | 'French' | 'Spanish')}
                            />
                          </SettingCard>
                          <SettingCard label={t('persist.library')} description={t('persist.library.desc')}>
                            <Toggle 
                              checked={persistLibrary} 
                              onChange={setPersistLibrary} 
                            />
                          </SettingCard>
                          <SettingCard label={t('seek.interval')} description={t('seek.interval.desc')}>
                            <div className="flex items-center gap-4 min-w-[200px]">
                              <input 
                                type="range" min="5" max="60" step="5"
                                value={seekInterval}
                                onChange={(e) => setSeekInterval(Number(e.target.value))}
                                className="flex-1 h-1.5 rounded-full appearance-none bg-foreground/10 cursor-pointer accent-accent"
                              />
                              <span className="text-[11px] font-mono font-bold text-accent w-8">{seekInterval}s</span>
                            </div>
                          </SettingCard>
                        </div>

                      </div>
                    )}

                    {activeTab === 'interface' && (
                      <div className="space-y-8">
                        <div className="divide-y divide-white/[0.04]">
                           <div className="py-4">
                             <div className="flex items-center gap-2 mb-4">
                               <Palette size={13} className="text-muted/60" />
                               <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{t('theme')}</span>
                             </div>
                             <div className="grid grid-cols-4 gap-2.5">
                               {[
                                 { id: 'midnight', name: 'Midnight', bg: '#0a0a0a', text: '#ffffff', accent: '#6366f1' },
                                 { id: 'daylight', name: 'Daylight', bg: '#f8f9fa', text: '#1a1a1a', accent: '#3b82f6' },
                                 { id: 'aura', name: 'Aura', bg: '#0f0b1a', text: '#f0e6ff', accent: '#a78bfa' },
                                 { id: 'sakura', name: 'Sakura', bg: '#fff5f7', text: '#4a1d24', accent: '#f472b6' },
                               ].map((t) => (
                                 <button
                                   key={t.id}
                                   onClick={() => setTheme(t.id as any)}
                                   className={`group relative flex flex-col gap-1.5 p-1.5 rounded-lg border-[1.5px] transition-all cursor-pointer ${
                                     theme === t.id 
                                     ? 'border-accent bg-accent/5' 
                                     : 'border-border-subtle bg-foreground/[0.01] hover:bg-foreground/[0.03]'
                                   }`}
                                 >
                                   <div 
                                     className="w-full aspect-[16/10] rounded-md shadow-sm flex flex-col p-1.5 gap-0.5"
                                     style={{ backgroundColor: t.bg }}
                                   >
                                     <div className="w-1/2 h-0.5 rounded-full" style={{ backgroundColor: t.text, opacity: 0.15 }} />
                                     <div className="w-full h-0.5 rounded-full" style={{ backgroundColor: t.text, opacity: 0.08 }} />
                                     <div className="w-2/3 h-0.5 rounded-full mt-auto" style={{ backgroundColor: t.accent }} />
                                   </div>
                                   <div className="flex items-center justify-between px-0.5">
                                     <span className={`text-[10px] font-bold tracking-tight ${theme === t.id ? 'text-accent' : 'text-muted group-hover:text-foreground'}`}>
                                       {t.name}
                                     </span>
                                     {theme === t.id && (
                                       <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                                     )}
                                   </div>
                                 </button>
                               ))}
                             </div>
                           </div>
                        </div>

                        {/* Accent Color */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Palette size={13} className="text-muted/60" />
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{t('accent.color')}</span>
                          </div>
                           <div className="grid grid-cols-4 gap-2">
                             {PRESET_COLORS.map((preset) => (
                               <button
                                 key={preset.name}
                                 onClick={() => setAccentColor(preset.color)}
                                 className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer border ${
                                   accentColor === preset.color 
                                   ? 'bg-accent/10 border-accent/20' 
                                   : 'bg-transparent border-border-subtle hover:bg-foreground/[0.04]'
                                 }`}
                               >
                                 <div 
                                   className="w-4 h-4 rounded-full shrink-0 ring-1 ring-foreground/10"
                                   style={{ backgroundColor: preset.color }}
                                 />
                                 <span className={`text-[10px] font-bold tracking-tight transition-colors ${
                                   accentColor === preset.color ? 'text-accent' : 'text-muted group-hover:text-foreground'
                                 }`}>
                                   {preset.name}
                                 </span>
                               </button>
                             ))}

                             {/* User-Saved Custom Presets */}
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
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); removeCustomPreset(color); }}
                                   className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px] hover:bg-red-500"
                                 >
                                   ×
                                 </button>
                               </button>
                             ))}
                             
                             {/* Minimal Mixer Trigger */}
                             <button 
                               onClick={() => setShowPicker(true)}
                               className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border cursor-pointer ${
                                 showPicker ? 'bg-accent/10 border-accent/20' : 'bg-transparent border-border-subtle hover:bg-foreground/[0.04]'
                               }`}
                             >
                               <div className="w-4 h-4 rounded-full shrink-0 ring-1 ring-foreground/10 bg-[conic-gradient(from_0deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)]" />
                               <span className="text-[10px] font-bold tracking-tight text-muted group-hover:text-foreground">
                                 {t('mixer')}
                               </span>
                             </button>
                           </div>

                           <AnimatePresence>
                             {showPicker && (
                               <div className="fixed inset-0 flex items-center justify-center z-[110] p-6 pointer-events-none">
                                 <motion.div 
                                   initial={{ opacity: 0 }}
                                   animate={{ opacity: 1 }}
                                   exit={{ opacity: 0 }}
                                   onClick={() => setShowPicker(false)}
                                   className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                                 />
                                 
                                 <motion.div 
                                   initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                   animate={{ opacity: 1, scale: 1, y: 0 }}
                                   exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                   className="relative w-64 p-3 rounded-2xl bg-background border border-border-subtle shadow-2xl pointer-events-auto"
                                 >
                                   <div className="flex items-center justify-between mb-4 px-1">
                                     <div className="flex items-center gap-2.5">
                                       <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                       <h3 className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">{t('color.mixer')}</h3>
                                     </div>
                                     <button 
                                       onClick={() => setShowPicker(false)}
                                       className="text-muted hover:text-foreground transition-colors cursor-pointer p-1"
                                     >
                                       <X size={14} />
                                     </button>
                                   </div>

                                   <div className="space-y-3">
                                     {/* Full-width Visual Preview & Hex */}
                                     <div className="flex flex-col items-center gap-3">
                                         <div 
                                         className="w-full h-14 rounded-2xl shadow-xl border border-white/10 flex items-center justify-center overflow-hidden" 
                                         style={{ backgroundColor: accentColor }} 
                                       />
                                       <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.03] border border-border-subtle">
                                         <span className="text-[9px] font-bold text-muted uppercase tracking-widest">{t('hex')}</span>
                                         <input 
                                           type="text" 
                                           value={accentColor.toUpperCase()}
                                           onChange={(e) => setAccentColor(e.target.value)}
                                           className="w-16 bg-transparent border-none text-[10px] font-mono font-bold text-accent uppercase focus:ring-0 p-0 text-center"
                                         />
                                       </div>
                                     </div>

                                     <div className="space-y-2.5">
                                       {/* Hue Slider */}
                                       <div className="space-y-1.5">
                                         <div className="flex justify-between text-[8px] font-black text-muted uppercase tracking-[0.15em] opacity-60">
                                           <span>{t('spectrum')}</span>
                                         </div>
                                         <input 
                                           type="range" min="0" max="360"
                                           className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[linear-gradient(to_right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)]"
                                           onChange={(e) => setAccentColor(`hsl(${e.target.value}, 70%, 60%)`)}
                                         />
                                       </div>

                                       {/* Brightness Slider */}
                                       <div className="space-y-1.5">
                                         <div className="flex justify-between text-[8px] font-black text-muted uppercase tracking-[0.15em] opacity-60">
                                           <span>{t('luminance')}</span>
                                         </div>
                                         <input 
                                           type="range" min="20" max="90"
                                           className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                           style={{ background: `linear-gradient(to right, #000, ${accentColor}, #fff)` }}
                                           onChange={(e) => {
                                              const matches = accentColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                                              if (matches) setAccentColor(`hsl(${matches[1]}, ${matches[2]}%, ${e.target.value}%)`);
                                           }}
                                         />
                                       </div>
                                     </div>

                                       <div className="flex gap-2 pt-2">
                                         <button 
                                           onClick={() => { addCustomPreset(accentColor); setShowPicker(false); }}
                                           className="flex-1 py-3 rounded-xl bg-foreground/[0.05] hover:bg-foreground/[0.1] text-foreground text-[9px] font-black uppercase tracking-[0.1em] transition-all border border-border-subtle cursor-pointer whitespace-nowrap"
                                         >
                                           {t('save')}
                                         </button>
                                         <button 
                                           onClick={() => setShowPicker(false)}
                                           className="flex-1 py-3 rounded-xl bg-accent text-white text-[10px] font-black uppercase tracking-[0.1em] hover:brightness-110 transition-all shadow-lg shadow-accent/20 cursor-pointer"
                                         >
                                           {t('done')}
                                         </button>
                                       </div>
                                   </div>
                                 </motion.div>
                               </div>
                             )}
                           </AnimatePresence>
                         </div>
                      </div>
                    )}

                    {activeTab === 'video' && (
                      <div className="space-y-8">
                        <div className="divide-y divide-border-subtle/30">
                          <SettingCard label={t('rendering.backend')} description={t('rendering.backend.desc')}>
                            <SegmentedControl 
                              options={['GPU-Next', 'D3D11', 'Vulkan']}
                              value={renderingBackend === 'gpu-next' ? 'GPU-Next' : renderingBackend === 'd3d11' ? 'D3D11' : 'Vulkan'}
                              onChange={(v) => {
                                const backend = v === 'GPU-Next' ? 'gpu-next' : v === 'D3D11' ? 'd3d11' : 'vulkan';
                                setRenderingBackend(backend);
                              }}
                            />
                          </SettingCard>
                          <SettingCard label={t('interpolation')} description={t('interpolation.desc')}>
                            <Toggle checked={interpolation} onChange={setInterpolation} />
                          </SettingCard>
                          <SettingCard label={t('deband')} description={t('deband.desc')}>
                            <Toggle checked={deband} onChange={setDeband} />
                          </SettingCard>
                        </div>

                        <div className="p-5 rounded-xl bg-foreground/[0.03] border border-border-subtle space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <FastForward size={14} className="text-accent" />
                              <div>
                                <h4 className="text-[13px] font-medium text-foreground">{t('crossfade')}</h4>
                                <p className="text-[10px] text-muted mt-0.5">{t('crossfade.desc')}</p>
                              </div>
                            </div>
                            <Toggle checked={crossfade} onChange={setCrossfade} />
                          </div>
                          
                          {crossfade && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }} 
                              animate={{ height: 'auto', opacity: 1 }}
                              className="pt-3 border-t border-border-subtle space-y-3"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted font-medium">{t('duration')}</span>
                                <span className="text-accent font-semibold font-mono">{crossfadeDuration}s</span>
                              </div>
                              <input 
                                type="range" min="1" max="10" step="0.5"
                                value={crossfadeDuration}
                                onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value))}
                                className="w-full accent-accent bg-foreground/[0.08] h-[3px] rounded-full cursor-pointer appearance-none"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )}


                    {activeTab === 'equalizer' && (
                      <div className="h-full flex flex-col gap-5">
                        <div className="flex flex-wrap gap-1.5">
                          {EQ_PRESETS.map((preset) => {
                            const isActive = JSON.stringify(equalizer) === JSON.stringify(preset.bands);
                            return (
                              <button
                                key={preset.name}
                                onClick={() => applyPreset(preset.bands)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                                  isActive
                                  ? 'bg-accent text-white'
                                  : 'bg-foreground/[0.04] text-muted hover:bg-foreground/[0.08] hover:text-foreground'
                                }`}
                              >
                                {preset.name}
                              </button>
                            );
                          })}
                          <button 
                            onClick={resetEqualizer}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted hover:text-foreground transition-colors cursor-pointer ml-auto"
                          >
                            {t('reset')}
                          </button>
                        </div>

                        <div className="flex-1 flex items-stretch gap-1 min-h-[220px] p-4 rounded-xl bg-foreground/[0.01] border border-border-subtle">
                          {BANDS.map((band, idx) => {
                            const pct = ((equalizer[idx] + 20) / 40) * 100;
                            return (
                              <div key={band.freq} className="flex-1 flex flex-col items-center gap-2 group relative">
                                <div className="text-[9px] font-mono font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity h-4 flex items-center">
                                  {equalizer[idx] > 0 ? '+' : ''}{equalizer[idx]}
                                </div>
                                <div className="flex-1 w-full flex flex-col items-center relative">
                                  <div className="w-[6px] h-full bg-foreground/[0.04] rounded-full relative overflow-hidden">
                                    <div 
                                      className="absolute bottom-0 w-full bg-accent/60 rounded-full transition-all group-hover:bg-accent"
                                      style={{ height: `${pct}%` }}
                                    />
                                  </div>
                                  <input 
                                    type="range" min="-20" max="20" step="0.5"
                                    value={equalizer[idx]}
                                    onChange={(e) => updateEqualizer(idx, parseFloat(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    style={{ appearance: 'slider-vertical', writingMode: 'vertical-lr' } as any}
                                  />
                                </div>
                                <span className="text-[9px] font-medium text-muted/60 group-hover:text-foreground transition-colors">{band.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeTab === 'shortcuts' && (
                      <div className="divide-y divide-border-subtle/30">
                        {shortcuts.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between py-3">
                            <span className="text-[12px] text-muted font-medium">{s.desc}</span>
                            <kbd className="px-2.5 py-1 bg-foreground/[0.05] rounded-md text-[11px] font-mono text-foreground/60 border border-border-subtle min-w-[42px] text-center">
                              {s.key}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'about' && (
                      <div className="h-full flex flex-col justify-center">
                        <div className="flex items-start gap-8 mb-8">
                          <div className="w-16 h-16 flex-shrink-0">
                            <img src="/lieb-player-icon.png" alt="Lieb Player" className="w-full h-full object-contain" />
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h2 className="text-xl font-black text-foreground tracking-tighter uppercase">
                                Lieb Player
                              </h2>
                              <span className="px-1.5 py-0.5 rounded-[2px] bg-foreground text-background text-[8px] font-black tracking-[0.2em] uppercase">
                                Alpha 0.1
                              </span>
                            </div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em]">{t('about.subtitle')}</p>
                          </div>
                        </div>

                        <div className="mb-10 space-y-6">
                          <p className="text-[13px] text-foreground/80 leading-[1.8] font-medium max-w-xl">
                            {t('about.story')}
                          </p>
                          <p className="text-[12px] text-muted leading-[1.8] font-medium max-w-xl">
                            {t('about.tech')}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-8 pt-6 border-t border-white/[0.04]">
                          <div>
                            <p className="text-[9px] text-muted font-black uppercase tracking-[0.2em] mb-2">{t('designer')}</p>
                            <p className="text-[11px] font-bold text-foreground">Christlieb Dela</p>
                          </div>
                          
                          <div>
                            <p className="text-[9px] text-muted font-black uppercase tracking-[0.2em] mb-2">{t('repository')}</p>
                            <a 
                              href="https://github.com/christliebdela/lieb-player" 
                              target="_blank" 
                              className="text-[11px] font-bold text-foreground hover:text-accent transition-colors flex items-center gap-1.5"
                            >
                              {t('source')} <ExternalLink size={10} strokeWidth={3} />
                            </a>
                          </div>

                          <div>
                            <p className="text-[9px] text-muted font-black uppercase tracking-[0.2em] mb-2">{t('feedback')}</p>
                            <a 
                              href="https://github.com/christliebdela/lieb-player/issues" 
                              target="_blank" 
                              className="text-[11px] font-bold text-accent hover:underline decoration-2 underline-offset-4"
                            >
                              {t('report.issue')}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
    </div>
  );

  // Standalone: render the panel directly, filling the window
  if (standalone) return panel;

  // Overlay mode: wrap in backdrop + portal
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
