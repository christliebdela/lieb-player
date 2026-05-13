# Changelog

All notable changes to this project will be documented in this file.

## [0.1.8] - 2026-05-13
### Added
- Visual Rebrand: Complete regeneration of application icons using the new official logo
- Library Overhaul: Complete redesign of the library interface with sidebar navigation
- Collections System: Organize media into system-managed (Movies, YouTube, Music) or custom collections
- YouTube Downloader: Integrated support for downloading YouTube media directly to local library
- Window Architecture: Unified standalone window management for Library and Settings
- Library UX: Dynamic empty state messages tailored to collections (e.g., "YouTube is empty")
- Visual Polish: Premium unique icons for system collections (Movies, YouTube, Music)
- Canvas Interactivity: Optimized "Open Library" link with improved background draggability
- Minimalist UI: Streamlined titles and messages by removing redundant "Your" labels
- Localization: Enhanced translation engine with dynamic variable support for all languages

## [0.1.7] - 2026-05-11
### Added
- Single-Instance Policy: Enforced a single application process to prevent 'ghosting' and resource contention
- Split Updater UI: New layout separating action buttons from status/progress information
- Subtitle Stability: Fixed truncation and locked modal sizing for a consistent search experience
- Auto-Injection: Chosen subtitles are now automatically attached and enabled in the player
- Smart Audio Mode: Automatically hides the playback overlay when embedded cover art is detected
- Intelligent Resizing: Proportional resizing from all 4 corners with clean, invisible hitboxes
- Aesthetic Refinements: Integrated theme colors into the updater and improved UI legibility

## [0.1.6] - 2026-05-11
### Changed
- Rebranding: Officially renamed to 'Lieb Player' across the entire interface and metadata
- Global Ready: 100% localization of all tooltips, metadata, and interface labels in English, French, and Spanish
- Integrated Updates: New progress-aware update button with smooth animations and immediate feedback
- Security: Removed hardcoded API keys; each user now manages their own unique credentials
- UI Polish: Fixed clipping in Subtitle Search list and refined control bar layout

## [0.1.5] - 2026-05-10
### Added
- Privacy: Added visibility toggle (Eye/EyeOff) for API Key in Maintenance settings
- Sidebar Cues: Added a pulsing accent dot to the 'Maintenance' tab when an update is available

### Changed
- Secured Subtitle API: Move credentials to secure local storage settings
- UI Refinement: Fixed overflow and clipping in the Subtitle Search modal
- Polished OSD: Slimmed down Action OSD for a more subtle media experience

## [0.1.4] - 2026-05-10
### Added
- Smart Resume: Play/Spacebar now automatically resumes the last played track and position
- Right-Click to Play: Trigger playback/resume via right-click on the player canvas
- Seamless Streaming: 30-second background prefetching for gapless web/YouTube playback
- Proportional UI Scaling: Control bar and icons now scale dynamically to window size
- Detailed Error Reporting: Specific feedback for update failures (Signature, Network, etc.)
- Multi-language Changelog: Full translations for version history in settings

### Fixed
- CRITICAL: Stabilized engine initialization to prevent 'Poison Error' and startup crashes
- Fixed layout clutter on small windows via proportional scaling engine
- Resolved issue where auto-play would stop after one track for library streams
- Fixed missing 'Loop All' progression for library items

## [0.1.3] - 2026-05-10 [REPLACED BY 0.1.4]
### Added
- Initial implementation of Smart Resume and Right-Click Play (Improved in 0.1.4)
- Initial implementation of Seamless Streaming (Stabilized in 0.1.4)

## [0.1.2] - 2026-05-10
### Added
- YouTube Playlist importing support
- Audio-only mode for focused listening
- New in-app Changelog settings tab
- Branded loading animations with logo pulsing

### Fixed
- Unified application versioning across all components
- Polished UI typography and branding elements
- Removed redundant badges from library titles

## [0.1.1] - 2026-05-09
### Added
- Subtitle sync adjustments
- New dark mode color palette

### Changed
- Optimized video rendering performance
- Improved hardware acceleration stability

### Fixed
- Window resizing aspect ratio constraints

## [0.1.0] - 2026-05-09
### Added
- Initial Alpha release
- Core MPV and Rust media engine integration
- Native file system browsing and library management
- Customizable accent colors and themes
- Global keyboard shortcut system
