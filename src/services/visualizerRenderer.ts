import { ColorTheme, VisualizerSettings, WaveformData, ProfileImageShape, SideSymmetryType, ColorRepresentationMode } from '../types';
import { SpectrumData } from './fftAnalyzer';

export interface RenderFrameOptions {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  time: number; // Current playback/export time in seconds
  duration: number; // Total duration in seconds
  isPlaying: boolean;
  spectrum: SpectrumData;
  waveformData?: WaveformData | null;
  settings: VisualizerSettings;
  theme: ColorTheme;
  backgroundImage?: HTMLImageElement | ImageBitmap | null;
  backgroundVideo?: HTMLVideoElement | null;
  backgroundBlur?: number;
  backgroundDim?: number;
  profileImage?: HTMLImageElement | ImageBitmap | null;
  isExport?: boolean;
}

export function getVisualizerGradient(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  primaryCol: string,
  gradientCol: string,
  enableGradient: boolean,
  colorMode: ColorRepresentationMode,
  avatarX?: number,
  avatarY?: number
): string | CanvasGradient {
  if (!enableGradient) {
    return primaryCol;
  }

  switch (colorMode) {
    case 'bottom-to-top': {
      const grad = ctx.createLinearGradient(0, y + height, 0, y);
      grad.addColorStop(0, primaryCol);
      grad.addColorStop(1, gradientCol);
      return grad;
    }
    case 'top-to-bottom': {
      const grad = ctx.createLinearGradient(0, y, 0, y + height);
      grad.addColorStop(0, primaryCol);
      grad.addColorStop(1, gradientCol);
      return grad;
    }
    case 'right-to-left': {
      const grad = ctx.createLinearGradient(x + width, 0, x, 0);
      grad.addColorStop(0, primaryCol);
      grad.addColorStop(1, gradientCol);
      return grad;
    }
    case 'left-to-right': {
      const grad = ctx.createLinearGradient(x, 0, x + width, 0);
      grad.addColorStop(0, primaryCol);
      grad.addColorStop(1, gradientCol);
      return grad;
    }
    case 'bottom-to-top': {
      const grad = ctx.createLinearGradient(0, y + height, 0, y);
      grad.addColorStop(0, primaryCol);
      grad.addColorStop(1, gradientCol);
      return grad;
    }
    case 'inside-out-horizontal': {
      const grad = ctx.createLinearGradient(x, 0, x + width, 0);
      const centerFrac =
        avatarX !== undefined && avatarX >= x && avatarX <= x + width
          ? (avatarX - x) / width
          : 0.5;
      grad.addColorStop(0, gradientCol);
      grad.addColorStop(Math.max(0.1, Math.min(0.9, centerFrac)), primaryCol);
      grad.addColorStop(1, gradientCol);
      return grad;
    }
    case 'inside-out-vertical': {
      const grad = ctx.createLinearGradient(0, y, 0, y + height);
      grad.addColorStop(0, gradientCol);
      grad.addColorStop(0.5, primaryCol);
      grad.addColorStop(1, gradientCol);
      return grad;
    }
    case 'inside-out-circular': {
      const cx = avatarX !== undefined && avatarX > 0 ? avatarX : x + width / 2;
      const cy = avatarY !== undefined && avatarY > 0 ? avatarY : y + height / 2;
      const maxR = Math.max(width, height) / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      grad.addColorStop(0, primaryCol);
      grad.addColorStop(1, gradientCol);
      return grad;
    }
    case 'alternate-bars':
      return primaryCol;
    default: {
      const grad = ctx.createLinearGradient(0, y + height, 0, y);
      grad.addColorStop(0, primaryCol);
      grad.addColorStop(1, gradientCol);
      return grad;
    }
  }
}

// Cached Background Canvas to avoid CPU blur filter on every frame
let cachedBgCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let cachedBgCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
let cachedBgKey = '';

