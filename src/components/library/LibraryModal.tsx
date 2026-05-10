import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Film, Folder, FolderOpen, Trash2, ChevronRight, FilePlus, FolderPlus, Globe, ArrowDownAZ, Clock, Music, FileStack, ArrowDownWideNarrow, ArrowUpWideNarrow, Youtube } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { listen, emit } from '@tauri-apps/api/event';
import { showActionOSD } from '../../utils/osd';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from '../../i18n';
import { open } from '@tauri-apps/plugin-dialog';
import { readDir } from '@tauri-apps/plugin-fs';

export const LibraryModal: React.FC<{ standalone?: boolean }> = ({ standalone }) => {
  const { 
    isLibraryOpen, setLibraryOpen, 
    playlist, addToPlaylist, removeFromPlaylist, clearPlaylist,
    currentTrack, setCurrentTrack, setPlaying,
    isBlocking, setBlocking
  } = usePlayerStore();
  const { t } = useTranslation();
  
  const [urlInput, setUrlInput] = React.useState('');
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'date' | 'type'>('date');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const handleAddFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Media',
          extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'flv', 'wmv', '3gp', 'ts', 'mp3', 'flac', 'wav', 'm4a', 'ogg', 'opus', 'aac', 'wma']
        }]
      });
      
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        const subExtensions = ['srt', 'ass', 'sub', 'vtt', 'ssa'];

        for (const path of paths) {
          // Look for subs in the same folder
          const dirPath = path.split(/[\\/]/).slice(0, -1).join(path.includes('\\') ? '\\' : '/');
          const fileName = path.split(/[\\/]/).pop()?.split('.').slice(0, -1).join('.') || '';
          
          let matchedSubs: string[] = [];
          try {
            const entries = await readDir(dirPath);
            matchedSubs = entries
              .filter(e => !e.isDirectory)
              .filter(e => {
                const ext = e.name.split('.').pop()?.toLowerCase() || '';
                const base = e.name.split('.').slice(0, -1).join('.');
                return subExtensions.includes(ext) && (base.toLowerCase().includes(fileName.toLowerCase()) || fileName.toLowerCase().includes(base.toLowerCase()));
              })
              .map(e => `${dirPath}${dirPath.includes('\\') ? '\\' : '/'}${e.name}`);
          } catch (e) {
            console.warn('Could not scan for subs in', dirPath);
          }

          addToPlaylist(path, matchedSubs);
        }
        showActionOSD(`${paths.length} ${t('library.files')}`, 'plus');
      }
    } catch (err) {
      console.error('Failed to open files:', err);
    }
  };

  const handleAddFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === 'string') {
        const mediaFiles: string[] = [];
        const subFiles: string[] = [];
        const extensions = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'flv', 'wmv', '3gp', 'ts', 'ogv', 'vob', 'mp3', 'flac', 'wav', 'm4a', 'ogg', 'opus', 'aac', 'wma'];
        const subExtensions = ['srt', 'ass', 'sub', 'vtt', 'ssa'];

        const scanDir = async (path: string) => {
          try {
            const entries = await readDir(path);
            for (const entry of entries) {
              // Robust path join
              const sep = path.includes('\\') ? '\\' : '/';
              const entryPath = path.endsWith(sep) ? `${path}${entry.name}` : `${path}${sep}${entry.name}`;
              
              if (entry.isDirectory) {
                await scanDir(entryPath);
              } else if (entry.name) {
                const ext = entry.name.split('.').pop()?.toLowerCase() || '';
                if (extensions.includes(ext)) {
                  mediaFiles.push(entryPath);
                } else if (subExtensions.includes(ext)) {
                  subFiles.push(entryPath);
                }
              }
            }
          } catch (err) {
            console.warn(` Lieb: Skipping unreadable directory: ${path}`, err);
          }
        };

        await scanDir(selected);
        
        // Smart Pairing: Match subtitles to media files
        const pairedItems = mediaFiles.map(mPath => {
          const mBase = mPath.split(/[\\/]/).pop()?.split('.').slice(0, -1).join('.') || '';
          const matchedSubs = subFiles.filter(sPath => {
            const sBase = sPath.split(/[\\/]/).pop()?.split('.').slice(0, -1).join('.') || '';
            // Match if names are similar (e.g., Episode1.mp4 and Episode1.srt)
            return sBase.toLowerCase().includes(mBase.toLowerCase()) || mBase.toLowerCase().includes(sBase.toLowerCase());
          });
          return { path: mPath, subs: matchedSubs };
        });

        pairedItems.forEach(item => addToPlaylist(item.path, item.subs));
        showActionOSD(`${pairedItems.length} ${t('library.files')}`, 'folder');
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  };

  const handlePlayUrl = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!urlInput.trim()) return;
    
    const url = urlInput.trim();
    setBlocking(true);

    try {
      if (url.includes('list=') || url.includes('/playlist?')) {
        showActionOSD('Fetching Playlist...', 'globe');
        const { invoke } = await import('@tauri-apps/api/core');
        const items = await invoke('fetch_playlist_info', { url }) as any[];
        
        for (const item of items) {
          const videoUrl = item.url || `https://www.youtube.com/watch?v=${item.id}`;
          const title = item.title || 'YouTube Video';
          addToPlaylist(videoUrl, [], title);
        }
        showActionOSD(`Loaded ${items.length} items`, 'film');
      } else {
        // Single video
        addToPlaylist(url, []);
        showActionOSD('URL Loaded', 'globe');
      }
      
      setUrlInput('');
      setShowUrlInput(false);
    } catch (err) {
      window.console.error('>>> [UI] Failed to stream URL:', err);
      showActionOSD('Fetch Failed', 'x');
    } finally {
      setBlocking(false);
    }
  };

    const unlistenRef = React.useRef<(() => void) | null>(null);

    React.useEffect(() => {
      if (!standalone) return;

      listen('tauri://drag-drop', async (event: any) => {
        const paths = event.payload.paths || event.payload;
        window.console.log('>>> [UI] Drag-drop in standalone:', paths);
        if (paths && paths.length > 0) {
          const state = usePlayerStore.getState();
          const firstPath = paths[0];
          
          paths.forEach((path: string) => addToPlaylist(path));

          if (!state.currentTrack || state.duration === 0) {
            await emit('lieb-play', { path: firstPath, subs: [] });
            state.setCurrentTrack(firstPath);
            state.setPlaying(true);
          }
        }
      }).then(u => {
        unlistenRef.current = u;
      });

      return () => {
        if (unlistenRef.current) unlistenRef.current();
      };
    }, [standalone, addToPlaylist]);

  const handleClose = () => {
    if (standalone) {
      getCurrentWindow().close();
    } else {
      setLibraryOpen(false);
    }
  };

  const handlePlayEpisode = async (track: { path: string; subs: string[] }) => {
    window.console.log('>>> [UI] handlePlayEpisode:', track.path);
    try {
      await emit('lieb-play', { path: track.path, subs: track.subs });
      setCurrentTrack(track.path);
      setPlaying(true);
      showActionOSD(getFileName(track.path), 'play');
      handleClose();
    } catch (err) {
      window.console.error('>>> [UI] Failed to play episode:', err);
    }
  };

  const getFileName = (path: string) => {
    // Look for a persistent metadata title first (works for local and web)
    const item = playlist.find(p => p.path === path);
    if (item?.title) return item.title;

    if (path.startsWith('http')) {
      // Fallback: cleaner URL name
      try {
        const url = new URL(path);
        if (url.hostname.includes('youtube.com')) {
          const v = url.searchParams.get('v');
          return v ? `YouTube: ${v}` : 'YouTube Video';
        }
        return url.hostname;
      } catch (e) {
        return path;
      }
    }
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1];
  };

  const getFileExtension = (path: string) => {
    if (path.startsWith('http')) return 'WEB';
    const parts = path.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  };

  const sortedPlaylist = React.useMemo(() => {
    return [...playlist].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        const nameA = getFileName(a.path).toLowerCase();
        const nameB = getFileName(b.path).toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === 'type') {
        const typeA = getFileExtension(a.path).toLowerCase();
        const typeB = getFileExtension(b.path).toLowerCase();
        comparison = typeA.localeCompare(typeB);
      } else {
        const dateA = a.addedAt || 0;
        const dateB = b.addedAt || 0;
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [playlist, sortBy, sortOrder]);

  const filteredPlaylist = sortedPlaylist.filter(track => {
    const fileName = getFileName(track.path).toLowerCase();
    const query = searchQuery.toLowerCase();
    return fileName.includes(query) || track.path.toLowerCase().includes(query);
  });

  if (!isLibraryOpen && !standalone) return null;

  const panel = (
    <div className={`bg-background overflow-hidden flex flex-col relative ${
      standalone
        ? 'w-full h-screen'
        : 'w-full max-w-[780px] h-[520px] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-border-subtle'
    }`}>
            {/* Loading Overlay */}
            <AnimatePresence>
              {isBlocking && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[100] bg-background flex items-center justify-center pointer-events-auto"
                  >
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative flex items-center justify-center">
                      {/* Soft Atmospheric Glow */}
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute w-24 h-24 rounded-full bg-accent/20 blur-2xl"
                      />
                      {/* Pulsing Branded Logo */}
                      <motion.img 
                        src="/lieb-player-icon.png" 
                        alt="Loading..."
                        animate={{ scale: [0.9, 1.1, 0.9] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-16 h-16 relative z-10 drop-shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]"
                      />
                    </div>
                    <motion.p 
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="text-[10px] font-black uppercase tracking-[0.4em] text-accent text-center"
                    >
                      Loading Your Media
                    </motion.p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Header */}
            <header className="h-12 px-6 flex items-center justify-between border-b border-border-subtle shrink-0" data-tauri-drag-region>
              <div className="flex items-center gap-3 pointer-events-none">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent ring-1 ring-accent/20">
                  <Folder size={14} />
                </div>
                <div className="flex flex-col justify-center">
                  <h2 className="text-[13px] font-semibold text-foreground leading-tight tracking-tight">{t('library.title')}</h2>
                  <p className="text-[9px] text-muted font-medium uppercase tracking-[0.15em] mt-[1px]">
                    {playlist.length} {playlist.length === 1 ? t('library.file') : t('library.files')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative group">
                  <FolderOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('library.search')}
                    className="h-8 w-96 bg-foreground/[0.04] border border-border-subtle rounded-lg pl-9 pr-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent/20 focus:border-accent/30 transition-all placeholder:text-muted/40"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-1 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-foreground/[0.04] border border-border-subtle rounded-lg p-0.5">
                  <button 
                    onClick={() => {
                      if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('name'); setSortOrder('asc'); }
                    }}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${sortBy === 'name' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'}`}
                    title={sortBy === 'name' ? (sortOrder === 'asc' ? 'Name (A-Z)' : 'Name (Z-A)') : 'Sort by Name'}
                  >
                    <ArrowDownAZ size={14} className={sortBy === 'name' && sortOrder === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  <button 
                    onClick={() => {
                      if (sortBy === 'date') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('date'); setSortOrder('desc'); }
                    }}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${sortBy === 'date' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'}`}
                    title={sortBy === 'date' ? (sortOrder === 'asc' ? 'Oldest first' : 'Newest first') : 'Sort by Date'}
                  >
                    <Clock size={14} className={sortBy === 'date' && sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  <button 
                    onClick={() => {
                      if (sortBy === 'type') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('type'); setSortOrder('asc'); }
                    }}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${sortBy === 'type' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'}`}
                    title={sortBy === 'type' ? (sortOrder === 'asc' ? 'Type (A-Z)' : 'Type (Z-A)') : 'Sort by Type'}
                  >
                    <FileStack size={14} className={sortBy === 'type' && sortOrder === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                </div>

                <div className="flex items-center bg-foreground/[0.04] border border-border-subtle rounded-lg p-0.5 ml-[-4px]">
                  <button 
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 rounded-md transition-all cursor-pointer text-muted hover:text-accent hover:bg-accent/5"
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? (
                      <ArrowDownWideNarrow size={14} />
                    ) : (
                      <ArrowUpWideNarrow size={14} />
                    )}
                  </button>
                </div>
                <button 
                  onClick={handleClose}
                  className="h-8 w-8 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col">
              {/* Top Search & Stream Bar (Toggleable) */}
              <AnimatePresence>
                {showUrlInput && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                    exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                    className="overflow-hidden"
                  >
                    <form 
                      onSubmit={handlePlayUrl}
                      className="flex items-center gap-3 bg-foreground/[0.03] border border-accent/30 rounded-xl px-4 py-2.5 transition-all group focus-within:ring-1 focus-within:ring-accent/20"
                    >
                      <Globe size={16} className="text-accent" />
                      <input 
                        autoFocus
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Paste YouTube/Twitch URL or Search..."
                        className="bg-transparent border-none outline-none text-[12px] text-foreground w-full placeholder:text-muted/30"
                      />
                      <div className="flex items-center gap-2">
                        {urlInput.trim() && (
                          <button type="submit" className="text-accent hover:text-accent-hover font-bold text-[10px] uppercase tracking-widest px-2 cursor-pointer">
                            Load
                          </button>
                        )}
                        <button type="button" onClick={() => setShowUrlInput(false)} className="text-muted hover:text-foreground p-1">
                          <X size={14} />
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 min-h-0 flex flex-col gap-1.5">
                {filteredPlaylist.length > 0 ? (
                  filteredPlaylist.map((track, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`group flex items-center gap-4 p-3.5 rounded-xl transition-all border ${
                        currentTrack === track.path 
                        ? 'bg-accent/5 border-accent/20' 
                        : 'bg-transparent border-transparent hover:bg-foreground/[0.04] hover:border-border-subtle'
                      }`}
                    >
                      <button 
                        onClick={() => handlePlayEpisode(track)}
                        className="flex-1 flex items-center gap-4 min-w-0 cursor-pointer text-left"
                      >
                        <div className="relative w-11 h-11 shrink-0 rounded-lg bg-foreground/[0.08] border border-border-subtle flex items-center justify-center text-muted group-hover:text-accent group-hover:border-accent/20 transition-all">
                          {['MP3', 'WAV', 'FLAC', 'M4A', 'OGG', 'OPUS', 'AAC', 'WMA'].includes(getFileExtension(track.path)) ? (
                            <Music size={20} />
                          ) : (
                            <Film size={20} />
                          )}
                          <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-background rounded-lg border border-border-subtle flex items-center justify-center shadow-xl">
                            {track.path.includes('youtube.com') || track.path.includes('youtu.be') ? (
                              <Youtube size={16} className="text-red-500" />
                            ) : (
                              <span className="text-[7px] font-black text-muted uppercase">{getFileExtension(track.path)}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[13px] text-foreground/80 font-medium truncate group-hover:text-accent transition-colors">
                              {getFileName(track.path)}
                            </h4>
                          </div>
                          <p className="text-muted text-[10px] mt-0.5 truncate font-mono">
                            {track.path}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handlePlayEpisode(track)}
                          className="w-8 h-8 rounded-lg bg-accent text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]"
                          title="Play"
                        >
                          <Play size={14} fill="currentColor" />
                        </button>
                        <button 
                          onClick={() => removeFromPlaylist(track.path)}
                          className="w-8 h-8 rounded-lg bg-foreground/[0.04] text-muted hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-all cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <ChevronRight size={14} className="text-muted/40 group-hover:text-accent transition-colors ml-1" />
                    </motion.div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-12">
                    <button 
                      onClick={handleAddFolder}
                      className="w-20 h-20 bg-foreground/[0.05] hover:bg-accent/10 rounded-3xl flex items-center justify-center text-muted hover:text-accent mb-6 border border-border-subtle hover:border-accent/30 transition-all duration-300 group cursor-pointer"
                    >
                      <FolderOpen size={40} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-300" />
                    </button>
                    <h3 className="text-sm font-bold text-muted tracking-tight">
                      {searchQuery ? 'No matches found' : t('library.empty')}
                    </h3>
                    <p className="text-[11px] text-muted leading-relaxed mt-2 max-w-[240px]">
                      {searchQuery ? `We couldn't find anything matching "${searchQuery}"` : t('library.empty.desc')}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* Footer */}
            <footer className="h-12 px-6 flex items-center justify-between border-t border-border-subtle shrink-0">
               <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted uppercase tracking-widest">
                 <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                 Lieb Media Engine
               </div>
               <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${
                      showUrlInput 
                        ? 'bg-accent/10 border-accent/40 text-accent' 
                        : 'bg-accent/5 border-accent/10 text-accent/80 hover:text-accent hover:border-accent/20'
                    } text-[9px] font-bold uppercase tracking-widest`}
                  >
                    <Globe size={12} />
                    <span>Stream URL</span>
                  </button>

                  <div className="w-[1px] h-4 bg-border-subtle mx-1" />

                  <button 
                    onClick={handleAddFiles}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/[0.03] hover:bg-foreground/[0.06] text-muted hover:text-accent text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer border border-border-subtle/50 hover:border-accent/30"
                  >
                    <FilePlus size={12} />
                    <span>{t('library.add.file')}</span>
                  </button>
                  <button 
                    onClick={handleAddFolder}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/[0.03] hover:bg-foreground/[0.06] text-muted hover:text-accent text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer border border-border-subtle/50 hover:border-accent/30"
                  >
                    <FolderPlus size={12} />
                    <span>{t('library.add.folder')}</span>
                  </button>
 
                  {playlist.length > 0 && (
                    <>
                     <div className="w-[1px] h-4 bg-border-subtle mx-1" />
                     <button 
                       onClick={clearPlaylist}
                       className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 text-red-500/60 hover:text-red-500 text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer border border-red-500/10 hover:border-red-500/20"
                     >
                       <Trash2 size={12} />
                       {t('library.clear')}
                     </button>
                    </>
                  )}
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
