import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getProperty } from 'tauri-plugin-mpv-api';
import { 
  X, Activity, Info, Monitor, Volume2, Settings
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { WindowControls } from '../layout/WindowControls';

interface TabProps {
  id: string;
  label: string;
  icon: any;
  active: boolean;
  onClick: () => void;
}

const Tab: React.FC<TabProps> = ({ label, icon: Icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer shrink-0 border ${
      active 
        ? 'bg-accent/15 text-accent font-bold border-accent/20 shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]' 
        : 'text-muted hover:text-foreground hover:bg-foreground/[0.04] border-transparent'
    }`}
  >
    <Icon size={16} className={active ? 'text-accent' : 'text-muted/50'} />
    <span className="text-[11px] uppercase tracking-widest">{label}</span>
  </button>
);

const StatRow = ({ label, value, highlight = false }: { label: string, value: string | number | null | undefined, highlight?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
    <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em]">{label}</span>
    <span className={`text-[11px] font-medium tabular-nums ${highlight ? 'text-accent' : 'text-foreground/80'}`}>
      {value === null || value === undefined || value === '' ? '—' : String(value)}
    </span>
  </div>
);

export const MediaInfoModal: React.FC<{ standalone?: boolean }> = ({ standalone }) => {
  const { isMediaInfoOpen, setMediaInfoOpen } = usePlayerStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [stats, setStats] = useState<Record<string, any>>({});
  const [isEngineHealthy, setIsEngineHealthy] = useState(true);

  const formatSize = (bytes: any) => {
    if (!bytes) return null;
    const b = parseInt(bytes);
    if (isNaN(b)) return bytes;
    if (b > 1024 * 1024 * 1024) return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GiB';
    return (b / (1024 * 1024)).toFixed(2) + ' MiB';
  };

  const formatBitrate = (bits: any) => {
    if (!bits) return null;
    const b = parseInt(bits);
    if (isNaN(b)) return bits;
    return (b / 1000).toFixed(0) + ' kbps';
  };

  useEffect(() => {
    // If standalone, we always poll. If modal, we poll only when open.
    if (!standalone && !isMediaInfoOpen) return;

    const fetchStats = async () => {
      try {
        const props = [
          'path', 'filename', 'file-size', 'duration',
          'video-codec', 'video-params/aspect-res', 'container-fps', 'video-bitrate', 'video-format', 
          'video-params/colormatrix', 'video-params/primaries', 'video-params/transfer', 'hwdec-current',
          'audio-codec', 'audio-params/channel-count', 'audio-params/samplerate', 'audio-bitrate',
          'vo', 'ao', 'frame-drop-count', 'mistimed-frame-count', 'cache-used', 'buffering-percentage'
        ];

        const results = await Promise.allSettled(props.map(p => getProperty(p)));
        const newStats: Record<string, any> = {};
        
        props.forEach((p, i) => {
          const res = results[i];
          if (res.status === 'fulfilled') {
            newStats[p] = res.value;
          }
        });

        setStats(newStats);
        setIsEngineHealthy(true);
      } catch (err) {
        console.error('Failed to fetch media stats:', err);
        setIsEngineHealthy(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, [isMediaInfoOpen, standalone]);

  if (!standalone && !isMediaInfoOpen) return null;

  const content = (
    <div className={`flex-1 flex flex-col min-h-0 ${standalone ? 'h-full w-full' : 'w-[700px] h-[500px] bg-[#0A0A0B]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] ring-1 ring-white/5 overflow-hidden'}`}>
      {/* Header */}
      <header className="h-14 flex items-center justify-between border-b border-white/[0.05] shrink-0 relative overflow-hidden">
        {/* Actual Drag Region (Background) */}
        <div className="absolute inset-0 z-0" data-tauri-drag-region />

        <div className="relative z-10 px-6 flex items-center gap-3 pointer-events-none">
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent ring-1 ring-accent/20">
            <Activity size={16} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-[14px] font-bold text-foreground leading-tight tracking-tight">Lieb Media Engine</h2>
            <p className="text-[9px] text-muted font-bold uppercase tracking-[0.2em] mt-[2px]">
              Technical Diagnostics System
            </p>
          </div>
        </div>

        <div className="relative z-20 px-6 h-full flex items-center pointer-events-auto" data-tauri-drag-region="false">
          {standalone ? (
            <WindowControls showMinimize={false} showMaximize={false} closeVariant="danger" />
          ) : (
            <button 
              onClick={() => setMediaInfoOpen(false)}
              className="h-8 w-8 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div className="w-48 border-r border-white/[0.05] flex flex-col bg-white/[0.01]">
          <div className="p-4 flex-1 flex flex-col gap-1">
            <Tab id="general" label={t('general')} icon={Info} active={activeTab === 'general'} onClick={() => setActiveTab('general')} />
            <Tab id="video" label={t('video')} icon={Monitor} active={activeTab === 'video'} onClick={() => setActiveTab('video')} />
            <Tab id="audio" label={t('audio')} icon={Volume2} active={activeTab === 'audio'} onClick={() => setActiveTab('audio')} />
            <Tab id="engine" label={t('engine')} icon={Settings} active={activeTab === 'engine'} onClick={() => setActiveTab('engine')} />
          </div>

          <div className="p-4 border-t border-white/[0.05] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-muted uppercase tracking-widest">Engine Status</span>
              <div className={`w-2 h-2 rounded-full ${isEngineHealthy ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-muted uppercase tracking-widest">Version</span>
              <span className="text-[8px] font-black text-accent uppercase tracking-widest">v0.2.0</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-br from-transparent to-white/[0.01]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeTab === 'general' && (
                <div className="space-y-1">
                  <StatRow label="Filename" value={stats['filename']} highlight />
                  <StatRow label="Full Path" value={stats['path']} />
                  <StatRow label="File Size" value={formatSize(stats['file-size'])} />
                  <StatRow label="Duration" value={stats['duration'] ? (Number(stats['duration']) / 60).toFixed(2) + ' min' : '—'} />
                </div>
              )}

              {activeTab === 'video' && (
                <div className="space-y-1">
                  <StatRow label="Codec" value={stats['video-codec']} highlight />
                  <StatRow label="Resolution" value={stats['video-params/aspect-res']} />
                  <StatRow label="Frame Rate" value={stats['container-fps'] ? Number(stats['container-fps']).toFixed(2) + ' fps' : '—'} />
                  <StatRow label="Bitrate" value={formatBitrate(stats['video-bitrate'])} />
                  <StatRow label="Format" value={stats['video-format']} />
                  <StatRow label="Matrix" value={stats['video-params/colormatrix']} />
                  <StatRow label="Primaries" value={stats['video-params/primaries']} />
                  <StatRow label="Transfer" value={stats['video-params/transfer']} />
                  <StatRow label="HW Decoder" value={stats['hwdec-current']} />
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="space-y-1">
                  <StatRow label="Codec" value={stats['audio-codec']} highlight />
                  <StatRow label="Channels" value={stats['audio-params/channel-count']} />
                  <StatRow label="Sample Rate" value={stats['audio-params/samplerate'] ? (Number(stats['audio-params/samplerate']) / 1000).toFixed(1) + ' kHz' : '—'} />
                  <StatRow label="Bitrate" value={formatBitrate(stats['audio-bitrate'])} />
                </div>
              )}

              {activeTab === 'engine' && (
                <div className="space-y-1">
                  <StatRow label="Video Output" value={stats['vo']} highlight />
                  <StatRow label="Audio Output" value={stats['ao']} highlight />
                  <StatRow label="Dropped Frames" value={stats['frame-drop-count']} />
                  <StatRow label="Mistimed Frames" value={stats['mistimed-frame-count']} />
                  <StatRow label="Cache Usage" value={formatSize(stats['cache-used'])} />
                  <StatRow label="Buffer Status" value={stats['buffering-percentage'] ? stats['buffering-percentage'] + '%' : '—'} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  if (standalone) {
    return (
      <div className="h-screen w-screen bg-background overflow-hidden font-inter select-none flex flex-col">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="pointer-events-auto"
      >
        {content}
      </motion.div>
    </div>
  );
};
