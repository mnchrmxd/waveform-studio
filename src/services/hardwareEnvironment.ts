import React, { useState, useEffect } from 'react';

/**
 * Hardware Environment & GPU Detection Service
 *
 * Detects the runtime environment (Cloud/Server, Local PC/Desktop, Mobile/Tablet)
 * and GPU vendor & architecture (NVIDIA, AMD, Intel, Qualcomm Snapdragon / Adreno,
 * Apple Silicon, ARM Mali, or Software Rasterizer).
 *
 * Provides tailored GPU settings and recommendations on whether to disable
 * cloud rendering in favor of fast local hardware acceleration.
 */

export type EnvironmentType = 'cloud-server' | 'local-pc' | 'mobile' | 'tablet' | 'unknown';

export type PlatformOS =
  | 'windows'
  | 'macos'
  | 'linux'
  | 'android'
  | 'ios'
  | 'chromeos'
  | 'server-linux'
  | 'unknown';

export type GpuVendor =
  | 'nvidia'
  | 'amd'
  | 'intel'
  | 'apple'
  | 'qualcomm' // Snapdragon / Adreno
  | 'arm-mali'
  | 'software' // SwiftShader, llvmpipe, basic display driver
  | 'unknown';

export type GpuTier = 'ultra' | 'high' | 'medium' | 'low' | 'basic';

export interface GpuDetails {
  vendor: GpuVendor;
  vendorName: string; // e.g. "NVIDIA", "Qualcomm Snapdragon", "Apple"
  renderer: string; // e.g. "NVIDIA GeForce RTX 4080", "Adreno (TM) 740", "Apple M3 Pro"
  architecture: string; // e.g. "Ampere / Ada Lovelace", "Adreno 7xx Series", "Metal Unified Memory"
  tier: GpuTier;
  maxTextureSize: number;
  hasHardwareAcceleration: boolean;
  unmaskedVendor?: string;
  unmaskedRenderer?: string;
}

export interface OptimalGpuSettings {
  recommendedResolution: '720p' | '1080p' | '4k';
  recommendedFps: 30 | 60;
  recommendedBitrate: number; // bps
  encoderQueueDepth: number; // Max frames in encoder buffer (higher for PC/Nvidia, lower for Snapdragon)
  webCodecsProfile: string; // e.g. 'avc1.64002a' or 'avc1.4d401f'
  canvasDesynchronized: boolean;
  canvasAlpha: boolean;
  notes: string;
  hardwareSummary: string;
}

export interface HardwareEnvironmentProfile {
  environment: EnvironmentType;
  os: PlatformOS;
  isMobileOrTablet: boolean;
  isLocalPc: boolean;
  isCloudServer: boolean;
  cpuCores: number;
  deviceMemoryGb?: number;
  gpu: GpuDetails;
  optimalSettings: OptimalGpuSettings;
  shouldDisableCloudRender: boolean;
  cloudRenderRecommendationReason: string;
}

const STORAGE_KEY_FORCE_DISABLE_CLOUD = 'waveform_force_disable_cloud_render';

/**
 * Checks if the user has manually toggled "Force Disable Cloud Render" in localStorage.
 */