function getCachedBackground(
  width: number,
  height: number,
  settings: VisualizerSettings,
  theme: ColorTheme,
  backgroundImage?: HTMLImageElement | ImageBitmap | null,
  backgroundBlur: number = 0,
  backgroundDim: number = 0.6
): HTMLCanvasElement | OffscreenCanvas | null {
  const imageKey = backgroundImage ? `${(backgroundImage as HTMLImageElement).src || 'bitmap'}` : 'none';
  const currentKey = `${width}x${height}_${settings.backgroundType}_${settings.backgroundColor}_${theme.id}_${imageKey}_${backgroundBlur}_${backgroundDim}`;

  if (cachedBgCanvas && cachedBgKey === currentKey) {
    return cachedBgCanvas;
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    cachedBgCanvas = new OffscreenCanvas(width, height);
    cachedBgCtx = cachedBgCanvas.getContext('2d');
  } else if (typeof document !== 'undefined') {
    cachedBgCanvas = document.createElement('canvas');
    cachedBgCanvas.width = width;
    cachedBgCanvas.height = height;
    cachedBgCtx = cachedBgCanvas.getContext('2d');
  } else {
    cachedBgCanvas = null;
    cachedBgCtx = null;
  }

  if (!cachedBgCtx) return null;

  if (settings.backgroundType === 'transparent') {
    return null;
  }

  cachedBgKey = currentKey;
  const ctx = cachedBgCtx;
  ctx.clearRect(0, 0, width, height);

  if (backgroundImage) {
    ctx.save();
    try {
      if (backgroundBlur > 0) {
        ctx.filter = `blur(${backgroundBlur}px)`;
      }
      const imgAspect = backgroundImage.width / backgroundImage.height;
      const canvasAspect = width / height;
      let sWidth = backgroundImage.width;
      let sHeight = backgroundImage.height;
      let sx = 0;
      let sy = 0;

      if (imgAspect > canvasAspect) {
        sWidth = backgroundImage.height * canvasAspect;
        sx = (backgroundImage.width - sWidth) / 2;
      } else {
        sHeight = backgroundImage.width / canvasAspect;
        sy = (backgroundImage.height - sHeight) / 2;
      }

      ctx.drawImage(backgroundImage, sx, sy, sWidth, sHeight, 0, 0, width, height);
      ctx.filter = 'none';

      // Dimming overlay
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.1, backgroundDim)})`;
      ctx.fillRect(0, 0, width, height);
    } catch {
      // fallback
    }
    ctx.restore();
    return cachedBgCanvas;
  }

  switch (settings.backgroundType) {
    case 'custom-solid':
      ctx.fillStyle = settings.backgroundColor || '#09090b';
      ctx.fillRect(0, 0, width, height);
      break;

    case 'oled-black':
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      break;

    case 'light-canvas': {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'radial-spotlight': {
      ctx.fillStyle = settings.backgroundColor || theme.backgroundColor || '#09090b';
      ctx.fillRect(0, 0, width, height);
      const spotGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        20,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7
      );
      const accent = theme.accentColor || theme.primaryColor;
      spotGrad.addColorStop(0, hexToRgba(accent, 0.28));
      spotGrad.addColorStop(0.6, hexToRgba(accent, 0.06));
      spotGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'gradient-mesh': {
      const meshGrad = ctx.createLinearGradient(0, 0, width, height);
      meshGrad.addColorStop(0, settings.backgroundColor || theme.backgroundColor || '#09090b');
      meshGrad.addColorStop(0.5, theme.backgroundSecondary || '#18181b');
      meshGrad.addColorStop(1, settings.backgroundColor || theme.backgroundColor || '#09090b');
      ctx.fillStyle = meshGrad;
      ctx.fillRect(0, 0, width, height);

      const orb1 = ctx.createRadialGradient(
        width * 0.25,
        height * 0.35,
        10,
        width * 0.25,
        height * 0.35,
        width * 0.4
      );
      orb1.addColorStop(0, hexToRgba(theme.primaryColor, 0.22));
      orb1.addColorStop(1, 'transparent');
      ctx.fillStyle = orb1;
      ctx.fillRect(0, 0, width, height);

      const orb2 = ctx.createRadialGradient(
        width * 0.75,
        height * 0.65,
        10,
        width * 0.75,
        height * 0.65,
        width * 0.45
      );
      orb2.addColorStop(0, hexToRgba(theme.primaryGradientEnd || theme.accentColor, 0.18));
      orb2.addColorStop(1, 'transparent');
      ctx.fillStyle = orb2;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'dark-studio':
    default: {
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.2,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      bgGrad.addColorStop(0, theme.backgroundSecondary || '#18181b');
      bgGrad.addColorStop(1, settings.backgroundColor || theme.backgroundColor || '#09090b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
      break;
    }
  }

  return cachedBgCanvas;
}

export function renderVisualizerFrame(opts: RenderFrameOptions): void {
  const {
    ctx,
    width,
    height,
    time,
    duration,
    spectrum,
    settings,
    theme,
    backgroundImage,
    backgroundVideo,
    backgroundBlur = 10,
    backgroundDim = 0.6,
    profileImage,
    isExport = false,
  } = opts;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. Audio-reactive subtle bass scale
  const bassPulse = spectrum.bassEnergy * 0.03;
  if (bassPulse > 0.005) {
    const cx = width / 2;
    const cy = height / 2;
    ctx.translate(cx, cy);
    ctx.scale(1 + bassPulse, 1 + bassPulse);
    ctx.translate(-cx, -cy);
  }

  // 2. Render Background (Skipped for transparent alpha stages/exports)
  if (settings.backgroundType !== 'transparent') {
    if (backgroundVideo && (backgroundVideo.readyState >= 2 || (backgroundVideo.videoWidth > 0 && backgroundVideo.videoHeight > 0))) {
      ctx.save();
      try {
        if (backgroundBlur > 0) {
          ctx.filter = `blur(${backgroundBlur}px)`;
        }
        const vw = backgroundVideo.videoWidth || 1920;
        const vh = backgroundVideo.videoHeight || 1080;
        const vidAspect = vw / vh;
        const canvasAspect = width / height;
        let sWidth = vw;
        let sHeight = vh;
        let sx = 0;
        let sy = 0;

        if (vidAspect > canvasAspect) {
          sWidth = vh * canvasAspect;
          sx = (vw - sWidth) / 2;
        } else {
          sHeight = vw / canvasAspect;
          sy = (vh - sHeight) / 2;
        }

        ctx.drawImage(backgroundVideo, sx, sy, sWidth, sHeight, 0, 0, width, height);
        ctx.filter = 'none';

        // Dimming overlay
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.05, backgroundDim)})`;
        ctx.fillRect(0, 0, width, height);
      } catch {
        // Fallback to theme or solid if video frame cannot be drawn
      }
      ctx.restore();
    } else {
      const cachedBg = getCachedBackground(
        width,
        height,
        settings,
        theme,
        backgroundImage,
        backgroundBlur,
        backgroundDim
      );
      if (cachedBg) {
        ctx.drawImage(cachedBg, 0, 0);
      }
    }
  }

  // 3. Resolution Scaling Factor
  // Reference base dimension: preview canvas authored at min dimension = 720 (720p height in 16:9/1:1, or 720p width in 9:16)
  const baseDim = Math.min(width, height);
  const resScale = Math.max(0.25, baseDim / 720);

  // Scaled settings for resolution-independent rendering
  const scaledSettings: VisualizerSettings = {
    ...settings,
    profileImageSize: (settings.profileImageSize || 130) * resScale,
    profileBorderWidth: (settings.profileBorderWidth ?? 4) * resScale,
    profileWingGap: (settings.profileWingGap ?? 16) * resScale,
    padding: (settings.padding || 32) * resScale,
    jointWidth: (settings.jointWidth || 60) * resScale,
  };

  // 4. Grid & Center line
  if (settings.showDbGrid) {
    renderDbGrid(ctx, width, height, theme, resScale);
  }
  if (settings.showCenterLine && settings.style !== 'radial') {
    renderCenterLine(ctx, width, height, scaledSettings, theme, resScale);
  }

  // 5. Calculate Waveform & Profile Bounds
  const padding = scaledSettings.padding || 32;
  const drawWidth = Math.max(10, width - padding * 2);
  const drawHeight = Math.max(10, height - padding * 2);
  const drawX = padding;
  const drawY = padding;
  const cx = width / 2;
  const cy = height / 2;

  // Profile Image Anchor Point (can be moved horizontally with X-Offset and vertically with Y-Offset)
  const xOffsetRatio = (scaledSettings.profileImageXOffset || 0) / 100;
  const yOffsetRatio = (scaledSettings.profileImageYOffset || 0) / 100;
  const avatarX = cx + drawWidth * xOffsetRatio;
  const avatarY = cy + drawHeight * yOffsetRatio;
  const isProfileActive = Boolean(scaledSettings.showProfileImage);

  // 6. Render Main Waveform
  switch (settings.style) {
    case 'bars-up':
      renderBarsUp(
        ctx,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
        spectrum,
        scaledSettings,
        theme,
        time,
        duration,
        isProfileActive,
        avatarX,
        avatarY
      );
      break;
    case 'smooth-wave':
      renderSmoothWave(
        ctx,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
        spectrum,
        scaledSettings,
        theme,
        time,
        duration,
        isProfileActive,
        avatarX,
        avatarY
      );
      break;
    case 'radial':
      renderRadial(
        ctx,
        isProfileActive ? avatarX : cx,
        isProfileActive ? avatarY : cy,
        Math.min(drawWidth, drawHeight) / 2,
        spectrum,
        scaledSettings,
        theme,
        time
      );
      break;
    case 'digital-matrix':
      renderDigitalMatrix(
        ctx,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
        spectrum,
        scaledSettings,
        theme,
        isProfileActive,
        avatarX,
        avatarY
      );
      break;
    case 'spine':
      renderSpine(
        ctx,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
        spectrum,
        scaledSettings,
        theme,
        time,
        isProfileActive,
        avatarX,
        avatarY
      );
      break;
    case 'spectrum-bands':
      renderSpectrumBands(ctx, drawX, drawY, drawWidth, drawHeight, spectrum, scaledSettings, theme);
      break;
    case 'mirrored-bars':
    default:
      renderMirroredBars(
        ctx,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
        spectrum,
        scaledSettings,
        theme,
        time,
        duration,
        isProfileActive,
        avatarX,
        avatarY
      );
      break;
  }

  // 7. Render Profile Image / Avatar on Top
  if (isProfileActive) {
    renderProfileImage(
      ctx,
      avatarX,
      avatarY,
      scaledSettings.profileImageSize || (130 * resScale),
      scaledSettings.profileImageShape || 'circle',
      scaledSettings.profileBorderWidth ?? (4 * resScale),
      scaledSettings.profileBorderColor || '#ffffff',
      scaledSettings.profileGlow ?? true,
      scaledSettings.profileAudioReactiveScale ?? true,
      spectrum,
      theme,
      profileImage,
      resScale
    );
  }

  // 8. Overlays
  if (settings.showTrackInfo) {
    renderTrackOverlay(ctx, width, height, padding, settings, theme, time, duration, resScale);
  }
  if (settings.showWatermark && settings.customWatermark) {
    renderWatermark(ctx, width, height, padding, settings.customWatermark, resScale);
  }

  ctx.restore();
}

