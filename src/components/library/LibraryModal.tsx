import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Film, Library, Trash2, ListMusic, ChevronRight } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { command, setProperty } from 'tauri-plugin-mpv-api';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from '../../i18n';

export const LibraryModal: React.FC<{ standalone?: boolean }> = ({ standalone }) => {
  const { isLibraryOpen, setLibraryOpen, playlist, addToPlaylist, removeFromPlaylist, clearPlaylist } = usePlayerStore();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!standalone) return;

    const unlisten = listen('tauri://drag-drop', (event: any) => {
      const paths = event.payload.paths || event.payload;
      if (paths && paths.length > 0) {
        paths.forEach((path: string) => addToPlaylist(path));
      }
    });

    return () => {
      unlisten.then(u => u());
    };
  }, [standalone, addToPlaylist]);

  const handleClose = () => {
    if (standalone) {
      getCurrentWindow().close();
    } else {
      setLibraryOpen(false);
    }
  };

  const handlePlayEpisode = async (path: string) => {
    try {
      await command('loadfile', [path]);
      await setProperty('pause', false);
      setLibraryOpen(false);
    } catch (err) {
      console.error('Failed to load episode:', err);
    }
  };

  const getFileName = (path: string) => {
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1];
  };

  const getFileExtension = (path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  };

  if (!isLibraryOpen && !standalone) return null;

  const panel = (
    <div className={`bg-background overflow-hidden flex flex-col ${
      standalone
        ? 'w-full h-screen'
        : 'w-full max-w-[780px] h-[520px] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-border-subtle'
    }`}>
            {/* Header */}
            <header className="h-12 px-6 flex items-center justify-between border-b border-border-subtle shrink-0" data-tauri-drag-region>
              <div className="flex items-center gap-3 pointer-events-none">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent ring-1 ring-accent/20">
                  <ListMusic size={14} />
                </div>
                <div className="flex flex-col justify-center">
                  <h2 className="text-[13px] font-semibold text-foreground leading-tight tracking-tight">{t('library.title')}</h2>
                  <p className="text-[9px] text-muted font-medium uppercase tracking-[0.15em] mt-[1px]">
                    {playlist.length} {playlist.length === 1 ? t('library.file') : t('library.files')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {playlist.length > 0 && (
                  <button 
                    onClick={clearPlaylist}
                    className="px-3 py-1.5 rounded-md bg-foreground/[0.03] hover:bg-red-500/10 text-muted hover:text-red-400 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border border-border-subtle hover:border-red-500/20"
                  >
                    {t('library.clear')}
                  </button>
                )}
                <button 
                  onClick={handleClose}
                  className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-muted hover:text-foreground cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="flex flex-col gap-1.5">
                {playlist.length > 0 ? (
                  playlist.map((path, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group flex items-center gap-4 p-3.5 rounded-xl bg-transparent hover:bg-foreground/[0.04] transition-all border border-transparent hover:border-border-subtle"
                    >
                      <button 
                        onClick={() => handlePlayEpisode(path)}
                        className="flex-1 flex items-center gap-4 min-w-0 cursor-pointer text-left"
                      >
                        <div className="relative w-11 h-11 shrink-0 rounded-lg bg-foreground/[0.08] border border-border-subtle flex items-center justify-center text-muted group-hover:text-accent group-hover:border-accent/20 transition-all">
                          <Film size={20} />
                          <div className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 bg-background rounded-md border border-border-subtle text-[7px] font-black tracking-wider text-muted">
                            {getFileExtension(path)}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] text-foreground/80 font-medium truncate group-hover:text-accent transition-colors">
                            {getFileName(path)}
                          </h4>
                          <p className="text-muted text-[10px] mt-0.5 truncate font-mono">
                            {path}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handlePlayEpisode(path)}
                          className="w-8 h-8 rounded-lg bg-accent text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]"
                          title="Play"
                        >
                          <Play size={14} fill="currentColor" />
                        </button>
                        <button 
                          onClick={() => removeFromPlaylist(path)}
                          className="w-8 h-8 rounded-lg bg-foreground/[0.08] text-muted flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all cursor-pointer border border-border-subtle"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <ChevronRight size={14} className="text-muted/40 group-hover:text-accent transition-colors ml-1" />
                    </motion.div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-24 px-12">
                    <div className="w-20 h-20 bg-foreground/[0.05] rounded-3xl flex items-center justify-center text-muted mb-6 border border-border-subtle">
                      <Library size={40} strokeWidth={1} />
                    </div>
                    <h3 className="text-sm font-bold text-muted tracking-tight">{t('library.empty')}</h3>
                    <p className="text-[11px] text-muted leading-relaxed mt-2 max-w-[240px]">
                      {t('library.empty.desc')}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* Footer */}
            <footer className="h-10 px-6 flex items-center border-t border-border-subtle shrink-0">
               <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted uppercase tracking-widest">
                 <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                 Lieb Media Engine
               </div>
            </footer>
    </div>
  );

  // Standalone: render the panel directly, filling the window
  if (standalone) return panel;

  // Overlay mode: wrap in backdrop + portal
  const overlay = (
    <AnimatePresence>
      {isLibraryOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/70 backdrop-blur-xl"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
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
