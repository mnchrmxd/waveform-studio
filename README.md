# Audio Waveform Studio & Headless Video Rendering Engine

A full-stack, studio-grade audio visualizer and video generation suite. Create real-time audio reactive animations directly in the browser or render videos programmatically via a headless REST API powered by Node.js, `@napi-rs/canvas`, and FFmpeg.

---

## Features

- **Interactive Studio UI**:
  - Multiple visualizer styles: Mirrored Bars, Radial / Circular Spectrum, Glowing Waves, Vinyl Turntable, Reactive Particle Rings, and more.
  - Audio reactive dynamics with adjustable FFT smoothing, frequency weighting, peak hold, and soft-knee compression.
  - Profile badges (circular, hexagonal, rounded) and custom background album artwork.
  - Transparent video export mode (WebM with alpha channel / ProRes compatibility) for video overlay in Premiere, After Effects, DaVinci Resolve, or OBS.
  - Social media aspect ratio presets: `16:9` (YouTube / Landscape), `9:16` (TikTok / Reels / Shorts), `1:1` (Instagram Feed), and `21:9` (Cinematic Ultrawide).
  - Audio input options: File upload (MP3, WAV, AAC, FLAC, OGG), Remote URL streaming, built-in demo tracks, or live microphone capture.

- **Headless Video Generation API**:
  - `POST /api/render-video` generates MP4 or WebM video files without needing a browser or GPU.
  - In-memory frame rendering using `@napi-rs/canvas` piped directly into FFmpeg.
  - Offline FFT spectrum analysis ensuring audio-reactive visuals match browser output.
  - Direct binary file streaming or Base64 JSON output.
  - Built-in **Payload Generator** in the UI: automatically converts your current visualizer setup into cURL, JSON, and Node.js requests.

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
   - [Rendering in Browser](#rendering-in-browser)
   - [Generating API Payloads](#generating-api-payloads)
3. [API Documentation](#api-documentation)
   - [API Endpoints Overview](#api-endpoints-overview)
   - [`GET /api/health`](#get-apihealth)
   - [`GET /api/render-video/schema`](#get-apirender-videoschema)
   - [`GET /api/proxy`](#get-apiproxy)
   - [`POST /api/render-video`](#post-apirender-video)
4. [API Code Examples](#api-code-examples)
   - [cURL](#curl-examples)
   - [Node.js (JavaScript / TypeScript)](#nodejs-example)
   - [Python](#python-example)
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

### Rendering in Browser
1. Click **Export MP4** in the header.
2. Choose your resolution (`720p`, `1080p Full HD`, `4K UHD`), frame rate (`30fps` or `60fps`), and format (`MP4`, `WebM`, or `PNG Sequence`).
3. Toggle **Transparent Background** if you plan to overlay the video in an editor.
4. Click **Render** to render the video locally using WebCodecs.

### Generating API Payloads
Inside the Export dialog, click **Payload Generator** (next to the Render button). 
- It automatically inspects your currently configured visualizer settings, active theme, selected audio, and uploaded artwork.
- Switch between **cURL**, **JSON**, and **Node.js (Axios)** tabs.
- Click **Copy Code** or **Download Script** to run the render headlessly on any server or terminal.

---

## API Documentation

The server exposes a REST API for automated, server-side video rendering.

### API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Healthcheck and capability verification. |
| `GET` | `/api/render-video/schema` | Returns the complete JSON schema and default parameters. |
| `GET` | `/api/proxy?url=<url>` | CORS proxy utility for remote audio or image assets. |
| `POST` | `/api/render-video` | Renders a video from audio and visual settings. |
| `POST` | `/api/generate-video` | Alias for `/api/render-video`. |

---

### `GET /api/health`

Verifies that the server and video rendering dependencies are running.

#### Response (`200 OK`)
```json
{
  "status": "ok",
  "service": "Waveform Studio Headless Video Generator",
  "features": {
    "headlessRendering": true,
    "mp4Export": true,
    "transparentAlphaWebm": true,
    "fftAnalyzer": true
  },
  "timestamp": "2026-09-02T19:40:00.000Z"
}
```

---

### `GET /api/render-video/schema`

Returns the parameter schema, allowed visualizer styles, available themes, and default settings.

#### Response (`200 OK`)
```json
{
  "endpoint": "POST /api/render-video",
  "description": "Generates animated audio visualizer videos headlessly using FFmpeg and Node.js Canvas.",
  "payloadExample": { ... },
  "defaultSettings": { ... },
  "availableThemes": [ ... ]
}
```

---

### `GET /api/proxy`

Fetches external assets (audio files, cover art, profile images) and returns them with permissive CORS headers.

#### Query Parameters
- `url` *(string, required)*: The URL-encoded target URL (must begin with `http://` or `https://`).

#### Example
```bash
curl "http://localhost:3000/api/proxy?url=https%3A%2F%2Fexample.com%2Ftrack.mp3" --output downloaded.mp3
```

---

### `POST /api/render-video`

Generates an audio-reactive visualizer video.

#### Request Headers
- `Content-Type: application/json`

#### Query Parameters (Optional)
- `format=json`: Instead of streaming the binary video file directly, returns a JSON response containing metadata and a Base64 data URL:
  ```json
  {
    "success": true,
    "filename": "visualizer_1725300000000.mp4",
    "mimeType": "video/mp4",
    "duration": 15,
    "width": 1280,
    "height": 720,
    "fps": 30,
    "format": "mp4",
    "fileSizeBytes": 4812390,
    "videoDataUrl": "data:video/mp4;base64,AAAA..."
  }
  ```

#### Request Body (`application/json`)

```json
{
  "audio": "https://example.com/audio.mp3",
  "audioUrl": "https://example.com/audio.mp3",
  "settings": {
    "style": "mirrored-bars",
    "barCount": 80,
    "heightScale": 1.2,
    "smoothing": 0.65,
    "sensitivity": 1.0,
    "glowIntensity": 0.4,
    "backgroundType": "dark-studio",
    "trackTitle": "Neon Horizons",
    "artistName": "Cyber Resonance"
  },
  "theme": "cyber-cyan",
  "video": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "format": "mp4",
    "duration": 15
  },
  "profileImage": "https://example.com/avatar.png",
  "backgroundImage": "https://example.com/background.jpg"
}
```

#### Field Details

| Field | Type | Description |
|---|---|---|
| `audio` | `string` | Base64 data URI (`data:audio/mp3;base64,...`), raw Base64 string, or remote HTTP URL. If omitted, the server synthesizes a harmonic demo chord. |
| `audioUrl` | `string` | Optional explicit remote HTTP(S) URL to the audio file. |
| `video.width` | `number` | Output video width in pixels (e.g. `1920`, `1280`, `1080`). Default: `1280`. |
| `video.height` | `number` | Output video height in pixels (e.g. `1080`, `720`, `1920`). Default: `720`. |
| `video.fps` | `number` | Frame rate (`15` to `60`). Default: `30`. |
| `video.format` | `string` | `"mp4"` (H.264 / AAC) or `"webm"` (VP9 / Opus). Default: `"mp4"` (or `"webm"` if `backgroundType` is `"transparent"`). |
| `video.duration` | `number` | Target duration in seconds. If shorter than audio, render is clamped; if omitted, renders entire track. |
| `theme` | `string \| object` | Theme preset ID (`"cyber-cyan"`, `"neon-violet"`, `"sunset-ember"`, etc.) or custom `{ primaryColor, primaryGradientEnd, accentGlow }` object. |
| `settings` | `object` | Visualizer styling options (see [Configuration Schema Reference](#configuration-schema-reference)). |
| `profileImage` | `string` | Base64 data URI or remote HTTP URL for center profile badge. |
| `backgroundImage` | `string` | Base64 data URI or remote HTTP URL for background artwork. |

---

## API Code Examples

### cURL Examples

#### 1. Quick Test (Synthesized Demo Audio)
Renders a 5-second `1280x720` MP4 visualizer using server-synthesized harmonic audio:

```bash
curl -X POST http://localhost:3000/api/render-video \
  -H "Content-Type: application/json" \
  -d '{
    "video": {
      "width": 1280,
      "height": 720,
      "duration": 5,
      "fps": 30,
      "format": "mp4"
    },
    "settings": {
      "style": "mirrored-bars",
      "trackTitle": "Localhost Demo",
      "artistName": "Waveform Studio"
    },
    "theme": "cyber-cyan"
  }' \
  --output demo_visualizer.mp4
```

#### 2. Render from Remote Audio URL
Renders a 10-second `1080p Full HD` video using a remote MP3 file:

```bash
curl -X POST http://localhost:3000/api/render-video \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "https://cdn.freesound.org/previews/612/612627_11861866-lq.mp3",
    "video": {
      "width": 1920,
      "height": 1080,
      "duration": 10,
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
      "duration": 8,
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
      duration: 10,
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
        "format": "mp4",
        "duration": 10
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