function renderDbGrid(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ColorTheme,
  resScale: number = 1
): void {
  ctx.save();
  ctx.strokeStyle = theme.gridColor || 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = Math.max(1, 1 * resScale);
  ctx.setLineDash([Math.round(4 * resScale), Math.round(4 * resScale)]);

  const lines = 6;
  ctx.beginPath();
  for (let i = 1; i < lines; i++) {
    const y = (height / lines) * i;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function renderCenterLine(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  settings: VisualizerSettings,
  theme: ColorTheme,
  resScale: number = 1
): void {
  ctx.save();
  const centerY = height / 2;
  ctx.strokeStyle = hexToRgba(theme.primaryColor, 0.25);
  ctx.lineWidth = Math.max(1, 1 * resScale);
  ctx.beginPath();
  ctx.moveTo(settings.padding || 32, centerY);
  ctx.lineTo(width - (settings.padding || 32), centerY);
  ctx.stroke();
  ctx.restore();
}

/**
 * Smooth Hermite, linear, or cubic attenuation curve for joint transitions [0, 1].
 */
export function computeJointMultiplier(
  t: number,
  curve: 'smooth' | 'linear' | 'cubic' = 'smooth'
): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (curve === 'linear') return clamped;
  if (curve === 'cubic') return clamped * clamped * clamped;
  // Hermite smoothstep (zero 1st derivatives at 0 and 1)
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Calculates joint multiplier for a wing bar (0 at ends or next to profile, 1 in center).
 */
export function getWingBarJointFactor(
  index: number,
  totalBars: number,
  isLeftWing: boolean,
  settings: VisualizerSettings,
  isProfileActive: boolean
): number {
  if (!settings.enableJoint) return 1.0;
  let factor = 1.0;
  const taperBars = Math.max(2, Math.round(totalBars * ((settings.jointWidth || 16) / 100)));

  if (isLeftWing) {
    if (settings.jointAtEnds) {
      const tEnd = index / taperBars;
      factor *= computeJointMultiplier(tEnd, settings.jointCurve);
    }
    if (settings.jointAtProfile && isProfileActive) {
      const tProf = (totalBars - 1 - index) / taperBars;
      factor *= computeJointMultiplier(tProf, settings.jointCurve);
    }
  } else {
    // Right wing: index 0 is next to profile, (totalBars - 1) is at outer right end
    if (settings.jointAtProfile && isProfileActive) {
      const tProf = index / taperBars;
      factor *= computeJointMultiplier(tProf, settings.jointCurve);
    }
    if (settings.jointAtEnds) {
      const tEnd = (totalBars - 1 - index) / taperBars;
      factor *= computeJointMultiplier(tEnd, settings.jointCurve);
    }
  }

  return factor;
}

/**
 * Calculates joint multiplier for continuous or split-cutout bars/points across the canvas.
 */
export function getContinuousJointFactor(
  posX: number,
  elementWidth: number,
  canvasX: number,
  canvasWidth: number,
  avatarX: number,
  avatarRadius: number,
  gap: number,
  settings: VisualizerSettings,
  isProfileActive: boolean
): number {
  if (!settings.enableJoint) return 1.0;
  let factor = 1.0;

  // 1. Joint at outer canvas ends (left and right)
  if (settings.jointAtEnds) {
    const endZoneWidth = Math.max(16, canvasWidth * ((settings.jointWidth || 16) / 100));
    const distFromLeft = posX - canvasX;
    const distFromRight = (canvasX + canvasWidth) - (posX + elementWidth);
    const distFromEnd = Math.min(distFromLeft, distFromRight);
    const tEnd = distFromEnd / endZoneWidth;
    factor *= computeJointMultiplier(tEnd, settings.jointCurve);
  }

  // 2. Joint next to profile boundary
  if (settings.jointAtProfile && isProfileActive) {
    const profileZoneWidth = Math.max(24, canvasWidth * ((settings.jointWidth || 16) / 100) * 0.7);
    const cutoutLeft = avatarX - avatarRadius - gap;
    const cutoutRight = avatarX + avatarRadius + gap;

    let distFromProfile = Infinity;
    if (posX + elementWidth <= cutoutLeft) {
      distFromProfile = cutoutLeft - (posX + elementWidth);
    } else if (posX >= cutoutRight) {
      distFromProfile = posX - cutoutRight;
    } else {
      distFromProfile = 0;
    }

    const tProf = distFromProfile / profileZoneWidth;
    factor *= computeJointMultiplier(tProf, settings.jointCurve);
  }

  return factor;
}

// 1. Mirrored Frequency Bars (Batched Path Rendering with Side Symmetry & Profile Offset)
function renderMirroredBars(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  spectrum: SpectrumData,
  settings: VisualizerSettings,
  theme: ColorTheme,
  _time: number,
  _duration: number,
  isProfileActive: boolean = false,
  avatarX: number = 0,
  _avatarY: number = 0
): void {
  const barCount = Math.max(16, Math.min(256, settings.barCount || 120));
  const barRadius = settings.barRadius || 3;
  const centerY = y + height / 2;
  const scale = settings.heightScale || 1.0;
  const maxHalfHeight = (height / 2) * scale;
  const glow = settings.glowIntensity || 0.4;

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const gradientCol = settings.useCustomColors
    ? (settings.gradientColor || settings.primaryGradientEnd || theme.gradientColor)
    : (theme.gradientColor || theme.primaryGradientEnd || settings.gradientColor || primaryCol);
  const enableGradient = settings.enableGradient !== undefined ? settings.enableGradient : true;
  const colorMode: ColorRepresentationMode = settings.colorMode || 'bottom-to-top';
  const isAlternate = enableGradient && colorMode === 'alternate-bars';

  ctx.save();
  if (glow > 0) {
    ctx.shadowBlur = 10 * glow;
  }

  const avatarRadius = isProfileActive
    ? ((settings.profileImageSize || 130) / 2) *
      (settings.profileAudioReactiveScale ? 1 + (spectrum.bassEnergy || 0) * 0.08 : 1)
    : 0;
  const gap = Math.max(0, settings.profileWingGap ?? 16);

  // CASE A: Flanking Symmetrical Wings on both sides of the Profile Picture
  if (isProfileActive && settings.sideSymmetry === 'mirrored-flank') {
    const leftWingEnd = Math.max(x + 4, avatarX - avatarRadius - gap);
    const leftWingWidth = Math.max(4, leftWingEnd - x);
    const rightWingStart = Math.min(x + width - 4, avatarX + avatarRadius + gap);
    const rightWingWidth = Math.max(4, x + width - rightWingStart);

    const totalWingWidth = leftWingWidth + rightWingWidth;
    const nLeft = Math.max(6, Math.round((barCount * leftWingWidth) / totalWingWidth));
    const nRight = Math.max(6, barCount - nLeft);

    const slotLeft = leftWingWidth / nLeft;
    const barWLeft = Math.max(1, slotLeft * (settings.barWidthRatio || 0.7));
    const slotRight = rightWingWidth / nRight;
    const barWRight = Math.max(1, slotRight * (settings.barWidthRatio || 0.7));

    if (isAlternate) {
      const pathEven = new Path2D();
      const pathOdd = new Path2D();

      // Left Wing: bars from left edge towards avatar
      for (let i = 0; i < nLeft; i++) {
        const bx = x + i * slotLeft + (slotLeft - barWLeft) / 2;
        const joint = getWingBarJointFactor(i, nLeft, true, settings, isProfileActive);
        const freqFrac = (nLeft - 1 - i) / nLeft;
        const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
        const rawVal = spectrum.frequencies[freqIdx] || 0;
        const barHeight = rawVal * maxHalfHeight * joint;
        if (barHeight < 0.5) continue;

        const target = i % 2 === 0 ? pathEven : pathOdd;
        if (settings.symmetry === 'top-only') {
          roundRectPath(target, bx, centerY - barHeight * 2, barWLeft, barHeight * 2, barRadius);
        } else if (settings.symmetry === 'bottom-only') {
          roundRectPath(target, bx, centerY, barWLeft, barHeight * 2, barRadius);
        } else {
          roundRectPath(target, bx, centerY - barHeight, barWLeft, barHeight * 2, barRadius);
        }
      }

      // Right Wing: bars from avatar towards right edge
      for (let j = 0; j < nRight; j++) {
        const bx = rightWingStart + j * slotRight + (slotRight - barWRight) / 2;
        const joint = getWingBarJointFactor(j, nRight, false, settings, isProfileActive);
        const freqFrac = j / nRight;
        const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
        const rawVal = spectrum.frequencies[freqIdx] || 0;
        const barHeight = rawVal * maxHalfHeight * joint;
        if (barHeight < 0.5) continue;

        const target = j % 2 === 0 ? pathEven : pathOdd;
        if (settings.symmetry === 'top-only') {
          roundRectPath(target, bx, centerY - barHeight * 2, barWRight, barHeight * 2, barRadius);
        } else if (settings.symmetry === 'bottom-only') {
          roundRectPath(target, bx, centerY, barWRight, barHeight * 2, barRadius);
        } else {
          roundRectPath(target, bx, centerY - barHeight, barWRight, barHeight * 2, barRadius);
        }
      }

      ctx.fillStyle = primaryCol;
      if (glow > 0) ctx.shadowColor = primaryCol;
      ctx.fill(pathEven);

      ctx.fillStyle = gradientCol;
      if (glow > 0) ctx.shadowColor = gradientCol;
      ctx.fill(pathOdd);
    } else {
      ctx.beginPath();
      let maxActiveBarH = 10;

      // Left Wing
      for (let i = 0; i < nLeft; i++) {
        const bx = x + i * slotLeft + (slotLeft - barWLeft) / 2;
        const joint = getWingBarJointFactor(i, nLeft, true, settings, isProfileActive);
        const freqFrac = (nLeft - 1 - i) / nLeft;
        const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
        const rawVal = spectrum.frequencies[freqIdx] || 0;
        const barHeight = rawVal * maxHalfHeight * joint;
        if (barHeight > maxActiveBarH) maxActiveBarH = barHeight;
        if (barHeight < 0.5) continue;

        if (settings.symmetry === 'top-only') {
          roundRectPath(ctx, bx, centerY - barHeight * 2, barWLeft, barHeight * 2, barRadius);
        } else if (settings.symmetry === 'bottom-only') {
          roundRectPath(ctx, bx, centerY, barWLeft, barHeight * 2, barRadius);
        } else {
          roundRectPath(ctx, bx, centerY - barHeight, barWLeft, barHeight * 2, barRadius);
        }
      }

      // Right Wing
      for (let j = 0; j < nRight; j++) {
        const bx = rightWingStart + j * slotRight + (slotRight - barWRight) / 2;
        const joint = getWingBarJointFactor(j, nRight, false, settings, isProfileActive);
        const freqFrac = j / nRight;
        const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
        const rawVal = spectrum.frequencies[freqIdx] || 0;
        const barHeight = rawVal * maxHalfHeight * joint;
        if (barHeight > maxActiveBarH) maxActiveBarH = barHeight;
        if (barHeight < 0.5) continue;

        if (settings.symmetry === 'top-only') {
          roundRectPath(ctx, bx, centerY - barHeight * 2, barWRight, barHeight * 2, barRadius);
        } else if (settings.symmetry === 'bottom-only') {
          roundRectPath(ctx, bx, centerY, barWRight, barHeight * 2, barRadius);
        } else {
          roundRectPath(ctx, bx, centerY - barHeight, barWRight, barHeight * 2, barRadius);
        }
      }

      const isVerticalMode =
        colorMode === 'bottom-to-top' ||
        colorMode === 'top-to-bottom' ||
        colorMode === 'inside-out-vertical';

      const activeVertH = isVerticalMode
        ? Math.max(20, Math.min(maxHalfHeight, maxActiveBarH * (settings.symmetry === 'mirror' ? 1.05 : 2.05)))
        : maxHalfHeight;

      let gradY = centerY - activeVertH;
      let gradH = activeVertH * 2;
      if (settings.symmetry === 'top-only') {
        gradY = centerY - activeVertH;
        gradH = activeVertH;
      } else if (settings.symmetry === 'bottom-only') {
        gradY = centerY;
        gradH = activeVertH;
      }

      ctx.fillStyle = getVisualizerGradient(
        ctx,
        x,
        gradY,
        width,
        gradH,
        primaryCol,
        gradientCol,
        enableGradient,
        colorMode,
        avatarX,
        centerY
      );
      if (glow > 0) ctx.shadowColor = primaryCol;
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  // CASE B: Standard / Split Cutout Mode
  const slotWidth = width / barCount;
  const barWidth = Math.max(1, slotWidth * (settings.barWidthRatio || 0.7));
  const isCutout = isProfileActive && settings.sideSymmetry === 'split-cutout';
  const cutoutLeft = avatarX - avatarRadius - gap;
  const cutoutRight = avatarX + avatarRadius + gap;

  if (isAlternate) {
    const pathEven = new Path2D();
    const pathOdd = new Path2D();

    for (let i = 0; i < barCount; i++) {
      const bx = x + i * slotWidth + (slotWidth - barWidth) / 2;
      if (isCutout && bx + barWidth >= cutoutLeft && bx <= cutoutRight) {
        continue;
      }

      const joint = getContinuousJointFactor(
        bx,
        barWidth,
        x,
        width,
        avatarX,
        avatarRadius,
        gap,
        settings,
        isProfileActive
      );
      const freqIdx = Math.floor((i / barCount) * spectrum.frequencies.length);
      const rawVal = spectrum.frequencies[freqIdx] || 0;
      const barHeight = rawVal * maxHalfHeight * joint;
      if (barHeight < 0.5) continue;

      const target = i % 2 === 0 ? pathEven : pathOdd;
      if (settings.symmetry === 'top-only') {
        roundRectPath(target, bx, centerY - barHeight * 2, barWidth, barHeight * 2, barRadius);
      } else if (settings.symmetry === 'bottom-only') {
        roundRectPath(target, bx, centerY, barWidth, barHeight * 2, barRadius);
      } else {
        roundRectPath(target, bx, centerY - barHeight, barWidth, barHeight * 2, barRadius);
      }
    }

    ctx.fillStyle = primaryCol;
    if (glow > 0) ctx.shadowColor = primaryCol;
    ctx.fill(pathEven);

    ctx.fillStyle = gradientCol;
    if (glow > 0) ctx.shadowColor = gradientCol;
    ctx.fill(pathOdd);
  } else {
    ctx.beginPath();
    let maxActiveBarH = 10;

    for (let i = 0; i < barCount; i++) {
      const bx = x + i * slotWidth + (slotWidth - barWidth) / 2;
      if (isCutout && bx + barWidth >= cutoutLeft && bx <= cutoutRight) {
        continue;
      }

      const joint = getContinuousJointFactor(
        bx,
        barWidth,
        x,
        width,
        avatarX,
        avatarRadius,
        gap,
        settings,
        isProfileActive
      );
      const freqIdx = Math.floor((i / barCount) * spectrum.frequencies.length);
      const rawVal = spectrum.frequencies[freqIdx] || 0;
      const barHeight = rawVal * maxHalfHeight * joint;
      if (barHeight > maxActiveBarH) maxActiveBarH = barHeight;
      if (barHeight < 0.5) continue;

      if (settings.symmetry === 'top-only') {
        roundRectPath(ctx, bx, centerY - barHeight * 2, barWidth, barHeight * 2, barRadius);
      } else if (settings.symmetry === 'bottom-only') {
        roundRectPath(ctx, bx, centerY, barWidth, barHeight * 2, barRadius);
      } else {
        roundRectPath(ctx, bx, centerY - barHeight, barWidth, barHeight * 2, barRadius);
      }
    }

    const isVerticalMode =
      colorMode === 'bottom-to-top' ||
      colorMode === 'top-to-bottom' ||
      colorMode === 'inside-out-vertical';

    const activeVertH = isVerticalMode
      ? Math.max(20, Math.min(maxHalfHeight, maxActiveBarH * (settings.symmetry === 'mirror' ? 1.05 : 2.05)))
      : maxHalfHeight;

    let gradY = centerY - activeVertH;
    let gradH = activeVertH * 2;
    if (settings.symmetry === 'top-only') {
      gradY = centerY - activeVertH;
      gradH = activeVertH;
    } else if (settings.symmetry === 'bottom-only') {
      gradY = centerY;
      gradH = activeVertH;
    }

    ctx.fillStyle = getVisualizerGradient(
      ctx,
      x,
      gradY,
      width,
      gradH,
      primaryCol,
      gradientCol,
      enableGradient,
      colorMode,
      avatarX,
      centerY
    );
    if (glow > 0) ctx.shadowColor = primaryCol;
    ctx.fill();
  }

  ctx.restore();
}

// 2. Bars Upward (Batched Paths & Peak Caps with Flanking Symmetrical Wings)
function renderBarsUp(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  spectrum: SpectrumData,
  settings: VisualizerSettings,
  theme: ColorTheme,
  _time: number,
  _duration: number,
  isProfileActive: boolean = false,
  avatarX: number = 0,
  _avatarY: number = 0
): void {
  const barCount = Math.max(16, Math.min(256, settings.barCount || 100));
  const barRadius = settings.barRadius || 4;
  const bottomY = y + height - 10;
  const maxHeight = (height - 30) * (settings.heightScale || 1.0);
  const glow = settings.glowIntensity || 0.4;

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const gradientCol = settings.useCustomColors
    ? (settings.gradientColor || settings.primaryGradientEnd || theme.gradientColor)
    : (theme.gradientColor || theme.primaryGradientEnd || settings.gradientColor || primaryCol);
  const enableGradient = settings.enableGradient !== undefined ? settings.enableGradient : true;
  const colorMode: ColorRepresentationMode = settings.colorMode || 'bottom-to-top';
  const isAlternate = enableGradient && colorMode === 'alternate-bars';

  ctx.save();
  if (glow > 0) {
    ctx.shadowBlur = 10 * glow;
  }

  const avatarRadius = isProfileActive
    ? ((settings.profileImageSize || 130) / 2) *
      (settings.profileAudioReactiveScale ? 1 + (spectrum.bassEnergy || 0) * 0.08 : 1)
    : 0;
  const gap = Math.max(0, settings.profileWingGap ?? 16);

  // CASE A: Flanking Symmetrical Wings for Bars Up
  if (isProfileActive && settings.sideSymmetry === 'mirrored-flank') {
    const leftWingEnd = Math.max(x + 4, avatarX - avatarRadius - gap);
    const leftWingWidth = Math.max(4, leftWingEnd - x);
    const rightWingStart = Math.min(x + width - 4, avatarX + avatarRadius + gap);
    const rightWingWidth = Math.max(4, x + width - rightWingStart);

    const totalWingWidth = leftWingWidth + rightWingWidth;
    const nLeft = Math.max(6, Math.round((barCount * leftWingWidth) / totalWingWidth));
    const nRight = Math.max(6, barCount - nLeft);

    const slotLeft = leftWingWidth / nLeft;
    const barWLeft = Math.max(1, slotLeft * (settings.barWidthRatio || 0.75));
    const slotRight = rightWingWidth / nRight;
    const barWRight = Math.max(1, slotRight * (settings.barWidthRatio || 0.75));
    const capH = Math.max(2, barRadius);

    if (isAlternate) {
      const pathEven = new Path2D();
      const pathOdd = new Path2D();

      for (let i = 0; i < nLeft; i++) {
        const bx = x + i * slotLeft + (slotLeft - barWLeft) / 2;
        const joint = getWingBarJointFactor(i, nLeft, true, settings, isProfileActive);
        const freqFrac = (nLeft - 1 - i) / nLeft;
        const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
        const val = spectrum.frequencies[freqIdx] || 0;
        const barH = val * maxHeight * joint;
        if (barH < 0.5) continue;
        roundRectPath(i % 2 === 0 ? pathEven : pathOdd, bx, bottomY - barH, barWLeft, barH, barRadius);
      }

      for (let j = 0; j < nRight; j++) {
        const bx = rightWingStart + j * slotRight + (slotRight - barWRight) / 2;
        const joint = getWingBarJointFactor(j, nRight, false, settings, isProfileActive);
        const freqFrac = j / nRight;
        const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
        const val = spectrum.frequencies[freqIdx] || 0;
        const barH = val * maxHeight * joint;
        if (barH < 0.5) continue;
        roundRectPath(j % 2 === 0 ? pathEven : pathOdd, bx, bottomY - barH, barWRight, barH, barRadius);
      }

      ctx.fillStyle = primaryCol;
      if (glow > 0) ctx.shadowColor = primaryCol;
      ctx.fill(pathEven);

      ctx.fillStyle = gradientCol;
      if (glow > 0) ctx.shadowColor = gradientCol;
      ctx.fill(pathOdd);
    } else {
      ctx.beginPath();
      let maxActiveBarH = 10;

      for (let i = 0; i < nLeft; i++) {
        const bx = x + i * slotLeft + (slotLeft - barWLeft) / 2;
        const joint = getWingBarJointFactor(i, nLeft, true, settings, isProfileActive);
        const freqFrac = (nLeft - 1 - i) / nLeft;
        const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
        const rawVal = spectrum.frequencies[freqIdx] || 0;
        const barH = rawVal * maxHeight * joint;
        if (barH > maxActiveBarH) maxActiveBarH = barH;
        if (barH < 0.5) continue;
        roundRectPath(ctx, bx, bottomY - barH, barWLeft, barH, barRadius);
      }
      for (let j = 0; j < nRight; j++) {
        const bx = rightWingStart + j * slotRight + (slotRight - barWRight) / 2;
        const joint = getWingBarJointFactor(j, nRight, false, settings, isProfileActive);
        const freqFrac = j / nRight;
        const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
        const rawVal = spectrum.frequencies[freqIdx] || 0;
        const barH = rawVal * maxHeight * joint;
        if (barH > maxActiveBarH) maxActiveBarH = barH;
        if (barH < 0.5) continue;
        roundRectPath(ctx, bx, bottomY - barH, barWRight, barH, barRadius);
      }

      const isVerticalMode =
        colorMode === 'bottom-to-top' ||
        colorMode === 'top-to-bottom' ||
        colorMode === 'inside-out-vertical';

      const activeVertH = isVerticalMode
        ? Math.max(20, Math.min(maxHeight, maxActiveBarH * 1.05))
        : maxHeight;

      ctx.fillStyle = getVisualizerGradient(
        ctx,
        x,
        bottomY - activeVertH,
        width,
        activeVertH,
        primaryCol,
        gradientCol,
        enableGradient,
        colorMode,
        avatarX,
        bottomY - activeVertH / 2
      );
      if (glow > 0) ctx.shadowColor = primaryCol;
      ctx.fill();
    }

    // Peak Caps
    ctx.beginPath();
    for (let i = 0; i < nLeft; i++) {
      const bx = x + i * slotLeft + (slotLeft - barWLeft) / 2;
      const joint = getWingBarJointFactor(i, nLeft, true, settings, isProfileActive);
      if (joint < 0.08) continue;
      const freqFrac = (nLeft - 1 - i) / nLeft;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const val = spectrum.frequencies[freqIdx] || 0;
      const barH = Math.max(1, val * maxHeight * joint);
      const capY = Math.max(y, bottomY - barH - capH - 3);
      ctx.rect(bx, capY, barWLeft, capH);
    }
    for (let j = 0; j < nRight; j++) {
      const bx = rightWingStart + j * slotRight + (slotRight - barWRight) / 2;
      const joint = getWingBarJointFactor(j, nRight, false, settings, isProfileActive);
      if (joint < 0.08) continue;
      const freqFrac = j / nRight;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const val = spectrum.frequencies[freqIdx] || 0;
      const barH = Math.max(1, val * maxHeight * joint);
      const capY = Math.max(y, bottomY - barH - capH - 3);
      ctx.rect(bx, capY, barWRight, capH);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
    return;
  }

  // CASE B: Standard / Split Cutout
  const slotWidth = width / barCount;
  const barWidth = Math.max(1, slotWidth * (settings.barWidthRatio || 0.75));
  const isCutout = isProfileActive && settings.sideSymmetry === 'split-cutout';
  const cutoutLeft = avatarX - avatarRadius - gap;
  const cutoutRight = avatarX + avatarRadius + gap;

  if (isAlternate) {
    const pathEven = new Path2D();
    const pathOdd = new Path2D();

    for (let i = 0; i < barCount; i++) {
      const bx = x + i * slotWidth + (slotWidth - barWidth) / 2;
      if (isCutout && bx + barWidth >= cutoutLeft && bx <= cutoutRight) continue;

      const joint = getContinuousJointFactor(
        bx,
        barWidth,
        x,
        width,
        avatarX,
        avatarRadius,
        gap,
        settings,
        isProfileActive
      );
      const freqIdx = Math.floor((i / barCount) * spectrum.frequencies.length);
      const val = spectrum.frequencies[freqIdx] || 0;
      const barH = val * maxHeight * joint;
      if (barH < 0.5) continue;
      roundRectPath(i % 2 === 0 ? pathEven : pathOdd, bx, bottomY - barH, barWidth, barH, barRadius);
    }

    ctx.fillStyle = primaryCol;
    if (glow > 0) ctx.shadowColor = primaryCol;
    ctx.fill(pathEven);

    ctx.fillStyle = gradientCol;
    if (glow > 0) ctx.shadowColor = gradientCol;
    ctx.fill(pathOdd);
  } else {
    ctx.beginPath();
    let maxActiveBarH = 10;

    for (let i = 0; i < barCount; i++) {
      const bx = x + i * slotWidth + (slotWidth - barWidth) / 2;
      if (isCutout && bx + barWidth >= cutoutLeft && bx <= cutoutRight) continue;

      const joint = getContinuousJointFactor(
        bx,
        barWidth,
        x,
        width,
        avatarX,
        avatarRadius,
        gap,
        settings,
        isProfileActive
      );
      const freqIdx = Math.floor((i / barCount) * spectrum.frequencies.length);
      const val = spectrum.frequencies[freqIdx] || 0;
      const barH = val * maxHeight * joint;
      if (barH > maxActiveBarH) maxActiveBarH = barH;
      if (barH < 0.5) continue;
      roundRectPath(ctx, bx, bottomY - barH, barWidth, barH, barRadius);
    }

    const isVerticalMode =
      colorMode === 'bottom-to-top' ||
      colorMode === 'top-to-bottom' ||
      colorMode === 'inside-out-vertical';

    const activeVertH = isVerticalMode
      ? Math.max(20, Math.min(maxHeight, maxActiveBarH * 1.05))
      : maxHeight;

    ctx.fillStyle = getVisualizerGradient(
      ctx,
      x,
      bottomY - activeVertH,
      width,
      activeVertH,
      primaryCol,
      gradientCol,
      enableGradient,
      colorMode,
      avatarX,
      bottomY - activeVertH / 2
    );
    if (glow > 0) ctx.shadowColor = primaryCol;
    ctx.fill();
  }

  // Pass 3: Peak Caps
  ctx.beginPath();
  const capH = Math.max(2, barRadius);
  for (let i = 0; i < barCount; i++) {
    const bx = x + i * slotWidth + (slotWidth - barWidth) / 2;
    if (isCutout && bx + barWidth >= cutoutLeft && bx <= cutoutRight) continue;

    const joint = getContinuousJointFactor(
      bx,
      barWidth,
      x,
      width,
      avatarX,
      avatarRadius,
      gap,
      settings,
      isProfileActive
    );
    if (joint < 0.08) continue;
    const freqIdx = Math.floor((i / barCount) * spectrum.frequencies.length);
    const val = spectrum.frequencies[freqIdx] || 0;
    const barH = Math.max(1, val * maxHeight * joint);
    const capY = Math.max(y, bottomY - barH - capH - 3);
    ctx.rect(bx, capY, barWidth, capH);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}

// 3. Smooth Glowing Spline Wave
function renderSmoothWave(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  spectrum: SpectrumData,
  settings: VisualizerSettings,
  theme: ColorTheme,
  time: number,
  _duration: number,
  isProfileActive: boolean = false,
  avatarX: number = 0,
  _avatarY: number = 0
): void {
  const centerY = y + height / 2;
  const maxAmp = height * 0.42 * (settings.heightScale || 1.0);
  const numPoints = Math.max(32, Math.min(128, settings.barCount || 80));
  const step = width / (numPoints - 1);
  const glow = settings.glowIntensity || 0.4;
  const avatarRadius = isProfileActive
    ? ((settings.profileImageSize || 130) / 2) *
      (settings.profileAudioReactiveScale ? 1 + (spectrum.bassEnergy || 0) * 0.08 : 1)
    : 0;
  const gap = Math.max(0, settings.profileWingGap ?? 16);

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const gradientCol = settings.useCustomColors
    ? (settings.gradientColor || settings.primaryGradientEnd || theme.gradientColor)
    : (theme.gradientColor || theme.primaryGradientEnd || settings.gradientColor || primaryCol);
  const enableGradient = settings.enableGradient !== undefined ? settings.enableGradient : true;
  const colorMode: ColorRepresentationMode = settings.colorMode || 'bottom-to-top';

  ctx.save();

  // Area Fill under wave
  ctx.beginPath();
  ctx.moveTo(x, centerY);
  for (let i = 0; i < numPoints; i++) {
    const px = x + i * step;
    const joint = getContinuousJointFactor(
      px,
      0,
      x,
      width,
      avatarX,
      avatarRadius,
      gap,
      settings,
      isProfileActive
    );
    const freqIdx = Math.floor((i / numPoints) * spectrum.frequencies.length);
    const val = spectrum.frequencies[freqIdx] || 0;
    const py = centerY - val * maxAmp * joint;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x + width, centerY);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, centerY - maxAmp, 0, centerY);
  areaGrad.addColorStop(0, hexToRgba(primaryCol, 0.25));
  areaGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Draw Primary Wave Lines
  const waveGrad = getVisualizerGradient(
    ctx,
    x,
    centerY - maxAmp,
    width,
    maxAmp * 2,
    primaryCol,
    gradientCol,
    enableGradient,
    colorMode,
    avatarX,
    centerY
  );
  ctx.strokeStyle = waveGrad;

  if (glow > 0) {
    ctx.shadowBlur = 10 * glow;
    ctx.shadowColor = primaryCol;
  }

  ctx.beginPath();
  ctx.lineWidth = 3;
  for (let i = 0; i < numPoints; i++) {
    const px = x + i * step;
    const joint = getContinuousJointFactor(
      px,
      0,
      x,
      width,
      avatarX,
      avatarRadius,
      gap,
      settings,
      isProfileActive
    );
    const freqIdx = Math.floor((i / numPoints) * spectrum.frequencies.length);
    const val = spectrum.frequencies[freqIdx] || 0;
    const py = centerY - val * maxAmp * Math.sin((i / numPoints) * Math.PI + time * 2) * joint;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      const prevPx = x + (i - 1) * step;
      const cpx = (prevPx + px) / 2;
      ctx.quadraticCurveTo(prevPx, centerY, cpx, py);
    }
  }
  ctx.stroke();

  ctx.restore();
}

// 0. Profile Image / Avatar Renderer
function renderProfileImage(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  imgX: number,
  imgY: number,
  size: number,
  shape: ProfileImageShape,
  borderWidth: number,
  borderColor: string,
  glow: boolean,
  reactiveScale: boolean,
  spectrum: SpectrumData,
  theme: ColorTheme,
  image?: HTMLImageElement | ImageBitmap | null,
  resScale: number = 1
): void {
  const bass = spectrum.bassEnergy || 0;
  const pulseScale = reactiveScale ? 1 + bass * 0.08 : 1;
  const currentSize = Math.max(30 * resScale, size * pulseScale);
  const r = currentSize / 2;

  ctx.save();

  // Outer neon ripple deprecated for a clean, professional finish
  // 1. Base Drop Shadow
  if (glow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 18 * resScale;
    ctx.shadowOffsetY = 6 * resScale;
  }

  // 3. Clipped Avatar Image / Placeholder
  ctx.save();
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(imgX, imgY, r, 0, Math.PI * 2);
  } else if (shape === 'rounded') {
    roundRectPath(ctx, imgX - r, imgY - r, currentSize, currentSize, Math.min(28 * resScale, currentSize * 0.22));
  } else {
    ctx.rect(imgX - r, imgY - r, currentSize, currentSize);
  }
  ctx.clip();

  // Dark background behind image
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(imgX - r, imgY - r, currentSize, currentSize);

  if (image) {
    // Draw user image with object-fit: cover
    const imgAspect = image.width / (image.height || 1);
    let sWidth = image.width;
    let sHeight = image.height;
    let sx = 0;
    let sy = 0;
    if (imgAspect > 1) {
      sWidth = image.height;
      sx = (image.width - sWidth) / 2;
    } else {
      sHeight = image.width;
      sy = (image.height - sHeight) / 2;
    }
    ctx.drawImage(image, sx, sy, sWidth, sHeight, imgX - r, imgY - r, currentSize, currentSize);
  } else {
    // Elegant Avatar Placeholder with Theme Gradient & Waveform Graphic
    const avatarGrad = ctx.createLinearGradient(imgX - r, imgY - r, imgX + r, imgY + r);
    avatarGrad.addColorStop(0, theme.primaryColor);
    avatarGrad.addColorStop(1, theme.primaryGradientEnd || theme.accentColor || '#38bdf8');
    ctx.fillStyle = avatarGrad;
    ctx.fillRect(imgX - r, imgY - r, currentSize, currentSize);

    // Subtle dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(imgX - r, imgY - r, currentSize, currentSize);

    // Decorative Audio Bars inside Avatar Placeholder
    const innerBarW = Math.max(3 * resScale, currentSize * 0.07);
    const innerBars = 5;
    const innerTotalW = innerBars * innerBarW * 1.8;
    const startInnerX = imgX - innerTotalW / 2;
    ctx.fillStyle = '#ffffff';
    for (let bi = 0; bi < innerBars; bi++) {
      const bhFactor = [0.4, 0.8, 1.0, 0.7, 0.45][bi];
      const bh = Math.max(6 * resScale, currentSize * 0.38 * bhFactor * (0.8 + bass * 0.4));
      const bx = startInnerX + bi * (innerBarW * 1.8);
      roundRectPath(ctx, bx, imgY - bh / 2, innerBarW, bh, innerBarW / 2);
    }
    ctx.fill();
  }
  ctx.restore();

  // 4. Border Stroke
  if (borderWidth > 0) {
    ctx.save();
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(imgX, imgY, r, 0, Math.PI * 2);
    } else if (shape === 'rounded') {
      roundRectPath(ctx, imgX - r, imgY - r, currentSize, currentSize, Math.min(28 * resScale, currentSize * 0.22));
    } else {
      ctx.rect(imgX - r, imgY - r, currentSize, currentSize);
    }

    const finalBorderColor = borderColor || '#ffffff';
    ctx.strokeStyle = finalBorderColor;
    ctx.lineWidth = borderWidth;
    if (glow) {
      ctx.shadowColor = finalBorderColor;
      ctx.shadowBlur = 10 * resScale;
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// 4. Radial Circular Halo Visualizer (Batched Spokes)
function renderRadial(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  cx: number,
  cy: number,
  maxRadius: number,
  spectrum: SpectrumData,
  settings: VisualizerSettings,
  theme: ColorTheme,
  time: number
): void {
  const barCount = Math.max(36, Math.min(128, settings.barCount || 72));
  const innerRadius = maxRadius * (settings.radialInnerRadius || 0.38);
  const maxBarLength = (maxRadius - innerRadius) * (settings.heightScale || 1.0);
  const rotation = ((settings.radialRotation || 0) * Math.PI) / 180 + time * 0.2;
  const glow = settings.glowIntensity || 0.4;

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const gradientCol = settings.useCustomColors
    ? (settings.gradientColor || settings.primaryGradientEnd || theme.gradientColor)
    : (theme.gradientColor || theme.primaryGradientEnd || settings.gradientColor || primaryCol);
  const enableGradient = settings.enableGradient !== undefined ? settings.enableGradient : true;
  const colorMode: ColorRepresentationMode = settings.colorMode || 'bottom-to-top';
  const isAlternate = enableGradient && colorMode === 'alternate-bars';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  if (glow > 0) {
    ctx.shadowBlur = 12 * glow;
    ctx.shadowColor = primaryCol;
  }

  // Inner pulsing circle
  const corePulse = innerRadius * (1 + spectrum.bassEnergy * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, corePulse * 0.85, 0, Math.PI * 2);
  const coreGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, corePulse);
  coreGrad.addColorStop(0, hexToRgba(enableGradient ? gradientCol : primaryCol, 0.4));
  coreGrad.addColorStop(0.8, hexToRgba(primaryCol, 0.15));
  coreGrad.addColorStop(1, hexToRgba(primaryCol, 0.8));
  ctx.fillStyle = coreGrad;
  ctx.fill();
  ctx.strokeStyle = primaryCol;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Radiating Spikes (Batched Spokes)
  const angleStep = (Math.PI * 2) / barCount;
  const barThickness = Math.max(2, ((Math.PI * 2 * innerRadius) / barCount) * 0.65);

  if (isAlternate) {
    const pathEven = new Path2D();
    const pathOdd = new Path2D();

    for (let i = 0; i < barCount; i++) {
      const half = barCount / 2;
      const normalizedIdx = i < half ? i / half : (barCount - i) / half;
      const freqIdx = Math.floor(normalizedIdx * spectrum.frequencies.length);
      const val = spectrum.frequencies[freqIdx] || 0;
      const barLen = Math.max(4, val * maxBarLength);

      const angle = i * angleStep;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const x1 = cosA * corePulse;
      const y1 = sinA * corePulse;
      const x2 = cosA * (corePulse + barLen);
      const y2 = sinA * (corePulse + barLen);

      const target = i % 2 === 0 ? pathEven : pathOdd;
      target.moveTo(x1, y1);
      target.lineTo(x2, y2);
    }

    ctx.lineWidth = barThickness;
    ctx.lineCap = 'round';
    ctx.strokeStyle = primaryCol;
    ctx.stroke(pathEven);
    ctx.strokeStyle = gradientCol;
    ctx.stroke(pathOdd);
  } else {
    ctx.beginPath();
    for (let i = 0; i < barCount; i++) {
      const half = barCount / 2;
      const normalizedIdx = i < half ? i / half : (barCount - i) / half;
      const freqIdx = Math.floor(normalizedIdx * spectrum.frequencies.length);
      const val = spectrum.frequencies[freqIdx] || 0;
      const barLen = Math.max(4, val * maxBarLength);

      const angle = i * angleStep;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const x1 = cosA * corePulse;
      const y1 = sinA * corePulse;
      const x2 = cosA * (corePulse + barLen);
      const y2 = sinA * (corePulse + barLen);

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }

    if (enableGradient) {
      if (colorMode === 'bottom-to-top') {
        const spikeGrad = ctx.createLinearGradient(0, maxRadius, 0, -maxRadius);
        spikeGrad.addColorStop(0, primaryCol);
        spikeGrad.addColorStop(1, gradientCol);
        ctx.strokeStyle = spikeGrad;
      } else if (colorMode === 'top-to-bottom') {
        const spikeGrad = ctx.createLinearGradient(0, -maxRadius, 0, maxRadius);
        spikeGrad.addColorStop(0, primaryCol);
        spikeGrad.addColorStop(1, gradientCol);
        ctx.strokeStyle = spikeGrad;
      } else if (colorMode === 'left-to-right') {
        const spikeGrad = ctx.createLinearGradient(-maxRadius, 0, maxRadius, 0);
        spikeGrad.addColorStop(0, primaryCol);
        spikeGrad.addColorStop(1, gradientCol);
        ctx.strokeStyle = spikeGrad;
      } else if (colorMode === 'right-to-left') {
        const spikeGrad = ctx.createLinearGradient(maxRadius, 0, -maxRadius, 0);
        spikeGrad.addColorStop(0, primaryCol);
        spikeGrad.addColorStop(1, gradientCol);
        ctx.strokeStyle = spikeGrad;
      } else if (colorMode === 'inside-out-horizontal') {
        const spikeGrad = ctx.createLinearGradient(-maxRadius, 0, maxRadius, 0);
        spikeGrad.addColorStop(0, gradientCol);
        spikeGrad.addColorStop(0.5, primaryCol);
        spikeGrad.addColorStop(1, gradientCol);
        ctx.strokeStyle = spikeGrad;
      } else if (colorMode === 'inside-out-vertical') {
        const spikeGrad = ctx.createLinearGradient(0, -maxRadius, 0, maxRadius);
        spikeGrad.addColorStop(0, gradientCol);
        spikeGrad.addColorStop(0.5, primaryCol);
        spikeGrad.addColorStop(1, gradientCol);
        ctx.strokeStyle = spikeGrad;
      } else {
        // 'inside-out-circular' or default: radial bloom from inner ring to spoke tips
        const spikeGrad = ctx.createRadialGradient(0, 0, corePulse, 0, 0, maxRadius);
        spikeGrad.addColorStop(0, primaryCol);
        spikeGrad.addColorStop(1, gradientCol);
        ctx.strokeStyle = spikeGrad;
      }
    } else {
      ctx.strokeStyle = primaryCol;
    }
    ctx.lineWidth = barThickness;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.restore();
}

// 5. Digital Matrix / Cyber Equalizer (Batched Color Buckets)
function renderDigitalMatrix(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  spectrum: SpectrumData,
  settings: VisualizerSettings,
  theme: ColorTheme,
  isProfileActive: boolean = false,
  avatarX: number = 0,
  _avatarY: number = 0
): void {
  const cols = Math.max(16, Math.min(64, settings.barCount || 40));
  const rows = 20;
  const slotW = width / cols;
  const barW = Math.max(2, slotW * 0.75);
  const blockGap = 2.5;
  const blockH = (height - (rows - 1) * blockGap) / rows;
  const glow = settings.glowIntensity || 0.4;
  const scale = settings.heightScale || 1.0;

  const avatarRadius = isProfileActive
    ? ((settings.profileImageSize || 130) / 2) *
      (settings.profileAudioReactiveScale ? 1 + (spectrum.bassEnergy || 0) * 0.08 : 1)
    : 0;
  const gap = Math.max(0, settings.profileWingGap ?? 16);
  const isCutout = isProfileActive && settings.sideSymmetry === 'split-cutout';
  const cutoutLeft = avatarX - avatarRadius - gap;
  const cutoutRight = avatarX + avatarRadius + gap;

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const gradientCol = settings.useCustomColors
    ? (settings.gradientColor || settings.primaryGradientEnd || theme.gradientColor)
    : (theme.gradientColor || theme.primaryGradientEnd || settings.gradientColor || primaryCol);
  const enableGradient = settings.enableGradient !== undefined ? settings.enableGradient : true;
  const colorMode: ColorRepresentationMode = settings.colorMode || 'bottom-to-top';
  const isAlternate = enableGradient && colorMode === 'alternate-bars';

  ctx.save();
  if (glow > 0) {
    ctx.shadowBlur = 8 * glow;
    ctx.shadowColor = primaryCol;
  }

  // Ghost blocks background
  ctx.beginPath();
  for (let c = 0; c < cols; c++) {
    const bx = x + c * slotW + (slotW - barW) / 2;
    if (isCutout && bx + barW >= cutoutLeft && bx <= cutoutRight) continue;
    for (let r = 0; r < rows; r++) {
      const by = y + height - (r + 1) * (blockH + blockGap);
      ctx.rect(bx, by, barW, blockH);
    }
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fill();

  // Active blocks
  if (isAlternate) {
    const pathEven = new Path2D();
    const pathOdd = new Path2D();

    for (let c = 0; c < cols; c++) {
      const bx = x + c * slotW + (slotW - barW) / 2;
      if (isCutout && bx + barW >= cutoutLeft && bx <= cutoutRight) continue;

      const joint = getContinuousJointFactor(
        bx,
        barW,
        x,
        width,
        avatarX,
        avatarRadius,
        gap,
        settings,
        isProfileActive
      );
      const freqIdx = Math.floor((c / cols) * spectrum.frequencies.length);
      const val = spectrum.frequencies[freqIdx] || 0;
      const activeBlocks = Math.min(rows, Math.round(val * rows * scale * joint));
      const target = c % 2 === 0 ? pathEven : pathOdd;

      for (let r = 0; r < activeBlocks; r++) {
        const by = y + height - (r + 1) * (blockH + blockGap);
        target.rect(bx, by, barW, blockH);
      }
    }

    ctx.fillStyle = primaryCol;
    ctx.fill(pathEven);

    ctx.fillStyle = gradientCol;
    ctx.fill(pathOdd);
  } else {
    ctx.beginPath();
    let maxActiveBlocks = 1;

    for (let c = 0; c < cols; c++) {
      const bx = x + c * slotW + (slotW - barW) / 2;
      if (isCutout && bx + barW >= cutoutLeft && bx <= cutoutRight) continue;

      const joint = getContinuousJointFactor(
        bx,
        barW,
        x,
        width,
        avatarX,
        avatarRadius,
        gap,
        settings,
        isProfileActive
      );
      const freqIdx = Math.floor((c / cols) * spectrum.frequencies.length);
      const val = spectrum.frequencies[freqIdx] || 0;
      const activeBlocks = Math.min(rows, Math.round(val * rows * scale * joint));
      if (activeBlocks > maxActiveBlocks) maxActiveBlocks = activeBlocks;

      for (let r = 0; r < activeBlocks; r++) {
        const by = y + height - (r + 1) * (blockH + blockGap);
        ctx.rect(bx, by, barW, blockH);
      }
    }

    const isVerticalMode =
      colorMode === 'bottom-to-top' ||
      colorMode === 'top-to-bottom' ||
      colorMode === 'inside-out-vertical';

    const activeHeight = isVerticalMode
      ? Math.max(20, maxActiveBlocks * (blockH + blockGap))
      : height;

    ctx.fillStyle = getVisualizerGradient(
      ctx,
      x,
      y + height - activeHeight,
      width,
      activeHeight,
      primaryCol,
      gradientCol,
      enableGradient,
      colorMode,
      avatarX,
      y + height / 2
    );
    ctx.fill();
  }

  ctx.restore();
}

// 6. Spine / Neural Waveform (Batched Lines & Nodes)
function renderSpine(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  spectrum: SpectrumData,
  settings: VisualizerSettings,
  theme: ColorTheme,
  time: number,
  isProfileActive: boolean = false,
  avatarX: number = 0,
  _avatarY: number = 0
): void {
  const centerY = y + height / 2;
  const nodeCount = Math.max(16, Math.min(64, settings.barCount || 40));
  const step = width / nodeCount;
  const maxAmp = height * 0.45 * (settings.heightScale || 1.0);
  const glow = settings.glowIntensity || 0.4;

  const avatarRadius = isProfileActive
    ? ((settings.profileImageSize || 130) / 2) *
      (settings.profileAudioReactiveScale ? 1 + (spectrum.bassEnergy || 0) * 0.08 : 1)
    : 0;
  const gap = Math.max(0, settings.profileWingGap ?? 16);

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const gradientCol = settings.useCustomColors
    ? (settings.gradientColor || settings.primaryGradientEnd || theme.gradientColor)
    : (theme.gradientColor || theme.primaryGradientEnd || settings.gradientColor || primaryCol);
  const enableGradient = settings.enableGradient !== undefined ? settings.enableGradient : true;
  const colorMode: ColorRepresentationMode = settings.colorMode || 'bottom-to-top';

  ctx.save();
  if (glow > 0) {
    ctx.shadowBlur = 10 * glow;
    ctx.shadowColor = primaryCol;
  }

  // Draw spine wave
  ctx.beginPath();
  ctx.strokeStyle = hexToRgba(primaryCol, 0.6);
  ctx.lineWidth = 2;

  const nodePositions: { nx: number; ny: number; r: number; joint: number }[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const nx = x + i * step + step / 2;
    const joint = getContinuousJointFactor(
      nx,
      0,
      x,
      width,
      avatarX,
      avatarRadius,
      gap,
      settings,
      isProfileActive
    );
    const freqIdx = Math.floor((i / nodeCount) * spectrum.frequencies.length);
    const val = spectrum.frequencies[freqIdx] || 0;
    const offset = Math.sin(i * 0.4 + time * 3) * val * maxAmp * joint;
    const ny = centerY + offset;
    const r = Math.max(2, val * 10 * joint);

    nodePositions.push({ nx, ny, r, joint });
    if (i === 0) ctx.moveTo(nx, ny);
    else ctx.lineTo(nx, ny);
  }
  ctx.stroke();

  // Batched Ribs
  ctx.beginPath();
  for (const n of nodePositions) {
    if (n.joint < 0.05) continue;
    ctx.moveTo(n.nx, centerY);
    ctx.lineTo(n.nx, n.ny);
  }
  ctx.strokeStyle = hexToRgba(enableGradient ? gradientCol : primaryCol, 0.4);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Batched Nodes
  if (enableGradient && colorMode === 'alternate-bars') {
    const pathEven = new Path2D();
    const pathOdd = new Path2D();
    nodePositions.forEach((n, idx) => {
      if (n.joint < 0.05) return;
      const target = idx % 2 === 0 ? pathEven : pathOdd;
      target.moveTo(n.nx + n.r, n.ny);
      target.arc(n.nx, n.ny, n.r, 0, Math.PI * 2);
    });
    ctx.fillStyle = primaryCol;
    ctx.fill(pathEven);
    ctx.fillStyle = gradientCol;
    ctx.fill(pathOdd);
  } else {
    ctx.beginPath();
    for (const n of nodePositions) {
      if (n.joint < 0.05) continue;
      ctx.moveTo(n.nx + n.r, n.ny);
      ctx.arc(n.nx, n.ny, n.r, 0, Math.PI * 2);
    }
    ctx.fillStyle = getVisualizerGradient(
      ctx,
      x,
      centerY - maxAmp,
      width,
      maxAmp * 2,
      primaryCol,
      gradientCol,
      enableGradient,
      colorMode,
      avatarX,
      centerY
    );
    ctx.fill();
  }

  ctx.restore();
}

// 7. Multi-Band Equalizer Bands
function renderSpectrumBands(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  spectrum: SpectrumData,
  settings: VisualizerSettings,
  theme: ColorTheme
): void {
  const bands = [
    { label: '32Hz', val: spectrum.bassEnergy * 1.1 },
    { label: '64Hz', val: spectrum.frequencies[2] || 0 },
    { label: '125Hz', val: spectrum.frequencies[6] || 0 },
    { label: '250Hz', val: spectrum.frequencies[12] || 0 },
    { label: '500Hz', val: spectrum.midEnergy * 0.9 },
    { label: '1kHz', val: spectrum.frequencies[24] || 0 },
    { label: '2kHz', val: spectrum.frequencies[36] || 0 },
    { label: '4kHz', val: spectrum.frequencies[48] || 0 },
    { label: '8kHz', val: spectrum.highEnergy * 1.1 },
    { label: '16kHz', val: spectrum.frequencies[64] || 0 },
  ];

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const gradientCol = settings.useCustomColors
    ? (settings.gradientColor || settings.primaryGradientEnd || theme.gradientColor)
    : (theme.gradientColor || theme.primaryGradientEnd || settings.gradientColor || primaryCol);
  const enableGradient = settings.enableGradient !== undefined ? settings.enableGradient : true;
  const colorMode: ColorRepresentationMode = settings.colorMode || 'bottom-to-top';

  const bandW = width / bands.length;
  const barW = bandW * 0.65;
  const bottomY = y + height - 25;
  const maxH = (height - 50) * (settings.heightScale || 1.0);

  ctx.save();
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';

  if (enableGradient && colorMode === 'alternate-bars') {
    const pathEven = new Path2D();
    const pathOdd = new Path2D();
    bands.forEach((b, i) => {
      const bx = x + i * bandW + (bandW - barW) / 2;
      const bHeight = Math.max(6, Math.min(1, b.val) * maxH);
      const by = bottomY - bHeight;
      const target = i % 2 === 0 ? pathEven : pathOdd;
      roundRectPath(target, bx, by, barW, bHeight, 4);
    });
    ctx.fillStyle = primaryCol;
    ctx.fill(pathEven);
    ctx.fillStyle = gradientCol;
    ctx.fill(pathOdd);
  } else {
    ctx.beginPath();
    let maxActiveH = 10;
    bands.forEach((b, i) => {
      const bx = x + i * bandW + (bandW - barW) / 2;
      const bHeight = Math.max(6, Math.min(1, b.val) * maxH);
      if (bHeight > maxActiveH) maxActiveH = bHeight;
      const by = bottomY - bHeight;
      roundRectPath(ctx, bx, by, barW, bHeight, 4);
    });

    const isVerticalMode =
      colorMode === 'bottom-to-top' ||
      colorMode === 'top-to-bottom' ||
      colorMode === 'inside-out-vertical';

    const activeVertH = isVerticalMode
      ? Math.max(20, Math.min(maxH, maxActiveH * 1.05))
      : maxH;

    ctx.fillStyle = getVisualizerGradient(
      ctx,
      x,
      bottomY - activeVertH,
      width,
      activeVertH,
      primaryCol,
      gradientCol,
      enableGradient,
      colorMode
    );
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  bands.forEach((b, i) => {
    const bx = x + i * bandW + (bandW - barW) / 2;
    ctx.fillText(b.label, bx + barW / 2, y + height - 6);
  });

  ctx.restore();
}

function renderTrackOverlay(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
  settings: VisualizerSettings,
  theme: ColorTheme,
  time: number,
  duration: number,
  resScale: number = 1
): void {
  ctx.save();

  const title = settings.trackTitle || 'Audio Track';
  const artist = settings.artistName || 'Waveform Studio';

  const isTop = settings.infoPosition?.includes('top');
  const isRight = settings.infoPosition?.includes('right');
  const isCenter = settings.infoPosition === 'center-top';

  const tx = isCenter ? width / 2 : isRight ? width - padding : padding;
  const titleSize = Math.max(14, Math.round(22 * resScale));
  const artistSize = Math.max(10, Math.round(13 * resScale));
  const vOffset = Math.round(24 * resScale);
  const artistSpacing = Math.round(20 * resScale);

  const ty = isTop ? padding + vOffset : height - padding - Math.round(36 * resScale);

  ctx.textAlign = isCenter ? 'center' : isRight ? 'right' : 'left';

  ctx.font = `700 ${titleSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = Math.round(4 * resScale);
  ctx.fillText(title, tx, ty);

  ctx.font = `500 ${artistSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = theme.accentColor || theme.primaryColor || '#38bdf8';
  const curMin = Math.floor(time / 60);
  const curSec = Math.floor(time % 60)
    .toString()
    .padStart(2, '0');
  const durMin = Math.floor(duration / 60);
  const durSec = Math.floor(duration % 60)
    .toString()
    .padStart(2, '0');

  ctx.fillText(`${artist} • ${curMin}:${curSec} / ${durMin}:${durSec}`, tx, ty + artistSpacing);

  ctx.restore();
}

function renderWatermark(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
  text: string,
  resScale: number = 1
): void {
  ctx.save();
  const fontSize = Math.max(9, Math.round(11 * resScale));
  ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.textAlign = 'right';
  ctx.fillText(text, width - padding, height - padding / 2);
  ctx.restore();
}

// Utility: Build Rounded Rect path without filling
function roundRectPath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | Path2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  if (r <= 0) {
    ctx.rect(x, y, width, height);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
}

// Utility: Hex to RGBA
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(255, 255, 255, ${alpha})`;
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
