# Audio Waveform Studio & High-Speed Video Rendering Suite

A full-stack, studio-grade audio visualizer and video generation suite. Create real-time audio reactive animations directly in the browser or render videos programmatically via a headless REST API or hardware-accelerated **Web Request to Local Webpage Renderer**.

---

## What's New & Architecture Updates

1. **Unified Web Request & Video Export Architecture (GPU Accelerated)**:
   - Headless CPU rendering on restricted environments (such as Google Colab or low-core Node.js servers) can be CPU-bound.
   - The export video UI and webpage renderer are unified into a single coherent WebCodecs pipeline. You can submit a render job via `POST /api/render-job` and open the local webpage (`/render?jobId=...` or `/`) to execute the render using **hardware-accelerated WebCodecs**.
   - Features real-time Server-Sent Events (SSE) progress streaming (`GET /api/render-progress/:jobId`), detailed telemetry (current frame, total frames, active FPS, elapsed seconds), optional **Debug Mode** terminal toggle, and automatic file upload/download.
   - Retired arbitrary "Nx real-time" multipliers and placebo ETA estimates in favor of exact frame counts and live frame rendering throughput.

2. **Mobile UI Export Optimization (Zero Dropped Frames)**:
   - Mobile hardware encoders (Qualcomm, Apple Silicon, MediaTek) drop frames if frames are pushed faster than the encoder's internal pipeline drains.
   - The export engine uses `latencyMode: 'quality'`, removes desynchronized canvas contexts, and enforces active backpressure pacing (`encodeQueueSize <= 2`). Mobile exports maintain buttery-smooth 60 FPS / 30 FPS output with zero frame dropping.

3. **FFmpeg Headless Speed Boost**:
   - Server-side headless renders now use the `ultrafast` H.264 / VP9 preset, reducing CPU rendering bottlenecks for programmatic pipelines.

4. **Deprecation of Audio Duration & Trimming**:
   - Audio trimming inputs and duration overrides have been deprecated. The visualizer always decodes and renders the full audio track naturally from start to finish with zero awkward cutoffs.

---

## Features

- **Interactive Studio UI**:
  - Multiple visualizer styles: Mirrored Bars, Radial / Circular Spectrum, Glowing Waves, Vinyl Turntable, Reactive Particle Rings, and more.
  - Audio reactive dynamics with adjustable FFT smoothing, frequency weighting, peak hold, and soft-knee compression.
  - Profile badges (circular, hexagonal, rounded) and custom background album artwork.
  - Transparent video export mode (WebM with alpha channel / ProRes compatibility) for video overlay in Premiere, After Effects, DaVinci Resolve, or OBS.
  - Social media aspect ratio presets: `16:9` (YouTube / Landscape), `9:16` (TikTok / Reels / Shorts), `1:1` (Instagram Feed), and `21:9` (Cinematic Ultrawide).
  - Audio input options: File upload (MP3, WAV, AAC, FLAC, OGG), Remote URL streaming, built-in demo tracks, or live microphone capture.

- **Dual Rendering Paradigms**:
  1. **Web Request Browser Renderer (`POST /api/render-job` & `/render?jobId=...`)**:
     - Web-based local webpage rendering utilizing client GPU WebCodecs.
     - Ultra-fast frame throughput with live Server-Sent Events progress reporting.
  2. **Direct Server-Side Headless API (`POST /api/render-video`)**:
     - Node.js `@napi-rs/canvas` + FFmpeg (`ultrafast` preset).
     - Direct binary streaming or Base64 JSON output.
     - Live progress streaming via `X-Render-Job-Id`.

---

## Table of Contents

