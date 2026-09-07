# Waveform Studio

A full-stack, studio-grade audio visualizer and video generation suite. Create real-time audio-reactive animations directly in the browser or render videos programmatically via a headless REST API or hardware-accelerated **Web Request to Local Webpage Renderer**.

---

## Features

- **Interactive Studio UI**:
  - **7 Visualizer Styles**: Mirrored Bars, Spectrum Bars, Smooth Wave, Radial Spectrum, Digital Matrix, Spine, and Spectrum Bands.
  - **Color Themes & Representation**: Built-in curated themes (Cyber Cyan, Electric Indigo, Sunset Ember, Emerald Matrix, Monochrome Luxe, Solar Flare, Nordic Frost) or custom RGB gradients with multiple representation modes (bottom-to-top, top-to-bottom, left-to-right, right-to-left, inside-out horizontal/vertical/circular, alternate bars).
  - **Center Avatar / Badge**: Circle, rounded, and square avatars with customizable border size, border color, audio-reactive bass pulse, and subtle glow.
  - **Waveform Symmetry & Flanking**: Symmetrical layouts including `none`, `mirrored-flank`, and `split-cutout` with adjustable profile wing gaps.
  - **Joint / Edge Tapering**: Smoothly taper bars towards zero at outer edges and/or next to the center profile badge, with configurable width (5–40%) and curve geometry (`smooth`, `linear`, `cubic`).
  - **Audio Dynamics & Reactivity**: Fine-tune FFT smoothing, bar count, sensitivity, frequency weighting, peak hold, soft-knee peak compression, and fluid easing transitions.
  - **Flexible Backgrounds**: Dark Studio, OLED Black, Light Canvas, Radial Spotlight, Gradient Mesh, Custom Solid Color, Custom Uploaded Artwork (Image / Looping Video with blur and dim controls), or Transparent Mode.
  - **Social Media Aspect Ratio Presets**: `16:9` (YouTube / Landscape), `9:16` (TikTok / Reels / Shorts), `1:1` (Instagram Feed), `21:9` (Cinematic Ultrawide), `3:1` (Banner), and `responsive`.
  - **Audio Input Options**: Local file upload (MP3, WAV, AAC, FLAC, OGG), remote URL streaming via built-in CORS proxy, pre-synthesized demo tracks, or live microphone capture.

