/**
 * ROOM WebRTC Peer Connection Manager
 * Manages RTCPeerConnection instances for mesh peer-to-peer audio & video
 */

import { getRTCConfiguration } from './rtcConfig';
import { signalingClient } from '../signaling/SignalingClient';

export interface WebRTCManagerCallbacks {
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onPeerConnectionStateChange: (peerId: string, state: RTCPeerConnectionState) => void;
  onPeerDisconnected: (peerId: string) => void;
}

interface PeerEntry {
  pc: RTCPeerConnection;
  stream: MediaStream;
  pendingIce: RTCIceCandidateInit[];
}

export class WebRTCManager {
  private peers = new Map<string, PeerEntry>();
  private localStream: MediaStream | null = null;
  private isScreenSharing = false;
  private currentVideoTrack: MediaStreamTrack | null = null;
  private callbacks: Partial<WebRTCManagerCallbacks> = {};

  constructor() {
    this.setupSignalingListeners();
  }

  setCallbacks(callbacks: Partial<WebRTCManagerCallbacks>) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    if (stream) {
      const vTrack = stream.getVideoTracks()[0];
      if (vTrack && !this.isScreenSharing) {
        this.currentVideoTrack = vTrack;
      }

      // Update active peer connections with new tracks
      for (const entry of this.peers.values()) {
        this.attachLocalTracksToPeer(entry.pc);
      }
    }
  }

  private setupSignalingListeners() {
    signalingClient.setListeners({
      onReceiveOffer: async (senderId, sdp) => {
        await this.handleOffer(senderId, sdp);
      },
      onReceiveAnswer: async (senderId, sdp) => {
        await this.handleAnswer(senderId, sdp);
      },
      onReceiveIce: async (senderId, candidate) => {
        await this.handleIceCandidate(senderId, candidate);
      },
      onUserLeft: ({ id }) => {
        this.removePeer(id);
      },
    });
  }

  /**
   * Initiate a WebRTC offer to a remote peer that has joined
   */
  async createOfferToPeer(targetPeerId: string): Promise<void> {
    try {
      const pc = this.getOrCreatePeerConnection(targetPeerId);

      // Add local audio and video tracks
      this.attachLocalTracksToPeer(pc);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(offer);

      signalingClient.sendOffer(targetPeerId, offer);
    } catch (err) {
      console.error(`[WebRTC] Failed to create offer to ${targetPeerId}:`, err);
    }
  }

  /**
   * Handle an incoming offer from another peer
   */
  private async handleOffer(senderId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    try {
      const pc = this.getOrCreatePeerConnection(senderId);

      // Attach our local tracks so the caller receives our video/audio
      this.attachLocalTracksToPeer(pc);

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush any pending ICE candidates that arrived before remote description was set
      const entry = this.peers.get(senderId);
      if (entry && entry.pendingIce.length > 0) {
        for (const candidate of entry.pendingIce) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[WebRTC] Error adding buffered ICE candidate:', e);
          }
        }
        entry.pendingIce = [];
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      signalingClient.sendAnswer(senderId, answer);
    } catch (err) {
      console.error(`[WebRTC] Error handling offer from ${senderId}:`, err);
    }
  }

  /**
   * Handle incoming answer to our offer
   */
  private async handleAnswer(senderId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    try {
      const entry = this.peers.get(senderId);
      if (!entry) {
        console.warn(`[WebRTC] Received answer from unknown peer ${senderId}`);
        return;
      }

      await entry.pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush buffered ICE candidates
      if (entry.pendingIce.length > 0) {
        for (const candidate of entry.pendingIce) {
          try {
            await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[WebRTC] Error adding buffered ICE candidate:', e);
          }
        }
        entry.pendingIce = [];
      }
    } catch (err) {
      console.error(`[WebRTC] Error handling answer from ${senderId}:`, err);
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  private async handleIceCandidate(senderId: string, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      const entry = this.peers.get(senderId);
      if (!entry) {
        return;
      }

      if (entry.pc.remoteDescription && entry.pc.remoteDescription.type) {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Buffer candidate until remote description is ready
        entry.pendingIce.push(candidate);
      }
    } catch (err) {
      console.warn(`[WebRTC] Error adding ICE candidate from ${senderId}:`, err);
    }
  }

  private getOrCreatePeerConnection(peerId: string): RTCPeerConnection {
    let entry = this.peers.get(peerId);
    if (entry) {
      return entry.pc;
    }

    const config = getRTCConfiguration();
    const pc = new RTCPeerConnection(config);
    const remoteStream = new MediaStream();

    entry = {
      pc,
      stream: remoteStream,
      pendingIce: [],
    };
    this.peers.set(peerId, entry);

    // Track received tracks
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });

      // Also ensure individual track is added if event.streams was empty
      if (!remoteStream.getTracks().includes(event.track)) {
        remoteStream.addTrack(event.track);
      }

      this.callbacks.onRemoteStream?.(peerId, remoteStream);
    };

    // Forward local ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingClient.sendIceCandidate(peerId, event.candidate.toJSON());
      }
    };

    // Monitor connection states
    pc.onconnectionstatechange = () => {
      this.callbacks.onPeerConnectionStateChange?.(peerId, pc.connectionState);

      if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        console.log(`[WebRTC] Peer ${peerId} connection state changed to: ${pc.connectionState}`);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        console.warn(`[WebRTC] Peer ${peerId} ICE state: ${pc.iceConnectionState}`);
      }
    };

    return pc;
  }

  private attachLocalTracksToPeer(pc: RTCPeerConnection) {
    if (!this.localStream) return;

    const existingSenders = pc.getSenders();
    const tracksToAdd = this.localStream.getTracks();

    tracksToAdd.forEach((track) => {
      const matchingSender = existingSenders.find((s) => s.track?.kind === track.kind);
      if (matchingSender) {
        if (matchingSender.track?.id !== track.id) {
          matchingSender.replaceTrack(track).catch((e) => console.warn('[WebRTC] replaceTrack warning:', e));
        }
      } else {
        try {
          pc.addTrack(track, this.localStream!);
        } catch (e) {
          console.warn('[WebRTC] Track add warning:', e);
        }
      }
    });
  }

  /**
   * Seamlessly replace the video track with screen share or camera
   */
  async replaceVideoTrack(newTrack: MediaStreamTrack | null): Promise<void> {
    this.currentVideoTrack = newTrack;
    this.isScreenSharing = Boolean(newTrack && newTrack.label?.toLowerCase().includes('screen'));

    for (const [peerId, entry] of this.peers.entries()) {
      try {
        const senders = entry.pc.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');

        if (videoSender) {
          await videoSender.replaceTrack(newTrack);
        } else if (newTrack && this.localStream) {
          entry.pc.addTrack(newTrack, this.localStream);
        }
      } catch (err) {
        console.error(`[WebRTC] Failed to replace video track for peer ${peerId}:`, err);
      }
    }
  }

  /**
   * Toggle local audio track enabled state across all active connections
   */
  setAudioEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = enabled;
      });
    }
  }

  /**
   * Toggle local video track enabled state across all active connections
   */
  setVideoEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = enabled;
      });
    }
  }

  /**
   * Remove a peer connection when user leaves
   */
  removePeer(peerId: string) {
    const entry = this.peers.get(peerId);
    if (entry) {
      entry.pc.ontrack = null;
      entry.pc.onicecandidate = null;
      entry.pc.onconnectionstatechange = null;
      entry.pc.close();
      this.peers.delete(peerId);
      this.callbacks.onPeerDisconnected?.(peerId);
      console.log(`[WebRTC] Closed connection and removed peer: ${peerId}`);
    }
  }

  /**
   * Tear down all peer connections on leave
   */
  closeAll() {
    for (const [peerId] of this.peers.entries()) {
      this.removePeer(peerId);
    }
    this.peers.clear();
  }
}

export const webRTCManager = new WebRTCManager();
