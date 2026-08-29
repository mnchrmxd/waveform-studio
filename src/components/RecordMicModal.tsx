import React, { useState, useEffect } from 'react';
import { X, Mic, Square, AlertCircle, CheckCircle2 } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { AudioMetadata, WaveformData } from '../types';

interface RecordMicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (data: { buffer: AudioBuffer; metadata: AudioMetadata; waveform: WaveformData }) => void;
}

export const RecordMicModal: React.FC<RecordMicModalProps> = ({
  isOpen,
  onClose,
  onRecordingComplete,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: number;
    if (isRecording) {
      timer = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    setErrorMessage(null);
    try {
      await audioEngine.startRecording();
      setIsRecording(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied or unavailable.';
      setErrorMessage(msg);
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await audioEngine.stopRecording();
      setIsRecording(false);
      onRecordingComplete(result);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process microphone audio.';
      setErrorMessage(msg);
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mic Icon / Pulse */}
        <div className="mx-auto my-4 relative">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-rose-500/20 text-rose-400 ring-8 ring-rose-500/10 animate-pulse'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
            }`}
          >
            <Mic className="w-10 h-10" />
          </div>
        </div>

        <h3 className="font-display font-bold text-lg text-white">
          {isRecording ? 'Recording Live Audio...' : 'Record Voice or Audio'}
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          {isRecording ? 'Speak, sing, or play an instrument' : 'Uses your browser microphone input directly'}
        </p>

        {/* Timer */}
        {isRecording && (
          <div className="my-4 font-mono text-3xl font-bold text-rose-400">
            {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, '0')}
          </div>
        )}

        {errorMessage && (
          <div className="my-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 flex justify-center">
          {!isRecording ? (
            <button
              id="start-mic-record-btn"
              onClick={handleStartRecording}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all cursor-pointer ring-1 ring-rose-400/30"
            >
              <Mic className="w-4 h-4" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              id="stop-mic-record-btn"
              onClick={handleStopRecording}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop & Visualize</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
