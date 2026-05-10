# Changelog

All notable changes to this project will be documented in this file.

## [0.1.3] - 2026-05-10
### Added
- Smart Resume: Play/Spacebar now automatically resumes the last played track and position
- Right-Click to Play: Trigger playback/resume via right-click on the player canvas
- Seamless Streaming: 30-second background prefetching for gapless web/YouTube playback
- Proportional UI Scaling: Control bar and icons now scale dynamically to window size
- Detailed Error Reporting: Specific feedback for update failures (Signature, Network, etc.)
- Multi-language Changelog: Full translations for version history in settings

### Changed
- Unified playback logic across Spacebar, Play button, and mouse interactions
- Refined loading overlay logic to avoid flashing during background transitions
- Optimized cursor management in windowed and fullscreen modes
- Updated skip buttons to use centralized store actions

### Fixed
- Fixed layout clutter on small windows via proportional scaling engine
- Resolved issue where auto-play would stop after one track for library streams
- Fixed missing 'Loop All' progression for library items

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

## [0.1.1] - 2026-05-08
### Added
- Subtitle sync adjustments
- New dark mode color palette

### Changed
- Optimized video rendering performance
- Improved hardware acceleration stability

### Fixed
- Window resizing aspect ratio constraints

## [0.1.0] - 2026-05-07
### Added
- Initial Alpha release
- Core MPV and Rust media engine integration
- Native file system browsing and library management
- Customizable accent colors and themes
- Global keyboard shortcut system