export function getForceDisableCloudRender(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const val = localStorage.getItem(STORAGE_KEY_FORCE_DISABLE_CLOUD);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Persists user preference for disabling cloud render.
 */
export function setForceDisableCloudRender(disable: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY_FORCE_DISABLE_CLOUD, disable ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Detects operating system and platform form-factor.
 */
export function detectPlatform(): { os: PlatformOS; environment: EnvironmentType; isMobileOrTablet: boolean } {
  // 1. Server / Node.js context check
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      os: 'server-linux',
      environment: 'cloud-server',
      isMobileOrTablet: false,
    };
  }

  const ua = navigator.userAgent || '';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

  const isAndroid = /android/i.test(ua) || /android/i.test(platform);
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (/mac/i.test(platform) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 2);
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch)))/i.test(ua);
  const isWindows = /win/i.test(platform) || /windows/i.test(ua);
  const isMac = !isIOS && (/mac/i.test(platform) || /macintosh/i.test(ua));
  const isLinux = !isAndroid && (/linux/i.test(platform) || /linux/i.test(ua));
  const isChromeOs = /cros/i.test(ua);

  let os: PlatformOS = 'unknown';
  if (isAndroid) os = 'android';
  else if (isIOS) os = 'ios';
  else if (isWindows) os = 'windows';
  else if (isMac) os = 'macos';
  else if (isChromeOs) os = 'chromeos';
  else if (isLinux) os = 'linux';

  const isMobile = (isAndroid || isIOS) && !isTablet;
  const isMobileOrTablet = isMobile || isTablet;

  let environment: EnvironmentType = 'local-pc';
  if (isMobile) environment = 'mobile';
  else if (isTablet) environment = 'tablet';
  else environment = 'local-pc';

  return { os, environment, isMobileOrTablet };
}

/**
 * Inspects WebGL unmasked renderer to accurately identify the GPU vendor and model.
 */
