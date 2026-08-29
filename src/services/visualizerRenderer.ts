import { ColorTheme, VisualizerSettings, WaveformData, ProfileImageShape, SideSymmetryType } from '../types';
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
  backgroundBlur?: number;
  backgroundDim?: number;
  profileImage?: HTMLImageElement | ImageBitmap | null;
  isExport?: boolean;
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
  const currentKey = `${width}x${height}_${settings.backgroundType}_${theme.id}_${imageKey}_${backgroundBlur}_${backgroundDim}`;

  if (cachedBgCanvas && cachedBgKey === currentKey) {
    return cachedBgCanvas;
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    cachedBgCanvas = new OffscreenCanvas(width, height);
    cachedBgCtx = cachedBgCanvas.getContext('2d');
  } else {
    cachedBgCanvas = document.createElement('canvas');
    cachedBgCanvas.width = width;
    cachedBgCanvas.height = height;
    cachedBgCtx = cachedBgCanvas.getContext('2d');
  }

  if (!cachedBgCtx) return null;

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
      ctx.fillStyle = theme.backgroundColor || '#09090b';
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
      meshGrad.addColorStop(0, theme.backgroundColor || '#09090b');
      meshGrad.addColorStop(0.5, theme.backgroundSecondary || '#18181b');
      meshGrad.addColorStop(1, theme.backgroundColor || '#09090b');
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

    case 'transparent':
      break;

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
      bgGrad.addColorStop(1, theme.backgroundColor || '#09090b');
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

  // 2. Render Fast Cached Background
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

  // 3. Grid & Center line
  if (settings.showDbGrid) {
    renderDbGrid(ctx, width, height, theme);
  }
  if (settings.showCenterLine && settings.style !== 'radial') {
    renderCenterLine(ctx, width, height, settings, theme);
  }

  // 4. Calculate Waveform & Profile Bounds
  const padding = settings.padding || 32;
  const drawWidth = Math.max(10, width - padding * 2);
  const drawHeight = Math.max(10, height - padding * 2);
  const drawX = padding;
  const drawY = padding;
  const cx = width / 2;
  const cy = height / 2;

  // Profile Image Anchor Point (can be moved horizontally with X-Offset and vertically with Y-Offset)
  const xOffsetRatio = (settings.profileImageXOffset || 0) / 100;
  const yOffsetRatio = (settings.profileImageYOffset || 0) / 100;
  const avatarX = cx + drawWidth * xOffsetRatio;
  const avatarY = cy + drawHeight * yOffsetRatio;
  const isProfileActive = settings.showProfileImage || !!profileImage;

  // 5. Render Main Waveform
  switch (settings.style) {
    case 'bars-up':
      renderBarsUp(
        ctx,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
        spectrum,
        settings,
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
        settings,
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
        settings,
        theme,
        time
      );
      break;
    case 'digital-matrix':
      renderDigitalMatrix(ctx, drawX, drawY, drawWidth, drawHeight, spectrum, settings, theme);
      break;
    case 'spine':
      renderSpine(ctx, drawX, drawY, drawWidth, drawHeight, spectrum, settings, theme, time);
      break;
    case 'spectrum-bands':
      renderSpectrumBands(ctx, drawX, drawY, drawWidth, drawHeight, spectrum, settings, theme);
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
        settings,
        theme,
        time,
        duration,
        isProfileActive,
        avatarX,
        avatarY
      );
      break;
  }

  // 6. Render Profile Image / Avatar on Top
  if (isProfileActive) {
    renderProfileImage(
      ctx,
      avatarX,
      avatarY,
      settings.profileImageSize || 130,
      settings.profileImageShape || 'circle',
      settings.profileBorderWidth ?? 4,
      settings.profileBorderColor || '#ffffff',
      settings.profileGlow ?? true,
      settings.profileAudioReactiveScale ?? true,
      spectrum,
      theme,
      profileImage
    );
  }

  // 7. Overlays
  // In exports: main time ruler is excluded by default for clean video clips!
  const shouldRenderTimeRuler =
    settings.showTimeRuler &&
    settings.style !== 'radial' &&
    (!isExport || settings.showTimeRulerInExport);

  if (shouldRenderTimeRuler) {
    renderTimeRuler(ctx, drawX, drawY, drawWidth, drawHeight, duration);
  }
  if (settings.showPlayhead && duration > 0 && settings.style !== 'radial') {
    renderPlayhead(ctx, drawX, drawY, drawWidth, drawHeight, time, duration, theme);
  }
  if (settings.showTrackInfo) {
    renderTrackOverlay(ctx, width, height, padding, settings, theme, time, duration);
  }
  if (settings.showWatermark && settings.customWatermark) {
    renderWatermark(ctx, width, height, padding, settings.customWatermark);
  }

  ctx.restore();
}

