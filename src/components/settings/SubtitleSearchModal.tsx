import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Download, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { command } from 'tauri-plugin-mpv-api';
import { showActionOSD } from '../../utils/osd';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface SubtitleResult {
  id: string;
  attributes: {
    release: string;
    language: string;
    files: Array<{ file_id: number; file_name: string }>;
    url: string;
  };
}

export const SubtitleSearchModal: React.FC<{ standalone?: boolean }> = ({ standalone }) => {
  const { currentTrack, isSubSearchOpen, setSubSearchOpen } = usePlayerStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SubtitleResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (currentTrack) {
      const fileName = currentTrack.split(/[\\/]/).pop()?.split('.').slice(0, -1).join('.') || '';
      setQuery(fileName);
      handleSearch(fileName);
    }
  }, [currentTrack]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Api-Key': 'YOUR_API_KEY_HERE',
          'Content-Type': 'application/json',
          'User-Agent': 'LiebPlayer v0.1.0'
        }
      });
      
      const data = await response.json();
      if (data.data) {
        setResults(data.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      setError('Failed to fetch subtitles. Please try again.');
      console.error('Subtitle search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (result: SubtitleResult) => {
    setDownloadingId(result.id);
    try {
      const fileId = result.attributes.files[0].file_id;
      
      const dlResponse = await fetch('https://api.opensubtitles.com/api/v1/download', {
        method: 'POST',
        headers: {
          'Api-Key': 'YOUR_API_KEY_HERE',
          'Content-Type': 'application/json',
          'User-Agent': 'LiebPlayer v0.1.0'
        },
        body: JSON.stringify({ file_id: fileId })
      });
      
      const dlData = await dlResponse.json();
      if (dlData.link) {
        await command('sub-add', [dlData.link, 'select']);
        showActionOSD('Subtitle Attached', 'subtitles');
        handleClose();
      }
    } catch (err) {
      showActionOSD('Download Failed', 'alert-circle');
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleClose = () => {
    if (standalone) {
      getCurrentWindow().close();
    } else {
      setSubSearchOpen(false);
    }
  };

  const modal = (
    <div className={`bg-background flex flex-col overflow-hidden ${
      standalone 
        ? 'w-full h-full' 
        : 'w-[520px] h-[480px] rounded-2xl shadow-2xl border border-white/5'
    }`}>
      <header className="h-14 px-6 flex items-center justify-between border-b border-white/5 shrink-0" data-tauri-drag-region>
        <div className="flex items-center gap-3">
          <Globe className="text-accent" size={18} />
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Online Subtitles</h2>
        </div>
        <button onClick={handleClose} className="text-muted hover:text-foreground transition-colors p-2">
          <X size={20} />
        </button>
      </header>

      <div className="p-6 shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
          className="relative group"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" size={18} />
          <input 
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movie or series title..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-foreground focus:border-accent/50 outline-none transition-all placeholder:text-muted/30"
          />
          <button 
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-accent text-black text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]"
          >
            Search
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-muted gap-4">
            <Loader2 className="animate-spin text-accent" size={32} />
            <p className="text-[10px] font-bold uppercase tracking-widest">Searching OpenSubtitles...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-red-400/60 gap-4">
            <AlertCircle size={32} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-center">{error}</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid gap-3">
            {results.map((result) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-accent/30 hover:bg-white/[0.08] transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 bg-accent/10 border border-accent/20 text-accent text-[9px] font-bold rounded uppercase">
                      {result.attributes.language}
                    </span>
                    <h4 className="text-[13px] text-foreground/90 font-medium truncate">
                      {result.attributes.release}
                    </h4>
                  </div>
                  <p className="text-[10px] text-muted truncate opacity-60">
                    ID: {result.id} • {result.attributes.files[0].file_name}
                  </p>
                </div>

                <button 
                  onClick={() => handleDownload(result)}
                  disabled={downloadingId !== null}
                  className="ml-4 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted hover:bg-accent hover:text-black transition-all cursor-pointer shadow-xl disabled:opacity-50"
                >
                  {downloadingId === result.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Download size={16} />
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        ) : query && (
          <div className="h-full flex flex-col items-center justify-center text-muted/40 gap-4">
            <Search size={40} strokeWidth={1} />
            <p className="text-[10px] font-bold uppercase tracking-widest">No subtitles found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );

  if (standalone) return modal;

  return createPortal(
    <AnimatePresence>
      {isSubSearchOpen && (
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
            onClick={(e) => e.stopPropagation()}
          >
            {modal}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
