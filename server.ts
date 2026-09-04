import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { renderHeadlessVideo, HeadlessVideoOptions } from './src/server/headlessRenderer';
import { DEFAULT_SETTINGS, COLOR_THEMES } from './src/data/presets';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers with generous limits for base64 audio and artwork
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // API 1: Health & Capabilities Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Waveform Studio Headless Video Generator',
      features: {
        headlessRendering: true,
        mp4Export: true,
        transparentAlphaWebm: true,
        fftAnalyzer: true,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // API: Resource Proxy (allows loading remote audio and images safely in client without CORS restrictions)
  app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send('Missing url parameter');
    }
    try {
      const parsed = new URL(targetUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).send('Invalid protocol');
      }
      const upstream = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (WaveformStudio/1.0)',
        },
      });
      if (!upstream.ok) {
        return res.status(upstream.status).send(`Upstream responded with ${upstream.status}`);
      }
      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      const arrayBuf = await upstream.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      res.status(500).send(err?.message || 'Proxy error');
    }
  });

  // API 2: Full Schema & Documentation
  app.get('/api/render-video/schema', (_req, res) => {
    res.json({
      endpoint: 'POST /api/render-video',
      description: 'Generates animated audio visualizer videos headlessly using FFmpeg and Node.js Canvas.',
      payloadExample: {
        audio: 'data:audio/mp3;base64,... (or raw base64, or https://... URL, or omit for demo sound)',
        settings: {
          style: 'mirrored-bars',
          barCount: 80,
          heightScale: 1.2,
          smoothing: 0.65,
          glowIntensity: 0.4,
          enableJoint: true,
          jointWidth: 48,
          jointCurve: 'smooth',
          backgroundType: 'dark-studio',
        },
        theme: {
          id: 'cyber-cyan',
          primaryColor: '#06b6d4',
          primaryGradientEnd: '#ec4899',
        },
        video: {
          width: 1920,
          height: 1080,
          fps: 30,
          format: 'mp4',
        },
        profileImage: 'data:image/png;base64,... (optional)',
        backgroundImage: 'data:image/jpeg;base64,... (optional)',
      },
      curlExample: `curl -X POST http://localhost:3000/api/render-video \\
  -H "Content-Type: application/json" \\
  -d '{"video": {"width": 1280, "height": 720, "format": "mp4"}}' \\
  --output visualizer.mp4`,
      defaultSettings: DEFAULT_SETTINGS,
      availableThemes: COLOR_THEMES.map((t) => ({ id: t.id, name: t.name, primaryColor: t.primaryColor })),
    });
  });

  // API 3: Core Headless Video Generation Endpoint
  const handleRenderVideo = async (req: express.Request, res: express.Response) => {
    try {
      const body: HeadlessVideoOptions = req.body || {};

      console.log(`[Headless Render] Started render request. Dimensions: ${body.video?.width || 1280}x${body.video?.height || 720}, Format: ${body.video?.format || 'mp4'}`);

      const result = await renderHeadlessVideo(body);

      console.log(`[Headless Render] Render complete: ${result.filename} (${result.fileSizeBytes} bytes)`);

      // If json format requested (e.g. ?format=json)
      if (req.query.format === 'json') {
        const fileBuf = fs.readFileSync(result.outputPath);
        const base64Video = `data:${result.mimeType};base64,${fileBuf.toString('base64')}`;
        result.cleanup();
        return res.json({
          success: true,
          filename: result.filename,
          mimeType: result.mimeType,
          duration: result.duration,
          width: result.width,
          height: result.height,
          fps: result.fps,
          format: result.format,
          fileSizeBytes: result.fileSizeBytes,
          videoDataUrl: base64Video,
        });
      }

      // Default: Stream the binary video file as attachment download
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.fileSizeBytes);

      const fileStream = fs.createReadStream(result.outputPath);
      fileStream.pipe(res);

      res.on('finish', () => {
        result.cleanup();
      });

      res.on('close', () => {
        result.cleanup();
      });
    } catch (err: any) {
      console.error('[Headless Render] Error:', err);
      res.status(400).json({
        error: err.message || 'Failed to render headless video',
        details: err.stack,
      });
    }
  };

  app.post('/api/render-video', handleRenderVideo);
  app.post('/api/generate-video', handleRenderVideo);

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