function renderDbGrid(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ColorTheme
): void {
  ctx.save();
  ctx.strokeStyle = theme.gridColor || 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

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
  theme: ColorTheme
): void {
  ctx.save();
  const centerY = height / 2;
  ctx.strokeStyle = hexToRgba(theme.primaryColor, 0.25);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(settings.padding || 32, centerY);
  ctx.lineTo(width - (settings.padding || 32), centerY);
  ctx.stroke();
  ctx.restore();
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
  time: number,
  duration: number,
  isProfileActive: boolean = false,
  avatarX: number = 0,
  avatarY: number = 0
): void {
  const barCount = Math.max(16, Math.min(256, settings.barCount || 120));
  const barRadius = settings.barRadius || 3;
  const centerY = y + height / 2;
  const maxCap = Math.max(0.1, Math.min(1.0, (settings.maxBarHeight ?? 100) / 100));
  const maxHalfHeight = (height / 2) * (settings.heightScale || 1.0) * maxCap;
  const progressRatio = duration > 0 ? time / duration : 0;
  const glow = settings.glowIntensity || 0.4;

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const primaryGradEnd = settings.useCustomColors ? settings.primaryGradientEnd : theme.primaryGradientEnd;
  const progressCol = settings.useCustomColors ? settings.progressColor : theme.progressColor;
  const progressGradEnd = settings.useCustomColors ? settings.progressGradientEnd : theme.progressGradientEnd;

  // Single shared gradients for all bars
  const primaryGrad = ctx.createLinearGradient(0, centerY - maxHalfHeight, 0, centerY + maxHalfHeight);
  primaryGrad.addColorStop(0, primaryGradEnd || primaryCol);
  primaryGrad.addColorStop(0.5, primaryCol);
  primaryGrad.addColorStop(1, primaryGradEnd || primaryCol);

  const progressGrad = ctx.createLinearGradient(0, centerY - maxHalfHeight, 0, centerY + maxHalfHeight);
  progressGrad.addColorStop(0, progressGradEnd || progressCol);
  progressGrad.addColorStop(0.5, progressCol);
  progressGrad.addColorStop(1, progressGradEnd || progressCol);

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

    // Pass 1: Progressed Left Wing & Right Wing
    ctx.beginPath();
    const splitX = x + width * progressRatio;

    // Left Wing: bars from left edge towards avatar (frequencies mirror with low bass near avatar)
    for (let i = 0; i < nLeft; i++) {
      const bx = x + i * slotLeft + (slotLeft - barWLeft) / 2;
      if (bx > splitX) continue;

      // Bass is closest to avatar (index nLeft-1)
      const freqFrac = (nLeft - 1 - i) / nLeft;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const rawVal = spectrum.frequencies[freqIdx] || 0;
      const barHeight = Math.max(2, rawVal * maxHalfHeight);

      if (settings.symmetry === 'top-only') {
        roundRectPath(ctx, bx, centerY - barHeight * 2, barWLeft, barHeight * 2, barRadius);
      } else if (settings.symmetry === 'bottom-only') {
        roundRectPath(ctx, bx, centerY, barWLeft, barHeight * 2, barRadius);
      } else {
        roundRectPath(ctx, bx, centerY - barHeight, barWLeft, barHeight * 2, barRadius);
      }
    }

    // Right Wing: bars from avatar towards right edge (bass closest to avatar, mirroring left wing!)
    for (let j = 0; j < nRight; j++) {
      const bx = rightWingStart + j * slotRight + (slotRight - barWRight) / 2;
      if (bx > splitX) continue;

      const freqFrac = j / nRight;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const rawVal = spectrum.frequencies[freqIdx] || 0;
      const barHeight = Math.max(2, rawVal * maxHalfHeight);

      if (settings.symmetry === 'top-only') {
        roundRectPath(ctx, bx, centerY - barHeight * 2, barWRight, barHeight * 2, barRadius);
      } else if (settings.symmetry === 'bottom-only') {
        roundRectPath(ctx, bx, centerY, barWRight, barHeight * 2, barRadius);
      } else {
        roundRectPath(ctx, bx, centerY - barHeight, barWRight, barHeight * 2, barRadius);
      }
    }

    ctx.fillStyle = progressGrad;
    if (glow > 0) ctx.shadowColor = progressCol;
    ctx.fill();

    // Pass 2: Remaining Unplayed Left & Right Wings
    ctx.beginPath();
    for (let i = 0; i < nLeft; i++) {
      const bx = x + i * slotLeft + (slotLeft - barWLeft) / 2;
      if (bx <= splitX) continue;

      const freqFrac = (nLeft - 1 - i) / nLeft;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const rawVal = spectrum.frequencies[freqIdx] || 0;
      const barHeight = Math.max(2, rawVal * maxHalfHeight);

      if (settings.symmetry === 'top-only') {
        roundRectPath(ctx, bx, centerY - barHeight * 2, barWLeft, barHeight * 2, barRadius);
      } else if (settings.symmetry === 'bottom-only') {
        roundRectPath(ctx, bx, centerY, barWLeft, barHeight * 2, barRadius);
      } else {
        roundRectPath(ctx, bx, centerY - barHeight, barWLeft, barHeight * 2, barRadius);
      }
    }

    for (let j = 0; j < nRight; j++) {
      const bx = rightWingStart + j * slotRight + (slotRight - barWRight) / 2;
      if (bx <= splitX) continue;

      const freqFrac = j / nRight;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const rawVal = spectrum.frequencies[freqIdx] || 0;
      const barHeight = Math.max(2, rawVal * maxHalfHeight);

      if (settings.symmetry === 'top-only') {
        roundRectPath(ctx, bx, centerY - barHeight * 2, barWRight, barHeight * 2, barRadius);
      } else if (settings.symmetry === 'bottom-only') {
        roundRectPath(ctx, bx, centerY, barWRight, barHeight * 2, barRadius);
      } else {
        roundRectPath(ctx, bx, centerY - barHeight, barWRight, barHeight * 2, barRadius);
      }
    }

    ctx.fillStyle = primaryGrad;
    if (glow > 0) ctx.shadowColor = primaryCol;
    ctx.fill();

    ctx.restore();
    return;
  }

  // CASE B: Standard / Split Cutout Mode
  const slotWidth = width / barCount;
  const barWidth = Math.max(1, slotWidth * (settings.barWidthRatio || 0.7));
  const splitIdx = Math.floor(barCount * progressRatio);

  const isCutout = isProfileActive && settings.sideSymmetry === 'split-cutout';
  const cutoutLeft = avatarX - avatarRadius - gap;
  const cutoutRight = avatarX + avatarRadius + gap;

  // Pass 1: Progressed Bars
  ctx.beginPath();
  for (let i = 0; i <= splitIdx && i < barCount; i++) {
    const bx = x + i * slotWidth + (slotWidth - barWidth) / 2;
    if (isCutout && bx + barWidth >= cutoutLeft && bx <= cutoutRight) {
      continue; // Skip bars inside the avatar cutout
    }

    const freqIdx = Math.floor((i / barCount) * spectrum.frequencies.length);
    const rawVal = spectrum.frequencies[freqIdx] || 0;
    const barHeight = Math.max(2, rawVal * maxHalfHeight);

    if (settings.symmetry === 'top-only') {
      roundRectPath(ctx, bx, centerY - barHeight * 2, barWidth, barHeight * 2, barRadius);
    } else if (settings.symmetry === 'bottom-only') {
      roundRectPath(ctx, bx, centerY, barWidth, barHeight * 2, barRadius);
    } else {
      roundRectPath(ctx, bx, centerY - barHeight, barWidth, barHeight * 2, barRadius);
    }
  }

  if (splitIdx >= 0) {
    ctx.fillStyle = progressGrad;
    if (glow > 0) ctx.shadowColor = progressCol;
    ctx.fill();
  }

  // Pass 2: Remaining Bars
  ctx.beginPath();
  for (let i = splitIdx + 1; i < barCount; i++) {
    const bx = x + i * slotWidth + (slotWidth - barWidth) / 2;
    if (isCutout && bx + barWidth >= cutoutLeft && bx <= cutoutRight) {
      continue;
    }

    const freqIdx = Math.floor((i / barCount) * spectrum.frequencies.length);
    const rawVal = spectrum.frequencies[freqIdx] || 0;
    const barHeight = Math.max(2, rawVal * maxHalfHeight);

    if (settings.symmetry === 'top-only') {
      roundRectPath(ctx, bx, centerY - barHeight * 2, barWidth, barHeight * 2, barRadius);
    } else if (settings.symmetry === 'bottom-only') {
      roundRectPath(ctx, bx, centerY, barWidth, barHeight * 2, barRadius);
    } else {
      roundRectPath(ctx, bx, centerY - barHeight, barWidth, barHeight * 2, barRadius);
    }
  }

  if (splitIdx < barCount - 1) {
    ctx.fillStyle = primaryGrad;
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
  time: number,
  duration: number,
  isProfileActive: boolean = false,
  avatarX: number = 0,
  avatarY: number = 0
): void {
  const barCount = Math.max(16, Math.min(256, settings.barCount || 100));
  const barRadius = settings.barRadius || 4;
  const bottomY = y + height - 10;
  const maxCap = Math.max(0.1, Math.min(1.0, (settings.maxBarHeight ?? 100) / 100));
  const maxHeight = (height - 30) * (settings.heightScale || 1.0) * maxCap;
  const progressRatio = duration > 0 ? time / duration : 0;
  const glow = settings.glowIntensity || 0.4;

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const primaryGradEnd = settings.useCustomColors ? settings.primaryGradientEnd : theme.primaryGradientEnd;
  const progressCol = settings.useCustomColors ? settings.progressColor : theme.progressColor;

  const primaryGrad = ctx.createLinearGradient(0, bottomY, 0, bottomY - maxHeight);
  primaryGrad.addColorStop(0, hexToRgba(primaryCol, 0.4));
  primaryGrad.addColorStop(1, primaryGradEnd || primaryCol);

  const progressGrad = ctx.createLinearGradient(0, bottomY, 0, bottomY - maxHeight);
  progressGrad.addColorStop(0, hexToRgba(progressCol, 0.4));
  progressGrad.addColorStop(1, progressCol);

  ctx.save();
  if (glow > 0) {
    ctx.shadowBlur = 10 * glow;
  }

  const avatarRadius = isProfileActive
    ? ((settings.profileImageSize || 130) / 2) *
      (settings.profileAudioReactiveScale ? 1 + (spectrum.bassEnergy || 0) * 0.08 : 1)
    : 0;
  const gap = Math.max(0, settings.profileWingGap ?? 16);
  const splitX = x + width * progressRatio;

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

    // Progressed Left & Right
    ctx.beginPath();
    for (let i = 0; i < nLeft; i++) {
      const bx = x + i * slotLeft + (slotLeft - barWLeft) / 2;
      if (bx > splitX) continue;
      const freqFrac = (nLeft - 1 - i) / nLeft;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const val = spectrum.frequencies[freqIdx] || 0;
      const barH = Math.max(3, val * maxHeight);
      roundRectPath(ctx, bx, bottomY - barH, barWLeft, barH, barRadius);
    }
    for (let j = 0; j < nRight; j++) {
      const bx = rightWingStart + j * slotRight + (slotRight - barWRight) / 2;
      if (bx > splitX) continue;
      const freqFrac = j / nRight;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const val = spectrum.frequencies[freqIdx] || 0;
      const barH = Math.max(3, val * maxHeight);
      roundRectPath(ctx, bx, bottomY - barH, barWRight, barH, barRadius);
    }
    ctx.fillStyle = progressGrad;
    if (glow > 0) ctx.shadowColor = progressCol;
    ctx.fill();

    // Remaining Left & Right
    ctx.beginPath();
    for (let i = 0; i < nLeft; i++) {
      const bx = x + i * slotLeft + (slotLeft - barWLeft) / 2;
      if (bx <= splitX) continue;
      const freqFrac = (nLeft - 1 - i) / nLeft;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const val = spectrum.frequencies[freqIdx] || 0;
      const barH = Math.max(3, val * maxHeight);
      roundRectPath(ctx, bx, bottomY - barH, barWLeft, barH, barRadius);
    }
    for (let j = 0; j < nRight; j++) {
      const bx = rightWingStart + j * slotRight + (slotRight - barWRight) / 2;
      if (bx <= splitX) continue;
      const freqFrac = j / nRight;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const val = spectrum.frequencies[freqIdx] || 0;
      const barH = Math.max(3, val * maxHeight);
      roundRectPath(ctx, bx, bottomY - barH, barWRight, barH, barRadius);
    }
    ctx.fillStyle = primaryGrad;
    if (glow > 0) ctx.shadowColor = primaryCol;
    ctx.fill();

    // Peak Caps
    ctx.beginPath();
    for (let i = 0; i < nLeft; i++) {
      const bx = x + i * slotLeft + (slotLeft - barWLeft) / 2;
      const freqFrac = (nLeft - 1 - i) / nLeft;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const val = spectrum.frequencies[freqIdx] || 0;
      const barH = Math.max(3, val * maxHeight);
      const capY = Math.max(y, bottomY - barH - capH - 3);
      ctx.rect(bx, capY, barWLeft, capH);
    }
    for (let j = 0; j < nRight; j++) {
      const bx = rightWingStart + j * slotRight + (slotRight - barWRight) / 2;
      const freqFrac = j / nRight;
      const freqIdx = Math.floor(freqFrac * (spectrum.frequencies.length * 0.8));
      const val = spectrum.frequencies[freqIdx] || 0;
      const barH = Math.max(3, val * maxHeight);
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
  const splitIdx = Math.floor(barCount * progressRatio);
  const isCutout = isProfileActive && settings.sideSymmetry === 'split-cutout';
  const cutoutLeft = avatarX - avatarRadius - gap;
  const cutoutRight = avatarX + avatarRadius + gap;

  // Pass 1: Progressed Bars
  ctx.beginPath();
  for (let i = 0; i <= splitIdx && i < barCount; i++) {
    const bx = x + i * slotWidth + (slotWidth - barWidth) / 2;
    if (isCutout && bx + barWidth >= cutoutLeft && bx <= cutoutRight) continue;

    const freqIdx = Math.floor((i / barCount) * spectrum.frequencies.length);
    const val = spectrum.frequencies[freqIdx] || 0;
    const barH = Math.max(3, val * maxHeight);
    roundRectPath(ctx, bx, bottomY - barH, barWidth, barH, barRadius);
  }
  if (splitIdx >= 0) {
    ctx.fillStyle = progressGrad;
    if (glow > 0) ctx.shadowColor = progressCol;
    ctx.fill();
  }

  // Pass 2: Remaining Bars
  ctx.beginPath();
  for (let i = splitIdx + 1; i < barCount; i++) {
    const bx = x + i * slotWidth + (slotWidth - barWidth) / 2;
    if (isCutout && bx + barWidth >= cutoutLeft && bx <= cutoutRight) continue;

    const freqIdx = Math.floor((i / barCount) * spectrum.frequencies.length);
    const val = spectrum.frequencies[freqIdx] || 0;
    const barH = Math.max(3, val * maxHeight);
    roundRectPath(ctx, bx, bottomY - barH, barWidth, barH, barRadius);
  }
  if (splitIdx < barCount - 1) {
    ctx.fillStyle = primaryGrad;
    if (glow > 0) ctx.shadowColor = primaryCol;
    ctx.fill();
  }

  // Pass 3: Peak Caps
  ctx.beginPath();
  const capH = Math.max(2, barRadius);
  for (let i = 0; i < barCount; i++) {
    const bx = x + i * slotWidth + (slotWidth - barWidth) / 2;
    if (isCutout && bx + barWidth >= cutoutLeft && bx <= cutoutRight) continue;

    const freqIdx = Math.floor((i / barCount) * spectrum.frequencies.length);
    const val = spectrum.frequencies[freqIdx] || 0;
    const barH = Math.max(3, val * maxHeight);
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
  _isProfileActive: boolean = false,
  _avatarX: number = 0,
  _avatarY: number = 0
): void {
  const centerY = y + height / 2;
  const maxCap = Math.max(0.1, Math.min(1.0, (settings.maxBarHeight ?? 100) / 100));
  const maxAmp = height * 0.42 * (settings.heightScale || 1.0) * maxCap;
  const numPoints = Math.max(32, Math.min(128, settings.barCount || 80));
  const step = width / (numPoints - 1);
  const glow = settings.glowIntensity || 0.4;

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const primaryGradEnd = settings.useCustomColors ? settings.primaryGradientEnd : theme.primaryGradientEnd;

  ctx.save();

  // Area Fill under wave
  ctx.beginPath();
  ctx.moveTo(x, centerY);
  for (let i = 0; i < numPoints; i++) {
    const freqIdx = Math.floor((i / numPoints) * spectrum.frequencies.length);
    const val = spectrum.frequencies[freqIdx] || 0;
    const px = x + i * step;
    const py = centerY - val * maxAmp;
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
  const waveGrad = ctx.createLinearGradient(x, 0, x + width, 0);
  waveGrad.addColorStop(0, primaryCol);
  waveGrad.addColorStop(0.5, primaryGradEnd || primaryCol);
  waveGrad.addColorStop(1, primaryCol);
  ctx.strokeStyle = waveGrad;

  if (glow > 0) {
    ctx.shadowBlur = 10 * glow;
    ctx.shadowColor = primaryCol;
  }

  ctx.beginPath();
  ctx.lineWidth = 3;
  for (let i = 0; i < numPoints; i++) {
    const freqIdx = Math.floor((i / numPoints) * spectrum.frequencies.length);
    const val = spectrum.frequencies[freqIdx] || 0;
    const px = x + i * step;
    const py = centerY - val * maxAmp * Math.sin((i / numPoints) * Math.PI + time * 2);

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
  image?: HTMLImageElement | ImageBitmap | null
): void {
  const bass = spectrum.bassEnergy || 0;
  const pulseScale = reactiveScale ? 1 + bass * 0.08 : 1;
  const currentSize = Math.max(30, size * pulseScale);
  const r = currentSize / 2;

  ctx.save();

  // 1. Audio-reactive outer glow ring
  if (glow && bass > 0.15) {
    ctx.save();
    ctx.beginPath();
    const rippleR = r + 8 + bass * 16;
    if (shape === 'circle') {
      ctx.arc(imgX, imgY, rippleR, 0, Math.PI * 2);
    } else {
      const cornerR = shape === 'rounded' ? Math.min(24, rippleR * 0.25) : 0;
      roundRectPath(ctx, imgX - rippleR, imgY - rippleR, rippleR * 2, rippleR * 2, cornerR);
    }
    const glowCol = borderColor && borderColor !== '#ffffff' ? borderColor : theme.accentColor || theme.primaryColor;
    ctx.strokeStyle = hexToRgba(glowCol, Math.min(1, (bass - 0.15) * 1.1));
    ctx.lineWidth = 2 + bass * 3;
    ctx.shadowColor = glowCol;
    ctx.shadowBlur = 14 * bass;
    ctx.stroke();
    ctx.restore();
  }

  // 2. Base Drop Shadow
  if (glow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
  }

  // 3. Clipped Avatar Image / Placeholder
  ctx.save();
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(imgX, imgY, r, 0, Math.PI * 2);
  } else if (shape === 'rounded') {
    roundRectPath(ctx, imgX - r, imgY - r, currentSize, currentSize, Math.min(28, currentSize * 0.22));
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
    const innerBarW = Math.max(3, currentSize * 0.07);
    const innerBars = 5;
    const innerTotalW = innerBars * innerBarW * 1.8;
    const startInnerX = imgX - innerTotalW / 2;
    ctx.fillStyle = '#ffffff';
    for (let bi = 0; bi < innerBars; bi++) {
      const bhFactor = [0.4, 0.8, 1.0, 0.7, 0.45][bi];
      const bh = Math.max(6, currentSize * 0.38 * bhFactor * (0.8 + bass * 0.4));
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
      roundRectPath(ctx, imgX - r, imgY - r, currentSize, currentSize, Math.min(28, currentSize * 0.22));
    } else {
      ctx.rect(imgX - r, imgY - r, currentSize, currentSize);
    }

    const finalBorderColor = borderColor || '#ffffff';
    ctx.strokeStyle = finalBorderColor;
    ctx.lineWidth = borderWidth;
    if (glow) {
      ctx.shadowColor = finalBorderColor;
      ctx.shadowBlur = 10;
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
  const maxCap = Math.max(0.1, Math.min(1.0, (settings.maxBarHeight ?? 100) / 100));
  const maxBarLength = (maxRadius - innerRadius) * (settings.heightScale || 1.0) * maxCap;
  const rotation = ((settings.radialRotation || 0) * Math.PI) / 180 + time * 0.2;
  const glow = settings.glowIntensity || 0.4;

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const primaryGradEnd = settings.useCustomColors ? settings.primaryGradientEnd : theme.primaryGradientEnd;

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
  coreGrad.addColorStop(0, hexToRgba(primaryGradEnd || primaryCol, 0.4));
  coreGrad.addColorStop(0.8, hexToRgba(primaryCol, 0.15));
  coreGrad.addColorStop(1, hexToRgba(primaryCol, 0.8));
  ctx.fillStyle = coreGrad;
  ctx.fill();
  ctx.strokeStyle = primaryCol;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Radiating Spikes (Single batched stroke path)
  const angleStep = (Math.PI * 2) / barCount;
  const barThickness = Math.max(2, ((Math.PI * 2 * innerRadius) / barCount) * 0.65);

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

  ctx.strokeStyle = primaryCol;
  ctx.lineWidth = barThickness;
  ctx.lineCap = 'round';
  ctx.stroke();

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
  theme: ColorTheme
): void {
  const cols = Math.max(16, Math.min(64, settings.barCount || 40));
  const rows = 20;
  const slotW = width / cols;
  const barW = Math.max(2, slotW * 0.75);
  const blockGap = 2.5;
  const blockH = (height - (rows - 1) * blockGap) / rows;
  const glow = settings.glowIntensity || 0.4;
  const maxCap = Math.max(0.1, Math.min(1.0, (settings.maxBarHeight ?? 100) / 100));

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const accentCol = theme.accentColor || theme.primaryGradientEnd || '#f43f5e';
  const midCol = theme.primaryGradientEnd || primaryCol;

  ctx.save();
  if (glow > 0) {
    ctx.shadowBlur = 8 * glow;
    ctx.shadowColor = primaryCol;
  }

  // Accumulate rects into 4 buckets: Ghost, Primary, Mid, Accent
  ctx.beginPath();
  for (let c = 0; c < cols; c++) {
    const bx = x + c * slotW + (slotW - barW) / 2;
    for (let r = 0; r < rows; r++) {
      const by = y + height - (r + 1) * (blockH + blockGap);
      ctx.rect(bx, by, barW, blockH);
    }
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fill();

  // Active blocks by level
  const primaryPath = new Path2D();
  const midPath = new Path2D();
  const accentPath = new Path2D();

  for (let c = 0; c < cols; c++) {
    const freqIdx = Math.floor((c / cols) * spectrum.frequencies.length);
    const val = spectrum.frequencies[freqIdx] || 0;
    const activeBlocks = Math.round(val * rows * maxCap);
    const bx = x + c * slotW + (slotW - barW) / 2;

    for (let r = 0; r < activeBlocks; r++) {
      const by = y + height - (r + 1) * (blockH + blockGap);
      if (r > rows * 0.8) {
        accentPath.rect(bx, by, barW, blockH);
      } else if (r > rows * 0.5) {
        midPath.rect(bx, by, barW, blockH);
      } else {
        primaryPath.rect(bx, by, barW, blockH);
      }
    }
  }

  ctx.fillStyle = primaryCol;
  ctx.fill(primaryPath);

  ctx.fillStyle = midCol;
  ctx.fill(midPath);

  ctx.fillStyle = accentCol;
  ctx.fill(accentPath);

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
  time: number
): void {
  const centerY = y + height / 2;
  const nodeCount = Math.max(16, Math.min(64, settings.barCount || 40));
  const step = width / nodeCount;
  const maxCap = Math.max(0.1, Math.min(1.0, (settings.maxBarHeight ?? 100) / 100));
  const maxAmp = height * 0.45 * (settings.heightScale || 1.0) * maxCap;
  const glow = settings.glowIntensity || 0.4;

  const primaryCol = settings.useCustomColors ? settings.primaryColor : theme.primaryColor;
  const primaryGradEnd = settings.useCustomColors ? settings.primaryGradientEnd : theme.primaryGradientEnd;

  ctx.save();
  if (glow > 0) {
    ctx.shadowBlur = 10 * glow;
    ctx.shadowColor = primaryCol;
  }

  // Draw spine wave
  ctx.beginPath();
  ctx.strokeStyle = hexToRgba(primaryCol, 0.6);
  ctx.lineWidth = 2;

  const nodePositions: { nx: number; ny: number; r: number }[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const freqIdx = Math.floor((i / nodeCount) * spectrum.frequencies.length);
    const val = spectrum.frequencies[freqIdx] || 0;
    const nx = x + i * step + step / 2;
    const offset = Math.sin(i * 0.4 + time * 3) * val * maxAmp;
    const ny = centerY + offset;
    const r = Math.max(3, val * 10);

    nodePositions.push({ nx, ny, r });
    if (i === 0) ctx.moveTo(nx, ny);
    else ctx.lineTo(nx, ny);
  }
  ctx.stroke();

  // Batched Ribs
  ctx.beginPath();
  for (const n of nodePositions) {
    ctx.moveTo(n.nx, centerY);
    ctx.lineTo(n.nx, n.ny);
  }
  ctx.strokeStyle = hexToRgba(primaryGradEnd || primaryCol, 0.4);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Batched Nodes
  ctx.beginPath();
  for (const n of nodePositions) {
    ctx.moveTo(n.nx + n.r, n.ny);
    ctx.arc(n.nx, n.ny, n.r, 0, Math.PI * 2);
  }
  ctx.fillStyle = primaryCol;
  ctx.fill();

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

  const bandW = width / bands.length;
  const barW = bandW * 0.65;
  const bottomY = y + height - 25;
  const maxCap = Math.max(0.1, Math.min(1.0, (settings.maxBarHeight ?? 100) / 100));
  const maxH = (height - 50) * (settings.heightScale || 1.0) * maxCap;

  ctx.save();
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';

  const grad = ctx.createLinearGradient(0, bottomY, 0, bottomY - maxH);
  grad.addColorStop(0, theme.primaryColor);
  grad.addColorStop(1, theme.primaryGradientEnd || theme.primaryColor);

  ctx.beginPath();
  bands.forEach((b, i) => {
    const bx = x + i * bandW + (bandW - barW) / 2;
    const bHeight = Math.max(6, Math.min(1, b.val) * maxH);
    const by = bottomY - bHeight;
    roundRectPath(ctx, bx, by, barW, bHeight, 4);
  });
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  bands.forEach((b, i) => {
    const bx = x + i * bandW + (bandW - barW) / 2;
    ctx.fillText(b.label, bx + barW / 2, y + height - 6);
  });

  ctx.restore();
}

function renderTimeRuler(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  duration: number
): void {
  ctx.save();
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;

  const ticks = 8;
  ctx.beginPath();
  for (let i = 0; i <= ticks; i++) {
    const tx = x + (width / ticks) * i;
    const ty = y + height - 4;
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx, ty + 6);
  }
  ctx.stroke();

  for (let i = 0; i <= ticks; i++) {
    const tx = x + (width / ticks) * i;
    const ty = y + height - 4;
    const timeSec = (duration / ticks) * i;
    const min = Math.floor(timeSec / 60);
    const sec = Math.floor(timeSec % 60)
      .toString()
      .padStart(2, '0');

    ctx.textAlign = i === 0 ? 'left' : i === ticks ? 'right' : 'center';
    ctx.fillText(`${min}:${sec}`, tx, ty + 18);
  }

  ctx.restore();
}

function renderPlayhead(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  time: number,
  duration: number,
  theme: ColorTheme
): void {
  const progress = duration > 0 ? Math.max(0, Math.min(1, time / duration)) : 0;
  const playheadX = x + width * progress;

  ctx.save();
  ctx.shadowColor = theme.playheadColor || '#ffffff';
  ctx.shadowBlur = 6;

  ctx.strokeStyle = theme.playheadColor || '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(playheadX, y);
  ctx.lineTo(playheadX, y + height);
  ctx.stroke();

  ctx.fillStyle = theme.playheadColor || '#ffffff';
  ctx.beginPath();
  ctx.arc(playheadX, y, 4, 0, Math.PI * 2);
  ctx.fill();

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
  duration: number
): void {
  ctx.save();

  const title = settings.trackTitle || 'Audio Track';
  const artist = settings.artistName || 'Waveform Studio';

  const isTop = settings.infoPosition?.includes('top');
  const isRight = settings.infoPosition?.includes('right');
  const isCenter = settings.infoPosition === 'center-top';

  const tx = isCenter ? width / 2 : isRight ? width - padding : padding;
  const ty = isTop ? padding + 24 : height - padding - 36;

  ctx.textAlign = isCenter ? 'center' : isRight ? 'right' : 'left';

  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(title, tx, ty);

  ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = theme.accentColor || theme.primaryColor || '#38bdf8';
  const curMin = Math.floor(time / 60);
  const curSec = Math.floor(time % 60)
    .toString()
    .padStart(2, '0');
  const durMin = Math.floor(duration / 60);
  const durSec = Math.floor(duration % 60)
    .toString()
    .padStart(2, '0');

  ctx.fillText(`${artist} • ${curMin}:${curSec} / ${durMin}:${durSec}`, tx, ty + 20);

  ctx.restore();
}

function renderWatermark(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
  text: string
): void {
  ctx.save();
  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.textAlign = 'right';
  ctx.fillText(text, width - padding, height - padding / 2);
  ctx.restore();
}

// Utility: Build Rounded Rect path without filling
function roundRectPath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
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