export function detectGpu(): GpuDetails {
  if (typeof window === 'undefined') {
    return {
      vendor: 'unknown',
      vendorName: 'Server vCPU / Host',
      renderer: 'Headless Server Node.js Canvas',
      architecture: 'Host Process Architecture',
      tier: 'medium',
      maxTextureSize: 4096,
      hasHardwareAcceleration: false,
    };
  }

  let unmaskedVendor = '';
  let unmaskedRenderer = '';
  let maxTextureSize = 4096;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);

    if (gl) {
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        unmaskedVendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || '';
        unmaskedRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '';
      } else {
        unmaskedVendor = gl.getParameter(gl.VENDOR) || '';
        unmaskedRenderer = gl.getParameter(gl.RENDERER) || '';
      }
    }
  } catch (err) {
    console.warn('[HardwareDetector] WebGL query failed:', err);
  }

  const combined = `${unmaskedVendor} ${unmaskedRenderer}`.toLowerCase();

  // 1. Qualcomm Snapdragon / Adreno
  if (combined.includes('adreno') || combined.includes('qualcomm') || combined.includes('snapdragon')) {
    let tier: GpuTier = 'medium';
    let arch = 'Qualcomm Snapdragon (Adreno Architecture)';

    const match = combined.match(/adreno\s*\(?tm\)?\s*(\d+)/i);
    if (match) {
      const modelNum = parseInt(match[1], 10);
      if (modelNum >= 730) {
        tier = 'high'; // Snapdragon 8 Gen 2 / 8 Gen 3 / X Elite (Adreno 740/750/X1)
        arch = `Snapdragon Adreno ${modelNum} (Flagship TBDR)`;
      } else if (modelNum >= 650) {
        tier = 'medium'; // Snapdragon 865/870/888/7+ Gen 2 (Adreno 650/660)
        arch = `Snapdragon Adreno ${modelNum}`;
      } else {
        tier = 'low';
        arch = `Snapdragon Adreno ${modelNum} (Entry/Mid)`;
      }
    }

    return {
      vendor: 'qualcomm',
      vendorName: 'Qualcomm Snapdragon',
      renderer: unmaskedRenderer || 'Qualcomm Adreno GPU',
      architecture: arch,
      tier,
      maxTextureSize,
      hasHardwareAcceleration: true,
      unmaskedVendor,
      unmaskedRenderer,
    };
  }

  // 2. NVIDIA
  if (combined.includes('nvidia') || combined.includes('geforce') || combined.includes('quadro') || combined.includes('rtx') || combined.includes('gtx') || combined.includes('tesla')) {
    let tier: GpuTier = 'high';
    let arch = 'NVIDIA CUDA / NVENC Architecture';

    if (/rtx\s*(4080|4090|3090|3080|5080|5090|a6000|a100|h100)/i.test(combined)) {
      tier = 'ultra';
      arch = 'NVIDIA Ada Lovelace / Ampere (Ultra Enthusiast)';
    } else if (/rtx\s*(4070|4060|3070|3060|2080|2070|a4000|t4)/i.test(combined)) {
      tier = 'high';
      arch = 'NVIDIA RTX Hardware Encoder (High Performance)';
    } else if (/gtx\s*(1660|1650|1080|1070|1060)/i.test(combined)) {
      tier = 'medium';
      arch = 'NVIDIA Pascal / Turing (Mainstream)';
    } else {
      tier = 'medium';
    }

    return {
      vendor: 'nvidia',
      vendorName: 'NVIDIA',
      renderer: unmaskedRenderer || 'NVIDIA GeForce GPU',
      architecture: arch,
      tier,
      maxTextureSize,
      hasHardwareAcceleration: true,
      unmaskedVendor,
      unmaskedRenderer,
    };
  }

  // 3. AMD Radeon
  if (combined.includes('amd') || combined.includes('radeon') || combined.includes('advanced micro devices')) {
    let tier: GpuTier = 'high';
    let arch = 'AMD RDNA / Radeon Architecture';

    if (/rx\s*(7900|7800|6900|6800)/i.test(combined)) {
      tier = 'ultra';
      arch = 'AMD RDNA 3 / RDNA 2 Flagship';
    } else if (/rx\s*(7700|7600|6700|6600|5700)/i.test(combined)) {
      tier = 'high';
      arch = 'AMD RDNA Mid-High Tier';
    } else if (/vega|rx\s*(580|570|560|550)|radeon\s*graphics/i.test(combined)) {
      tier = 'medium';
      arch = 'AMD Radeon / Vega APU';
    }

    return {
      vendor: 'amd',
      vendorName: 'AMD Radeon',
      renderer: unmaskedRenderer || 'AMD Radeon Graphics',
      architecture: arch,
      tier,
      maxTextureSize,
      hasHardwareAcceleration: true,
      unmaskedVendor,
      unmaskedRenderer,
    };
  }

  // 4. Apple Silicon / Apple GPU
  if (combined.includes('apple') || combined.includes('m1') || combined.includes('m2') || combined.includes('m3') || combined.includes('m4')) {
    let tier: GpuTier = 'high';
    let arch = 'Apple Silicon Unified Memory (Metal)';

    if (/max|ultra/i.test(combined) || combined.includes('m3 max') || combined.includes('m2 ultra') || combined.includes('m1 ultra')) {
      tier = 'ultra';
      arch = 'Apple Silicon Max/Ultra (Multi-Core Unified GPU)';
    } else if (/pro/i.test(combined)) {
      tier = 'high';
      arch = 'Apple Silicon Pro (High-Bandwidth Unified GPU)';
    } else if (/m1|m2|m3|m4/i.test(combined)) {
      tier = 'high';
      arch = 'Apple Silicon M-Series Unified Architecture';
    } else {
      // iPhone / iPad A-series
      tier = 'medium';
      arch = 'Apple Bionic / A-Series Mobile GPU';
    }

    return {
      vendor: 'apple',
      vendorName: 'Apple',
      renderer: unmaskedRenderer || 'Apple GPU',
      architecture: arch,
      tier,
      maxTextureSize,
      hasHardwareAcceleration: true,
      unmaskedVendor,
      unmaskedRenderer,
    };
  }

  // 5. Intel
  if (combined.includes('intel') || combined.includes('iris') || combined.includes('uhd') || combined.includes('arc')) {
    let tier: GpuTier = 'medium';
    let arch = 'Intel Graphics Architecture';

    if (/arc\s*(a770|a750|b580|b570)/i.test(combined)) {
      tier = 'high';
      arch = 'Intel Arc Xe-HPG Discrete Architecture';
    } else if (/iris\s*xe/i.test(combined) || /arc/i.test(combined)) {
      tier = 'medium';
      arch = 'Intel Iris Xe / Arc Integrated Architecture';
    } else {
      tier = 'low';
      arch = 'Intel UHD Integrated Graphics';
    }

    return {
      vendor: 'intel',
      vendorName: 'Intel',
      renderer: unmaskedRenderer || 'Intel Graphics',
      architecture: arch,
      tier,
      maxTextureSize,
      hasHardwareAcceleration: true,
      unmaskedVendor,
      unmaskedRenderer,
    };
  }

  // 6. ARM Mali
  if (combined.includes('mali') || combined.includes('bifrost') || combined.includes('valhall')) {
    return {
      vendor: 'arm-mali',
      vendorName: 'ARM Mali',
      renderer: unmaskedRenderer || 'ARM Mali GPU',
      architecture: 'ARM Valhall / Bifrost Architecture',
      tier: 'medium',
      maxTextureSize,
      hasHardwareAcceleration: true,
      unmaskedVendor,
      unmaskedRenderer,
    };
  }

  // 7. Software / Virtualizer Fallback
  if (
    combined.includes('swiftshader') ||
    combined.includes('llvmpipe') ||
    combined.includes('basic render') ||
    combined.includes('software rasterizer') ||
    combined.includes('mesa')
  ) {
    return {
      vendor: 'software',
      vendorName: 'Software Rasterizer',
      renderer: unmaskedRenderer || 'CPU Software Rasterizer',
      architecture: 'Host CPU Emulated Graphics',
      tier: 'basic',
      maxTextureSize,
      hasHardwareAcceleration: false,
      unmaskedVendor,
      unmaskedRenderer,
    };
  }

  return {
    vendor: 'unknown',
    vendorName: 'Generic Display Driver',
    renderer: unmaskedRenderer || 'Default Graphics Adapter',
    architecture: 'Standard Graphics Pipeline',
    tier: 'medium',
    maxTextureSize,
    hasHardwareAcceleration: true,
    unmaskedVendor,
    unmaskedRenderer,
  };
}

