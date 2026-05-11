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
    version: "0.1.6",
    date: "2026-05-11",
    changes: {
      English: [
        "Rebranding: Officially renamed to 'Lieb Player' across the entire interface",
        "Global Ready: 100% localization of all tooltips, metadata, and interface labels",
        "Integrated Updates: New progress-aware update button with smooth animations",
        "Security: Removed hardcoded API keys; each user now manages their own credentials",
        "UI Polish: Fixed clipping in Subtitle Search and refined control bar layout"
      ],
      French: [
        "Branding : Officiellement renommé 'Lieb Player' sur toute l'interface",
        "Prêt pour l'international : Localisation à 100% des infobulles et étiquettes",
        "Mises à jour intégrées : Nouveau bouton de progression pour les mises à jour",
        "Sécurité : Suppression des clés API codées en dur ; chaque utilisateur gère ses accès",
        "Affinage UI : Correction du rognage de la liste de sous-titres et layout amélioré"
      ],
      Spanish: [
        "Branding: Renombrado oficialmente a 'Lieb Player' en toda la interfaz",
        "Listo para el Mundo: Localización al 100% de globos de texto y etiquetas",
        "Actualizaciones Integradas: Nuevo botón de progreso con animaciones fluidas",
        "Seguridad: Se eliminaron las claves API predeterminadas; cada usuario gestiona las suyas",
        "Pulido de UI: Corregido el recorte en la búsqueda de subtítulos y diseño refinado"
      ]
    }
  },
  {
    version: "0.1.5",
    date: "2026-05-10",
    changes: {
      English: [
        "Secured Subtitle API: Move credentials to secure local storage settings",
        "UI Refinement: Fixed overflow and clipping in the Subtitle Search modal",
        "Polished OSD: Slimmed down Action OSD for a more subtle media experience",
        "Privacy: Added visibility toggle for API Key in Maintenance settings"
      ],
      French: [
        "Sécurité API Sous-titres : Déplacement des identifiants vers les paramètres sécurisés",
        "Affinage UI : Correction du débordement dans la recherche de sous-titres",
        "OSD Épuré : Réduction de la taille de l'OSD pour une expérience plus discrète",
        "Confidentialité : Ajout d'un bouton de visibilité pour la clé API"
      ],
      Spanish: [
        "Seguridad de API de Subtítulos: Credenciales movidas a ajustes de almacenamiento seguro",
        "Refinamiento de UI: Corregido el desbordamiento en el buscador de subtítulos",
        "OSD Pulido: Reducción del tamaño del OSD para una experiencia más sutil",
        "Privacidad: Añadido conmutador de visibilidad para la clave API"
      ]
    }
  },
  {
    version: "0.1.4",
    date: "2026-05-10",
    changes: {
      English: [
        "CRITICAL: Stabilized engine initialization to prevent startup crashes",
        "Smart Resume: Play/Spacebar now automatically resumes last track and position",
        "Right-Click to Play: Trigger playback/resume via right-click on canvas",
        "Seamless Streaming: 30s background prefetching for gapless playback",
        "Proportional UI Scaling: Controls now scale perfectly to any window size",
        "Detailed Error Reporting: Specific feedback for update failures",
        "Multi-language Changelog: Full translations for version history"
      ],
      French: [
        "CRITIQUE : Stabilisation de l'initialisation du moteur pour éviter les plantages",
        "Reprise Intelligente : Lecture/Espace reprend automatiquement la piste et la position",
        "Clic-Droit pour Jouer : Déclenchez la lecture via un clic-droit sur le canevas",
        "Streaming Fluide : Préchargement de 30s pour une lecture sans coupure",
        "Mise à l'échelle Proportionnelle : Les contrôles s'adaptent à toute taille",
        "Rapports d'Erreur Détaillés : Retours précis sur les échecs de mise à jour",
        "Historique Multilingue : Traductions complètes de l'historique"
      ],
      Spanish: [
        "CRÍTICO: Estabilización de la inicialización del motor para evitar fallos",
        "Reanudación Inteligente: Play/Espacio reanuda automáticamente pista y posición",
        "Clic-Derecho para Reproducir: Activa la reproducción con clic-derecho en el lienzo",
        "Streaming Fluido: Precarga de 30s para reproducción sin pausas",
        "Escalado Proporcional: Controles que se adaptan a cualquier tamaño",
        "Informes de Errores Detallados: Feedback específico en actualizaciones",
        "Historial Multilingüe: Traducciones completas del historial de versiones"
      ]
    }
  },
  {
    version: "0.1.3",
    date: "2026-05-10",
    changes: {
      English: [
        "Initial implementation of Smart Resume and Right-Click Play",
        "Initial implementation of Seamless Streaming prefetching",
        "Note: This version is replaced by 0.1.4 for stability."
      ],
      French: [
        "Implémentation initiale de la Reprise Intelligente et du Clic-Droit",
        "Implémentation initiale du préchargement pour le Streaming Fluide",
        "Note : Cette version est remplacée par la 0.1.4 pour la stabilité."
      ],
      Spanish: [
        "Implementación inicial de Reanudación Inteligente y Clic-Derecho",
        "Implementación inicial de precarga para Streaming Fluido",
        "Nota: Esta versión es reemplazada por la 0.1.4 por estabilidad."
      ]
    }
  },
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
