import { ColorTheme, VisualizerSettings } from '../types';

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'cyber-cyan',
    name: 'Cyber Cyan & Magenta',
    category: 'neon',
    primaryColor: '#06b6d4',
    gradientColor: '#ec4899',
    accentColor: '#22d3ee',
    playheadColor: '#ffffff',
    gridColor: 'rgba(255, 255, 255, 0.08)',
  },
  {
    id: 'electric-indigo',
    name: 'Electric Indigo & Violet',
    category: 'neon',
    primaryColor: '#6366f1',
    gradientColor: '#a855f7',
    accentColor: '#818cf8',
    playheadColor: '#38bdf8',
    gridColor: 'rgba(99, 102, 241, 0.12)',
  },
  {
    id: 'sunset-ember',
    name: 'Sunset Ember & Gold',
    category: 'gradient',
    primaryColor: '#f97316',
    gradientColor: '#ef4444',
    accentColor: '#fbbf24',
    playheadColor: '#ffffff',
    gridColor: 'rgba(249, 115, 22, 0.12)',
  },
  {
    id: 'emerald-mint',
    name: 'Emerald Matrix & Lime',
    category: 'neon',
    primaryColor: '#10b981',
    gradientColor: '#84cc16',
    accentColor: '#10b981',
    playheadColor: '#ecfdf5',
    gridColor: 'rgba(16, 185, 129, 0.15)',
  },
  {
    id: 'monochrome-luxe',
    name: 'Monochrome Studio Luxe',
    category: 'minimal',
    primaryColor: '#e4e4e7',
    gradientColor: '#a1a1aa',
    accentColor: '#ffffff',
    playheadColor: '#38bdf8',
    gridColor: 'rgba(255, 255, 255, 0.07)',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare & Rose',
    category: 'gradient',
    primaryColor: '#fbbf24',
    gradientColor: '#f43f5e',
    accentColor: '#f43f5e',
    playheadColor: '#ffffff',
    gridColor: 'rgba(251, 191, 36, 0.1)',
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost & Teal',
    category: 'modern',
    primaryColor: '#38bdf8',
    gradientColor: '#2dd4bf',
    accentColor: '#38bdf8',
    playheadColor: '#ffffff',
    gridColor: 'rgba(56, 189, 248, 0.12)',
  },
  {
    id: 'clean-light',
    name: 'Clean Slate & Cyan',
    category: 'minimal',
    primaryColor: '#0ea5e9',
    gradientColor: '#64748b',
    accentColor: '#38bdf8',
    playheadColor: '#ffffff',
    gridColor: 'rgba(255, 255, 255, 0.08)',
  },
];

export const DEFAULT_SETTINGS: VisualizerSettings = {
  style: 'mirrored-bars',
  barCount: 120,
  barWidthRatio: 0.7,
  barGap: 3,
  barRadius: 4,
  heightScale: 1.0, // 1.0x baseline scale
  sensitivity: 1.0, // 1.0x dynamic sensitivity response
  softKneeCompression: true,
  symmetry: 'mirror',
  smoothing: 0.65, // silky smooth fluid easing
  easingMode: 'organic-fluid',
  invert: false,
  normalize: true,

  themeId: 'cyber-cyan',
  useCustomColors: false,
  primaryColor: '#06b6d4',
  enableGradient: true,
  gradientColor: '#ec4899',
  colorMode: 'bottom-to-top',
  backgroundColor: '#09090b',
  backgroundType: 'dark-studio',
  glowIntensity: 0.45,

  // Profile Picture / Avatar & Side Symmetry
  showProfileImage: false,
  profileImageShape: 'circle',
  profileImageSize: 130,
  profileImageXOffset: 0, // center
  profileImageYOffset: 0, // center
  profileBorderWidth: 4,
  profileBorderColor: '#ffffff',
  profileAudioReactiveScale: true,
  profileGlow: true,
  sideSymmetry: 'mirrored-flank',
  profileWingGap: 16, // px gap between profile and wings (supports 0 for continuous edge)

  // Joint / Edge & Profile Tapering
  enableJoint: true,
  jointAtEnds: true,
  jointAtProfile: true,
  jointWidth: 16, // 16% smooth falloff distance
  jointCurve: 'smooth',

  // Overlays
  showDbGrid: true,
  showCenterLine: true,
  showTrackInfo: true,
  trackTitle: 'Electronic Groove Demo',
  artistName: 'AI Studio Sound Lab',
  customWatermark: 'WAVEFORM VISUALIZER',
  showWatermark: false,
  infoPosition: 'top-left',

  radialInnerRadius: 0.35,
  radialRotation: 0,

  aspectRatio: '16:9',
  padding: 32,
};