/**
 * Computes the optimal GPU settings tailored to the detected hardware.
 */
export function computeOptimalGpuSettings(gpu: GpuDetails, env: EnvironmentType): OptimalGpuSettings {
  // --- QUALCOMM SNAPDRAGON (Adreno) ---
  if (gpu.vendor === 'qualcomm') {
    const isSnapdragonFlagship = gpu.tier === 'high';
    return {
      recommendedResolution: isSnapdragonFlagship ? '1080p' : '720p',
      recommendedFps: 30, // 30 FPS avoids thermal throttling on mobile phones during heavy export
      recommendedBitrate: isSnapdragonFlagship ? 8_000_000 : 5_000_000,
      encoderQueueDepth: 2, // Conservative queue prevents mobile out-of-memory
      webCodecsProfile: 'avc1.4d401f', // H.264 Main Profile Level 3.1
      canvasDesynchronized: true,
      canvasAlpha: false,
      notes: 'Optimized for Qualcomm Snapdragon Adreno Tile-Based Deferred Rendering with battery & thermal safeguards.',
      hardwareSummary: `${gpu.vendorName} (${gpu.architecture})`,
    };
  }

  // --- NVIDIA (GeForce, RTX, GTX, Quadro, NVENC) ---
  if (gpu.vendor === 'nvidia') {
    const isUltra = gpu.tier === 'ultra';
    return {
      recommendedResolution: isUltra ? '4k' : '1080p',
      recommendedFps: 60,
      recommendedBitrate: isUltra ? 24_000_000 : 12_000_000,
      encoderQueueDepth: isUltra ? 8 : 6, // High queue depth unlocks maximum NVENC throughput (80-140+ FPS)
      webCodecsProfile: 'avc1.64002a', // H.264 High Profile Level 4.2
      canvasDesynchronized: true,
      canvasAlpha: false,
      notes: 'Optimized for NVIDIA NVENC hardware-accelerated video pipeline with parallel stream encoding.',
      hardwareSummary: `${gpu.vendorName} ${gpu.renderer} (${gpu.tier.toUpperCase()} Tier)`,
    };
  }

  // --- AMD (Radeon RX, RDNA) ---
  if (gpu.vendor === 'amd') {
    const isUltra = gpu.tier === 'ultra';
    return {
      recommendedResolution: isUltra ? '4k' : '1080p',
      recommendedFps: 60,
      recommendedBitrate: isUltra ? 20_000_000 : 10_000_000,
      encoderQueueDepth: 5,
      webCodecsProfile: 'avc1.64002a',
      canvasDesynchronized: true,
      canvasAlpha: false,
      notes: 'Optimized for AMD Radeon hardware acceleration with direct texture streaming.',
      hardwareSummary: `${gpu.vendorName} ${gpu.renderer}`,
    };
  }

  // --- APPLE SILICON (Metal, M1/M2/M3/M4) ---
  if (gpu.vendor === 'apple') {
    const isUltraOrMax = gpu.tier === 'ultra';
    return {
      recommendedResolution: isUltraOrMax ? '4k' : '1080p',
      recommendedFps: 60,
      recommendedBitrate: isUltraOrMax ? 22_000_000 : 12_000_000,
      encoderQueueDepth: 8, // Unified memory bandwidth can easily process deep frame queues with zero copy lag
      webCodecsProfile: 'avc1.640033', // H.264 High Profile Level 5.1
      canvasDesynchronized: true,
      canvasAlpha: false,
      notes: 'Optimized for Apple Silicon Metal & VideoToolbox unified memory architecture.',
      hardwareSummary: `${gpu.vendorName} (${gpu.architecture})`,
    };
  }

  // --- INTEL (Arc, Iris Xe, UHD, QuickSync) ---
  if (gpu.vendor === 'intel') {
    const isArcOrIris = gpu.tier === 'high' || gpu.tier === 'medium';
    return {
      recommendedResolution: '1080p',
      recommendedFps: isArcOrIris ? 60 : 30,
      recommendedBitrate: isArcOrIris ? 8_000_000 : 6_000_000,
      encoderQueueDepth: 3,
      webCodecsProfile: 'avc1.4d4028',
      canvasDesynchronized: true,
      canvasAlpha: false,
      notes: 'Optimized for Intel QuickSync Video (QSV) hardware encoder.',
      hardwareSummary: `${gpu.vendorName} ${gpu.renderer}`,
    };
  }

  // --- ARM MALI ---
  if (gpu.vendor === 'arm-mali') {
    return {
      recommendedResolution: '1080p',
      recommendedFps: 30,
      recommendedBitrate: 6_000_000,
      encoderQueueDepth: 2,
      webCodecsProfile: 'avc1.42E01E', // Baseline
      canvasDesynchronized: true,
      canvasAlpha: false,
      notes: 'Optimized for ARM Mali mobile GPU architecture.',
      hardwareSummary: `${gpu.vendorName} Mobile GPU`,
    };
  }

  // --- SOFTWARE / VIRTUAL RASTERIZER / LOW-END ---
  if (gpu.vendor === 'software' || gpu.tier === 'basic') {
    return {
      recommendedResolution: '720p',
      recommendedFps: 30,
      recommendedBitrate: 4_000_000,
      encoderQueueDepth: 2,
      webCodecsProfile: 'avc1.42E01E',
      canvasDesynchronized: false,
      canvasAlpha: false,
      notes: 'Software-emulated rasterizer: Low-overhead profile with reduced draw call complexity.',
      hardwareSummary: 'Software / Emulated Graphics Adapter',
    };
  }

  // --- DEFAULT FALLBACK ---
  return {
    recommendedResolution: '1080p',
    recommendedFps: 60,
    recommendedBitrate: 8_000_000,
    encoderQueueDepth: 4,
    webCodecsProfile: 'avc1.4d4028',
    canvasDesynchronized: true,
    canvasAlpha: false,
    notes: 'Balanced hardware profile for standard desktop display adapters.',
    hardwareSummary: gpu.renderer,
  };
}

