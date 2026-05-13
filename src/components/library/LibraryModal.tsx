import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  X, Play, Film, Folder, FolderOpen, Trash2, ChevronRight, FilePlus, 
  FolderPlus, Globe, ArrowDownAZ, Clock, Music, FileStack, 
  Youtube, Download, Check, 
  LayoutGrid, Plus, FolderHeart, Settings2
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { listen, emit } from '@tauri-apps/api/event';
import { showActionOSD } from '../../utils/osd';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from '../../i18n';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readDir } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';

export const LibraryModal: React.FC<{ standalone?: boolean }> = ({ standalone }) => {
  const { 
    isLibraryOpen, setLibraryOpen, 
    playlist, setPlaylist, addToPlaylist, removeFromPlaylist, clearPlaylist,
    currentTrack, 
    isBlocking, setBlocking, updateTrackLocalPath,
    collections, setCollections, activeCollectionId, addCollection, removeCollection, renameCollection, setActiveCollection, assignToCollection,
    ensureDefaultCollections, clearCollection
  } = usePlayerStore();
  const { t } = useTranslation();
  
  const [urlInput, setUrlInput] = React.useState('');
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'date' | 'type'>('date');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [downloads, setDownloads] = React.useState<Record<string, number>>({});
  const [rowResolutions, setRowResolutions] = React.useState<Record<string, any[]>>({});
  const [analyzingUrl, setAnalyzingUrl] = React.useState<string | null>(null);
  const [showAddCollection, setShowAddCollection] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState('');
  const [movingTrack, setMovingTrack] = React.useState<string | null>(null);
  const [editingCollectionId, setEditingCollectionId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');

  React.useEffect(() => {
    ensureDefaultCollections();
  }, []);

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

          addToPlaylist(path, matchedSubs, undefined, activeCollectionId);
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
        
        const pairedItems = mediaFiles.map(mPath => {
          const mBase = mPath.split(/[\\/]/).pop()?.split('.').slice(0, -1).join('.') || '';
          const matchedSubs = subFiles.filter(sPath => {
            const sBase = sPath.split(/[\\/]/).pop()?.split('.').slice(0, -1).join('.') || '';
            return sBase.toLowerCase().includes(mBase.toLowerCase()) || mBase.toLowerCase().includes(sBase.toLowerCase());
          });
          return { path: mPath, subs: matchedSubs };
        });

        pairedItems.forEach(item => addToPlaylist(item.path, item.subs, undefined, activeCollectionId));
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
      showActionOSD('Fetching Media Info...', 'globe');
      const items = await invoke('fetch_playlist_info', { url }) as any[];
      
      if (items && items.length > 0) {
        for (const item of items) {
          const videoUrl = item.webpage_url || item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : url);
          const title = item.title || item.fulltitle || 'Stream Video';
          addToPlaylist(videoUrl, [], title);
        }
        showActionOSD(items.length > 1 ? `Loaded ${items.length} items` : 'URL Loaded', 'globe');
      } else {
        addToPlaylist(url, []);
        showActionOSD('URL Loaded', 'globe');
      }
      
      setUrlInput('');
      setShowUrlInput(false);
    } catch (err) {
      console.error('Failed to stream URL:', err);
      showActionOSD('Fetch Failed', 'x');
    } finally {
      setBlocking(false);
    }
  };

  const handleDownload = async (track: { path: string }, formatId?: string) => {
    if (!track.path.startsWith('http')) return;

    if (!formatId) {
      setAnalyzingUrl(track.path);
      try {
        const formats = await invoke('get_media_formats', { url: track.path }) as any[];
        const seenHeights = new Set();
        const videoFormats = formats
          .filter(f => f.vcodec !== 'none')
          .sort((a, b) => (b.height || 0) - (a.height || 0))
          .filter(f => {
            if (!f.height || seenHeights.has(f.height)) return false;
            seenHeights.add(f.height);
            return true;
          })
          .slice(0, 5);
        
        setRowResolutions(prev => ({ ...prev, [track.path]: videoFormats }));
      } catch (err) {
        console.error('Failed to get formats:', err);
        showActionOSD('Could not fetch resolutions', 'x');
      } finally {
        setAnalyzingUrl(null);
      }
      return;
    }

    try {
      const fileName = getFileName(track.path).replace(/[/\\?%*:|"<>]/g, '-') + '.mp4';
      const savePath = await save({
        defaultPath: fileName,
        filters: [{ name: 'Video', extensions: ['mp4', 'mkv', 'webm'] }]
      });

      if (savePath) {
        setRowResolutions(prev => {
          const next = { ...prev };
          delete next[track.path];
          return next;
        });
        showActionOSD('Starting Download', 'download');
        setDownloads(prev => ({ ...prev, [track.path]: 0 }));
        await invoke('download_media', { url: track.path, savePath, formatId });
      }
    } catch (err) {
      console.error('Download failed:', err);
      showActionOSD('Download Error', 'x');
    }
  };

  React.useEffect(() => {
    const unlistenProgress = listen('download-progress', (event: any) => {
      const { url, progress } = event.payload;
      setDownloads(prev => ({ ...prev, [url]: parseFloat(progress) }));
    });
    
    const unlistenComplete = listen('download-complete', (event: any) => {
      const { url, path } = event.payload;
      setDownloads(prev => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
      updateTrackLocalPath(url, path);
      showActionOSD('Download Finished', 'download');
    });

    const unlistenError = listen('download-error', (event: any) => {
      const { url } = event.payload;
      setDownloads(prev => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
      showActionOSD('Download Failed', 'x');
    });

    return () => {
      unlistenProgress.then(u => u());
      unlistenComplete.then(u => u());
      unlistenError.then(u => u());
    };
  }, []);

  const unlistenRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (!standalone) return;

    listen('tauri://drag-drop', async (event: any) => {
      const paths = event.payload.paths || event.payload;
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

  const handlePlayEpisode = async (track: any) => {
    try {
      await emit('lieb-play', { path: track.path, subs: track.subs });
      handleClose();
    } catch (err) {
      console.error('Failed to play episode:', err);
    }
  };

  const getFileName = (path: string) => {
    const item = playlist.find(p => p.path === path);
    if (item?.title) return item.title;

    if (path.startsWith('http')) {
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
    // If we're sorting by something, we can't manually reorder
    if (sortBy === 'name' || sortBy === 'type' || sortBy === 'date') {
      return [...playlist].sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
          comparison = getFileName(a.path).toLowerCase().localeCompare(getFileName(b.path).toLowerCase());
        } else if (sortBy === 'type') {
          comparison = getFileExtension(a.path).toLowerCase().localeCompare(getFileExtension(b.path).toLowerCase());
        } else {
          comparison = (a.addedAt || 0) - (b.addedAt || 0);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    return playlist;
  }, [playlist, sortBy, sortOrder]);

  const filteredPlaylist = sortedPlaylist.filter(track => {
    if (activeCollectionId && track.collectionId !== activeCollectionId) return false;
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-background flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-24 h-24 rounded-full bg-accent/20 blur-2xl"
                />
                <motion.img 
                  src="/lieb-player-icon.png" alt="Loading..."
                  animate={{ scale: [0.9, 1.1, 0.9] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 relative z-10"
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
      <header className="h-12 px-4 flex items-center justify-between border-b border-border-subtle shrink-0" data-tauri-drag-region>
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
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('library.search')}
              className="h-8 w-96 bg-foreground/[0.04] border border-border-subtle rounded-lg pl-9 pr-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent/20 focus:border-accent/30 transition-all placeholder:text-muted/40"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-1 cursor-pointer">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-foreground/[0.04] border border-border-subtle rounded-lg p-0.5">
            <button 
              onClick={() => { if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy('name'); setSortOrder('asc'); }}}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${sortBy === 'name' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'}`}
            >
              <ArrowDownAZ size={14} className={sortBy === 'name' && sortOrder === 'desc' ? 'rotate-180 transition-transform' : ''} />
            </button>
            <button 
              onClick={() => { if (sortBy === 'date') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy('date'); setSortOrder('desc'); }}}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${sortBy === 'date' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'}`}
            >
              <Clock size={14} className={sortBy === 'date' && sortOrder === 'asc' ? 'rotate-180 transition-transform' : ''} />
            </button>
            <button 
              onClick={() => { if (sortBy === 'type') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy('type'); setSortOrder('asc'); }}}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${sortBy === 'type' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'}`}
            >
              <FileStack size={14} className={sortBy === 'type' && sortOrder === 'desc' ? 'rotate-180 transition-transform' : ''} />
            </button>
          </div>

          <button onClick={handleClose} className="h-8 w-8 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer">
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="flex-1 flex min-h-0 relative">
        <div className="w-52 border-r border-border-subtle flex flex-col bg-foreground/[0.02]">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">{t('library.collections')}</h3>
            <button onClick={() => setShowAddCollection(true)} className="w-6 h-6 rounded-lg bg-accent/10 text-accent flex items-center justify-center hover:bg-accent hover:text-black transition-all cursor-pointer">
              <Plus size={14} />
            </button>
          </div>

          <Reorder.Group 
            axis="y" 
            values={collections} 
            onReorder={setCollections}
            className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1"
          >
            <button
              onClick={() => setActiveCollection(null)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer shrink-0 border ${activeCollectionId === null ? 'bg-accent/15 text-accent font-bold border-accent/20 shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]' : 'text-muted hover:text-foreground hover:bg-foreground/[0.04] border-transparent'}`}
            >
              <LayoutGrid size={16} className={activeCollectionId === null ? 'text-accent' : 'text-muted/50'} />
              <span className="text-[11px] truncate">{t('library.all')}</span>
            </button>
            <div className="h-[1px] bg-border-subtle my-2 mx-2 shrink-0" />
            {collections.map(col => (
              <Reorder.Item 
                key={col.id} 
                value={col}
                className="group relative"
              >
                {editingCollectionId === col.id ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-accent/10 rounded-lg border border-accent/30">
                    <FileStack size={16} className="text-accent shrink-0" />
                    <input 
                      autoFocus 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => {
                        if (editName.trim() && editName.trim() !== col.name) renameCollection(col.id, editName.trim());
                        setEditingCollectionId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editName.trim() && editName.trim() !== col.name) renameCollection(col.id, editName.trim());
                          setEditingCollectionId(null);
                        } else if (e.key === 'Escape') {
                          setEditingCollectionId(null);
                        }
                      }}
                      className="w-full bg-transparent border-none outline-none text-[11px] text-foreground font-bold"
                    />
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveCollection(col.id)}
                      onDoubleClick={() => { setEditingCollectionId(col.id); setEditName(col.name); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left cursor-pointer border ${activeCollectionId === col.id ? 'bg-accent/15 text-accent border-accent/20 font-bold' : 'text-muted hover:text-foreground hover:bg-foreground/[0.04] border-transparent'}`}
                    >
                      {(() => {
                        const iconProps = { size: 16, className: activeCollectionId === col.id ? 'text-accent' : 'text-muted/50' };
                        if (col.id === 'movies') return <Film {...iconProps} />;
                        if (col.id === 'youtube') return <Youtube {...iconProps} />;
                        if (col.id === 'music') return <Music {...iconProps} />;
                        return <FileStack {...iconProps} />;
                      })()}
                      <span className="text-[11px] truncate min-w-0 flex-1">{col.isImmutable ? t(`col.${col.id}` as any) : col.name}</span>
                    </button>
                    {!col.isImmutable && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); setEditingCollectionId(col.id); setEditName(col.name); }} className="w-6 h-6 rounded-lg bg-foreground/[0.05] text-muted hover:text-accent flex items-center justify-center cursor-pointer"><Settings2 size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); removeCollection(col.id); }} className="w-6 h-6 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all cursor-pointer"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <AnimatePresence>
            {showAddCollection && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="p-3 border-t border-border-subtle bg-background">
                <input autoFocus value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newCollectionName.trim()) { addCollection(newCollectionName.trim()); setNewCollectionName(''); setShowAddCollection(false); }}}
                  placeholder={t('library.collection.placeholder')}
                  className="w-full bg-foreground/[0.05] border border-border-subtle rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:border-accent/50 mb-2"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowAddCollection(false)} className="flex-1 bg-foreground/[0.05] text-muted text-[9px] font-bold uppercase tracking-wider py-2.5 rounded-lg cursor-pointer hover:bg-foreground/[0.1] transition-all">{t('cancel')}</button>
                  <button 
                    onClick={() => { if (newCollectionName.trim()) { addCollection(newCollectionName.trim()); setNewCollectionName(''); setShowAddCollection(false); }}} 
                    className="flex-1 bg-accent text-black font-bold text-[9px] uppercase tracking-wider py-2.5 rounded-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {t('library.create')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 flex flex-col min-w-0 p-6 overflow-y-auto custom-scrollbar">

          <AnimatePresence>
            {showUrlInput && (
              <motion.div initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height: 'auto', opacity: 1, marginBottom: 24 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} className="overflow-hidden">
                <form onSubmit={handlePlayUrl} className="flex items-center gap-3 bg-foreground/[0.03] border border-accent/30 rounded-xl px-4 py-2.5 group">
                  <Globe size={16} className="text-accent" />
                  <input autoFocus value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder={t('library.url.placeholder')} className="bg-transparent border-none outline-none text-[12px] text-foreground w-full" />
                  <button type="submit" className="text-accent hover:text-accent-hover font-bold text-[10px] uppercase px-2 cursor-pointer">{t('library.load')}</button>
                  <button type="button" onClick={() => setShowUrlInput(false)} className="text-muted p-1 cursor-pointer"><X size={14} /></button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <Reorder.Group 
            axis="y" 
            values={filteredPlaylist} 
            onReorder={(newOrder) => {
              if (!searchQuery && !activeCollectionId && sortBy === 'date' && sortOrder === 'desc') {
                setPlaylist(newOrder);
              }
            }}
            className="flex-1 min-h-0 flex flex-col gap-1.5"
          >
            {filteredPlaylist.length > 0 ? (
              filteredPlaylist.map((track, index) => (
                <Reorder.Item
                  key={track.path} 
                  value={track}
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: index * 0.03 }}
                  className={`group flex items-center gap-3 p-2.5 rounded-lg transition-all border relative ${currentTrack === track.path ? 'bg-accent/5 border-accent/20' : 'bg-transparent border-transparent hover:bg-foreground/[0.04] hover:border-border-subtle'}`}
                >
                  {downloads[track.path] !== undefined && (
                    <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none z-0">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${downloads[track.path]}%` }} className="absolute inset-y-0 left-0 bg-accent/10" />
                    </div>
                  )}
                  <button onClick={() => handlePlayEpisode(track)} className="flex-1 flex items-center gap-3 min-w-0 text-left cursor-pointer">
                    <div className="relative w-9 h-9 shrink-0 rounded-lg bg-foreground/[0.08] border border-border-subtle flex items-center justify-center text-muted group-hover:text-accent transition-all">
                      {['MP3', 'WAV', 'FLAC', 'M4A', 'OGG', 'OPUS', 'AAC', 'WMA'].includes(getFileExtension(track.path)) ? <Music size={16} /> : <Film size={16} />}
                      <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-background rounded-md border border-border-subtle flex items-center justify-center shadow-xl">
                        <span className="text-[6px] font-black uppercase text-muted group-hover:text-accent">{getFileExtension(track.path)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[12.5px] font-semibold text-foreground/90 group-hover:text-accent truncate tracking-tight">{getFileName(track.path)}</span>
                      <span className="text-[9px] text-muted truncate opacity-50 group-hover:opacity-80 leading-none">{track.path}</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    {rowResolutions[track.path] ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[8px] font-black text-accent uppercase tracking-[0.2em] px-1">Resolution</span>
                        <div className="flex items-center gap-1 bg-accent/5 border border-accent/20 p-1.5 rounded-xl">
                          {rowResolutions[track.path].map((f, i) => (
                            <button key={i} onClick={() => handleDownload(track, f.format_id)} className="px-2 py-1 text-[9px] font-bold bg-foreground/[0.08] hover:bg-accent hover:text-black rounded-lg transition-all">{f.height}p</button>
                          ))}
                          <button onClick={() => setRowResolutions(prev => { const n = { ...prev }; delete n[track.path]; return n; })} className="w-6 h-6 text-muted hover:text-red-500 cursor-pointer"><X size={12} /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => handlePlayEpisode(track)} className="w-8 h-8 rounded-lg bg-accent text-black flex items-center justify-center hover:scale-105 transition-all cursor-pointer"><Play size={14} fill="currentColor" /></button>
                        {track.path.startsWith('http') && (
                          <button onClick={() => handleDownload(track)} disabled={downloads[track.path] !== undefined} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${downloads[track.path] !== undefined ? 'text-accent' : track.localPath ? 'text-green-500 bg-green-500/10' : 'text-muted hover:text-accent hover:bg-accent/10'}`}>
                            {analyzingUrl === track.path ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-3 h-3 border border-accent border-t-transparent rounded-full" /> : downloads[track.path] !== undefined ? <span className="text-[9px] font-black">{Math.round(downloads[track.path])}%</span> : track.localPath ? <Check size={14} /> : <Download size={14} />}
                          </button>
                        )}
                        <div className="relative">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setMovingTrack(movingTrack === track.path ? null : track.path); 
                            }} 
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${movingTrack === track.path ? 'bg-accent text-black' : 'text-muted hover:text-accent hover:bg-accent/10'}`}
                          >
                            <FolderHeart size={14} />
                          </button>
                          <AnimatePresence>
                            {movingTrack === track.path && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: -10 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.9, y: -10 }} 
                                className="absolute top-full right-0 mt-2 w-48 bg-background border border-border-subtle rounded-xl shadow-2xl z-[150] p-1.5"
                              >
                                <div className="fixed inset-0 z-[-1]" onClick={() => setMovingTrack(null)} />
                                <p className="text-[8px] font-black text-muted uppercase tracking-[0.15em] p-2">{t('library.move_to')}</p>
                                <button onClick={() => { assignToCollection(track.path, null); setMovingTrack(null); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-foreground/[0.04] text-[11px] text-foreground transition-all cursor-pointer"><LayoutGrid size={12} className="text-muted" /> {t('library.no_collection')}</button>
                                <div className="h-[1px] bg-border-subtle my-1" />
                                {collections.map(c => (
                                  <button key={c.id} onClick={() => { assignToCollection(track.path, c.id); setMovingTrack(null); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-foreground/[0.04] text-[11px] transition-all ${track.collectionId === c.id ? 'text-accent font-bold bg-accent/5' : 'text-foreground'}`}>
                                    <FileStack size={12} className={track.collectionId === c.id ? 'text-accent shrink-0' : 'text-muted shrink-0'} />
                                    <span className="truncate">{c.isImmutable ? t(`col.${c.id}` as any) : c.name}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <button onClick={() => removeFromPlaylist(track.path)} className="w-8 h-8 rounded-lg bg-foreground/[0.04] text-muted hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-all cursor-pointer"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-muted/40 group-hover:text-accent transition-colors ml-1" />
                </Reorder.Item>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <button onClick={handleAddFolder} className="w-20 h-20 bg-foreground/[0.05] hover:bg-accent/10 rounded-3xl flex items-center justify-center text-muted hover:text-accent mb-6 transition-all group cursor-pointer"><FolderOpen size={40} strokeWidth={1} /></button>
                <h3 className="text-sm font-bold text-muted">
                  {searchQuery ? t('library.search.no_matches' as any) : (
                    activeCollectionId ? (
                      (() => {
                        const col = collections.find(c => c.id === activeCollectionId);
                        const name = col ? (col.isImmutable ? t(`col.${col.id}` as any) : col.name) : '';
                        return t('library.empty.col', { name });
                      })()
                    ) : t('library.empty')
                  )}
                </h3>
              </div>
            )}
          </Reorder.Group>
        </div>
      </div>

      <footer className="h-12 px-4 flex items-center justify-between border-t border-border-subtle shrink-0">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted uppercase tracking-widest"><span className="w-1 h-1 rounded-full bg-accent animate-pulse" /> Lieb Media Engine</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowUrlInput(!showUrlInput)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${showUrlInput ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-accent/5 border-accent/10 text-accent/80'} text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer`}><Globe size={12} /><span>{t('library.url')}</span></button>
          <div className="w-[1px] h-4 bg-border-subtle mx-1" />
          <button onClick={handleAddFiles} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/[0.03] text-muted hover:text-accent text-[9px] font-bold uppercase tracking-widest border border-border-subtle/50 transition-all cursor-pointer"><FilePlus size={12} /><span>{t('library.add.file')}</span></button>
          <button onClick={handleAddFolder} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-foreground/[0.03] text-muted hover:text-accent text-[9px] font-bold uppercase tracking-widest border border-border-subtle/50 transition-all cursor-pointer"><FolderPlus size={12} /><span>{t('library.add.folder')}</span></button>
          {filteredPlaylist.length > 0 && (
            <button 
              onClick={() => activeCollectionId ? clearCollection(activeCollectionId) : clearPlaylist()} 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/5 text-red-500/60 hover:text-red-500 text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer border border-red-500/10"
            >
              <Trash2 size={12} />
              {activeCollectionId ? t('library.clear.collection') : t('library.clear.library')}
            </button>
          )}
        </div>
      </footer>
    </div>
  );

  if (standalone) return panel;

  const overlay = (
    <AnimatePresence>
      {isLibraryOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/70 backdrop-blur-xl" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 30, stiffness: 350 }}>
            {panel}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
};
