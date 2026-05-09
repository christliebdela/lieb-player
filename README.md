<div align="center">
  <img src="public/lieb-player-icon.png" alt="Lieb Player Logo" width="120" height="120" />
  <h1>Lieb Player</h1>
  <p><strong>A modern, high-fidelity desktop media player powered by Tauri, React, and the Libre Media Engine (mpv).</strong></p>

  <p>
    <a href="https://github.com/christliebdela/lieb-player/issues"><img src="https://img.shields.io/github/issues/christliebdela/lieb-player" alt="Issues" /></a>
    <a href="https://github.com/christliebdela/lieb-player/network/members"><img src="https://img.shields.io/github/forks/christliebdela/lieb-player" alt="Forks" /></a>
    <a href="https://github.com/christliebdela/lieb-player/stargazers"><img src="https://img.shields.io/github/stars/christliebdela/lieb-player" alt="Stars" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/github/license/christliebdela/lieb-player" alt="License" /></a>
  </p>
</div>

<br />

Lieb Player is a lightweight, ultra-sleek, multi-window desktop media player built with **Tauri v2** and **React (TypeScript)**. Under the hood, it uses the incredibly powerful **mpv engine** via a custom RPC bridge, ensuring seamless hardware acceleration and support for virtually every media codec in existence. 

Designed for users who care about beautiful aesthetics and robust control, Lieb Player feels like a premium native application.

## Core Features

- **Premium UI & Theming**: Pitch-black sleek dark mode, frosted glass elements, and completely customizable accent colors.
- **Streaming Quality Console**: A high-fidelity segmented control bar for managing YouTube/Twitch resolutions (144p to 4K) in real-time.
- **Online Subtitle Discovery**: Integrated OpenSubtitles search engine—find and download captions for any movie directly within the player.
- **Multi-Window Architecture**: Independent, isolated windows for settings, library, and subtitle search that float flawlessly over your content.
- **Proportional Aspect Scaling**: Intelligent resizing engine that respects the video's original aspect ratio during window adjustments.
- **Smart PiP Snapping**: "Always on Top" mode includes automatic corner-snapping and window downsizing for non-intrusive multitasking.
- **Adaptive Control Layouts**: Choose between four distinct UI configurations—Default, Centered, Compact, or Minimal—tailored to your focus level.
- **Advanced Video Rendering**: Full control over GPU backends (Vulkan, D3D11, GPU-Next) with built-in Interpolation and Debanding filters.
- **10-Band Equalizer**: Granular audio control with built-in presets (Bass Boost, Electronic, Pop, etc.) and custom profile support.
- **Visual Shutter Feedback**: Custom accent-colored flash and OSD indicators providing tactile confirmation for media captures.
- **Maintenance Suite**: Built-in tools for clearing media cache, resetting application state, and managing playback persistence.

## Getting Started

Because Lieb Player wraps the `mpv.exe` binary, you will need to download and place it in the project before compiling.

### Prerequisites

- Node.js (v18 or higher)
- Rust (latest stable)
- mpv.exe binary for Windows

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/christliebdela/lieb-player.git
   cd lieb-player
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Download the Media Engine**
   Since `mpv.exe` is a large binary (100MB+), it is not tracked in this repository. 
   - Download the latest Windows `mpv.exe` build from [the official mpv website](https://mpv.io/installation/).
   - Place the extracted `mpv.exe` directly inside the `src-tauri/` directory.

4. **Start the development server**
   ```bash
   npm run tauri dev
   ```

## Architecture Stack

- **Frontend Core**: React 18, TypeScript, Vite
- **Styling**: Vanilla CSS, Framer Motion for micro-animations
- **Global State**: Zustand (with persist and subscribeWithSelector middleware)
- **Icons**: Lucide React
- **Backend & Windowing**: Tauri v2 (Rust)
- **Playback Engine**: mpv (communicating via tauri-plugin-mpv-api)

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check out the [issues page](https://github.com/christliebdela/lieb-player/issues).

To contribute:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

- The team behind Tauri
- The maintainers of the mpv player
- OpenSubtitles.org for the caption engine