/**
 * Determines whether cloud render should be disabled in favor of local client GPU rendering.
 *
 * Rule:
 * If the user is on a Desktop PC/Mac with a capable GPU (NVIDIA, AMD, Apple Silicon, Intel Arc/Iris),
 * local WebCodecs client rendering runs at 60-120+ FPS directly in hardware with zero network
 * upload/download latency. Cloud render on a shared CPU/container is dramatically slower.
 * Thus, we disable or bypass cloud render to save time and give the user the fastest export possible.
 */
export function evaluateCloudRenderDisabling(
  env: EnvironmentType,
  gpu: GpuDetails
): { shouldDisable: boolean; reason: string } {
  // If user explicitly forced disabling cloud render in preferences
  if (getForceDisableCloudRender()) {
    return {
      shouldDisable: true,
      reason: 'User preference: Cloud rendering manually disabled in hardware settings.',
    };
  }

  // Dedicated / Strong Local Desktop GPUs
  if (env === 'local-pc') {
    if (gpu.vendor === 'nvidia' && (gpu.tier === 'ultra' || gpu.tier === 'high' || gpu.tier === 'medium')) {
      return {
        shouldDisable: true,
        reason: `Local ${gpu.renderer} detected: Client GPU encoding runs up to 10× faster than cloud containers with zero upload lag.`,
      };
    }

    if (gpu.vendor === 'apple' && (gpu.tier === 'ultra' || gpu.tier === 'high')) {
      return {
        shouldDisable: true,
        reason: `Local Apple Silicon (${gpu.architecture}) detected: Unified memory hardware encoding delivers near-instantaneous export.`,
      };
    }

    if (gpu.vendor === 'amd' && (gpu.tier === 'ultra' || gpu.tier === 'high')) {
      return {
        shouldDisable: true,
        reason: `Local AMD Radeon GPU detected: Hardware WebCodecs delivers superior speed over cloud containers.`,
      };
    }

    if (gpu.vendor === 'intel' && (gpu.tier === 'high' || gpu.renderer.toLowerCase().includes('arc'))) {
      return {
        shouldDisable: true,
        reason: `Local Intel Arc / Iris GPU detected: Direct QuickSync acceleration is faster than cloud rendering.`,
      };
    }
  }

  // For mobile devices (Snapdragon, Mali, iPhone), cloud render can still be useful if user wants to save battery/RAM,
  // or they can choose client mode with mobile-safe settings.
  return {
    shouldDisable: false,
    reason: 'Cloud rendering available as a secondary alternative (e.g. for low-power mobile or headless servers).',
  };
}