- **Dual Rendering Paradigms & Export Engines**:
  1. **Client GPU Engine (WebCodecs)**:
     - Modern in-browser rendering utilizing hardware-accelerated WebCodecs (`VideoEncoder`) paired with `mp4-muxer` and `webm-muxer`, falling back to `MediaRecorder`.
     - Operates entirely client-side; fully functional in offline environments or static hosting without requiring a Node.js server.
     - Zero dropped frames via active backpressure pacing and quality latency modes on both desktop and mobile devices.
  2. **Cloud Server Engine (Headless Node.js + FFmpeg)**:
     - Server-side headless rendering utilizing Node.js `@napi-rs/canvas` and `ffmpeg-static` (`ultrafast` / `realtime` presets).
     - Generates zero client memory load; suitable for low-spec client hardware or automated worker scripts.
     - **Automatic Environment Detection**: The application dynamically probes `/api/health`. In environments where Node.js is not active, cloud server rendering is automatically disabled with visual notice, seamlessly routing exports through the Client GPU engine.
  3. **Alpha Channel Transparency**:
     - Export transparent WebM videos (`libvpx-vp9` with `yuva420p` pixel format) for direct overlay in video editors such as Premiere Pro, DaVinci Resolve, Final Cut, and OBS Studio.
  4. **PNG Image Sequence (ZIP)**:
     - Export full-resolution frame-by-frame PNG sequences zipped in-memory for post-production workflows.

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
   - [Unified Export & Webpage Renderer](#unified-export--webpage-renderer)
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
   - [Web Request Workflow (cURL + Browser)](#web-request-workflow-curl--browser)
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
2. **FFmpeg**: Bundled automatically via the `ffmpeg-static` npm package. A separate system FFmpeg installation is optional but supported as a fallback.

### Installation

1. Clone or download the repository into your local directory:
   ```bash
   git clone <repository-url>
   cd waveform-studio
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
    "fftAnalyzer": true,
    "ffmpegSource": "npm (ffmpeg-static)"
  }
}
```

---

## General Usage (Web Studio)

### Loading Audio
1. **Upload Audio**: Click the **Upload Audio** button in the header or drag-and-drop any audio file (`.mp3`, `.wav`, `.aac`, `.flac`, `.ogg`).
2. **Audio URL**: Click the **Audio URL** button in the header to stream or import audio directly from an online HTTP/HTTPS URL. The backend automatically handles CORS proxying.
3. **Demo Tracks**: Click **Demo Tracks** to select from pre-synthesized tracks (Synthwave, Ambient, Drum & Bass, Chill Lo-Fi).
4. **Record Mic**: Click **Record** to record real-time audio directly from your microphone.

### Customizing Visuals
The side panel gives you granular control over every aspect of the animation:
- **Visualizer Style**: Select from 7 distinct styles: Mirrored Bars, Spectrum Bars, Smooth Wave, Radial Spectrum, Digital Matrix, Spine, and Spectrum Bands.
- **Center Avatar / Badge**: Enable the center profile image, select shape (Circle, Rounded, Square), set border attributes, and upload an image or provide an image URL.
- **Color Themes**: Select from built-in themes (Cyber Cyan, Electric Indigo, Sunset Ember, Emerald Matrix, Monochrome Luxe, Solar Flare, Nordic Frost) or define custom RGB gradients and color representation modes.
- **Background**: Toggle between Dark Studio, OLED Black, Light Canvas, Radial Spotlight, Gradient Mesh, Custom Solid Color, Custom Background Artwork (image or video), or Transparent Mode.
- **Reactivity & Dynamics**: Tune FFT smoothing, bar count, sensitivity, soft-knee peak compression, and joint edge tapering.

### Rendering in Browser (Studio UI)
1. Click **Export Video** in the top navigation header.
2. Select your **Engine**:
   - **Client GPU** (Fast in-browser rendering via WebCodecs / MediaRecorder). Works completely client-side in any browser or static hosting environment without requiring a backend server.
   - **Cloud Server** (Zero client RAM, headless rendering using Node.js and FFmpeg). Automatically disabled with visual notice when running in client-only or static environments where a Node.js backend is not detected.
3. Choose your resolution (`720p`, `1080p Full HD`, `4K UHD`), frame rate (`30fps` or `60fps`), and format (`MP4`, `WebM`, or `PNG Sequence`).
4. Toggle **Transparent Background** if you plan to overlay the video in Premiere Pro, DaVinci Resolve, or OBS.
5. Click **Render Video**. The export engine automatically handles backpressure pacing and quality latency modes to ensure 100% stable framerates without frame drops on both desktop and mobile devices.

### Unified Export & Webpage Renderer
- Export Video and the Webpage Renderer are unified into one seamless workflow.
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
| `POST` | `/api/render-video` | Direct synchronous headless video render using FFmpeg (`ultrafast` preset). Aliased to `/api/render-headless` and `/api/generate-video`. |
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

### `POST /api/render-video` (or `POST /api/render-headless`) (Direct Headless)

Direct synchronous headless video rendering via Node.js Canvas and FFmpeg (`ffmpeg-static`). Supports standard MP4 (H.264) as well as transparent WebM with full alpha channel (`libvpx-vp9` with `yuva420p` pixel format). Enhanced with FFmpeg's `ultrafast` / `realtime` presets to minimize CPU bottlenecks on Colab and cloud instances.

#### Request Headers
- `Content-Type: application/json`

#### Response
Streams the finished binary video (`video/mp4` or `video/webm`) as an attachment download, with the `X-Render-Job-Id` header attached for tracking. Alternatively, pass `?format=json` in the query parameters to receive a JSON response containing metadata and a base64 Data URL.

---

### Field Details

| Field | Type | Description |
|---|---|---|
| `audio` | `string` | Base64 data URI (`data:audio/mp3;base64,...`), raw Base64 string, or remote HTTP URL. If omitted, synthesizes a clean demo harmonic chord. Audio is decoded and rendered in its entirety. |
| `video.width` | `number` | Output video width in pixels (e.g. `1280`, `1920`, `3840`). Default: `1280`. |
| `video.height` | `number` | Output video height in pixels (e.g. `720`, `1080`, `2160`). Default: `720`. |
| `video.fps` | `number` | Frame rate (`30` or `60`). Default: `30`. |
| `video.format` | `string` | `"mp4"` (H.264 / AAC) or `"webm"` (VP9 / Opus). Default: `"mp4"`. |
| `theme` | `string \| object` | Theme preset ID (`"cyber-cyan"`, `"electric-indigo"`, `"sunset-ember"`, `"emerald-mint"`, `"monochrome-luxe"`, `"solar-flare"`, `"nordic-frost"`) or custom `{ primaryColor, gradientColor }` object. |
| `settings` | `object` | Visualizer styling options (see [Configuration Schema Reference](#configuration-schema-reference)). |
| `profileImage` | `string` | Base64 data URI or remote HTTP URL for center avatar badge. |
| `backgroundImage` | `string` | Base64 data URI or remote HTTP URL for background artwork. |

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
      "style": "radial",
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
      "style": "radial",
      "backgroundType": "transparent",
      "barCount": 64
    },
    "theme": "electric-indigo"
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
      jointWidth: 20,
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
        "style": "smooth-wave",
        "trackTitle": "Python Automation",
        "artistName": "Waveform Engine",
        "backgroundType": "gradient-mesh"
    },
    "theme": "emerald-mint"
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
- `"bars-up"`: Bottom-anchored spectrum analyzer bars.
- `"smooth-wave"`: Fluid continuous bezier waveform line with ambient glow.
- `"radial"`: 360° circular spectrum expanding outwards around the center.
- `"digital-matrix"`: Matrix-style dot/segment digital equalizer.
- `"spine"`: Organic central spine waveform structure with lateral ribs.
- `"spectrum-bands"`: Multi-band grouped frequency equalizer blocks.

### Theme IDs (`theme`)
- `"cyber-cyan"`: Cyber Cyan `#06b6d4` & Magenta `#ec4899`.
- `"electric-indigo"`: Electric Indigo `#6366f1` & Violet `#a855f7`.
- `"sunset-ember"`: Sunset Ember `#f97316` & Gold `#ef4444`.
- `"emerald-mint"`: Emerald Matrix `#10b981` & Lime `#84cc16`.
- `"monochrome-luxe"`: Monochrome Studio Luxe `#e4e4e7` & Platinum `#a1a1aa`.
- `"solar-flare"`: Solar Flare `#fbbf24` & Rose `#f43f5e`.
- `"nordic-frost"`: Nordic Frost `#38bdf8` & Teal `#2dd4bf`.

### Background Types (`settings.backgroundType`)
- `"dark-studio"`: Deep studio vignette neutral backdrop.
- `"oled-black"`: Pure `#000000` black background for maximum contrast.
- `"light-canvas"`: Crisp modern light neutral theme.
- `"radial-spotlight"`: Focused center spotlight glow.
- `"gradient-mesh"`: Subtle multi-color gradient ambient field.
- `"transparent"`: Alpha channel clear canvas (supports transparent WebM exports).
- `"custom-solid"`: Solid color fill controlled by `settings.backgroundColor`.

### Core Settings Object (`settings`)

| Property | Type | Default | Description |
|---|---|---|---|
| `style` | `string` | `"mirrored-bars"` | Visualizer rendering style. |
| `barCount` | `number` | `80` | Number of frequency bars (`16` to `128`). |
| `barWidthRatio` | `number` | `0.7` | Width of individual bars relative to slot (`0.1` to `1.0`). |
| `barGap` | `number` | `2` | Spacing between bars in pixels. |
| `barRadius` | `number` | `4` | Corner rounding radius of bars. |
| `heightScale` | `number` | `1.0` | Vertical amplitude multiplier (`0.2` to `3.0`). |
| `sensitivity` | `number` | `1.0` | Audio volume responsiveness gain (`0.2` to `3.0`). |
| `softKneeCompression` | `boolean` | `true` | Soft-knee peak audio compression to prevent clipping. |
| `symmetry` | `string` | `"mirror"` | Layout symmetry: `"mirror"`, `"top-only"`, `"bottom-only"`. |
| `smoothing` | `number` | `0.65` | Temporal FFT frame smoothing (`0.0` to `1.0`). |
| `easingMode` | `string` | `"organic-fluid"` | Easing transition: `"organic-fluid"`, `"snappy"`, `"liquid-flow"`, `"gentle"`. |
| `glowIntensity` | `number` | `0.4` | Ambient visualizer glow (`0.0` to `1.0`). |
| `enableJoint` | `boolean` | `true` | Enable edge and profile tapering. |
| `jointAtEnds` | `boolean` | `true` | Taper waveform bars smoothly to zero at the outer ends. |
| `jointAtProfile` | `boolean` | `true` | Taper waveform bars smoothly next to the profile avatar. |
| `jointWidth` | `number` | `20` | Tapering transition width percentage (`5` to `40`). |
| `jointCurve` | `string` | `"smooth"` | Taper geometry: `"smooth"`, `"linear"`, `"cubic"`. |
| `backgroundType` | `string` | `"dark-studio"` | Background type setting. |
| `showProfileImage` | `boolean` | `true` | Display center logo/avatar badge. |
| `profileImageShape` | `string` | `"circle"` | Shape: `"circle"`, `"rounded"`, `"square"`. |
| `profileImageSize` | `number` | `120` | Diameter/width of profile badge in pixels. |
| `profileAudioReactiveScale` | `boolean` | `true` | Scale avatar reactively to low-frequency bass. |
| `profileGlow` | `boolean` | `true` | Subtle radial glow around profile avatar. |
| `sideSymmetry` | `string` | `"none"` | Layout flanking: `"none"`, `"mirrored-flank"`, `"split-cutout"`. |
| `profileWingGap` | `number` | `24` | Gap in pixels between profile picture and waveform wings. |
| `showTrackInfo` | `boolean` | `true` | Display track title and artist typography overlay. |
| `trackTitle` | `string` | `""` | Primary title string. |
| `artistName` | `string` | `""` | Subtitle / artist string. |
| `infoPosition` | `string` | `"top-left"` | Info overlay position (`"top-left"`, `"top-right"`, `"bottom-left"`, `"center-top"`). |
| `showWatermark` | `boolean` | `false` | Enable custom watermark text. |
| `customWatermark` | `string` | `""` | Watermark text string. |
| `showDbGrid` | `boolean` | `false` | Display subtle decibel background grid lines. |
| `showCenterLine` | `boolean` | `false` | Display center horizon baseline. |

---

## Troubleshooting & FAQ

### 1. `Error: spawn ffmpeg ENOENT`
- **Cause**: FFmpeg executable could not be located.
- **Solution**: The application bundles `ffmpeg-static` in `node_modules` automatically. If running on a non-standard architecture, install system FFmpeg (`brew install ffmpeg` on macOS, `sudo apt install ffmpeg` on Linux) so the fallback detects `ffmpeg` in your `PATH`.

### 2. Can I render long audio files?
- Yes. The API streams raw RGBA frames directly into FFmpeg without buffering uncompressed video in memory, supporting tracks of arbitrary length.

### 3. How do I get transparent video for editing?
- Set `"settings": { "backgroundType": "transparent" }` and `"video": { "format": "webm" }`. FFmpeg will encode with the `libvpx-vp9` codec and `yuva420p` pixel format containing an alpha channel.

### 4. Large Base64 audio payload limit
- The Express server is configured with a generous `100mb` body limit (`app.use(express.json({ limit: '100mb' }))`), accommodating high-resolution artwork and uncompressed WAV audio.

### 5. Running in a static web hosting environment without Node.js
- The web application features automated environment detection. When deployed to a static host (GitHub Pages, Vercel static, S3/CloudFront), the Cloud Server option is automatically disabled, and video exports proceed using the client GPU (WebCodecs / MediaRecorder) with zero server dependencies.
