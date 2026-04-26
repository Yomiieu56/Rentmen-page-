import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Mic, Play, Square, Wand2, Volume2, Info, ChevronRight, Activity, Music } from 'lucide-react';
import { generateSpeech, analyzeVoiceSample, VOICES, VoiceName, VoiceOption, EMOTIONS, VoiceEmotion } from '../services/geminiService';
import { WaveformVisualizer } from './WaveformVisualizer';

export function VoiceStudio() {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[0]);
  const [selectedEmotion, setSelectedEmotion] = useState<VoiceEmotion>('neutral');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [sampleBase64, setSampleBase64] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSampleFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSampleBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onAnalyze = async () => {
    if (!sampleBase64 || !sampleFile) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const base64Data = sampleBase64.split(',')[1];
      const result = await analyzeVoiceSample(base64Data, sampleFile.type);
      setAnalysisResult(result || "Analysis failed.");
      
      // Auto-suggest voice based on analysis (simple heuristic for demo)
      if (result) {
        const lowerResult = result.toLowerCase();
        const suggested = VOICES.find(v => lowerResult.includes(v.name.toLowerCase()));
        if (suggested) setSelectedVoice(suggested);
      }
    } catch (error: any) {
      console.error(error);
      setAnalysisResult("Error analyzing sample: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onGenerate = async () => {
    if (!text) return;
    setIsGenerating(true);
    try {
      const base64 = await generateSpeech(text, selectedVoice.name, selectedEmotion);
      const audioUrl = await pcm24ToWavUrl(base64);
      setAudioUrl(audioUrl);
      
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play();
      }
    } catch (error: any) {
      console.error(error);
      alert("Generation failed: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to convert base64 PCM to WAV Blob URL
  const pcm24ToWavUrl = async (base64: string) => {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Int16Array(len / 2);
    for (let i = 0; i < len; i += 2) {
      bytes[i / 2] = (binary.charCodeAt(i + 1) << 8) | binary.charCodeAt(i);
    }
    
    const sampleRate = 24000;
    const wavBuffer = createWavHeader(bytes.length * 2, sampleRate);
    const combined = new Uint8Array(wavBuffer.length + bytes.length * 2);
    combined.set(wavBuffer);
    combined.set(new Uint8Array(bytes.buffer), wavBuffer.length);
    
    return URL.createObjectURL(new Blob([combined], { type: 'audio/wav' }));
  };

  const createWavHeader = (dataLength: number, sampleRate: number) => {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    
    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + dataLength, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, dataLength, true);
    
    return new Uint8Array(buffer);
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const base64ToBlob = (base64: string, mime: string) => {
    const binary = atob(base64);
    const len = binary.length;
    const array = new Uint8Array(len);
    for (let i = 0; i < len; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#ECECEC] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222] pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-[#F27D26]" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[#888]">Advanced Audio Engine V3.1</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-light tracking-tight">Realistic <span className="italic text-[#F27D26]">Voice</span> Studio</h1>
          </div>
          <div className="hidden md:block">
            <div className="text-right font-mono text-[10px] text-[#555] uppercase tracking-widest leading-relaxed">
              Status // Optimal<br />
              Encryption // Active<br />
              Model // Gemini 3.1 TTS
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          
          {/* Left Column: Sample Analysis */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#111] p-6 rounded-2xl border border-[#222] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Upload className="w-12 h-12" />
              </div>
              
              <h2 className="text-sm font-mono uppercase tracking-widest text-[#888] mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#F27D26] rounded-full animate-pulse" />
                Reference Intake
              </h2>
              
              <div 
                className="border-2 border-dashed border-[#333] rounded-xl p-8 text-center hover:border-[#F27D26] hover:bg-[#1a1a1a] transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="audio/*"
                />
                {sampleFile ? (
                  <div className="space-y-2">
                    <Music className="w-8 h-8 mx-auto text-[#F27D26]" />
                    <p className="text-xs font-medium truncate">{sampleFile.name}</p>
                    <p className="text-[10px] text-[#555]">{(sampleFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-[#444]" />
                    <p className="text-xs text-[#666]">Upload voice sample for analysis</p>
                  </div>
                )}
              </div>

              {sampleFile && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                  className="w-full mt-6 bg-[#222] hover:bg-[#F27D26] hover:text-[#000] py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Analyzing Frequency...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      Fingerprint Analysis
                    </>
                  )}
                </motion.button>
              )}

              <AnimatePresence>
                {analysisResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 pt-6 border-t border-[#222]"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="w-4 h-4 text-[#F27D26]" />
                      <span className="text-[10px] font-mono text-[#888] uppercase tracking-wide">AI Profile Identification</span>
                    </div>
                    <div className="text-xs text-[#AAA] leading-relaxed italic bg-[#000] p-4 rounded-lg border border-[#1a1a1a]">
                      {analysisResult}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="bg-[#111] p-4 rounded-xl border border-[#222] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-[#444]" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-[#555] uppercase">Output Protocol</p>
                <p className="text-xs text-[#888]">Auto-Stereo 48kbps Mono</p>
              </div>
            </div>
          </div>

          {/* Right Column: Generation Controls */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[#111] p-8 rounded-2xl border border-[#222] shadow-2xl space-y-8">
              
              {/* Voice Selector */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[#555] mb-4">Select Voice Core</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {VOICES.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => setSelectedVoice(v)}
                      className={`p-3 rounded-xl border transition-all text-left ${
                        selectedVoice.name === v.name 
                          ? 'border-[#F27D26] bg-[#F27D26]/5' 
                          : 'border-[#222] bg-[#1a1a1a] hover:border-[#333]'
                      }`}
                    >
                      <p className={`text-xs font-bold ${selectedVoice.name === v.name ? 'text-[#F27D26]' : 'text-[#888]'}`}>
                        {v.name}
                      </p>
                      <p className="text-[9px] text-[#444] uppercase tracking-tighter mt-1">{v.gender}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] flex items-start gap-3">
                  <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-[#F27D26] opacity-50 shadow-[0_0_8px_rgba(242,125,38,0.5)]" />
                  </div>
                  <p className="text-xs text-[#666] leading-relaxed">
                    <span className="text-[#F27D26] font-medium">{selectedVoice.name} Profile:</span> {selectedVoice.description}
                  </p>
                </div>
              </div>

              {/* Emotion Selector */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[#555] mb-4">Emotional Modulation</h3>
                <div className="flex flex-wrap gap-2">
                  {EMOTIONS.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEmotion(e.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-xs ${
                        selectedEmotion === e.id
                          ? 'border-[#F27D26] bg-[#F27D26]/10 text-[#F27D26]'
                          : 'border-[#222] bg-[#1a1a1a] text-[#888] hover:border-[#333]'
                      }`}
                    >
                      <span>{e.icon}</span>
                      <span className="font-medium">{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[#555]">Script Conversion</h3>
                  <span className="text-[10px] text-[#444] font-mono">{text.length} Characters</span>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the text you want the voice to say..."
                  className="w-full h-40 bg-[#0a0a0a] border border-[#222] rounded-xl p-6 text-[#ECECEC] focus:ring-1 focus:ring-[#F27D26] focus:border-transparent outline-none resize-none transition-all placeholder:text-[#333] text-sm leading-relaxed"
                />
              </div>

              {/* Action */}
              <div className="flex flex-col md:flex-row items-center gap-6">
                <button
                  onClick={onGenerate}
                  disabled={isGenerating || !text}
                  className="w-full md:w-auto px-12 py-4 bg-[#F27D26] hover:bg-[#ff8e3d] text-[#000] rounded-xl font-black uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#F27D26]/10 disabled:opacity-50 active:scale-95"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-3 border-[#000] border-t-transparent rounded-full animate-spin" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Generate Speech
                    </>
                  )}
                </button>

                <div className="flex-1 w-full bg-[#0a0a0a] border border-[#222] rounded-xl p-4 flex items-center gap-4">
                  <WaveformVisualizer isAnimating={isGenerating} />
                </div>
              </div>

              {/* Player Area */}
              <AnimatePresence>
                {audioUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-[#0a0a0a] rounded-xl border border-[#F27D26]/20 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#F27D26]/10" />
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F27D26] flex items-center justify-center">
                          <Play className="w-4 h-4 text-black fill-black" />
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-[#F27D26] uppercase font-bold tracking-widest">Master Recording</p>
                          <p className="text-xs text-[#888]">WAV Container // 24kHz Sample Rate</p>
                        </div>
                      </div>
                      <audio 
                        controls 
                        ref={audioRef} 
                        src={audioUrl} 
                        className="h-10 invert brightness-125 rounded-none" 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-[#111]">
          <p className="text-[10px] font-mono text-[#333] uppercase tracking-[0.4em]">
            Neural Synthesis Platform &copy; 2026 // Powered by Gemini AI
          </p>
        </footer>
      </div>
    </div>
  );
}