/**
 * Generates a complete Hardware and Environment Profile for the current machine/browser.
 */
export function getHardwareEnvironmentProfile(): HardwareEnvironmentProfile {
  const { os, environment, isMobileOrTablet } = detectPlatform();
  const gpu = detectGpu();
  const cpuCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const deviceMemoryGb = typeof navigator !== 'undefined' ? (navigator as any).deviceMemory : undefined;
  const optimalSettings = computeOptimalGpuSettings(gpu, environment);
  const { shouldDisable, reason } = evaluateCloudRenderDisabling(environment, gpu);

  return {
    environment,
    os,
    isMobileOrTablet,
    isLocalPc: environment === 'local-pc',
    isCloudServer: environment === 'cloud-server',
    cpuCores,
    deviceMemoryGb,
    gpu,
    optimalSettings,
    shouldDisableCloudRender: shouldDisable,
    cloudRenderRecommendationReason: reason,
  };
}

/**
 * React Hook for inspecting hardware environment & GPU settings.
 */
export function useHardwareEnvironment() {
  const [profile, setProfile] = React.useState<HardwareEnvironmentProfile>(getHardwareEnvironmentProfile);

  React.useEffect(() => {
    // Re-evaluate profile in browser after component mount
    setProfile(getHardwareEnvironmentProfile());
  }, []);

  const toggleForceDisableCloud = (disable: boolean) => {
    setForceDisableCloudRender(disable);
    setProfile(getHardwareEnvironmentProfile());
  };

  return {
    profile,
    gpu: profile.gpu,
    optimalSettings: profile.optimalSettings,
    shouldDisableCloudRender: profile.shouldDisableCloudRender,
    cloudReason: profile.cloudRenderRecommendationReason,
    toggleForceDisableCloud,
  };
}
