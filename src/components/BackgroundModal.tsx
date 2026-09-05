import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Link2,
  Camera,
  Sparkles,
  Image as ImageIcon,
  Film,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sliders,
  Video,
} from 'lucide-react';
import { loadImageFromUrl } from '../utils/imageLoader';

interface BackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  backgroundImage: HTMLImageElement | null;
  backgroundImageUrl?: string | null;
  onBackgroundImageUpload: (image: HTMLImageElement | null, url?: string | null) => void;
  backgroundVideo: HTMLVideoElement | null;
  backgroundVideoUrl?: string | null;
  onBackgroundVideoUpload: (video: HTMLVideoElement | null, url: string | null) => void;
  backgroundBlur: number;
  onBackgroundBlurChange: (blur: number) => void;
  backgroundDim: number;
  onBackgroundDimChange: (dim: number) => void;
}

interface BackdropPreset {
  id: string;
  name: string;
  type: 'video' | 'image';
  url: string;
  thumb?: string;
  desc: string;
}

const BACKDROP_PRESETS: BackdropPreset[] = [
  {
    id: 'ambient-bloom',
    name: 'Ambient Bloom',
    type: 'video',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    desc: 'Soft blooming flora motion loop',
  },
  {
    id: 'urban-motion',
    name: 'Urban Motion',
    type: 'video',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    desc: 'Energetic metropolitan street loop',
  },
  {
    id: 'cyber-grid',
    name: 'Cyber Grid Wallpaper',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80',
    desc: 'Futuristic geometric neon gridlines',
  },
  {
    id: 'studio-noir',
    name: 'Studio Noir',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1600&auto=format&fit=crop&q=80',
    desc: 'Dark acoustic music studio atmosphere',
  },
  {
    id: 'neon-stage',
    name: 'Neon Concert Stage',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600&auto=format&fit=crop&q=80',
    desc: 'Vibrant festival crowd and stage spotlights',
  },
  {
    id: 'cosmic-nebula',
    name: 'Cosmic Nebula',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80',
    desc: 'Deep space interstellar star cluster',
  },
  {
    id: 'lofi-sunset',
    name: 'Lo-Fi Sunset Glow',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    desc: 'Warm sunset horizon backdrop',
  },
];

