export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    English: string[];
    French: string[];
    Spanish: string[];
  };
}

export const changelog: ChangelogEntry[] = [
  {
    version: "0.1.2",
    date: "2026-05-10",
    changes: {
      English: [
        "Added support for YouTube Playlist importing",
        "Introduced Audio-only mode for focused listening",
        "Redesigned library source badges with dynamic icons",
        "Enhanced loading states with branded animations",
        "Unified application versioning across all components",
        "Polished UI typography and branding elements"
      ],
      French: [
        "Ajout du support pour l'importation de playlists YouTube",
        "Introduction du mode Audio seul pour une écoute ciblée",
        "Refonte des badges de source de bibliothèque avec des icônes dynamiques",
        "Amélioration des états de chargement avec des animations de marque",
        "Uniformisation de la version de l'application sur tous les composants",
        "Peaufinage de la typographie et des éléments de marque de l'interface"
      ],
      Spanish: [
        "Añadido soporte para importar listas de reproducción de YouTube",
        "Introducido el modo Solo Audio para una escucha enfocada",
        "Rediseño de los distintivos de fuente de la biblioteca con iconos dinámicos",
        "Estados de carga mejorados con animaciones de marca",
        "Versionado de la aplicación unificado en todos los componentes",
        "Tipografía de la interfaz y elementos de marca pulidos"
      ]
    }
  },
  {
    version: "0.1.1",
    date: "2026-05-09",
    changes: {
      English: [
        "Optimized video rendering performance",
        "Improved hardware acceleration stability",
        "Added subtitle sync adjustments",
        "Fixed window resizing aspect ratio constraints",
        "Refined dark mode color palette"
      ],
      French: [
        "Optimisation des performances de rendu vidéo",
        "Amélioration de la stabilité de l'accélération matérielle",
        "Ajout de réglages de synchronisation des sous-titres",
        "Correction des contraintes de ratio d'aspect lors du redimensionnement",
        "Affinage de la palette de couleurs du mode sombre"
      ],
      Spanish: [
        "Optimización del rendimiento de renderizado de vídeo",
        "Mejora de la estabilidad de la aceleración por hardware",
        "Añadidos ajustes de sincronización de subtítulos",
        "Corrección de restricciones de relación de aspecto al redimensionar",
        "Paleta de colores del modo oscuro refinada"
      ]
    }
  },
  {
    version: "0.1.0",
    date: "2026-05-09",
    changes: {
      English: [
        "Initial Alpha release",
        "Core MPV and Rust media engine integration",
        "Native file system browsing and library management",
        "Customizable accent colors and themes",
        "Global keyboard shortcut system"
      ],
      French: [
        "Première version Alpha",
        "Intégration du moteur média MPV et Rust",
        "Navigation native du système de fichiers et gestion de la bibliothèque",
        "Couleurs d'accentuation et thèmes personnalisables",
        "Système de raccourcis clavier globaux"
      ],
      Spanish: [
        "Lanzamiento inicial de la versión Alpha",
        "Integración del motor multimedia principal de MPV y Rust",
        "Navegación nativa del sistema de archivos y gestión de la biblioteca",
        "Colores de acento y temas personalizables",
        "Sistema de atajos de teclado globales"
      ]
    }
  }
];
