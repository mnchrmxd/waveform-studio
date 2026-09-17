# AGENTS.md — Waveform Studio Engineering Methodology & Architectural Directives

> **Document Version:** 1.0.0  
> **Status:** Active / Authoritative System Specification  
> **Evolution Model:** Strictly Versioned & Append-Only (See [Section 1: Versioning Protocol](#1-document-versioning--append-only-evolution-protocol))  
> **Scope:** Full-stack architecture, 2D canvas graphics, WebCodecs & FFmpeg headless rendering, alpha transparency pipelines, audio DSP / FFT analysis, design systems, and headless REST APIs.

---

## Table of Contents

1. [Document Versioning & Append-Only Evolution Protocol](#1-document-versioning--append-only-evolution-protocol)
2. [Executive Architecture & Technology Stack](#2-executive-architecture--technology-stack)
3. [Dual-Engine Rendering Paradigm](#3-dual-engine-rendering-paradigm)
4. [Alpha Rendering & Transparency Pipeline Methodology (Deep Dive)](#4-alpha-rendering--transparency-pipeline-methodology-deep-dive)
   - 4.1 [The Role of Alpha Transparency in Audio Visualization](#41-the-role-of-alpha-transparency-in-audio-visualization)
   - 4.2 [2D Canvas Frame Buffer & ClearRect Protocol](#42-2d-canvas-frame-buffer--clearrect-protocol)
   - 4.3 [Background Layer Suppression & State Isolation](#43-background-layer-suppression--state-isolation)
   - 4.4 [Glow, Shadow, and Anti-Aliasing Alpha Math](#44-glow-shadow-and-anti-aliasing-alpha-math)
   - 4.5 [Client GPU WebCodecs VP9 Alpha Pipeline](#45-client-gpu-webcodecs-vp9-alpha-pipeline)
   - 4.6 [Cloud Headless Node.js + FFmpeg VP9 Alpha Pipeline](#46-cloud-headless-nodejs--ffmpeg-vp9-alpha-pipeline)
   - 4.7 [Lossless PNG Image Sequence (ZIP) Fallback](#47-lossless-png-image-sequence-zip-fallback)
   - 4.8 [Edge Artifact & Dark-Halo Prevention Math](#48-edge-artifact--dark-halo-prevention-math)
5. [Design Guidelines & Aesthetic Philosophy](#5-design-guidelines--aesthetic-philosophy)
   - 5.1 [Anti-Slop Directives & Visual Hygiene](#51-anti-slop-directives--visual-hygiene)
   - 5.2 [Color Foundations & Neutrals Management](#52-color-foundations--neutrals-management)
   - 5.3 [The 7 Visualizer Styles & Geometric Math](#53-the-7-visualizer-styles--geometric-math)
   - 5.4 [Color Representation Modes & Vector Math](#54-color-representation-modes--vector-math)
   - 5.5 [Joint / Edge & Profile Tapering Curves](#55-joint--edge--profile-tapering-curves)
   - 5.6 [Typography, Spacing, and Mathematical Layout Rules](#56-typography-spacing-and-mathematical-layout-rules)
   - 5.7 [Canvas Framing & Aspect Ratio Presets](#57-canvas-framing--aspect-ratio-presets)
6. [Audio Engine, Spectral Analysis & Time-Stepping](#6-audio-engine-spectral-analysis--time-stepping)
   - 6.1 [Real-Time Web Audio Graph](#61-real-time-web-audio-graph)
   - 6.2 [Radix-2 Cooley-Tukey Offline FFT Analyzer](#62-radix-2-cooley-tukey-offline-fft-analyzer)
   - 6.3 [Temporal Smoothing & Dynamic Range Compression](#63-temporal-smoothing--dynamic-range-compression)
   - 6.4 [Deterministic Time-Stepping Protocol](#64-deterministic-time-stepping-protocol)
7. [REST API, Webpage Renderer & Telemetry Stream](#7-rest-api-webpage-renderer--telemetry-stream)
   - 7.1 [Headless Direct Render vs. Web Request Paradigms](#71-headless-direct-render-vs-web-request-paradigms)
   - 7.2 [Server-Sent Events (SSE) Live Telemetry Stream](#72-server-sent-events-sse-live-telemetry-stream)
   - 7.3 [CORS Resource Proxy Engine](#73-cors-resource-proxy-engine)
8. [Codebase Anatomy & Modular Contracts](#8-codebase-anatomy--modular-contracts)
   - 8.1 [Directory Hierarchy & Component Boundaries](#81-directory-hierarchy--component-boundaries)
   - 8.2 [System Invariants (Non-Negotiable Rules)](#82-system-invariants-non-negotiable-rules)
9. [Version Evolution Log (Append-Only Registry)](#9-version-evolution-log-append-only-registry)

---

## 1. Document Versioning & Append-Only Evolution Protocol

### 1.1 The Append-Only Invariant for Future AI Agents
This file (`AGENTS.md`) is the master architectural and methodology guide for Waveform Studio. It is consumed by AI coding agents and human engineers alike.

**MANDATORY RULE FOR FUTURE AGENTS:**
> **DO NOT overwrite, delete, replace, or prune previous methodology sections when updating this file.**
> 
> All future changes, enhancements, deprecations, or architectural shifts **MUST be appended** to the document as a new version entry under [Section 9: Version Evolution Log](#9-version-evolution-log-append-only-registry) or as dedicated amendment addenda. If an existing pattern is superseded, add an explicit deprecation note pointing to the newer version section rather than rewriting historical documentation.
> 
> This preserves full historical provenance, design intent, and rationale across conversational and multi-turn development cycles.

### 1.2 Version Numbering Scheme
We utilize Semantic Versioning for documentation:
- **Patch increments (`x.y.Z`)**: Clarifications, code snippet corrections, parameter updates, bug mitigations.
- **Minor increments (`x.Y.0`)**: Addition of new visualizer styles, themes, export formats, API endpoints, or shader algorithms.
- **Major increments (`X.0.0`)**: Fundamental engine re-architectures, API breaking changes, or rendering pipeline replacements.

---

## 2. Executive Architecture & Technology Stack

Waveform Studio is a full-stack audio-reactive video rendering platform that achieves 100% parity between real-time browser preview, in-browser hardware-accelerated export, and cloud headless video generation.

### 2.1 Technology Stack Matrix
- **Runtime Environment**: Node.js (v20+ LTS) running Express 4.x on port `3000` (`0.0.0.0`).
- **Client Frontend**: React 19, TypeScript 5.8+, Vite 6, Tailwind CSS 4 (`@tailwindcss/vite`), Lucide Icons, Motion (`motion/react`).
- **Client Video Encoding**: WebCodecs API (`VideoEncoder`, `VideoFrame`) paired with `webm-muxer` (VP9 with alpha channel) and `mp4-muxer` (H.264 AVC). MediaRecorder fallback for legacy browsers.
- **Server Video Encoding**: Headless Skia 2D Canvas (`@napi-rs/canvas`) piped directly into `ffmpeg-static` via raw uncompressed RGBA standard input (`pipe:0`).
- **Audio DSP Engine**: Dual-mode engine:
  1. *Real-time*: Browser `AudioContext` + `AnalyserNode` with biquad band splitting.
  2. *Offline/Headless*: Custom Cooley-Tukey Radix-2 FFT analyzer (`fftAnalyzer.ts`) with precomputed twiddle factors and bit-reversal lookup tables.
- **Inter-Process & Network Communication**: Server-Sent Events (SSE) for live frame-by-frame export telemetry; reverse proxy for cross-origin audio streaming.

---

## 3. Dual-Engine Rendering Paradigm

Waveform Studio is intentionally designed around two mutually reinforcing rendering engines that share the exact same mathematical drawing routines (`visualizerRenderer.ts`).

```
                              +----------------------------+
                              |    User Audio & Config     |
                              +--------------+-------------+
                                             |
                     +-----------------------+-----------------------+
                     |                                               |
                     v                                               v
        [ Client GPU Engine ]                           [ Cloud Headless Engine ]
     (In-Browser / WebCodecs API)                    (Node.js + @napi-rs/canvas + FFmpeg)
                     |                                               |
       Web Audio OfflineAudioContext                 OfflineAudioAnalyzer (Cooley-Tukey)
                     |                                               |
       OffscreenCanvas / HTML5 Canvas                 Skia Canvas (@napi-rs/canvas)
                     |                                               |
          renderVisualizerFrame()                         renderVisualizerFrame()
                     |                                               |
    VideoFrame(canvas, {alpha: 'keep'})                 canvas.data() -> Raw RGBA Buffer
                     |                                               |
     VideoEncoder (vp09.xx / avc1.xx)                   FFmpeg pipe:0 (-c:v libvpx-vp9)
                     |                                               |
       webm-muxer / mp4-muxer                         yuva420p (Alpha) / yuv420p (MP4)
                     |                                               |
                     +-----------------------+-----------------------+
                                             |
                                             v
                              +----------------------------+
                              |   Final Video / PNG ZIP    |
                              +----------------------------+
```

### 3.1 Client GPU Engine (WebCodecs)
- **Execution Target**: Browser UI (`fastVideoExporter.ts`).
- **Mechanism**: Renders offline canvas frames at discrete timestamps ($t = f / \text{fps}$), converts each canvas frame to a `VideoFrame` with `{ alpha: 'keep' }`, and submits it to hardware-accelerated `VideoEncoder`.
- **Muxing**: `webm-muxer` captures VP9 video tracks and merges 16-bit PCM WAV audio.
- **Benefits**: Zero server CPU load, client-side data privacy, works in air-gapped or static web deployments.
- **Backpressure**: Controlled via `encoder.encodeQueueSize`; throttles frame generation if queue exceeds 4 frames to avoid GPU memory starvation.

### 3.2 Cloud Server Engine (Headless Node.js + FFmpeg)
- **Execution Target**: Node.js microservice (`headlessRenderer.ts`).
- **Mechanism**: Runs headlessly on Linux/macOS/Windows servers. Allocates a `@napi-rs/canvas` Skia surface, computes FFT spectrum via `OfflineAudioAnalyzer`, draws via `renderVisualizerFrame()`, extracts the raw pixel buffer via `canvas.data()`, and pipes it into an FFmpeg child process.
- **Muxing**: FFmpeg encodes the video stream and muxes the source audio track with sub-millisecond synchronization.
- **Benefits**: Can run via cron, REST API, or command-line scripts; zero client battery/GPU drain.

---

## 4. Alpha Rendering & Transparency Pipeline Methodology (Deep Dive)

Alpha transparency rendering is one of the foundational architectural features of Waveform Studio. It allows creators to produce animated audio visualizer overlays for integration into video editors (DaVinci Resolve, Adobe Premiere Pro, Final Cut Pro, Apple Motion, CapCut, OBS Studio) without requiring chroma keying (green screen removal).

### 4.1 The Role of Alpha Transparency in Audio Visualization
Standard video containers (such as MP4 with H.264 `yuv420p`) discard the alpha channel entirely, flattening semi-transparent pixels onto an opaque background. If a creator exports an audio visualizer on a black background and keys it out in an NLE, anti-aliased edges and ambient bar glows produce dark, muddy fringe artifacts.

Waveform Studio provides true 32-bit RGBA and YUVA transparent video delivery through:
1. Transparent WebM containers using Google VP9 with alpha channel preservation (`yuva420p`).
2. Frame-by-frame 32-bit PNG sequences packaged in-memory into a ZIP archive.

### 4.2 2D Canvas Frame Buffer & ClearRect Protocol
At the beginning of each rendered frame in `renderVisualizerFrame()`:

```typescript
// Explicit canvas clearing maintaining 0x00000000 RGBA
ctx.save();
ctx.clearRect(0, 0, width, height);
```

#### Key Technical Rules:
1. **Never use `ctx.fillRect` with a background color when `backgroundType === 'transparent'`**: The canvas must remain an empty, zero-alpha pixel surface ($R=0, G=0, B=0, A=0$).
2. **Context Save / Restore Pairs**: Every isolated rendering step (avatar clipping, watermark text, spectrum bars) must be encapsulated in a `ctx.save()` / `ctx.restore()` block to prevent state leaks of clipping regions or global composite operations.

### 4.3 Background Layer Suppression & State Isolation
In `visualizerRenderer.ts`, the background rendering block is strictly guarded:

```typescript
// 1. Render Background (Skipped entirely for transparent alpha stages/exports)
if (settings.backgroundType !== 'transparent') {
  if (backgroundVideo && backgroundVideo.readyState >= 2) {
    // Draw and dim video frame
  } else {
    const cachedBg = getCachedBackground(width, height, settings, theme, ...);
    if (cachedBg) {
      ctx.drawImage(cachedBg, 0, 0);
    }
  }
}
```

When `backgroundType === 'transparent'`, `getCachedBackground()` immediately returns `null` without executing CPU-heavy canvas blurs or gradient fills.

### 4.4 Glow, Shadow, and Anti-Aliasing Alpha Math
Audio visualizer bars frequently employ ambient glows (`glowIntensity > 0`) using `ctx.shadowBlur` and `ctx.shadowColor`.
In an alpha-enabled pipeline:
- **Premultiplied Alpha Interaction**: Canvas 2D engines compute shadow colors using alpha blending. A shadow color formatted as `hexToRgba(primaryColor, 0.4)` will blend against the transparent background by placing color values into the RGB channels while setting the alpha channel to $0.4$.
- **Sub-Pixel Anti-Aliasing**: Rounded bar corners (`barRadius > 0`) and bezier curve strokes (`smooth-wave`) compute sub-pixel coverage coefficients. When exported to an alpha-capable video codec, these edge pixels retain partial opacity ($0 < \alpha < 1$), producing clean edges when superimposed over complex video footage.

### 4.5 Client GPU WebCodecs VP9 Alpha Pipeline
Modern browsers (Chromium, Edge) support hardware/software VP9 video encoding with alpha preservation via the W3C WebCodecs specification.

#### 4.5.1 Codec Profile Negotiation
In `fastVideoExporter.ts`, `findOptimalVideoConfig()` performs feature detection:

```typescript
export function getVp9CodecString(width: number, height: number, fps: number): string {
  const maxDim = Math.max(width, height);
  if (maxDim > 1920) return 'vp09.00.51.08'; // Level 5.1 for 4K
  if (maxDim > 1280) return fps > 30 ? 'vp09.00.41.08' : 'vp09.00.40.08'; // Level 4.1 for 1080p60
  return 'vp09.00.31.08'; // Level 3.1 for 720p
}
```

The candidate matrix tests acceleration and latency modes:
1. `prefer-hardware` + `realtime`
2. `no-preference` + `realtime`
3. `prefer-software` + `realtime`
4. `prefer-software` + `quality`

#### 4.5.2 The `alpha: 'keep'` Requirement
Crucially, the configuration object passed to `VideoEncoder.configure()` must include:

```typescript
const encoderConfig: VideoEncoderConfig = {
  codec: vp9LevelCodec,
  width,
  height,
  bitrate: 8_000_000,
  framerate: fps,
  alpha: 'keep', // Mandates alpha channel retention in encoder bitstream
  latencyMode: 'realtime',
};
```

When constructing each frame from the rendering canvas:

```typescript
const videoFrame = new VideoFrame(canvas, {
  timestamp: Math.round((frameIndex / fps) * 1_000_000), // Microseconds
  alpha: 'keep', // Instructs frame copy to retain alpha buffer
});
encoder.encode(videoFrame);
videoFrame.close(); // Immediate memory release
```

#### 4.5.3 Container Muxing with `webm-muxer`
The encoded chunks are muxed via `webm-muxer`, explicitly configured for VP9 video and 16-bit PCM WAV audio:

```typescript
const muxer = new Muxer({
  target: new ArrayBufferTarget(),
  video: {
    codec: 'V_VP9',
    width,
    height,
    alpha: true, // Configures WebM TrackEntry with Alpha flag
  },
  audio: {
    codec: 'A_OPUS' || 'A_PCM/INT/LIT',
    numberOfChannels: 2,
    sampleRate: 44100,
  },
  firstTimestampBehavior: 'offset',
});
```

### 4.6 Cloud Headless Node.js + FFmpeg VP9 Alpha Pipeline
On the server side (`src/server/headlessRenderer.ts`), rendering occurs without a display or GPU driver using Skia via `@napi-rs/canvas`.

#### 4.6.1 Pixel Buffer Extraction
The canvas surface writes directly to native Skia memory. Calling `canvas.data()` yields an uncompressed raw 32-bit `Buffer` of RGBA pixels ($4 \times W \times H$ bytes).

#### 4.6.2 FFmpeg Process Construction
FFmpeg is spawned as a child process using binary paths resolved by `ffmpeg-static`:

```typescript
const ffmpegArgs: string[] = [
  '-y',
  '-f', 'rawvideo',
  '-pix_fmt', 'rgba',          // Ingests 32-bit RGBA from Node.js canvas.data()
  '-s', `${width}x${height}`,
  '-r', fps.toString(),
  '-i', 'pipe:0',              // Standard input stream
  '-ss', '0',
  '-t', maxDuration.toString(),
  '-i', audioInputPath,        // Synced audio input
];
```

#### 4.6.3 Codec Arguments for Transparent WebM
When `format === 'webm'` and transparency is active:

```typescript
ffmpegArgs.push(
  '-c:v', 'libvpx-vp9',
  '-pix_fmt', isTransparent ? 'yuva420p' : 'yuv420p',
  '-auto-alt-ref', '0',        // CRITICAL: Disables alternate reference frames
  '-deadline', 'realtime',
  '-cpu-used', '8',
  '-row-mt', '1',
  '-threads', '0',
  '-b:v', '6M',
  '-c:a', 'libopus',
  '-b:a', '128k',
  '-shortest',
  outputPath
);
```

#### 4.6.4 The Invariant of `-auto-alt-ref 0`
> **CRITICAL ARCHITECTURAL REQUIREMENT:**  
> When encoding VP9 with alpha (`yuva420p`) in FFmpeg, the flag `-auto-alt-ref 0` is **MANDATORY**.  
> If omitted or set to `1`, FFmpeg's `libvpx-vp9` encoder produces invisible temporal forward-reference frames that standard video decoders (QuickTime, DaVinci, Premiere Pro, Chrome) cannot reconcile with the separate alpha plane. Omitting this flag results in videos rendering with pitch-black backgrounds or crashing playback engines.

#### 4.6.5 Stream Backpressure & Pipe Draining
Piping raw 1080p60 RGBA frames ($1920 \times 1080 \times 4 \approx 8.29\text{ MB/frame}$) into FFmpeg can generate over 500 MB of uncompressed memory per second.
To prevent out-of-memory crashes:

```typescript
const canWrite = ffmpeg.stdin.write(frameData);
if (!canWrite) {
  // Wait until FFmpeg's OS pipe buffer drains before rendering next frame
  await new Promise<void>((res) => ffmpeg.stdin.once('drain', res));
}
```

### 4.7 Lossless PNG Image Sequence (ZIP) Fallback
For VFX artists and 3D compositors who require uncompressed frame sequences, Waveform Studio includes a client-side PNG sequence exporter using `jszip`:
- Each frame is converted to a PNG Blob via `canvas.toBlob('image/png')`.
- Frames are named with zero-padded sequences (`frame_000001.png`, `frame_000002.png`).
- Stored without compression (`compression: "STORE"`) inside the ZIP to maximize rendering throughput.
- Accompanied by the trimmed master audio file (`audio.wav`).

### 4.8 Edge Artifact & Dark-Halo Prevention Math
When rendering visualizer elements onto a transparent canvas:
1. **Never use additive blending on transparent surfaces**: `ctx.globalCompositeOperation = 'lighter'` assumes a black backing. In transparent mode, use `source-over`.
2. **Avatar Border Feathering**: When rendering profile images in circle or rounded shapes, clipping paths must draw borders on top of the clipped image with `ctx.stroke()` rather than creating a gap between the clipped image and the border.

---

## 5. Design Guidelines & Aesthetic Philosophy

Waveform Studio rejects generic "AI-slop" aesthetics (monotonous cyan-on-dark glow palettes, uncalibrated border radii, nested card spam). Every visual decision follows deliberate mathematical and acoustic principles.

### 5.1 Anti-Slop Directives & Visual Hygiene
1. **No Gratuitous Neon Blurs**: Glows are strictly tied to acoustic amplitude. At zero volume, bar glows decay to zero.
2. **No Arbitrary Glassmorphism in Dark Mode**: Background cards in the studio interface maintain disciplined contrast ($\le 7\%$ difference in light mode, $\le 12\%$ in dark mode).
3. **No Unrequested Landing Pages / Hero Sections**: The studio application presents the working workspace immediately upon loading.
4. **Nested Radius Formula**: When a rounded element sits inside a container:
   $$\text{Radius}_{\text{inner}} = \text{Radius}_{\text{outer}} - \text{Padding}$$

### 5.2 Color Foundations & Neutrals Management
- **OLED Black (`oled-black`)**: Absolute `#000000` for pure OLED contrast.
- **Dark Studio (`dark-studio`)**: Deep zinc neutral `#09090b` with subtle radial vignette.
- **Light Canvas (`light-canvas`)**: Clean architectural slate gradient (`#f8fafc` to `#e2e8f0`).
- **Theme Color Palette Registry**:
  - `cyber-cyan`: Cyan (`#06b6d4`) to Magenta (`#ec4899`).
  - `electric-indigo`: Indigo (`#6366f1`) to Violet (`#a855f7`).
  - `sunset-ember`: Orange (`#f97316`) to Crimson (`#ef4444`).
  - `emerald-mint`: Emerald (`#10b981`) to Lime (`#84cc16`).
  - `monochrome-luxe`: Platinum (`#e4e4e7`) to Slate (`#a1a1aa`).
  - `solar-flare`: Amber (`#fbbf24`) to Rose (`#f43f5e`).
  - `nordic-frost`: Sky (`#38bdf8`) to Teal (`#2dd4bf`).

### 5.3 The 7 Visualizer Styles & Geometric Math

```
1. Mirrored Bars   2. Bars Up         3. Smooth Wave      4. Radial
   | | | | | |        | | | | | |            .-.             \ | /
---|---|---|---|---   -----------        .--'   '--.        -- O --
   | | | | | |                                               / | \

5. Digital Matrix  6. Spine           7. Spectrum Bands
   : : : : : :        -|- -|- -|-        [===] [===] [===]
   : : : : : :        ---|---|---        [===] [===] [===]
```

1. **Mirrored Bars (`mirrored-bars`)**: Center-anchored vertical bars extending symmetrically upwards and downwards from the midline.
2. **Bars Up / Spectrum Bars (`bars-up`)**: Bottom-anchored vertical bars extending upwards with rounded caps.
3. **Smooth Wave (`smooth-wave`)**: Continuous cubic Bezier spline connecting interpolated frequency points.
4. **Radial Spectrum (`radial`)**: 360-degree circular visualizer expanding outwards from a center radius ($r_{\text{inner}}$) around an avatar badge.
5. **Digital Matrix (`digital-matrix`)**: Segmented vertical led-style matrix with discrete rectangular blocks.
6. **Spine (`spine`)**: Central organic vertebra axis with lateral audio-reactive rib vectors.
7. **Spectrum Bands (`spectrum-bands`)**: Grouped logarithmic frequency band blocks (Sub-Bass, Bass, Low-Mid, High-Mid, Presence, Brilliance).

### 5.4 Color Representation Modes & Vector Math
In `getVisualizerGradient()`, colors are mapped across the visualizer using coordinate math:
- **`bottom-to-top`**: Linear gradient $(0, y+h)$ to $(0, y)$.
- **`top-to-bottom`**: Linear gradient $(0, y)$ to $(0, y+h)$.
- **`left-to-right`**: Linear gradient $(x, 0)$ to $(x+w, 0)$.
- **`right-to-left`**: Linear gradient $(x+w, 0)$ to $(x, 0)$.
- **`inside-out-horizontal`**: 3-stop linear gradient; primary color at avatar center, secondary gradient color at outer edges.
- **`inside-out-vertical`**: 3-stop vertical gradient transitioning from center outwards.
- **`inside-out-circular`**: Radial gradient centered on avatar position $(c_x, c_y)$ expanding to bounding radius.
- **`alternate-bars`**: Alternates primary and secondary colors on odd/even bar indices.

### 5.5 Joint / Edge & Profile Tapering Curves
To prevent visualizer bars from abruptly ending at the canvas boundaries or clipping awkwardly against the center avatar, Waveform Studio implements mathematical tapering:

```typescript
function calculateTaperFactor(
  index: number,
  totalBars: number,
  jointWidthPct: number,
  jointCurve: 'smooth' | 'linear' | 'cubic'
): number {
  const taperZone = Math.max(1, Math.floor(totalBars * (jointWidthPct / 100)));
  let factor = 1.0;

  // Outer Edge Tapering
  if (index < taperZone) {
    factor = index / taperZone;
  } else if (index >= totalBars - taperZone) {
    factor = (totalBars - 1 - index) / taperZone;
  }

  // Curve geometry transformation
  if (jointCurve === 'smooth') {
    // Hermite smoothstep: 3x^2 - 2x^3
    return factor * factor * (3 - 2 * factor);
  } else if (jointCurve === 'cubic') {
    return Math.pow(factor, 3);
  }
  return factor; // Linear
}
```

### 5.6 Typography, Spacing, and Mathematical Layout Rules
- **Display & Header Typography**: Clean contemporary sans fonts with optical tracking (`tracking-tight` on headings).
- **Timecode / Telemetry Metrics**: Must use tabular numbers (`font-mono` or `tabular-nums`) to prevent jitter during live playback and frame export counters.
- **Button Spacing Rule**: Horizontal padding must equal $2 \times$ vertical padding (e.g. `px-4 py-2`).

### 5.7 Canvas Framing & Aspect Ratio Presets
The canvas supports dynamic geometry transforms:
- `16:9` (1920x1080 / 1280x720) — YouTube, Desktop Video.
- `9:16` (1080x1920 / 720x1280) — TikTok, Instagram Reels, YouTube Shorts.
- `1:1` (1080x1080) — Instagram Feed, Square Socials.
- `21:9` (2560x1080) — Cinematic Ultrawide.
- `3:1` (1800x600) — Twitter / Web Banners.
- `responsive` — Fluid viewport container matching.

---

## 6. Audio Engine, Spectral Analysis & Time-Stepping

### 6.1 Real-Time Web Audio Graph
In the browser client, real-time preview utilizes a standard Web Audio graph:

```
[ Audio Element / Buffer Source ]
                |
                v
       [ BiquadFilterNode ] (Optional Bass Boost / Cut)
                |
                v
       [ AnalyserNode ] (fftSize: 2048, smoothingTimeConstant: 0.8)
                |
                +-------------------> [ GainNode ] -> [ AudioDestinationNode ]
                |
                v
       getByteFrequencyData() -> Float32Array (Render Loop)
```

### 6.2 Radix-2 Cooley-Tukey Offline FFT Analyzer
For deterministic video rendering (both client WebCodecs and cloud FFmpeg), the real-time `AnalyserNode` cannot be used because it cannot be stepped backwards or advanced frame-by-frame faster than real-time.
`src/services/fftAnalyzer.ts` implements a high-performance offline discrete Fourier transform:

1. **Precomputed Twiddle & Bit-Reversal Tables**: Bit-reversal indices and $\sin/\cos$ factors for $N=1024$ points are computed once in `getFFTCache(n)`:
   $$W_N^k = \exp\left(-\frac{2\pi i k}{N}\right) = \cos\left(\frac{2\pi k}{N}\right) - i\sin\left(\frac{2\pi k}{N}\right)$$
2. **Hann Windowing**: Each time slice is multiplied by a Hann window function to minimize spectral leakage:
   $$w[n] = 0.5 \left(1 - \cos\left(\frac{2\pi n}{N - 1}\right)\right)$$
3. **Sub-Band Energy Aggregation**:
   - **Bass**: $20\text{ Hz} - 250\text{ Hz}$ (drives avatar scale pulsing).
   - **Mids**: $250\text{ Hz} - 4000\text{ Hz}$.
   - **Highs**: $4000\text{ Hz} - 20000\text{ Hz}$.

### 6.3 Temporal Smoothing & Dynamic Range Compression
1. **Exponential Moving Average (EMA)**:
   $$S_t[k] = \alpha S_{t-1}[k] + (1 - \alpha) X_t[k]$$
   where $\alpha$ is the user's `smoothing` setting ($0 \le \alpha \le 1$).
2. **Soft-Knee Peak Compression**:
   Audio visualizers look poor when waveforms clip against the top boundary. When `softKneeCompression: true`:
   $$y = \begin{cases} 
   x & \text{for } x < T \\
   T + (1 - T) \tanh\left(\frac{x - T}{1 - T}\right) & \text{for } x \ge T 
   \end{cases}$$
   where threshold $T \approx 0.75$. This yields smooth organic saturation.

### 6.4 Deterministic Time-Stepping Protocol
Video export must never drop frames, even under heavy CPU/GPU load.
- Frame index $f$ directly dictates audio time:
  $$t = \frac{f}{\text{fps}}$$
- Total frames: $N_{\text{total}} = \lfloor \text{duration} \times \text{fps} \rfloor$.
- Audio analysis at time $t$ samples the audio buffer at exactly:
  $$\text{sampleIndex} = \lfloor t \times \text{sampleRate} \rfloor$$
- This guarantees identical output between a 10-second render on an M3 Max and a 5-minute render on a low-power cloud container.

---

## 7. REST API, Webpage Renderer & Telemetry Stream

### 7.1 Headless Direct Render vs. Web Request Paradigms
The platform provides two server-side video generation pathways:

1. **Direct Headless (`POST /api/render-video`)**:
   - Accepts JSON payload with base64 audio, theme, settings, and dimension options.
   - Executes entirely within Node.js via Skia and FFmpeg.
   - Synchronously streams the finished MP4 or WebM video file upon completion.

2. **Web Request Paradigm (`POST /api/render-job`)**:
   - Generates an asynchronous rendering job with a unique UUID (`jobId`).
   - Serves an interactive dedicated render page at `GET /render?jobId=:jobId`.
   - Allows external automated browser agents (Puppeteer, Playwright) or human operators to monitor live canvas frames in real time.
   - Telemetry accessible via SSE (`GET /api/render-progress/:jobId`).
   - Finished asset downloadable at `GET /api/render-download/:jobId`.

### 7.2 Server-Sent Events (SSE) Live Telemetry Stream
Clients subscribe to `GET /api/render-progress/:jobId` to receive a real-time event stream:

```
event: progress
data: {"jobId":"job_1710654000","progress":0.45,"currentFrame":270,"totalFrames":600,"fps":58.4,"elapsedSec":4.6,"etaSec":5.6,"status":"rendering"}
```

When finished:
```
event: complete
data: {"jobId":"job_1710654000","downloadUrl":"/api/render-download/job_1710654000","fileSizeBytes":14285910,"duration":10.0}
```

### 7.3 CORS Resource Proxy Engine
Browsers restrict loading remote audio files or artwork from third-party URLs due to CORS policies.
Waveform Studio includes `GET /api/proxy?url=<encoded_url>`:
- Validates protocols (`http:`, `https:`).
- Sets `Access-Control-Allow-Origin: *`.
- Streams remote audio buffers with intact `Content-Type` headers for Web Audio decoding.

---

## 8. Codebase Anatomy & Modular Contracts

### 8.1 Directory Hierarchy & Component Boundaries

```
├── server.ts                       # Express server, REST endpoints, Vite middleware integration
├── src/
│   ├── types.ts                    # Canonical TypeScript interfaces, styles, themes, export configs
│   ├── data/
│   │   ├── presets.ts              # Built-in sample audio, theme definitions, default settings
│   ├── services/
│   │   ├── audioEngine.ts          # Real-time Web Audio graph & microphone streaming
│   │   ├── fastVideoExporter.ts    # Client GPU WebCodecs VP9/H.264 exporter & PNG sequence
│   │   ├── fftAnalyzer.ts          # Radix-2 Cooley-Tukey offline FFT analyzer & EMA smoother
│   │   ├── visualizerRenderer.ts   # Shared 2D Canvas rendering routines (7 styles, alpha, gradients)
│   │   └── cloudDetection.ts       # Runtime health probe (/api/health) & fallback router
│   ├── server/
│   │   └── headlessRenderer.ts     # Node.js Skia + FFmpeg child-process video generator
│   ├── utils/
│   │   ├── defaultAvatar.ts        # Built-in SVG/vector placeholder profile badges
│   │   └── imageLoader.ts          # Safe HTMLImageElement / ImageBitmap async loaders
│   ├── components/
│   │   ├── Header.tsx              # Top navigation, engine indicator, aspect ratio selector
│   │   ├── VisualizerCanvas.tsx    # Live interactive preview stage with ResizeObserver
│   │   ├── ControlPanel.tsx        # Tabs for Styles, Themes, Geometry, Dynamics, Overlays
│   │   ├── AudioControls.tsx       # Transport controls, waveform scrubber, volume, mic toggle
│   │   ├── ExportModal.tsx         # Unified export modal (WebCodecs, Headless, Alpha, Terminal)
│   │   ├── BackgroundModal.tsx     # Background selector (transparent, solid, mesh, video, art)
│   │   ├── ProfileModal.tsx        # Avatar badge configuration (shape, border, audio-pulse)
│   │   └── PayloadGeneratorModal.ts# Code generator for cURL, Node.js, Python headless API calls
```

### 8.2 System Invariants (Non-Negotiable Rules)

1. **Port & Host Lockdown**: Dev and production servers must always bind to `0.0.0.0:3000`.
2. **Visual Parity**: `visualizerRenderer.ts` must remain the single source of truth for both browser rendering and server-side rendering. Never fork visualizer rendering logic into separate browser and server files.
3. **Transparent Alpha Preservation**: Any modification to `fastVideoExporter.ts` or `headlessRenderer.ts` must verify that transparent WebM files retain clean 32-bit alpha (`yuva420p`, `alpha: 'keep'`, `-auto-alt-ref 0`).
4. **Zero-Frame-Drop Determinism**: Time-stepping in export routines must remain strictly mathematical ($t = f / \text{fps}$); never tie export frames to `requestAnimationFrame` wall-clock timestamps.
5. **Backpressure Compliance**: Node.js raw video pipes and browser `VideoEncoder` queues must actively monitor backpressure to prevent runaway memory allocation.

---

## 9. Version Evolution Log (Append-Only Registry)

*Future agents: Record all architectural modifications, additions, or deprecations below this line. Do not modify or delete historical version blocks.*

### Version 1.0.0 — Initial Master Specification
- **Date**: 2026-09-17
- **Author**: Waveform Studio Architecture Team
- **Summary**:
  - Established formal dual-engine rendering paradigm (WebCodecs client GPU + Node.js/FFmpeg headless cloud engine).
  - Documented deep-dive alpha rendering mechanism, VP9 codec string heuristics, `-auto-alt-ref 0` FFmpeg requirement, and 2D canvas buffer clearing rules.
  - Formulated Anti-Slop visual guidelines, mathematical container spacing, nested radius calculations, and typography standards.
  - Specified Cooley-Tukey Radix-2 offline FFT mathematical foundations and deterministic time-stepping protocol.
  - Documented headless REST API endpoints, SSE live telemetry stream, and CORS proxy engine.
  - Formalized append-only document evolution protocol.

---
<!-- FUTURE AGENTS: Append Version 1.1.0 and subsequent additions here -->
