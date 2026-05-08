import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sliders, Monitor, Keyboard, Info, Volume2, ExternalLink, Activity, Palette, FastForward } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
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
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Sky', color: '#0ea5e9' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Crimson', color: '#e11d48' },
  { name: 'Gold', color: '#d4af37' },
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
  <div className="flex bg-white/[0.04] rounded-lg p-0.5 border border-white/5">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`relative px-3 py-1.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
          value === opt
            ? 'text-black'
            : 'text-white/40 hover:text-white/70'
        }`}
      >
        {value === opt && (
          <motion.div
            layoutId="segment-active"
            className="absolute inset-0 bg-accent rounded-md"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
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
    className={`relative w-10 h-[22px] rounded-full transition-colors cursor-pointer ${checked ? 'bg-accent' : 'bg-white/10 hover:bg-white/15'}`}
  >
    <motion.div
      className="absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-md"
      animate={{ left: checked ? 22 : 3 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
);

/* ─── Setting Card ─── */
const SettingCard = ({ label, description, children }: { 
  label: string; description?: string; children: React.ReactNode 
}) => (
  <div className="flex items-center justify-between py-4 group">
    <div className="space-y-0.5">
      <h4 className="text-[13px] font-medium text-white/90">{label}</h4>
      {description && <p className="text-[11px] text-white/30 leading-relaxed">{description}</p>}
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
    theme, setTheme
  } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  if (!isSettingsOpen && !standalone) return null;

  const handleClose = () => {
    if (standalone) {
      getCurrentWindow().close();
    } else {
      setSettingsOpen(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'interface', label: 'Interface', icon: Palette },
    { id: 'video', label: 'Video', icon: Monitor },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'equalizer', label: 'Equalizer', icon: Activity },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
    { id: 'about', label: 'About', icon: Info },
  ];

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause' },
    { key: 'F', desc: 'Toggle Fullscreen' },
    { key: 'M', desc: 'Mute / Unmute' },
    { key: 'L', desc: 'Open Library' },
    { key: 'S', desc: 'Open Settings' },
    { key: 'N', desc: 'Next Track' },
    { key: 'P', desc: 'Previous Track' },
    { key: '→', desc: 'Seek Forward 10s' },
    { key: '←', desc: 'Seek Backward 10s' },
    { key: '↑ / ↓', desc: 'Volume Up / Down' },
    { key: 'Esc', desc: 'Exit Fullscreen / Close' },
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
    <div className={`bg-[#050505] overflow-hidden flex ${
      standalone 
        ? 'w-full h-screen' 
        : 'w-full max-w-[780px] h-[520px] rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10'
    }`}>

            {/* Sidebar */}
            <div className="w-48 bg-white/[0.015] border-r border-white/5 p-3 flex flex-col">
              <div className="px-3 py-4 mb-2 flex items-center gap-2.5">
                <img src="/lieb-player-icon.png" alt="Lieb Player" className="w-6 h-6 rounded-lg" />
                <div>
                  <h1 className="text-[13px] font-semibold text-white leading-tight tracking-tight">lieb player</h1>
                  <p className="text-[9px] text-white/20 font-medium uppercase tracking-[0.15em]">preferences</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                      activeTab === tab.id 
                      ? 'bg-white/[0.08] text-white' 
                      : 'text-white/35 hover:text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <tab.icon size={15} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-auto pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-white/20 font-mono">
                  v0.1.0-alpha
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <header className="h-12 flex items-center justify-between px-6 border-b border-white/5 shrink-0" data-tauri-drag-region>
                <h2 className="text-[13px] font-semibold text-white/80 capitalize">{activeTab}</h2>
                <button 
                  onClick={handleClose}
                  className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-white/30 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    {/* ... (rest of the content remains same) */}
                    {activeTab === 'general' && (
                      <div className="space-y-8">
                        <div className="divide-y divide-white/[0.04]">
                          <SettingCard label="Hardware Acceleration" description="Use GPU for video decoding">
                            <Toggle checked={true} onChange={() => {}} />
                          </SettingCard>
                          <SettingCard label="Remember Position" description="Resume from where you left off">
                            <Toggle checked={true} onChange={() => {}} />
                          </SettingCard>
                          <SettingCard label="Scroll Wheel" description="What the scroll wheel controls">
                            <SegmentedControl 
                              options={['Volume', 'Seek']}
                              value={scrollMode === 'volume' ? 'Volume' : 'Seek'}
                              onChange={(v) => setScrollMode(v.toLowerCase() as 'volume' | 'seek')}
                            />
                          </SettingCard>
                        </div>

                      </div>
                    )}

                    {activeTab === 'interface' && (
                      <div className="space-y-8">
                        <div className="divide-y divide-white/[0.04]">
                          <SettingCard label="Theme" description="Application appearance">
                            <SegmentedControl 
                              options={['Dark', 'Light']}
                              value={theme === 'light' ? 'Light' : 'Dark'}
                              onChange={(v) => setTheme(v.toLowerCase() as 'dark' | 'light')}
                            />
                          </SettingCard>
                        </div>

                        {/* Accent Color */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Palette size={13} className="text-white/25" />
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">Accent Color</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {PRESET_COLORS.map((preset) => (
                              <button
                                key={preset.name}
                                onClick={() => setAccentColor(preset.color)}
                                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer border ${
                                  accentColor === preset.color 
                                  ? 'bg-white/[0.08] border-white/15' 
                                  : 'bg-transparent border-white/5 hover:bg-white/[0.04]'
                                }`}
                              >
                                <div 
                                  className="w-5 h-5 rounded-full shrink-0 ring-1 ring-white/10"
                                  style={{ backgroundColor: preset.color }}
                                />
                                <span className={`text-[11px] font-medium transition-colors ${
                                  accentColor === preset.color ? 'text-white' : 'text-white/35 group-hover:text-white/60'
                                }`}>
                                  {preset.name}
                                </span>
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex-1">
                              <span className="text-[11px] font-medium text-white/50">Custom</span>
                            </div>
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden cursor-pointer ring-1 ring-white/10">
                              <div className="w-full h-full" style={{ backgroundColor: accentColor }} />
                              <input 
                                type="color" value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'video' && (
                      <div className="space-y-8">
                        <div className="divide-y divide-white/[0.04]">
                          <SettingCard label="Rendering Backend" description="Graphics API for video output">
                            <SegmentedControl 
                              options={['GPU-Next', 'D3D11', 'Vulkan']}
                              value="GPU-Next"
                              onChange={() => {}}
                            />
                          </SettingCard>
                          <SettingCard label="Interpolation" description="Smoother motion on high-refresh displays">
                            <Toggle checked={true} onChange={() => {}} />
                          </SettingCard>
                          <SettingCard label="Deband" description="Reduce color banding in gradients">
                            <Toggle checked={true} onChange={() => {}} />
                          </SettingCard>
                        </div>

                        <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <FastForward size={14} className="text-accent" />
                              <div>
                                <h4 className="text-[13px] font-medium text-white/90">Crossfade</h4>
                                <p className="text-[10px] text-white/30 mt-0.5">Smooth audio transitions between tracks</p>
                              </div>
                            </div>
                            <Toggle checked={crossfade} onChange={setCrossfade} />
                          </div>
                          
                          {crossfade && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }} 
                              animate={{ height: 'auto', opacity: 1 }}
                              className="pt-3 border-t border-white/5 space-y-3"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-white/40 font-medium">Duration</span>
                                <span className="text-accent font-semibold font-mono">{crossfadeDuration}s</span>
                              </div>
                              <input 
                                type="range" min="1" max="10" step="0.5"
                                value={crossfadeDuration}
                                onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value))}
                                className="w-full accent-accent bg-white/10 h-[3px] rounded-full cursor-pointer appearance-none"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'audio' && (
                      <div className="divide-y divide-white/[0.04]">
                        <SettingCard label="Normalization" description="Balance volume across different files">
                          <Toggle checked={false} onChange={() => {}} />
                        </SettingCard>
                        <SettingCard label="Preferred Language" description="Default audio track language">
                          <SegmentedControl 
                            options={['English', 'Japanese', 'French']}
                            value="English"
                            onChange={() => {}}
                          />
                        </SettingCard>
                        <SettingCard label="Audio Delay" description="Adjust sync offset in milliseconds">
                          <span className="text-[11px] font-mono text-white/30 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/5">0 ms</span>
                        </SettingCard>
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
                                  ? 'bg-accent text-black'
                                  : 'bg-white/[0.04] text-white/35 hover:bg-white/[0.08] hover:text-white/70'
                                }`}
                              >
                                {preset.name}
                              </button>
                            );
                          })}
                          <button 
                            onClick={resetEqualizer}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/20 hover:text-white/50 transition-colors cursor-pointer ml-auto"
                          >
                            Reset
                          </button>
                        </div>

                        <div className="flex-1 flex items-stretch gap-1 min-h-[220px] p-4 rounded-xl bg-white/[0.02] border border-white/5">
                          {BANDS.map((band, idx) => {
                            const pct = ((equalizer[idx] + 20) / 40) * 100;
                            return (
                              <div key={band.freq} className="flex-1 flex flex-col items-center gap-2 group relative">
                                <div className="text-[9px] font-mono font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity h-4 flex items-center">
                                  {equalizer[idx] > 0 ? '+' : ''}{equalizer[idx]}
                                </div>
                                <div className="flex-1 w-full flex flex-col items-center relative">
                                  <div className="w-[6px] h-full bg-white/[0.04] rounded-full relative overflow-hidden">
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
                                <span className="text-[9px] font-medium text-white/20 group-hover:text-white/50 transition-colors">{band.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeTab === 'shortcuts' && (
                      <div className="divide-y divide-white/[0.04]">
                        {shortcuts.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between py-3">
                            <span className="text-[12px] text-white/50 font-medium">{s.desc}</span>
                            <kbd className="px-2.5 py-1 bg-white/[0.05] rounded-md text-[11px] font-mono text-white/60 border border-white/10 min-w-[42px] text-center">
                              {s.key}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'about' && (
                      <div className="h-full flex flex-col justify-center max-w-sm mx-auto">
                        <div className="flex flex-col items-center text-center gap-4 mb-8">
                          <div className="relative">
                            <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full" />
                            <div className="w-24 h-24 bg-[#050505] rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden p-2 relative z-10">
                              <img src="/lieb-player-icon.png" alt="Lieb Player" className="w-full h-full object-contain drop-shadow-xl" />
                            </div>
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
                              Lieb Player
                              <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-black tracking-widest border border-accent/20">ALPHA</span>
                            </h2>
                            <p className="text-[11px] text-white/40 mt-1.5 font-medium tracking-wide">Version 0.1.0 · Modern Media Experience</p>
                          </div>
                        </div>

                        <div className="text-center mb-8 px-2">
                          <p className="text-[12px] text-white/50 leading-relaxed font-medium">
                            I built Lieb Player because I wanted more control and deep customization 
                            options that most other players simply don't provide. It's a project born 
                            from the need for a truly personal media experience that looks as good 
                            as it performs.
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-5 border-t border-white/5">
                          <div>
                            <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mb-1">Created by</p>
                            <p className="text-[13px] font-bold text-white/90">Christlieb Dela</p>
                          </div>
                          <div className="flex gap-2">
                            <a 
                              href="https://github.com/christliebdela/lieb-player" 
                              target="_blank" 
                              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer"
                              title="Source Code"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <a 
                              href="https://github.com/christliebdela/lieb-player/issues" 
                              target="_blank" 
                              className="px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/20 flex items-center gap-1.5 text-accent text-[11px] font-bold transition-all cursor-pointer"
                            >
                              Report Bug
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
