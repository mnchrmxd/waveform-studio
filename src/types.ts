export type WaveformStyle =
  | 'mirrored-bars'
  | 'bars-up'
  | 'smooth-wave'
  | 'radial'
  | 'digital-matrix'
  | 'spine'
  | 'spectrum-bands';

export type BackgroundType =
  | 'dark-studio'
  | 'oled-black'
  | 'light-canvas'
  | 'radial-spotlight'
  | 'gradient-mesh'
  | 'transparent'
  | 'custom-solid';

export type AspectRatioType = '16:9' | '1:1' | '9:16' | '21:9' | '3:1' | 'responsive';

export type ColorRepresentationMode =
  | 'bottom-to-top'
  | 'top-to-bottom'
  | 'right-to-left'
  | 'left-to-right'
  | 'inside-out-horizontal'
  | 'inside-out-vertical'
  | 'inside-out-circular'
  | 'alternate-bars';

export interface ColorTheme {
  id: string;
  name: string;
  category: 'neon' | 'modern' | 'minimal' | 'gradient';
  primaryColor: string;
  gradientColor: string;
  backgroundColor: string;
  backgroundSecondary: string;
  accentColor?: string;
  primaryGradientEnd?: string;
  progressColor?: string;
  progressGradientEnd?: string;
  playheadColor: string;
  gridColor: string;
}

export type SideSymmetryType = 'none' | 'mirrored-flank' | 'split-cutout';
export type ProfileImageShape = 'circle' | 'rounded' | 'square';

export interface VisualizerSettings {
  style: WaveformStyle;
  barCount: number;
  barWidthRatio: number; // 0.1 to 1.0 (bar width relative to slot)
  barGap: number; // pixels
  barRadius: number; // corner radius in px
  heightScale: number; // 0.2 to 3.0 multiplier (amplitude sensitivity & max height scale)
  sensitivity: number; // 0.2 to 3.0 audio gain sensitivity
  softKneeCompression: boolean; // softly compresses high-volume peaks with smooth saturation
  symmetry: 'mirror' | 'top-only' | 'bottom-only';
  smoothing: number; // 0 (raw) to 1 (liquid smooth)
  easingMode: 'organic-fluid' | 'snappy' | 'liquid-flow' | 'gentle';
  invert: boolean;
  normalize: boolean;
  
  // Theme & Colors
  themeId: string;
  useCustomColors: boolean;
  primaryColor: string;
  enableGradient: boolean; // Switch button to toggle optional gradient/accent color
  gradientColor: string; // The secondary / gradient / accent color
  colorMode: ColorRepresentationMode; // How primary and gradient/accent colors are represented
  backgroundColor: string;
  backgroundType: BackgroundType;
  glowIntensity: number; // 0 to 1

  // Deprecated fields (kept optional for backwards compatibility)
  primaryGradientEnd?: string;
  progressColor?: string;
  progressGradientEnd?: string;

  // Profile Picture / Avatar & Side Symmetry
  showProfileImage: boolean;
  profileImageShape: ProfileImageShape;
  profileImageSize: number; // px diameter / size
  profileImageXOffset: number; // -50 to +50 percent
  profileImageYOffset: number; // -40 to +40 percent
  profileBorderWidth: number; // 0 to 12 px
  profileBorderColor: string; // hex
  profileAudioReactiveScale: boolean; // pulse to bass
  profileGlow: boolean;
  sideSymmetry: SideSymmetryType; // 'none' | 'mirrored-flank' | 'split-cutout'
  profileWingGap: number; // 0 to 60 px gap between profile picture and waveform wings

  // Joint / Edge & Profile Tapering (Bars smoothly approach zero at ends and/or next to profile)
  enableJoint: boolean;
  jointAtEnds: boolean;
  jointAtProfile: boolean;
  jointWidth: number; // 5 to 40 (%)
  jointCurve: 'smooth' | 'linear' | 'cubic';
  
  // Overlays
  showDbGrid: boolean;
  showCenterLine: boolean;
  showTrackInfo: boolean;
  trackTitle: string;
  artistName: string;
  customWatermark: string;
  showWatermark: boolean;
  infoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'center-top';

  // Deprecated overlay fields (kept optional for backwards compatibility)
  showPlayhead?: boolean;
  showTimeRuler?: boolean;
  showTimeRulerInExport?: boolean;

  // Radial specific
  radialInnerRadius: number; // 0.1 to 0.7
  radialRotation: number; // 0 to 360

  // Canvas Framing
  aspectRatio: AspectRatioType;
  padding: number; // in px
}

export interface AudioMetadata {
  fileName: string;
  fileSize: number;
  duration: number; // in seconds
  sampleRate: number;
  numberOfChannels: number;
  peakAmplitude: number;
  rmsAmplitude: number;
  dynamicRangeDb: number;
  format: string;
}

export interface WaveformData {
  peaks: number[]; // Normalized 0 to 1
  minima?: number[];
  rms: number[];
  duration: number;
  sampleRate: number;
  channelData: Float32Array[];
}

export interface SampleAudioPreset {
  id: string;
  name: string;
  genre: string;
  description: string;
  duration: number;
  bpm: number;
  generator: (ctx: AudioContext) => Promise<AudioBuffer>;
}
