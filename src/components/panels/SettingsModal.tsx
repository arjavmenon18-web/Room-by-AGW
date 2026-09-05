import React, { useState, useRef, useEffect } from 'react';
import { useMeeting } from '../../context/MeetingContext';
import { 
  X, 
  Camera, 
  Mic, 
  Volume2, 
  Palette, 
  User, 
  Check, 
  Play
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsSection = 'camera' | 'microphone' | 'audio' | 'appearance' | 'account';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    setUser,
    deviceSettings,
    updateDeviceSettings,
    availableDevices,
    refreshDevices,
    localStream,
    localAudioLevel,
    firebaseUser,
    signInWithGoogleAuth,
    signOutFirebaseAuth,
    atmosphere,
    setAtmosphere,
    restrainedIndicators,
    setRestrainedIndicators,
    filmGrain,
    setFilmGrain,
  } = useMeeting();

  const [activeSection, setActiveSection] = useState<SettingsSection>('camera');
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      refreshDevices();
    }
  }, [isOpen, refreshDevices]);

  useEffect(() => {
    if (videoRef.current && localStream && activeSection === 'camera') {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, activeSection]);

  if (!isOpen) return null;

  // Simple test sound generator using Web Audio API
  const handleTestSpeaker = () => {
    try {
      setIsPlayingTestSound(true);
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
      setTimeout(() => {
        setIsPlayingTestSound(false);
        audioCtx.close();
      }, 850);
    } catch {
      setIsPlayingTestSound(false);
    }
  };

  const sections: { id: SettingsSection; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'microphone', label: 'Microphone', icon: Mic },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1917]/50 backdrop-blur-sm animate-in fade-in duration-150 select-none font-sans">
      <div className="bg-[#faf8f5] border border-[#e8e4dc] rounded-2xl w-full max-w-2xl h-[520px] shadow-2xl flex flex-col overflow-hidden room-grain text-[#1a1917]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#ece7de] flex items-center justify-between">
          <h3 className="text-lg font-medium text-[#1a1917]">
            Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8a8479] hover:text-[#1a1917] hover:bg-[#f0ece3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Sidebar + Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation */}
          <nav className="w-48 border-r border-[#ece7de] p-3 space-y-1 bg-[#f7f5f0]">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-[#ede9e0] text-[#1a1917]'
                      : 'text-[#706a60] hover:text-[#1a1917] hover:bg-[#f0ece3]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#148b94]' : 'text-[#8a8479]'}`} />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Section Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* CAMERA */}
            {activeSection === 'camera' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-medium text-[#1a1917]">Camera</h4>
                  <p className="text-xs text-[#706a60] pt-0.5">Select and preview your video device.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6e685f]">Camera device</label>
                  <select
                    value={deviceSettings.videoInputId}
                    onChange={(e) => updateDeviceSettings({ videoInputId: e.target.value })}
                    className="w-full bg-[#faf8f5] border border-[#d8d3c7] focus:border-[#148b94] rounded-xl px-3.5 py-2 text-xs text-[#1a1917] focus:outline-none"
                  >
                    <option value="default">Default camera</option>
                    {availableDevices.videoInputs.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Preview Frame */}
                <div className="relative aspect-video max-w-sm rounded-xl bg-[#1d1c1a] border border-[#ded8cc] overflow-hidden flex items-center justify-center">
                  {localStream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${deviceSettings.mirrorVideo ? 'scale-x-[-1]' : ''}`}
                    />
                  ) : (
                    <span className="text-xs text-[#8a8479]">No camera connected</span>
                  )}
                </div>

                <div className="pt-1">
                  <label className="flex items-center space-x-2 text-xs text-[#504c44] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deviceSettings.mirrorVideo}
                      onChange={(e) => updateDeviceSettings({ mirrorVideo: e.target.checked })}
                      className="accent-[#148b94]"
                    />
                    <span>Mirror my video preview</span>
                  </label>
                </div>
              </div>
            )}

            {/* MICROPHONE */}
            {activeSection === 'microphone' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-medium text-[#1a1917]">Microphone</h4>
                  <p className="text-xs text-[#706a60] pt-0.5">Select and test your input audio.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6e685f]">Microphone device</label>
                  <select
                    value={deviceSettings.audioInputId}
                    onChange={(e) => updateDeviceSettings({ audioInputId: e.target.value })}
                    className="w-full bg-[#faf8f5] border border-[#d8d3c7] focus:border-[#148b94] rounded-xl px-3.5 py-2 text-xs text-[#1a1917] focus:outline-none"
                  >
                    <option value="default">Default microphone</option>
                    {availableDevices.audioInputs.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Microphone ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Input Level Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-[#706a60]">
                    <span>Input level</span>
                    <span className="font-mono text-[11px]">{localAudioLevel}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#e8e4dc] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#148b94] transition-all duration-75"
                      style={{ width: `${Math.min(100, localAudioLevel * 2.2)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <label className="flex items-center space-x-2 text-xs text-[#504c44] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deviceSettings.noiseSuppression}
                      onChange={(e) => updateDeviceSettings({ noiseSuppression: e.target.checked })}
                      className="accent-[#148b94]"
                    />
                    <span>Noise suppression</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-[#504c44] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deviceSettings.echoCancellation}
                      onChange={(e) => updateDeviceSettings({ echoCancellation: e.target.checked })}
                      className="accent-[#148b94]"
                    />
                    <span>Echo cancellation</span>
                  </label>
                </div>
              </div>
            )}

            {/* AUDIO (SPEAKERS) */}
            {activeSection === 'audio' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-medium text-[#1a1917]">Audio</h4>
                  <p className="text-xs text-[#706a60] pt-0.5">Select your speakers and test output sound.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6e685f]">Speaker output</label>
                  <select
                    value={deviceSettings.audioOutputId}
                    onChange={(e) => updateDeviceSettings({ audioOutputId: e.target.value })}
                    className="w-full bg-[#faf8f5] border border-[#d8d3c7] focus:border-[#148b94] rounded-xl px-3.5 py-2 text-xs text-[#1a1917] focus:outline-none"
                  >
                    <option value="default">Default system speaker</option>
                    {availableDevices.audioOutputs.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Speaker ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTestSpeaker}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#f3f0e8] hover:bg-[#eae5da] text-xs font-medium text-[#2d2b27] transition-colors border border-[#dcd6ca]"
                  >
                    <Play className="w-3.5 h-3.5 text-[#148b94]" />
                    <span>{isPlayingTestSound ? 'Playing sound…' : 'Test speaker'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* APPEARANCE */}
            {activeSection === 'appearance' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-medium text-[#1a1917]">Appearance</h4>
                  <p className="text-xs text-[#706a60] pt-0.5">Customize your interface and visual preferences.</p>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Atmosphere Selector Card (Interactive & Tactile) */}
                  <div 
                    onClick={() => {
                      const presets: ('linen' | 'obsidian' | 'studio')[] = ['linen', 'obsidian', 'studio'];
                      const next = presets[(presets.indexOf(atmosphere) + 1) % presets.length];
                      setAtmosphere(next);
                    }}
                    className="p-4 rounded-xl bg-[#f4efe5] hover:bg-[#ece6d8] border border-[#ded6c8] hover:border-[#148b94]/45 shadow-[0_1px_3px_rgba(45,38,28,0.04)] cursor-pointer transition-all duration-150 space-y-3 select-none group"
                    title="Click to cycle atmosphere theme"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-[#1a1917] group-hover:text-[#148b94] transition-colors">
                        Atmosphere
                      </div>
                      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider bg-[#148b94]/10 text-[#148b94] border border-[#148b94]/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#148b94] animate-pulse" />
                        <span>
                          {atmosphere === 'linen' ? 'Warm Linen' : atmosphere === 'obsidian' ? 'Obsidian Noir' : 'Studio Minimal'}
                        </span>
                      </span>
                    </div>

                    <div className="text-xs text-[#706a60] leading-relaxed font-light">
                      {atmosphere === 'linen' && 'Warm off-white foundation with fine organic film grain and muted cyan accents.'}
                      {atmosphere === 'obsidian' && 'Deep charcoal foundation with tactile dark noise and muted highlights.'}
                      {atmosphere === 'studio' && 'Clean architectural monochrome with minimal texture and crisp typography.'}
                    </div>

                    {/* Presets Quick Picker */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[
                        { id: 'linen' as const, label: 'Warm Linen', bg: '#faf8f5', border: '#ded7ca' },
                        { id: 'obsidian' as const, label: 'Obsidian Noir', bg: '#141312', border: '#38332a' },
                        { id: 'studio' as const, label: 'Studio Minimal', bg: '#f7f6f3', border: '#dedada' },
                      ].map((preset) => {
                        const isSelected = atmosphere === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAtmosphere(preset.id);
                            }}
                            className={`px-2.5 py-2 rounded-lg text-left border transition-all text-xs flex flex-col justify-between space-y-1.5 ${
                              isSelected
                                ? 'bg-[#faf8f4] border-[#148b94] shadow-[0_0_0_1px_rgba(20,139,148,0.35)]'
                                : 'bg-[#eae3d5]/70 hover:bg-[#e4dcce] border-[#ded7ca] text-[#706a60]'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span
                                className="w-3.5 h-3.5 rounded-full border shadow-sm"
                                style={{ backgroundColor: preset.bg, borderColor: preset.border }}
                              />
                              {isSelected && <Check className="w-3 h-3 text-[#148b94]" strokeWidth={2.5} />}
                            </div>
                            <span className={`text-[11px] font-medium leading-tight ${isSelected ? 'text-[#1a1917]' : 'text-[#706a60]'}`}>
                              {preset.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Restrained Indicators Toggle */}
                  <div 
                    onClick={() => setRestrainedIndicators(!restrainedIndicators)}
                    className="p-4 rounded-xl bg-[#f4efe5] hover:bg-[#ece6d8] border border-[#ded6c8] hover:border-[#148b94]/45 shadow-[0_1px_3px_rgba(45,38,28,0.04)] flex items-center justify-between cursor-pointer transition-all duration-150 select-none group"
                    title="Click to toggle speaking indicators"
                  >
                    <div>
                      <div className="text-xs font-medium text-[#1a1917] group-hover:text-[#148b94] transition-colors">
                        Restrained indicators
                      </div>
                      <div className="text-xs text-[#706a60] font-light">
                        Muted pulse and quiet highlights when speaking
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      restrainedIndicators 
                        ? 'bg-[#148b94] border-[#148b94] text-white shadow-sm' 
                        : 'bg-[#ede8dc] border-[#d8d1c2] text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Tactile Film Grain Toggle */}
                  <div 
                    onClick={() => setFilmGrain(!filmGrain)}
                    className="p-4 rounded-xl bg-[#f4efe5] hover:bg-[#ece6d8] border border-[#ded6c8] hover:border-[#148b94]/45 shadow-[0_1px_3px_rgba(45,38,28,0.04)] flex items-center justify-between cursor-pointer transition-all duration-150 select-none group"
                    title="Click to toggle film grain texture"
                  >
                    <div>
                      <div className="text-xs font-medium text-[#1a1917] group-hover:text-[#148b94] transition-colors">
                        Tactile film grain
                      </div>
                      <div className="text-xs text-[#706a60] font-light">
                        Fine organic paper tooth and cinematic micro-noise
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      filmGrain 
                        ? 'bg-[#148b94] border-[#148b94] text-white shadow-sm' 
                        : 'bg-[#ede8dc] border-[#d8d1c2] text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ACCOUNT */}
            {activeSection === 'account' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-medium text-[#1a1917]">Account</h4>
                  <p className="text-xs text-[#706a60] pt-0.5">Manage your profile details.</p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#6e685f]">Display name</label>
                    <input
                      type="text"
                      value={user.name}
                      onChange={(e) => setUser((u) => ({ ...u, name: e.target.value }))}
                      className="w-full bg-[#faf8f5] border border-[#d8d3c7] focus:border-[#148b94] rounded-xl px-3.5 py-2 text-xs text-[#1a1917] focus:outline-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-[#ece7de] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[#1a1917]">
                        {firebaseUser ? firebaseUser.email : 'Signed in as guest'}
                      </div>
                      <div className="text-xs text-[#8a8479]">
                        {firebaseUser ? 'Connected account' : 'Temporary guest session'}
                      </div>
                    </div>

                    {firebaseUser ? (
                      <button
                        type="button"
                        onClick={signOutFirebaseAuth}
                        className="px-3 py-1.5 rounded-lg border border-[#ded8cc] text-xs text-[#706a60] hover:text-[#1a1917] hover:bg-[#f0ece3] transition-colors"
                      >
                        Sign out
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={signInWithGoogleAuth}
                        className="px-3 py-1.5 rounded-lg bg-[#1a1917] text-white text-xs font-medium hover:bg-[#2d2a26] transition-colors"
                      >
                        Sign in
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