1. [Localhost Setup](#localhost-setup)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [Running the Server](#running-the-server)
   - [Verifying the Installation](#verifying-the-installation)
2. [General Usage (Web Studio)](#general-usage-web-studio)
   - [Loading Audio](#loading-audio)
   - [Customizing Visuals](#customizing-visuals)
   - [Rendering in Browser (Studio UI)](#rendering-in-browser-studio-ui)
   - [Hardware-Accelerated Webpage Renderer](#hardware-accelerated-webpage-renderer)
   - [Generating API Payloads](#generating-api-payloads)
3. [API Documentation](#api-documentation)
   - [API Endpoints Overview](#api-endpoints-overview)
   - [`POST /api/render-job` (Web Request Paradigm)](#post-apirender-job)
   - [`GET /api/render-progress/:jobId` (Live SSE Telemetry)](#get-apirender-progressjobid)
   - [`GET /api/render-status/:jobId`](#get-apirender-statusjobid)
   - [`GET /api/render-download/:jobId`](#get-apirender-downloadjobid)
   - [`POST /api/render-video` (Direct Headless)](#post-apirender-video)
   - [`GET /api/health`](#get-apihealth)
   - [`GET /api/proxy`](#get-apiproxy)
4. [API Code Examples](#api-code-examples)
   - [Web Request Workflow (cURL + Browser / Headless Chrome)](#web-request-workflow-curl--browser)
   - [Direct Headless cURL](#direct-headless-curl)
   - [Node.js Script](#nodejs-script)
   - [Python Script](#python-script)
5. [Configuration Schema Reference](#configuration-schema-reference)
6. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Localhost Setup

Follow these steps to clone and run the application locally on your machine.

### Prerequisites

1. **Node.js**: Version 18.0.0 or later (v20+ LTS recommended).
   - Check version:
     ```bash
     node -v
     npm -v
     ```
2. **FFmpeg**: Required for server-side headless video rendering (`POST /api/render-video`).
   - **macOS** (Homebrew):
     ```bash
     brew install ffmpeg
     ```
   - **Ubuntu / Debian**:
     ```bash
     sudo apt update && sudo apt install -y ffmpeg
     ```
   - **Windows** (Chocolatey / Winget):
     ```bash
     choco install ffmpeg
     # or
     winget install "FFmpeg (Shared)"
     ```
   - Verify FFmpeg is accessible in your `PATH`:
     ```bash
     ffmpeg -version
     ```

### Installation

1. Clone or download the repository into your local directory:
   ```bash
   git clone <repository-url>
   cd audio-waveform-visualizer
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

### Running the Server

#### Development Mode (with Live Reloading)
Runs Express on port `3000` with integrated Vite middleware:
```bash
npm run dev
```

The application will be accessible at:
- **Web Interface**: `http://localhost:3000`
- **Headless API**: `http://localhost:3000/api/render-video`

#### Production Build & Run
To test the standalone production build:
```bash
npm run build
npm start
```

### Verifying the Installation

Open your browser or run the following cURL command to check if the server is healthy:

```bash
curl http://localhost:3000/api/health
```

Expected output:
```json
{
  "status": "ok",
  "service": "Waveform Studio Headless Video Generator",
  "features": {
    "headlessRendering": true,
    "mp4Export": true,
    "transparentAlphaWebm": true,
    "fftAnalyzer": true
  }
}
```

---

## General Usage (Web Studio)

### Loading Audio
1. **Upload Audio**: Click the **Upload Audio** button in the header or drag-and-drop any audio file (`.mp3`, `.wav`, `.aac`, `.flac`, `.ogg`).
2. **Audio URL**: Click the **Audio URL** button in the header to stream or import audio directly from an online HTTP/HTTPS URL. The backend automatically handles CORS proxying.
3. **Demo Tracks**: Click **Demo Tracks** to pick from pre-synthesized tracks (Synthwave, Ambient, Drum & Bass, Chill Lo-Fi).
4. **Record Mic**: Click **Record** to record real-time audio directly from your microphone.

### Customizing Visuals
The side panel gives you granular control over every aspect of the animation:
- **Visualizer Style**: Select from 8+ waveform types: Mirrored Bars, Bars, Circular Radial, Glowing Waves, Vinyl, Particle Rings, etc.
- **Center Avatar / Badge**: Enable the center profile image, select shape (Circle, Square, Rounded, Hexagon), and either upload an image or provide an image URL.
- **Color Themes**: Select from built-in themes (Cyber Cyan, Neon Violet, Sunset Ember, Emerald Matrix, Golden Lux, Monochrome) or define custom RGB gradients.
- **Background**: Toggle between Dark Studio, Cyber Grid, Ambient Glow, Solid Color, Custom Background Artwork (via file or URL), or Transparent Mode.
- **Reactivity & Dynamics**: Tune FFT smoothing, bar count, sensitivity, and peak hold.

### Rendering in Browser (Studio UI)
1. Click **Export Video** in the top navigation header.
2. Choose your resolution (`720p`, `1080p Full HD`, `4K UHD`), frame rate (`30fps` or `60fps`), and format (`MP4` or `WebM`).
3. Toggle **Transparent Background** if you plan to overlay the video in Premiere Pro, DaVinci Resolve, or OBS.
4. Click **Render Video (WebCodecs)**. The export engine automatically handles backpressure pacing and quality latency modes to ensure 100% stable framerates without frame drops on both desktop and mobile devices.

### Unified Export & Webpage Renderer
- Export Video and the Webpage Renderer are completely unified into one seamless workflow.
- Opening `/render` or passing `?jobId=...` opens the Export Studio with the job configuration loaded and ready.
- **Debug Mode Toggle**: Click the **Debug Mode** button in the Export header to inspect live frame-by-frame console telemetry, sample rates, WebCodecs buffer state, and server sync logs.
- External systems (such as Colab or background worker scripts) can initiate high-speed GPU rendering inside a browser page via a simple web request (`POST /api/render-job`), which streams real-time progress back to the server and registers the finished MP4/WebM video for retrieval.

### Generating API Payloads
Inside the Export dialog, click **Payload Generator** (next to the Render button). 
- It automatically inspects your currently configured visualizer settings, active theme, selected audio, and uploaded artwork.
- Switch between **cURL**, **JSON**, and **Node.js** tabs.
- Click **Copy Code** or **Download Script** to run the render headlessly or through the Web Request pipeline.

---

## API Documentation

The server provides both a Web Request Job pipeline (recommended for fast GPU rendering with live telemetry) and a direct headless FFmpeg API.

### API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/render-job` | Registers a new render job. Returns webpage `renderUrl` and telemetry endpoints. |
| `GET` | `/render?jobId=:id` | Hardware-accelerated browser webpage renderer for the specified job. |
| `GET` | `/api/render-progress/:id` | **Server-Sent Events (SSE)** stream delivering live frame rendering telemetry. |
| `GET` | `/api/render-status/:id` | Pollable JSON status for a job (pending, rendering, completed, failed). |
| `GET` | `/api/render-download/:id` | Downloads the completed video file produced by the webpage or server. |
| `POST` | `/api/render-video` | Direct synchronous headless video render using FFmpeg (`ultrafast` preset). |
| `GET` | `/api/render-video/schema` | Returns the complete parameter schema and available theme definitions. |
| `GET` | `/api/health` | Healthcheck and capability verification. |
| `GET` | `/api/proxy?url=<url>` | Permissive CORS proxy utility for remote audio or image assets. |

---

### `POST /api/render-job` (Web Request Paradigm)

Creates a rendering job. Ideal when running on Colab or remote machines where pure CPU FFmpeg is too slow: you send the payload via web request, open the generated `renderUrl` in any browser or headless Chrome instance, and receive real-time progress telemetry.

#### Request Headers
- `Content-Type: application/json`

#### Request Body
```json
{
  "audio": "https://example.com/audio.mp3",
  "settings": {
    "style": "mirrored-bars",
    "barCount": 80,
    "heightScale": 1.2,
    "smoothing": 0.65,
    "backgroundType": "dark-studio",
    "trackTitle": "Neon Horizons",
    "artistName": "Cyber Resonance"
  },
  "theme": "cyber-cyan",
  "video": {
    "width": 1280,
    "height": 720,
    "fps": 60,
    "format": "mp4"
  }
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "jobId": "job_1725300000_abc12",
  "status": "pending",
  "renderUrl": "/render?jobId=job_1725300000_abc12",
  "statusUrl": "/api/render-status/job_1725300000_abc12",
  "progressUrl": "/api/render-progress/job_1725300000_abc12",
  "downloadUrl": "/api/render-download/job_1725300000_abc12",
  "message": "Job created. Open renderUrl in any browser for ultra-fast GPU rendering, or stream progress via progressUrl."
}
```

---

### `GET /api/render-progress/:jobId` (Live SSE Telemetry)

Subscribes to a real-time Server-Sent Events stream. The server pushes updates as each batch of frames is encoded.

#### Stream Payload Format (`text/event-stream`)
```json
data: {
  "jobId": "job_1725300000_abc12",
  "status": "rendering",
  "progress": 42,
  "currentFrame": 504,
  "totalFrames": 1200,
  "fps": 94,
  "elapsedSec": 5.3,
  "message": "Rendering frames in browser: 42% (94 FPS)",
  "timestamp": 1725300005300
}
```

---

### `POST /api/render-video` (Direct Headless)

Direct synchronous headless video rendering via Node.js Canvas and FFmpeg. Enhanced with FFmpeg's `ultrafast` preset to minimize CPU bottlenecks on Colab and cloud instances.

#### Request Headers
- `Content-Type: application/json`

#### Response
Streams the finished binary video (`video/mp4` or `video/webm`) as an attachment download, with the `X-Render-Job-Id` header attached for tracking.

---

### Field Details

| Field | Type | Description |
|---|---|---|
| `audio` | `string` | Base64 data URI (`data:audio/mp3;base64,...`), raw Base64 string, or remote HTTP URL. If omitted, synthesizes a clean demo chord. Audio is always rendered in its entirety. |
| `video.width` | `number` | Output video width in pixels (e.g. `1280`, `1920`, `1080`). Default: `1280`. |
| `video.height` | `number` | Output video height in pixels (e.g. `720`, `1080`, `1920`). Default: `720`. |
| `video.fps` | `number` | Frame rate (`30` or `60`). Default: `60` (or `30`). |
| `video.format` | `string` | `"mp4"` (H.264 / AAC) or `"webm"` (VP9 / Opus). Default: `"mp4"`. |
| `theme` | `string \| object` | Theme preset ID (`"cyber-cyan"`, `"neon-violet"`, `"sunset-ember"`, etc.) or custom `{ primaryColor, primaryGradientEnd, accentGlow }` object. |
| `settings` | `object` | Visualizer styling options (see [Configuration Schema Reference](#configuration-schema-reference)). |
| `profileImage` | `string` | Base64 data URI or remote HTTP URL for center avatar badge. |
| `backgroundImage` | `string` | Base64 data URI or remote HTTP URL for background artwork. |

*(Note: Audio duration and trimming controls are deprecated. The renderer automatically decodes the complete audio file, eliminating cutoff glitches.)*

---

## API Code Examples

### Web Request Workflow (cURL + Browser)

**1. Create Render Job via Web Request:**
```bash
curl -X POST http://localhost:3000/api/render-job \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "https://cdn.freesound.org/previews/612/612627_11861866-lq.mp3",
    "video": { "width": 1280, "height": 720, "fps": 60, "format": "mp4" },
    "settings": { "style": "mirrored-bars", "trackTitle": "Web Visualizer" },
    "theme": "cyber-cyan"
  }'
```

**2. Open Webpage in Browser (or Headless Chrome on Colab):**
```bash
# In your local browser or terminal with Chrome:
google-chrome "http://localhost:3000/render?jobId=YOUR_JOB_ID"
```

**3. Monitor Live Progress Stream (SSE):**
```bash
curl -N http://localhost:3000/api/render-progress/YOUR_JOB_ID
```

**4. Download Video (once complete):**
```bash
curl http://localhost:3000/api/render-download/YOUR_JOB_ID --output visualizer.mp4
```

---

### Direct Headless cURL

Renders directly on the server with FFmpeg (`ultrafast` preset):

```bash
curl -X POST http://localhost:3000/api/render-video \
  -H "Content-Type: application/json" \
  -d '{
    "video": { "width": 1280, "height": 720, "fps": 30, "format": "mp4" },
    "settings": { "style": "mirrored-bars", "trackTitle": "Direct Render" },
    "theme": "cyber-cyan"
  }' \
  --output visualizer.mp4
```

#### 2. Render from Remote Audio URL
Renders a `1080p Full HD` video using a remote MP3 file:

```bash
curl -X POST http://localhost:3000/api/render-video \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "https://cdn.freesound.org/previews/612/612627_11861866-lq.mp3",
    "video": {
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "format": "mp4"
    },
    "settings": {
      "style": "circular-wave",
      "barCount": 96,
      "trackTitle": "Streaming Soundscape",
      "artistName": "Ambient World"
    },
    "theme": "sunset-ember"
  }' \
  --output stream_visualizer.mp4
```

#### 3. Transparent Overlay (WebM with Alpha Channel)
Renders a transparent video overlay ready for Premiere Pro, DaVinci Resolve, or OBS:

```bash
curl -X POST http://localhost:3000/api/render-video \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "https://cdn.freesound.org/previews/612/612627_11861866-lq.mp3",
    "video": {
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "format": "webm"
    },
    "settings": {
      "style": "radial-bars",
      "backgroundType": "transparent",
      "barCount": 64
    },
    "theme": "neon-violet"
  }' \
  --output transparent_overlay.webm
```

---

### Node.js Example

Create a script `render.js` and run it with `node render.js`:

```javascript
import fs from 'fs';
import axios from 'axios';

async function generateVisualizerVideo() {
  const payload = {
    audio: 'https://cdn.freesound.org/previews/612/612627_11861866-lq.mp3',
    video: {
      width: 1920,
      height: 1080,
      fps: 30,
      format: 'mp4',
    },
    settings: {
      style: 'mirrored-bars',
      barCount: 80,
      heightScale: 1.2,
      smoothing: 0.65,
      sensitivity: 1.0,
      trackTitle: 'Midnight Drive',
      artistName: 'Synthwave Labs',
      backgroundType: 'dark-studio',
      enableJoint: true,
      jointWidth: 48,
      jointCurve: 'smooth',
    },
    theme: 'cyber-cyan',
    profileImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
  };

  console.log('Sending render request to http://localhost:3000/api/render-video...');

  const response = await axios.post('http://localhost:3000/api/render-video', payload, {
    responseType: 'stream',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const outputFilePath = './output_visualizer.mp4';
  const writer = fs.createWriteStream(outputFilePath);

  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  console.log(`Video render complete! Saved to ${outputFilePath}`);
}

generateVisualizerVideo().catch(console.error);
```

---

### Python Example

Using Python's `requests` library (`pip install requests`):

```python
import requests

url = "http://localhost:3000/api/render-video"

payload = {
    "audio": "https://cdn.freesound.org/previews/612/612627_11861866-lq.mp3",
    "video": {
        "width": 1920,
        "height": 1080,
        "fps": 30,
        "format": "mp4"
    },
    "settings": {
        "style": "wave",
        "trackTitle": "Python Automation",
        "artistName": "Waveform Engine",
        "backgroundType": "gradient"
    },
    "theme": "emerald-matrix"
}

print("Submitting render job...")
response = requests.post(url, json=payload, stream=True)

if response.status_code == 200:
    with open("python_render.mp4", "wb") as f:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)
    print("Render succeeded! File saved to python_render.mp4")
else:
    print(f"Error {response.status_code}: {response.text}")
```

---

## Configuration Schema Reference

### Visualizer Styles (`settings.style`)
- `"mirrored-bars"`: Classic center-anchored dual-mirror equalizer bars.
- `"bars"`: Bottom-anchored spectrum analyzer bars.
- `"radial-bars"`: 360° circular equalizer expanding outwards around the center.
- `"wave"`: Smooth flowing continuous waveform line with ambient glow.
- `"circular-wave"`: Closed circular pulsating sine wave.
- `"particles"`: Orbiting sound-reactive particle rings.
- `"vinyl"`: Spinning retro vinyl turntable with radial sound grooves.
- `"neon-pulse"`: High-energy glowing neon visualizer.

### Theme IDs (`theme`)
- `"cyber-cyan"`: Cyberpunk Neon Cyan `#06b6d4` & Magenta `#ec4899`.
- `"neon-violet"`: Electric Violet `#a855f7` & Radiant Pink `#f43f5e`.
- `"sunset-ember"`: Warm Amber `#f59e0b` & Sunset Crimson `#ef4444`.
- `"emerald-matrix"`: Matrix Emerald `#10b981` & Acid Green `#84cc16`.
- `"golden-lux"`: Luxury Gold `#eab308` & Champagne Bronze `#f97316`.
- `"monochrome-studio"`: Clean White `#f8fafc` & Platinum Gray `#94a3b8`.

### Core Settings Object (`settings`)

| Property | Type | Default | Description |
|---|---|---|---|
| `style` | `string` | `"mirrored-bars"` | Visualizer rendering algorithm. |
| `barCount` | `number` | `80` | Number of frequency bars (`16` to `256`). |
| `barWidth` | `number` | `4` | Width of individual bars in pixels. |
| `barGap` | `number` | `2` | Spacing between bars in pixels. |
| `barRadius` | `number` | `4` | Corner rounding radius of bars. |
| `heightScale` | `number` | `1.0` | Vertical amplitude multiplier (`0.5` to `3.0`). |
| `smoothing` | `number` | `0.65` | Temporal FFT frame smoothing (`0.1` to `0.95`). |
| `sensitivity` | `number` | `1.0` | Audio volume responsiveness (`0.5` to `2.5`). |
| `glowIntensity` | `number` | `0.4` | Ambient visualizer glow (`0.0` to `1.0`). |
| `enableJoint` | `boolean` | `true` | Bridge/joint connector between mirrored halves. |
| `jointWidth` | `number` | `48` | Distance between mirrored bar rows. |
| `jointCurve` | `string` | `"smooth"` | Joint geometry: `"flat"`, `"smooth"`, `"pointed"`, `"arch"`. |
| `backgroundType` | `string` | `"dark-studio"` | `"dark-studio"`, `"gradient"`, `"solid"`, `"transparent"`. |
| `showProfileImage` | `boolean` | `true` | Display center logo/avatar badge. |
| `profileImageShape` | `string` | `"circle"` | Shape: `"circle"`, `"square"`, `"rounded"`, `"hexagon"`. |
| `profileImageSize` | `number` | `120` | Diameter/width of profile badge in pixels. |
| `showTrackInfo` | `boolean` | `true` | Display track title and artist typography overlay. |
| `trackTitle` | `string` | `""` | Primary title string. |
| `artistName` | `string` | `""` | Subtitle / artist string. |

---

## Troubleshooting & FAQ

### 1. `Error: spawn ffmpeg ENOENT`
- **Cause**: FFmpeg is not installed or not found in the system's `PATH`.
- **Solution**: Install FFmpeg (`brew install ffmpeg` on macOS, `sudo apt install ffmpeg` on Linux, or add FFmpeg to Windows System Environment Variables). Confirm by typing `ffmpeg -version` in your terminal.

### 2. Can I render long audio files?
- Yes. For full-length tracks (3–5 minutes), increase your client/cURL timeout. The API streams raw RGBA frames directly into FFmpeg without buffering entire uncompressed videos in RAM.

### 3. How do I get transparent video for editing?
- Set `"settings": { "backgroundType": "transparent" }` and `"video": { "format": "webm" }`. FFmpeg will encode with the `libvpx-vp9` codec and `yuva420p` pixel format containing an alpha channel.

### 4. Large Base64 audio payload limit
- The Express server is configured with a generous `100mb` body limit (`app.use(express.json({ limit: '100mb' }))`), accommodating high-resolution artwork and uncompressed WAV audio.
