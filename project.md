# Project: Lieb Player (Modern Media Player)

## Overview
A clean, modern desktop media player built with **Tauri + React** and powered by **libmpv/mpv**. 
Focus: Lightweight, high-performance, intuitive UX, and elegant interface.

## Vision
- **Powerful Playback**: Leveraging mpv's reliability.
- **Modern Minimalist UI**: Better UX than mpv/VLC.
- **Zero Nonsense**: Clean, fast, and lightweight.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS.
- **State Management**: Zustand.
- **Desktop Shell**: Tauri.
- **Playback Engine**: libmpv / mpv backend.
- **Extras**: FFmpeg (thumbnails/metadata), SQLite (history/settings).

## Core Features (MVP)
- [ ] **File Playback**: Open files, Drag & Drop, Playlists.
- [ ] **Playback Controls**: Play/Pause, Seek, Volume, Mute, Fullscreen, Speed.
- [ ] **Looping**: Media loop, Playlist loop.
- [ ] **Subtitles**: External loader, Track switching, Basic styling.
- [ ] **Audio**: Track switching, Delay adjustment.
- [ ] **Resume**: Progress saving & restoration.

## UI/UX Design
- **Dark Mode Default**: Sleek, professional look.
- **Translucent UI**: Floating controls with blur effects.
- **Auto-hide**: Controls disappear during playback.
- **Premium Aesthetics**: Rounded corners, clean typography (Inter/Outfit), smooth animations.

## Milestones
### Phase 1: Foundation
- [ ] Tauri + React setup.
- [ ] mpv integration (Rust side).
- [ ] Basic UI Scaffold.
### Phase 2: Playback
- [ ] Core controls & Seek bar.
- [ ] Fullscreen & Volume.
### Phase 3: UX
- [ ] Playlist & Subtitles.
- [ ] Resume playback logic.
### Phase 4: Polish
- [ ] Animations & Themes.
- [ ] Thumbnail scrubbing.

## Keyboard Shortcuts
- `Space`: Play/Pause
- `F`: Fullscreen
- `M`: Mute
- `Right/Left`: Seek +/-
- `Up/Down`: Volume +/-
- `L`: Loop toggle
- `N`: Next track
- `P`: Previous track
- `Ctrl+O`: Open File
