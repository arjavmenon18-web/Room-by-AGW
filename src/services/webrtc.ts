/**
 * ROOM WebRTC & Media Device Service
 * by Armen GlobalWorks (AGW)
 * 
 * Provides production-ready WebRTC primitives:
 * - Local hardware media stream capture (Camera, Mic)
 * - Screen capture via getDisplayMedia
 * - Audio analysis & speaking activity detection
 * - WebRTC Signaling & PeerConnection abstractions
 * - Graceful fallback / HD simulated video canvas generators
 */

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export const DEFAULT_RTC_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class MediaService {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private audioLevelCallback: ((level: number) => void) | null = null;
  private animFrameId: number | null = null;

  /**
   * Enumerate available system audio and video hardware
   */
  async getDevices(): Promise<{
    audioInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return { audioInputs: [], audioOutputs: [], videoInputs: [] };
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        audioInputs: devices.filter((d) => d.kind === 'audioinput'),
        audioOutputs: devices.filter((d) => d.kind === 'audiooutput'),
        videoInputs: devices.filter((d) => d.kind === 'videoinput'),
      };
    } catch (err) {
      console.warn('Unable to enumerate devices:', err);
      return { audioInputs: [], audioOutputs: [], videoInputs: [] };
    }
  }

  /**
   * Request user camera and microphone stream
   */
  async getUserMedia(
    audio: boolean = true,
    video: boolean = true,
    videoDeviceId?: string,
    audioDeviceId?: string
  ): Promise<{ stream: MediaStream | null; error: Error | null; isSimulated: boolean }> {
    try {
      if (!audio && !video) {
        return { stream: new MediaStream(), error: null, isSimulated: false };
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser mediaDevices API not supported');
      }

      const constraints: MediaStreamConstraints = {
        audio: audio
          ? {
              deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
        video: video
          ? {
              deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;

      if (audio) {
        this.setupAudioAnalysis(stream);
      }

      return { stream, error: null, isSimulated: false };
    } catch (error: any) {
      console.warn('Real camera/mic acquisition unavailable or denied:', error.message);
      // Generate realistic canvas stream as visual preview if hardware blocked
      const simulated = this.createSimulatedLocalStream(video, audio);
      this.localStream = simulated;
      return { stream: simulated, error, isSimulated: true };
    }
  }

  /**
   * Setup Web Audio API volume detection
   */
  setupAudioAnalysis(stream: MediaStream, onLevelChange?: (level: number) => void) {
    if (onLevelChange) {
      this.audioLevelCallback = onLevelChange;
    }

    try {
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;

      this.microphoneSource = this.audioContext.createMediaStreamSource(stream);
      this.microphoneSource.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));

        if (this.audioLevelCallback) {
          this.audioLevelCallback(normalized);
        }

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('Could not initialize audio analysis:', err);
    }
  }

  setAudioCallback(cb: (level: number) => void) {
    this.audioLevelCallback = cb;
  }

  /**
   * Start native browser display capture (Screen share)
   */
  async getDisplayMedia(): Promise<{ stream: MediaStream | null; error: Error | null }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen capture not supported in this browser environment');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          frameRate: { max: 30 },
        } as any,
        audio: true,
      });

      this.screenStream = stream;
      return { stream, error: null };
    } catch (error: any) {
      console.warn('Screen share cancelled or failed:', error.message);
      return { stream: null, error };
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
  }

  /**
   * Physically stop video camera tracks and turn off hardware sensor
   */
  stopVideo() {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
        this.localStream?.removeTrack(track);
      });
    }
  }

  /**
   * Stop audio microphone tracks and volume detection
   */
  stopAudio() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
        this.localStream?.removeTrack(track);
      });
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Stop all active local media hardware
   */
  stopAll() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.stopScreenShare();

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }
  }

  /**
   * Creates a synthesized HD video stream with subtle cinematic grain & avatar initials
   * Used when physical camera is disabled or permissions unavailable
   */
  createSimulatedLocalStream(withVideo: boolean = true, withAudio: boolean = true): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    let phase = 0;
    const render = () => {
      phase += 0.02;

      // Deep cinematic studio backdrop
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#161513');
      gradient.addColorStop(0.5, '#1a1917');
      gradient.addColorStop(1, '#11100f');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle editorial vignette
      const radial = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.2,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.7
      );
      radial.addColorStop(0, 'rgba(217, 119, 70, 0.08)');
      radial.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center editorial monogram / portrait representation
      ctx.fillStyle = '#2c2925';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 20, 90, 0, Math.PI * 2);
      ctx.fill();

      // Delicate warm outline
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4a433a';
      ctx.stroke();

      // Monogram
      ctx.fillStyle = '#e5dfd5';
      ctx.font = '500 56px "Instrument Serif", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ROOM', canvas.width / 2, canvas.height / 2 - 20);

      // Live status text
      ctx.fillStyle = '#8f887d';
      ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('CAMERA FEED READY • ARMEN GLOBALWORKS', canvas.width / 2, canvas.height / 2 + 100);

      requestAnimationFrame(render);
    };

    render();
    const stream = canvas.captureStream(30);

    if (withAudio) {
      // Synthesized silent audio track
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          const ctxAudio = new AudioCtx();
          const osc = ctxAudio.createOscillator();
          const dst = ctxAudio.createMediaStreamDestination();
          osc.connect(dst);
          osc.start();
          const audioTrack = dst.stream.getAudioTracks()[0];
          audioTrack.enabled = false;
          stream.addTrack(audioTrack);
        } catch (e) {
          // silent fallback
        }
      }
    }

    return stream;
  }
}

export const mediaService = new MediaService();
