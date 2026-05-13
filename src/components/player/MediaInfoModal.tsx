import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getProperty } from 'tauri-plugin-mpv-api';
import { 
  HardDrive, Film, Music, Zap, X, Activity 
} from 'lucide-react';
import { useTranslation } from '../../i18n';

interface MediaStats {
  path: string;
  filename: string;
  filesize: string;
  duration: number;
  
  // Video
  videoCodec: string;
  videoRes: string;
  videoFps: string;
  videoBitrate: string;
  videoFormat: string;
  videoColorSpace: string;
  videoPrimaries: string;
  videoTransfer: string;
  hwDec: string;
  
  // Audio
  audioCodec: string;
  audioChannels: string;
  audioSamplerate: string;
  audioBitrate: string;
  
  // Engine
  vo: string;
  ao: string;
  droppedFrames: number;
  mistimedFrames: number;
  cacheSize: string;
  buffering: number;
}

export const MediaInfoModal: React.FC = () => {
  const { isMediaInfoOpen, setMediaInfoOpen } = usePlayerStore();
  const { t } = useTranslation();
  const [stats, setStats] = useState<MediaStats | null>(null);

  useEffect(() => {
    if (!isMediaInfoOpen) return;

    const fetchStats = async () => {
      try {
        const [
          path, filename, filesize, duration,
          vCodec, vRes, vFps, vBitrate, vFormat, vCS, vPri, vTrans, hw,
          aCodec, aChan, aSR, aBitrate,
          vo, ao, dropped, mistimed, cache, buffer
        ] = await Promise.all([
          getProperty('path'),
          getProperty('filename'),
          getProperty('file-size'),
          getProperty('duration'),
          
          getProperty('video-codec'),
          getProperty('video-params/aspect-res'),
          getProperty('container-fps'),
          getProperty('video-bitrate'),
          getProperty('video-format'),
          getProperty('video-params/colormatrix'),
          getProperty('video-params/primaries'),
          getProperty('video-params/transfer'),
          getProperty('hwdec-current'),
          
          getProperty('audio-codec'),
          getProperty('audio-params/channel-count'),
          getProperty('audio-params/samplerate'),
          getProperty('audio-bitrate'),
          
          getProperty('vo'),
          getProperty('ao'),
          getProperty('frame-drop-count'),
          getProperty('mistimed-frame-count'),
          getProperty('cache-used'),
          getProperty('buffering-percentage')
        ]);

        const formatSize = (bytes: any) => {
          if (!bytes) return 'N/A';
          const b = parseInt(bytes);
          if (isNaN(b)) return bytes;
          if (b > 1024 * 1024 * 1024) return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GiB';
          return (b / (1024 * 1024)).toFixed(2) + ' MiB';
        };

        const formatBitrate = (bits: any) => {
          if (!bits) return 'N/A';
          const b = parseInt(bits);
          if (isNaN(b)) return bits;
          return (b / 1000).toFixed(0) + ' kbps';
        };

        setStats({
          path: String(path || ''),
          filename: String(filename || ''),
          filesize: formatSize(filesize),
          duration: Number(duration || 0),
          videoCodec: String(vCodec || 'N/A'),
          videoRes: String(vRes || 'N/A'),
          videoFps: Number(vFps).toFixed(2),
          videoBitrate: formatBitrate(vBitrate),
          videoFormat: String(vFormat || 'N/A'),
          videoColorSpace: String(vCS || 'N/A'),
          videoPrimaries: String(vPri || 'N/A'),
          videoTransfer: String(vTrans || 'N/A'),
          hwDec: String(hw || 'no'),
          audioCodec: String(aCodec || 'N/A'),
          audioChannels: String(aChan || 'N/A'),
          audioSamplerate: (Number(aSR) / 1000).toFixed(1) + ' kHz',
          audioBitrate: formatBitrate(aBitrate),
          vo: String(vo || 'N/A'),
          ao: String(ao || 'N/A'),
          droppedFrames: Number(dropped || 0),
          mistimedFrames: Number(mistimed || 0),
          cacheSize: formatSize(cache),
          buffering: Number(buffer || 0)
        });
      } catch (err) {
        console.error('Failed to fetch media stats:', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [isMediaInfoOpen]);

  if (!isMediaInfoOpen) return null;

  const InfoGroup = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05]">
        <Icon size={14} className="text-accent" />
        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        {children}
      </div>
    </div>
  );

  const InfoItem = ({ label, value, highlight = false }: { label: string, value: string | number, highlight?: boolean }) => (
    <div className="space-y-1">
      <p className="text-[9px] text-muted font-bold uppercase tracking-wider">{label}</p>
      <p className={`text-[12px] ${highlight ? 'text-accent font-bold' : 'text-foreground/90 font-medium'} truncate`}>{value}</p>
    </div>
  );

  return (
    <AnimatePresence>
      {isMediaInfoOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            onClick={() => setMediaInfoOpen(false)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-[32px] border border-white/[0.05] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.03] bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-foreground uppercase tracking-widest">{t('sc.media_info' as any)}</h2>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider mt-0.5">{stats?.filename || 'Analyzing...'}</p>
                </div>
              </div>
              <button 
                onClick={() => setMediaInfoOpen(false)}
                className="w-10 h-10 rounded-2xl hover:bg-white/[0.05] flex items-center justify-center text-muted hover:text-foreground transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-12">
              {stats ? (
                <>
                  <InfoGroup icon={HardDrive} title="File & Container">
                    <InfoItem label="File Size" value={stats.filesize} />
                    <InfoItem label="Format" value={stats.videoFormat} />
                    <InfoItem label="Duration" value={`${Math.floor(stats.duration / 60)}m ${Math.floor(stats.duration % 60)}s`} />
                    <InfoItem label="Path" value={stats.path} />
                  </InfoGroup>

                  <InfoGroup icon={Film} title="Video Stream">
                    <InfoItem label="Codec" value={stats.videoCodec} highlight />
                    <InfoItem label="Resolution" value={stats.videoRes} />
                    <InfoItem label="Framerate" value={`${stats.videoFps} fps`} />
                    <InfoItem label="Bitrate" value={stats.videoBitrate} />
                    <InfoItem label="Hardware Dec" value={stats.hwDec.toUpperCase()} highlight />
                    <InfoItem label="Format" value={stats.videoFormat} />
                  </InfoGroup>

                  <InfoGroup icon={Music} title="Audio Stream">
                    <InfoItem label="Codec" value={stats.audioCodec} />
                    <InfoItem label="Channels" value={stats.audioChannels} />
                    <InfoItem label="Sample Rate" value={stats.audioSamplerate} />
                    <InfoItem label="Bitrate" value={stats.audioBitrate} />
                  </InfoGroup>

                  <InfoGroup icon={Zap} title="Engine Performance">
                    <InfoItem label="Video Output" value={stats.vo} />
                    <InfoItem label="Audio Output" value={stats.ao} />
                    <InfoItem label="Dropped Frames" value={stats.droppedFrames} highlight={stats.droppedFrames > 0} />
                    <InfoItem label="Mistimed Frames" value={stats.mistimedFrames} />
                    <InfoItem label="Cache Size" value={stats.cacheSize} />
                    <InfoItem label="Buffering" value={`${stats.buffering}%`} />
                  </InfoGroup>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-12 h-12 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                  <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Interrogating Lieb Engine...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-white/[0.02] border-t border-white/[0.03] flex justify-between items-center">
              <p className="text-[9px] text-muted/40 font-bold uppercase tracking-[0.2em]">Lieb Player Diagnostic Interface v0.1.9</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[9px] text-muted font-black uppercase tracking-wider">Engine Healthy</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
