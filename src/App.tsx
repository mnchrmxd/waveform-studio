import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { VisualizerCanvas } from './components/VisualizerCanvas';
import { AudioControls } from './components/AudioControls';
import { ControlPanel } from './components/ControlPanel';
import { ExportModal } from './components/ExportModal';
import { DemoTracksModal } from './components/DemoTracksModal';
import { RecordMicModal } from './components/RecordMicModal';
import { AudioUrlModal } from './components/AudioUrlModal';
import { audioEngine } from './services/audioEngine';
import { AudioMetadata, ColorTheme, SampleAudioPreset, VisualizerSettings, WaveformData, AspectRatioType } from './types';
import { COLOR_THEMES, DEFAULT_SETTINGS } from './data/presets';
import { loadDefaultAvatarImage } from './utils/defaultAvatar';

export default function App() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);

  const [settings, setSettings] = useState<VisualizerSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<ColorTheme>(COLOR_THEMES[0]);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);

  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundVideo, setBackgroundVideo] = useState<HTMLVideoElement | null>(null);
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState<string | null>(null);
  const [backgroundBlur, setBackgroundBlur] = useState<number>(10);
  const [backgroundDim, setBackgroundDim] = useState<number>(0.6);

  const [profileImage, setProfileImage] = useState<HTMLImageElement | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [isAudioUrlModalOpen, setIsAudioUrlModalOpen] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial default avatar badge
  useEffect(() => {
    loadDefaultAvatarImage()
      .then((img) => setProfileImage(img))
      .catch((e) => console.warn('Could not load default avatar:', e));
  }, []);

  // Auto-initialize with high-energy synthesizer demo track on initial load
  useEffect(() => {
    let mounted = true;
    const initDemo = async () => {
      try {
        const result = await audioEngine.generateDemoTrack('synthwave');
        if (!mounted) return;
        setAudioBuffer(result.buffer);
        setWaveformData(result.waveform);
        setMetadata(result.metadata);
        setDuration(result.buffer.duration);
        setTrimStart(0);
        setTrimEnd(result.buffer.duration);
        setSettings((prev) => ({
          ...prev,
          trackTitle: result.metadata.fileName,
          artistName: 'Waveform Cyberwave Demo',
        }));
      } catch (err) {
        console.error('Initial audio preset failed:', err);
      }
    };

    initDemo();
    return () => {
      mounted = false;
    };
  }, []);

  // Listen to Audio Engine time & playback events
  useEffect(() => {
    const unsubTime = audioEngine.onTimeUpdate((time, dur) => {
      setCurrentTime(time);
      if (dur > 0 && dur !== duration) {
        setDuration(dur);
      }
    });

    const unsubState = audioEngine.onPlaybackStateChange((playing) => {
      setIsPlaying(playing);
    });

    return () => {
      unsubTime();
      unsubState();
    };
  }, [duration]);

  // Spacebar hotkey to toggle playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        audioEngine.togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Audio loading handlers
  const handleFileUpload = async (file: File) => {
    setIsLoadingAudio(true);
    try {
      if (isPlaying) {
        audioEngine.pause();
      }
      const result = await audioEngine.decodeAudioFile(file);
      setAudioBuffer(result.buffer);
      setAudioUrl(null);
      setWaveformData(result.waveform);
      setMetadata(result.metadata);
      setDuration(result.buffer.duration);
      setCurrentTime(0);
      setTrimStart(0);
      setTrimEnd(result.buffer.duration);
      setSettings((prev) => ({
        ...prev,
        trackTitle: result.metadata.fileName,
        artistName: 'Original Audio',
      }));
    } catch (err) {
      alert('Could not decode audio file. Please ensure it is a valid audio format (MP3, WAV, FLAC, OGG, M4A).');
      console.error(err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleLoadAudioUrl = async (url: string) => {
    setIsLoadingAudio(true);
    try {
      if (isPlaying) {
        audioEngine.pause();
      }
      const result = await audioEngine.loadAudioFromUrl(url);
      setAudioBuffer(result.buffer);
      setAudioUrl(url);
      setWaveformData(result.waveform);
      setMetadata(result.metadata);
      setDuration(result.buffer.duration);
      setCurrentTime(0);
      setTrimStart(0);
      setTrimEnd(result.buffer.duration);
      setSettings((prev) => ({
        ...prev,
        trackTitle: result.metadata.fileName,
        artistName: 'Remote Audio Stream',
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load audio from URL';
      console.error('Audio URL loading failed:', err);
      throw new Error(msg);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleSelectPreset = async (preset: SampleAudioPreset) => {
    setIsLoadingAudio(true);
    try {
      if (isPlaying) {
        audioEngine.pause();
      }
      const result = await audioEngine.generateDemoTrack(preset.id);
      setAudioBuffer(result.buffer);
      setAudioUrl(null);
      setWaveformData(result.waveform);
      setMetadata(result.metadata);
      setDuration(result.buffer.duration);
      setCurrentTime(0);
      setTrimStart(0);
      setTrimEnd(result.buffer.duration);
      setSettings((prev) => ({
        ...prev,
        trackTitle: preset.name,
        artistName: preset.genre,
      }));
      setIsDemoModalOpen(false);
    } catch (err) {
      console.error('Preset loading failed:', err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleRecordingComplete = (data: { buffer: AudioBuffer; metadata: AudioMetadata; waveform: WaveformData }) => {
    if (isPlaying) {
      audioEngine.pause();
    }
    setAudioBuffer(data.buffer);
    setAudioUrl(null);
    setWaveformData(data.waveform);
    setMetadata(data.metadata);
    setDuration(data.buffer.duration);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(data.buffer.duration);
    setSettings((prev) => ({
      ...prev,
      trackTitle: data.metadata.fileName,
      artistName: 'Microphone Recording',
    }));
  };

  // Playback Control Handlers
  const handleTogglePlay = () => {
    audioEngine.togglePlay();
  };

  const handleSeek = (time: number) => {
    audioEngine.seek(time);
    setCurrentTime(time);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    audioEngine.setVolume(vol);
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    audioEngine.setPlaybackRate(rate);
  };

  const handleToggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    audioEngine.setLoop(next);
  };

  const handleTrimChange = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
  };

  // Settings & Theme Handlers
  const handleSettingsChange = (newSettings: Partial<VisualizerSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleThemeSelect = (themeId: string) => {
    const th = COLOR_THEMES.find((t) => t.id === themeId);
    if (th) {
      setTheme(th);
      setSettings((prev) => ({
        ...prev,
        themeId,
        primaryColor: th.primaryColor,
        gradientColor: th.gradientColor,
        backgroundColor: th.backgroundColor,
      }));
    }
  };

  const handleAspectRatioChange = (aspect: AspectRatioType) => {
    setSettings((prev) => ({ ...prev, aspectRatio: aspect }));
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* Top Application Header */}
      <Header
        metadata={metadata}
        onUploadClick={() => fileInputRef.current?.click()}
        onDemoClick={() => setIsDemoModalOpen(true)}
        onRecordClick={() => setIsRecordModalOpen(true)}
        onExportClick={() => setIsExportModalOpen(true)}
        onUrlAudioClick={() => setIsAudioUrlModalOpen(true)}
        isExportDisabled={!audioBuffer}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col gap-6">
        {/* Stage & Live Waveform Preview */}
        <section className="flex flex-col gap-4">
          <VisualizerCanvas
            buffer={audioBuffer}
            waveformData={waveformData}
            settings={settings}
            theme={theme}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onSeek={handleSeek}
            backgroundImage={backgroundImage}
            backgroundVideo={backgroundVideo}
            backgroundVideoUrl={backgroundVideoUrl}
            backgroundBlur={backgroundBlur}
            backgroundDim={backgroundDim}
            profileImage={profileImage}
            onAspectRatioChange={handleAspectRatioChange}
            onDropAudioFile={handleFileUpload}
            onToggleProfile={() => handleSettingsChange({ showProfileImage: !settings.showProfileImage })}
            onToggleJoint={() => handleSettingsChange({ enableJoint: !settings.enableJoint })}
            onToggleTrackInfo={() => handleSettingsChange({ showTrackInfo: !settings.showTrackInfo })}
          />

          {/* Audio Playback Timeline & Transport Controls */}
          <AudioControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            waveformData={waveformData}
            volume={volume}
            playbackRate={playbackRate}
            isLooping={isLooping}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onPlaybackRateChange={handlePlaybackRateChange}
            onToggleLoop={handleToggleLoop}
            onTrimChange={handleTrimChange}
          />
        </section>

        {/* Customization Settings Sidebar / Tabbed Panel */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-bold text-sm tracking-tight text-neutral-300">
              Visualizer Customization & Overlays
            </h2>
            <span className="text-xs text-neutral-500 font-mono">Real-time GPU rendering</span>
          </div>

          <ControlPanel
            settings={settings}
            theme={theme}
            onSettingsChange={handleSettingsChange}
            onThemeSelect={handleThemeSelect}
            onBackgroundImageUpload={setBackgroundImage}
            backgroundImage={backgroundImage}
            backgroundImageUrl={backgroundImageUrl}
            onBackgroundImageUrlChange={setBackgroundImageUrl}
            onBackgroundVideoUpload={(vid, url) => {
              setBackgroundVideo(vid);
              setBackgroundVideoUrl(url);
            }}
            backgroundVideo={backgroundVideo}
            backgroundVideoUrl={backgroundVideoUrl}
            backgroundBlur={backgroundBlur}
            onBackgroundBlurChange={setBackgroundBlur}
            backgroundDim={backgroundDim}
            onBackgroundDimChange={setBackgroundDim}
            profileImage={profileImage}
            profileImageUrl={profileImageUrl}
            onProfileImageUpload={setProfileImage}
            onProfileImageUrlChange={setProfileImageUrl}
          />
        </section>
      </main>

      {/* Fast Headless Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        audioBuffer={audioBuffer}
        audioUrl={audioUrl}
        waveformData={waveformData}
        settings={settings}
        theme={theme}
        trimStart={trimStart}
        trimEnd={trimEnd}
        backgroundImage={backgroundImage}
        backgroundImageUrl={backgroundImageUrl}
        backgroundVideo={backgroundVideo}
        backgroundVideoUrl={backgroundVideoUrl}
        backgroundBlur={backgroundBlur}
        backgroundDim={backgroundDim}
        profileImage={profileImage}
        profileImageUrl={profileImageUrl}
        onSettingsChange={handleSettingsChange}
      />

      {/* Demo Tracks Modal */}
      <DemoTracksModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSelectPreset={handleSelectPreset}
        isLoading={isLoadingAudio}
      />

      {/* Record Mic Modal */}
      <RecordMicModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onRecordingComplete={handleRecordingComplete}
      />

      {/* Remote Audio URL Modal */}
      <AudioUrlModal
        isOpen={isAudioUrlModalOpen}
        onClose={() => setIsAudioUrlModalOpen(false)}
        onLoadUrl={handleLoadAudioUrl}
        isLoading={isLoadingAudio}
      />
    </div>
  );
}
