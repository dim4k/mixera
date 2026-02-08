<div align="center">
  <img src="public/favicon.png" alt="Logo MixEra" width="120" height="120">

  <h1>MixEra</h1>

  <p>
    <strong>A premium, modern music time machine quiz. Guess the years, test your knowledge.</strong>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue.js" />
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Lucide-FF69B4?style=for-the-badge&logo=lucide&logoColor=white" alt="Lucide Icons" />
  </p>
  
  <p>
    <a href="#features">Features</a> •
    <a href="#game-modes">Game Modes</a> •
    <a href="#tech-stack">Tech Stack</a>
  </p>
</div>

</div>

## <a id="install"></a>📱 Install on Android

1.  Go to the [**Releases**](../../releases) page of this repository.
2.  Expand the **Assets** section of the latest release.
3.  Download the file named `MixEra-vX.X.X.apk`.
4.  Open the file on your Android device to install it.

## <a id="features"></a>✨ Features

-   **Glassmorphic Design**: A premium, high-contrast interface with vibrant glows and smooth transitions.
-   **QR Scanner**: Fully integrated Hitster-compatible QR scanner to play with your physical cards.
-   **Dynamic Audio**: Real-time Deezer integration for high-quality song previews.
-   **Cross-Fade System**: Seamless background transitions that adapt to the currently playing song's artwork.
-   **Offline Persistence**: High scores and game history are saved locally in your browser.
-   **Responsive UX**: Optimized for both mobile and desktop, featuring a specialized 14px "Precision Timer".

## <a id="game-modes"></a>🎮 Game Modes

-   **🎯 Bullseye**: The ultimate expert mode. Guess the exact year of a song on a specialized slider. Exact match = 100pts!
-   **🔥 Timeline**: Compare mystery songs against a pivot year. Build the longest streak possible.
-   **🎵 Blindtest**: The classic experience. Guess the artist and title with real-time feedback and discovery logic.
-   **🧠 Memory**: Test your auditory memory! Match pairs of identical songs in this classic grid-flipping game.
-   **📷 Hitster**: Use the built-in scanner to integrate your physical Hitster cards into the digital experience.

## <a id="tech-stack"></a>🛠️ Tech Stack

-   **Framework**: [Vue.js 3](https://vuejs.org/) (Composition API)
-   **Build Tool**: [Vite](https://vitejs.dev/) (Ultra-fast HMR)
-   **Mobile**: [Capacitor](https://capacitorjs.com/) (Android APK)
-   **State Management**: Vue Composables (Functional & Modular)
-   **UI Icons**: [Lucide Vue](https://lucide.dev/)
-   **Deployment**: GitHub Actions (Full Automaton to GH Pages & Releases)

## <a id="quick-start"></a>🚀 Development

### 1. Requirements

- Docker (Desktop or Engine)
- Make (optional, but recommended)

### 2. Available Commands

All development tasks are handled via Docker to ensure a consistent environment.

| Command | Description |
| :--- | :--- |
| `make dev` | Start development server at http://localhost:5173 |
| `make check` | Run all checks (Lint + Type Check) |
| `make lint` | Run ESLint fix |
| `make format` | Run Prettier format |
| `make build` | Build web assets for production |
| `make apk` | Build Android APK (Full pipeline) |
---

_Made with ❤️ for music lovers and trivia fans._
