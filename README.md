<div align="center">
  <img src="public/lieb-player-icon.png" alt="Lieb Player Logo" width="120" height="120" />
  <h1>Lieb Player</h1>
  <p><strong>A modern, highly customizable desktop media player powered by Tauri, React, and the Libre Media Engine (mpv).</strong></p>

  <p>
    <a href="https://github.com/christliebdela/lieb-player/issues"><img src="https://img.shields.io/github/issues/christliebdela/lieb-player" alt="Issues" /></a>
    <a href="https://github.com/christliebdela/lieb-player/network/members"><img src="https://img.shields.io/github/forks/christliebdela/lieb-player" alt="Forks" /></a>
    <a href="https://github.com/christliebdela/lieb-player/stargazers"><img src="https://img.shields.io/github/stars/christliebdela/lieb-player" alt="Stars" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/github/license/christliebdela/lieb-player" alt="License" /></a>
  </p>
</div>

<br />

Lieb Player is a lightweight, ultra-sleek, multi-window desktop media player built with **Tauri v2** and **React (TypeScript)**. Under the hood, it uses the incredibly powerful **mpv engine** via RPC, ensuring seamless hardware acceleration and support for virtually every media codec in existence. 

Designed for users who care about beautiful aesthetics and robust control, Lieb Player feels like a premium native application.

## ✨ Features

- 🎨 **Premium UI & Theming**: Pitch-black sleek dark mode, frosted glass elements, and completely customizable accent colors.
- 🪟 **Multi-Window Architecture**: Independent, isolated windows for settings and library management that float flawlessly over your content.
- 🎛️ **Libre Media Engine (mpv)**: Lightning-fast rendering, GPU hardware acceleration (Vulkan, D3D11), and pristine playback quality.
- 🎚️ **10-Band Equalizer & Crossfade**: Granular audio control directly built into the application preferences.
- ⚡ **Lightweight & Blazing Fast**: Built on Rust and Tauri, keeping memory overhead and CPU usage significantly lower than Electron-based alternatives.
- ⌨️ **Keyboard Navigation**: Comprehensive hotkey system for seamless power-user interactions (Seek, Mute, Volume, Fullscreen, Loop modes).
- 🧩 **Persistent State**: Fluid cross-window synchronization ensures settings modified in the preferences instantly apply to the main player.

## 🚀 Getting Started

Because Lieb Player wraps the `mpv.exe` binary, you will need to download and place it in the project before compiling.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [Rust](https://www.rust-lang.org/) (latest stable)
- **mpv.exe** binary for Windows

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

## 🏗️ Architecture Stack

- **Frontend Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (JIT), Framer Motion for micro-animations
- **Global State**: Zustand with persist middleware and cross-webview sync
- **Icons**: Lucide React
- **Backend & Windowing**: Tauri v2 (Rust)
- **Playback Engine**: mpv (communicating via custom IPC/RPC bridges)

## 🤝 Contributing

Contributions, issues, and feature requests are incredibly welcome! Feel free to check out the [issues page](https://github.com/christliebdela/lieb-player/issues).

To contribute:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please make sure to read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating in our community.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

- The incredible team behind [Tauri](https://tauri.app/)
- The maintainers of the [mpv player](https://mpv.io/)
- Our open-source contributors and community