export const BackgroundModal: React.FC<BackgroundModalProps> = ({
  isOpen,
  onClose,
  backgroundImage,
  backgroundImageUrl,
  onBackgroundImageUpload,
  backgroundVideo,
  backgroundVideoUrl,
  onBackgroundVideoUpload,
  backgroundBlur,
  onBackgroundBlurChange,
  backgroundDim,
  onBackgroundDimChange,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'link' | 'record' | 'presets'>('upload');
  
  // Link state
  const [urlInput, setUrlInput] = useState(backgroundImageUrl || backgroundVideoUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera / Webcam state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Stop camera when closing modal or switching tabs
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  if (!isOpen) return null;

  const handleClearBackground = () => {
    onBackgroundImageUpload(null, null);
    onBackgroundVideoUpload(null, null);
  };

  const processVideoFile = (file: File) => {
    setIsLoading(true);
    setMediaError(null);
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    video.onloadeddata = () => {
      setIsLoading(false);
      onBackgroundVideoUpload(video, videoUrl);
      onBackgroundImageUpload(null, null); // Clear static image
      onClose();
    };

    video.onerror = () => {
      setIsLoading(false);
      setMediaError('Failed to load video file. Please check video format (MP4, WebM, MOV recommended).');
    };
  };

  const processImageFile = (file: File) => {
    setIsLoading(true);
    setMediaError(null);
    const imgUrl = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgUrl;

    img.onload = () => {
      setIsLoading(false);
      onBackgroundImageUpload(img, imgUrl);
      onBackgroundVideoUpload(null, null); // Clear video
      onClose();
    };

    img.onerror = () => {
      setIsLoading(false);
      setMediaError('Failed to load image file. Please check file integrity.');
    };
  };

  // Automatic media detection on file upload (Image OR Video)
  const handleFile = (file: File) => {
    const isVideo =
      file.type.startsWith('video/') ||
      /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);

    if (isVideo) {
      processVideoFile(file);
    } else {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Automatic media detection on URL load (Image OR Video)
  const loadMediaFromUrl = async (urlToLoad: string) => {
    const cleanUrl = urlToLoad.trim();
    if (!cleanUrl) {
      setMediaError('Please enter a valid image or video URL');
      return;
    }

    setIsLoading(true);
    setMediaError(null);

    const isVideoUrl = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(cleanUrl);

    if (isVideoUrl) {
      const video = document.createElement('video');
      video.src = cleanUrl;
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      video.onloadeddata = () => {
        setIsLoading(false);
        onBackgroundVideoUpload(video, cleanUrl);
        onBackgroundImageUpload(null, null);
        onClose();
      };

      video.onerror = () => {
        setIsLoading(false);
        setMediaError('Failed to load video from URL. Please check CORS headers or direct link.');
      };
    } else {
      // Try image first, fallback to video if image fails
      try {
        const img = await loadImageFromUrl(cleanUrl);
        setIsLoading(false);
        onBackgroundImageUpload(img, cleanUrl);
        onBackgroundVideoUpload(null, null);
        onClose();
      } catch (imgErr) {
        // Try as video in case the URL was a video stream without an extension
        const video = document.createElement('video');
        video.src = cleanUrl;
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';

        video.onloadeddata = () => {
          setIsLoading(false);
          onBackgroundVideoUpload(video, cleanUrl);
          onBackgroundImageUpload(null, null);
          onClose();
        };

        video.onerror = () => {
          setIsLoading(false);
          setMediaError('Could not load URL as image or video. Please check the URL and CORS permissions.');
        };
      }
    }
  };

  const handlePresetSelect = (preset: BackdropPreset) => {
    if (preset.type === 'video') {
      const video = document.createElement('video');
      video.src = preset.url;
      video.crossOrigin = 'anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      video.onloadeddata = () => {
        onBackgroundVideoUpload(video, preset.url);
        onBackgroundImageUpload(null, null);
        onClose();
      };
    } else {
      loadImageFromUrl(preset.url).then((img) => {
        onBackgroundImageUpload(img, preset.url);
        onBackgroundVideoUpload(null, null);
        onClose();
      }).catch((err) => {
        setMediaError(err?.message || 'Failed to load preset');
      });
    }
  };

  // Start Webcam
  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera permission denied or unavailable';
      setCameraError(msg);
    }
  };

  const handleCaptureCameraPhoto = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      onBackgroundImageUpload(img, dataUrl);
      onBackgroundVideoUpload(null, null);
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
      onClose();
    };
  };

  const handleUseLiveCameraVideo = () => {
    if (!videoRef.current || !cameraStream) return;
    const v = videoRef.current;
    // Set live webcam video element as background
    onBackgroundVideoUpload(v, 'live-webcam');
    onBackgroundImageUpload(null, null);
    onClose();
  };

  const hasBackground = !!(backgroundImage || backgroundVideo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-white">Backdrop Media</h2>
              <p className="text-xs text-neutral-400">Add any image or video backdrop behind the visualizer</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Backdrop Banner */}
        {hasBackground && (
          <div className="px-5 py-2.5 bg-neutral-900/50 border-b border-neutral-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              {backgroundVideo ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[11px] border border-cyan-500/30">
                  <Film className="w-3 h-3" />
                  <span>Looping Video Active</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-500/30">
                  <ImageIcon className="w-3 h-3" />
                  <span>Image Artwork Active</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearBackground}
              className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Backdrop</span>
            </button>
          </div>
        )}

        {/* Unified 4-Action Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-neutral-900/80 border-b border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-neutral-800 text-cyan-400 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'bg-neutral-800 text-cyan-400 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link / URL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'record'
                ? 'bg-neutral-800 text-rose-400 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Record / Cam</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-neutral-800 text-amber-400 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Presets</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          {/* TAB 1: UPLOAD FILE (ANY IMAGE OR VIDEO AUTOMATICALLY) */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.mp4,.webm,.mov,.m4v,.png,.jpg,.jpeg,.webp,.gif"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer text-center ${
                  isDragOver
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Film className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm text-white">Click or drag any image or video here</span>
                  <span className="text-xs text-neutral-400">
                    Auto-detects format. Supports MP4, WebM, MOV video loops & JPG, PNG, WebP, GIF artwork.
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-cyan-300 border border-neutral-700">
                    MP4 / WebM
                  </span>
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-neutral-300 border border-neutral-700">
                    JPG / PNG / WebP
                  </span>
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-neutral-400 border border-neutral-700">
                    No conversion needed
                  </span>
                </div>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-xs text-cyan-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading backdrop media...</span>
                </div>
              )}

              {mediaError && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{mediaError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LINK / URL */}
          {activeTab === 'link' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadMediaFromUrl(urlInput);
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-300">Image or Video URL</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      placeholder="https://example.com/backdrop.mp4 or photo.jpg"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        setMediaError(null);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 font-mono transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !urlInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shadow-cyan-500/10 shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    <span>Load Media</span>
                  </button>
                </div>

                <p className="text-[11px] text-neutral-400">
                  Paste any web link. The app automatically detects if it's a video loop or high-resolution artwork.
                </p>

                {mediaError && (
                  <div className="text-xs text-rose-400 flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{mediaError}</span>
                  </div>
                )}
              </div>
            </form>
          )}

          {/* TAB 3: RECORD / WEBCAM */}
          {activeTab === 'record' && (
            <div className="flex flex-col items-center justify-center gap-4 py-2 text-center">
              <div className="w-full max-w-sm rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 aspect-video relative flex items-center justify-center">
                {cameraStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 text-neutral-500">
                    <Camera className="w-10 h-10 text-neutral-600" />
                    <span className="text-xs">Webcam / Camera Backdrop</span>
                    <span className="text-[11px] text-neutral-500">Capture a live photo or use live webcam behind your visualizer</span>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5 max-w-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5 flex-wrap justify-center">
                {!cameraStream ? (
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/20 active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Webcam</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCaptureCameraPhoto}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Capture Photo Backdrop</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUseLiveCameraVideo}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Use Live Video Feed</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PRESETS (VIDEOS & ARTWORKS UNIFIED) */}
          {activeTab === 'presets' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-neutral-400">
                Choose from curated video loops and high-resolution artworks:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BACKDROP_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    id={`backdrop-preset-${preset.id}`}
                    onClick={() => handlePresetSelect(preset)}
                    className="p-3 rounded-xl bg-neutral-900/70 hover:bg-neutral-800 border border-neutral-800 hover:border-cyan-500/40 transition-all text-left flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700 group-hover:border-cyan-500/40 transition-colors">
                      {preset.type === 'video' ? (
                        <Film className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors truncate">
                          {preset.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                            preset.type === 'video'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {preset.type === 'video' ? 'Loop Video' : 'Artwork'}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1 truncate">{preset.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Blur and Dim Sliders (always accessible at the bottom of the modal) */}
          <div className="pt-3 mt-2 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 p-2.5 bg-neutral-900/50 rounded-xl border border-neutral-800/70">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-300 font-medium">Backdrop Blur</span>
                <span className="font-mono text-cyan-400">{backgroundBlur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="2"
                value={backgroundBlur}
                onChange={(e) => onBackgroundBlurChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="flex flex-col gap-1 p-2.5 bg-neutral-900/50 rounded-xl border border-neutral-800/70">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-300 font-medium">Backdrop Dimming (Darkness)</span>
                <span className="font-mono text-cyan-400">{Math.round(backgroundDim * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.95"
                step="0.05"
                value={backgroundDim}
                onChange={(e) => onBackgroundDimChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
