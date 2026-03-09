# Konex Desktop

Application desktop officielle pour Konex - Chat & Voice.

## Fonctionnalités

- 🖥️ **Fenêtre style Discord** - Titlebar custom avec contrôles Windows
- 🎬 **Splash screen animé** - Chargement avec vidéo personnalisée
- 💾 **Cache persistant** - Cookies et sessions préservés entre les sessions
- 🔄 **Mises à jour automatiques** - Via GitHub Releases
- 📴 **Mode hors-ligne** - Écran de reconnexion élégant
- 🔒 **Sécurisé** - Webview sandboxée, contextIsolation activé

## Installation

```bash
# Cloner le repo
git clone https://github.com/konex-sh/konex-desktop.git
cd konex-desktop

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build pour production
npm run dist
```

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance l'app en mode développement |
| `npm run build` | Compile TypeScript et renderer |
| `npm run pack` | Build sans créer d'installeur |
| `npm run dist` | Build + créer installeur (toutes plateformes) |
| `npm run dist:win` | Build pour Windows |
| `npm run dist:mac` | Build pour macOS |
| `npm run dist:linux` | Build pour Linux |
| `npm run release` | Build et publie sur GitHub Releases |

## Structure du projet

```
konex-desktop/
├── src/
│   ├── main/           # Process principal Electron
│   │   ├── main.ts     # Point d'entrée
│   │   ├── updater.ts  # Système de mises à jour
│   │   └── preload.ts  # Script preload
│   └── renderer/       # Interface React
│       ├── App.tsx     # Composant principal
│       ├── components/ # Composants UI
│       └── index.css   # Styles globaux
├── public/
│   ├── splash.html     # Écran de chargement
│   └── offline.html    # Écran hors-ligne
├── assets/
│   ├── icon.png        # Icône de l'app
│   └── loader.mp4      # Vidéo de chargement (fallback)
└── dist/               # Build output
```

## Configuration des mises à jour

Les mises à jour sont automatiquement téléchargées depuis GitHub Releases.

Pour publier une nouvelle version :

1. Mettre à jour `version` dans `package.json`
2. Commit et tag : `git tag v1.0.1`
3. Push : `git push && git push --tags`
4. Lancer : `npm run release`

## Assets requis

- `assets/icon.png` - Icône 512x512 PNG
- `assets/icon.ico` - Icône Windows
- `assets/icon.icns` - Icône macOS
- `assets/loader.mp4` - Vidéo de chargement (fallback local)

La vidéo de chargement est d'abord chargée depuis `https://cdn.konex.sh/loader.mp4`, avec fallback sur le fichier local.

## Technologies

- **Electron** - Framework desktop
- **React** - UI renderer
- **TypeScript** - Typage statique
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **electron-updater** - Auto-updates

## License

MIT
