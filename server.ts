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
      endpoint: 'POST /api/render-job (or POST /api/render-video)',
      description: 'Generates animated audio visualizer videos. Use /api/render-job for fast browser GPU rendering via web request with live progress, or /api/render-video for direct headless render.',
      endpoints: {
        createJob: 'POST /api/render-job',
        webRendererUrl: 'GET /render?jobId=:jobId',
        liveProgressSSE: 'GET /api/render-progress/:jobId',
        jobStatus: 'GET /api/render-status/:jobId',
        downloadVideo: 'GET /api/render-download/:jobId',
        directRender: 'POST /api/render-video',
      },
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
          width: 1280,
          height: 720,
          fps: 60,
          format: 'mp4',
        },
        profileImage: 'data:image/png;base64,... (optional)',
        backgroundImage: 'data:image/jpeg;base64,... (optional)',
      },
      curlExample: `curl -X POST http://localhost:3000/api/render-job \\
  -H "Content-Type: application/json" \\
  -d '{"video": {"width": 1280, "height": 720, "format": "mp4"}}'`,
      defaultSettings: DEFAULT_SETTINGS,
      availableThemes: COLOR_THEMES.map((t) => ({ id: t.id, name: t.name, primaryColor: t.primaryColor })),
    });
  });

  // ----------------------------------------------------
  // Render Job System & Progress State Management
  // ----------------------------------------------------
  interface RenderJob {
    id: string;
    createdAt: number;
    payload: HeadlessVideoOptions;
    status: 'pending' | 'rendering' | 'completed' | 'failed';
    progress: number; // 0..100
    currentFrame?: number;
    totalFrames?: number;
    fps?: number;
    elapsedSec?: number;
    message?: string;
    outputPath?: string;
    filename?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    error?: string;
  }

  const renderJobs = new Map<string, RenderJob>();
  const sseClientsByJob = new Map<string, Set<express.Response>>();

  const notifyJobProgress = (jobId: string, data: Partial<RenderJob> & { message?: string }) => {
    const job = renderJobs.get(jobId);
    if (job) {
      if (data.progress !== undefined) job.progress = data.progress;
      if (data.currentFrame !== undefined) job.currentFrame = data.currentFrame;
      if (data.totalFrames !== undefined) job.totalFrames = data.totalFrames;
      if (data.fps !== undefined) job.fps = data.fps;
      if (data.elapsedSec !== undefined) job.elapsedSec = data.elapsedSec;
      if (data.status !== undefined) job.status = data.status;
      if (data.message !== undefined) job.message = data.message;
      if (data.outputPath !== undefined) job.outputPath = data.outputPath;
      if (data.filename !== undefined) job.filename = data.filename;
      if (data.mimeType !== undefined) job.mimeType = data.mimeType;
      if (data.fileSizeBytes !== undefined) job.fileSizeBytes = data.fileSizeBytes;
      if (data.error !== undefined) job.error = data.error;
    }

    const clients = sseClientsByJob.get(jobId);
    if (clients && clients.size > 0) {
      const sseMsg = `data: ${JSON.stringify({ jobId, ...data, timestamp: Date.now() })}\n\n`;
      for (const client of clients) {
        try {
          client.write(sseMsg);
        } catch (e) {
          // ignore closed connection
        }
      }
    }
  };

  // Endpoint: Create Render Job (Web Request Paradigm)
  app.post('/api/render-job', (req, res) => {
    try {
      const payload: HeadlessVideoOptions = req.body || {};
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newJob: RenderJob = {
        id: jobId,
        createdAt: Date.now(),
        payload,
        status: 'pending',
        progress: 0,
        message: 'Job registered. Waiting for render execution...',
      };

      renderJobs.set(jobId, newJob);

      console.log(`[Render Job] Created job "${jobId}". Dimensions: ${payload.video?.width || 1280}x${payload.video?.height || 720}`);

      res.status(201).json({
        success: true,
        jobId,
        status: 'pending',
        renderUrl: `/render?jobId=${jobId}`,
        statusUrl: `/api/render-status/${jobId}`,
        progressUrl: `/api/render-progress/${jobId}`,
        downloadUrl: `/api/render-download/${jobId}`,
        message: 'Job created. Open renderUrl in any browser for ultra-fast GPU rendering, or stream progress via progressUrl.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create render job' });
    }
  });

  // Endpoint: Get Job Payload & Metadata
  app.get('/api/render-job/:jobId', (req, res) => {
    const job = renderJobs.get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: `Job "${req.params.jobId}" not found` });
    }
    res.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      payload: job.payload,
      createdAt: job.createdAt,
    });
  });

  // Endpoint: Polling Status
  app.get('/api/render-status/:jobId', (req, res) => {
    const job = renderJobs.get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: `Job "${req.params.jobId}" not found` });
    }
    res.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      currentFrame: job.currentFrame,
      totalFrames: job.totalFrames,
      fps: job.fps,
      elapsedSec: job.elapsedSec,
      message: job.message,
      downloadUrl: job.status === 'completed' ? `/api/render-download/${job.id}` : null,
      error: job.error,
    });
  });

  // Endpoint: Server-Sent Events (SSE) Progress Stream
  app.get('/api/render-progress/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = renderJobs.get(jobId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();

    if (!sseClientsByJob.has(jobId)) {
      sseClientsByJob.set(jobId, new Set());
    }
    const clients = sseClientsByJob.get(jobId)!;
    clients.add(res);

    // Send initial status immediately
    const initialStatus = job
      ? {
          jobId,
          status: job.status,
          progress: job.progress,
          currentFrame: job.currentFrame,
          totalFrames: job.totalFrames,
          fps: job.fps,
          elapsedSec: job.elapsedSec,
          message: job.message,
        }
      : { jobId, status: 'waiting', progress: 0, message: 'Waiting for job registration' };

    res.write(`data: ${JSON.stringify(initialStatus)}\n\n`);

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(res);
      if (clients.size === 0) {
        sseClientsByJob.delete(jobId);
      }
    });
  });

  // Endpoint: Browser / Worker Reports Progress
  app.post('/api/render-progress/:jobId', (req, res) => {
    const { jobId } = req.params;
    notifyJobProgress(jobId, req.body || {});
    res.json({ ok: true });
  });

  // Endpoint: Browser / Worker Completes Job and Uploads Result
  app.post('/api/render-complete/:jobId', express.raw({ type: '*/*', limit: '200mb' }), (req, res) => {
    const { jobId } = req.params;
    const job = renderJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ error: `Job "${jobId}" not found` });
    }

    try {
      const tmpDir = path.join(process.cwd(), 'tmp_renders');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      let buffer: Buffer;
      let filename = `visualizer_${jobId}.mp4`;
      let mimeType = 'video/mp4';

      // Check if body was JSON (base64) or raw binary buffer
      if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        buffer = req.body;
        const format = job.payload.video?.format || 'mp4';
        filename = `visualizer_${jobId}.${format}`;
        mimeType = format === 'webm' ? 'video/webm' : 'video/mp4';
      } else if (req.body && typeof req.body === 'object') {
        if (req.body.base64Video) {
          const raw = req.body.base64Video.replace(/^data:[^;]+;base64,/, '');
          buffer = Buffer.from(raw, 'base64');
        } else {
          buffer = Buffer.alloc(0);
        }
        if (req.body.filename) filename = req.body.filename;
        if (req.body.mimeType) mimeType = req.body.mimeType;
      } else {
        buffer = Buffer.alloc(0);
      }

      const outPath = path.join(tmpDir, filename);
      if (buffer.length > 0) {
        fs.writeFileSync(outPath, buffer);
      }

      notifyJobProgress(jobId, {
        status: 'completed',
        progress: 100,
        message: 'Video rendering and muxing complete!',
        outputPath: outPath,
        filename,
        mimeType,
        fileSizeBytes: buffer.length,
      });

      console.log(`[Render Job] Completed "${jobId}". File size: ${buffer.length} bytes`);
      res.json({
        success: true,
        jobId,
        downloadUrl: `/api/render-download/${jobId}`,
      });
    } catch (e: any) {
      console.error(`[Render Job] Complete error:`, e);
      notifyJobProgress(jobId, { status: 'failed', error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

  // Endpoint: Download Completed Video
  app.get('/api/render-download/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = renderJobs.get(jobId);
    if (!job || !job.outputPath || !fs.existsSync(job.outputPath)) {
      return res.status(404).send(`Completed video for job "${jobId}" not found or still processing.`);
    }

    const filename = job.filename || `visualizer_${jobId}.mp4`;
    const mimeType = job.mimeType || 'video/mp4';
    const stat = fs.statSync(job.outputPath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);

    fs.createReadStream(job.outputPath).pipe(res);
  });

  // API 3: Core Headless Video Generation Endpoint (Synchronous or Server-Side)
  const handleRenderVideo = async (req: express.Request, res: express.Response) => {
    try {
      const body: HeadlessVideoOptions = req.body || {};
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      console.log(`[Headless Render] Started render request. Dimensions: ${body.video?.width || 1280}x${body.video?.height || 720}, Format: ${body.video?.format || 'mp4'}`);

      // Register job for progress streaming if client listens
      const job: RenderJob = {
        id: jobId,
        createdAt: Date.now(),
        payload: body,
        status: 'rendering',
        progress: 0,
        message: 'Server-side rendering started...',
      };
      renderJobs.set(jobId, job);

      // Attach onProgress callback
      body.onProgress = (progressFrac, meta) => {
        const pct = Math.round(progressFrac * 100);
        notifyJobProgress(jobId, {
          progress: pct,
          currentFrame: meta?.currentFrame,
          totalFrames: meta?.totalFrames,
          fps: meta?.fps,
          elapsedSec: meta?.elapsedSec,
          message: `Encoding frames on server: ${pct}%`,
        });
      };

      const result = await renderHeadlessVideo(body);

      notifyJobProgress(jobId, {
        status: 'completed',
        progress: 100,
        outputPath: result.outputPath,
        filename: result.filename,
        mimeType: result.mimeType,
        fileSizeBytes: result.fileSizeBytes,
        message: 'Server rendering completed successfully',
      });

      console.log(`[Headless Render] Render complete: ${result.filename} (${result.fileSizeBytes} bytes)`);

      // If json format requested (e.g. ?format=json)
      if (req.query.format === 'json') {
        const fileBuf = fs.readFileSync(result.outputPath);
        const base64Video = `data:${result.mimeType};base64,${fileBuf.toString('base64')}`;
        result.cleanup();
        return res.json({
          success: true,
          jobId,
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
      res.setHeader('X-Render-Job-Id', jobId);

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
