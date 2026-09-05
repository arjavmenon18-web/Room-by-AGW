/**
 * ROOM WebSocket Signaling Client
 * Connects directly to backend signaling service to coordinate WebRTC connections
 */

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'unavailable';

export interface SignalingUser {
  id: string;
  name: string;
  role: 'host' | 'co-host' | 'guest';
  avatar?: string;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
}

export interface SignalingEvents {
  onStatusChange: (status: ConnectionStatus) => void;
  onJoinedRoom: (data: { assignedRole: string; existingParticipants: SignalingUser[]; totalParticipants: number }) => void;
  onUserJoined: (user: SignalingUser) => void;
  onUserLeft: (data: { id: string; name: string; remainingParticipants: number }) => void;
  onReceiveOffer: (senderId: string, sdp: RTCSessionDescriptionInit) => void;
  onReceiveAnswer: (senderId: string, sdp: RTCSessionDescriptionInit) => void;
  onReceiveIce: (senderId: string, candidate: RTCIceCandidateInit) => void;
  onMediaStateChanged: (data: { peerId: string; audioEnabled?: boolean; videoEnabled?: boolean; isScreenSharing?: boolean; isHandRaised?: boolean }) => void;
  onChatMessage: (msg: { id: string; senderId: string; senderName: string; text: string; timestamp: number }) => void;
  onError: (err: string) => void;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private currentRoomId: string | null = null;
  private currentPeerId: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private messageQueue: string[] = [];

  private listeners: Partial<SignalingEvents> = {};

  constructor() {
    // Initial status
  }

  setListeners(listeners: Partial<SignalingEvents>) {
    this.listeners = { ...this.listeners, ...listeners };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(s: ConnectionStatus) {
    if (this.status !== s) {
      this.status = s;
      this.listeners.onStatusChange?.(s);
    }
  }

  private getWebSocketUrl(): string {
    const customUrl = import.meta.env.VITE_SIGNALING_URL;
    if (customUrl) return customUrl;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  connect(): Promise<boolean> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve(true);
    }

    this.setStatus('connecting');
    const url = this.getWebSocketUrl();

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.setStatus('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();

          // Flush any queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            if (msg) this.ws?.send(msg);
          }

          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleIncomingMessage(data);
          } catch (e) {
            console.error('[SignalingClient] Parse error:', e);
          }
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          if (this.status !== 'disconnected') {
            this.setStatus('disconnected');
            this.scheduleReconnect();
          }
          resolve(false);
        };

        this.ws.onerror = () => {
          console.warn('[SignalingClient] WebSocket connection failed at', url);
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.setStatus('unavailable');
          }
          resolve(false);
        };
      } catch (err) {
        console.warn('[SignalingClient] Error creating WebSocket:', err);
        this.setStatus('unavailable');
        resolve(false);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
      this.reconnectTimer = setTimeout(() => {
        if (this.currentRoomId && this.currentPeerId) {
          this.connect();
        }
      }, delay);
    } else {
      this.setStatus('unavailable');
    }
  }

  private send(message: any) {
    const raw = JSON.stringify(message);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else {
      this.messageQueue.push(raw);
      if (this.status !== 'connecting') {
        this.connect();
      }
    }
  }

  joinRoom(params: {
    roomId: string;
    peerId: string;
    name: string;
    role: 'host' | 'co-host' | 'guest';
    avatar?: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
  }) {
    this.currentRoomId = params.roomId.trim().toUpperCase();
    this.currentPeerId = params.peerId;

    this.send({
      type: 'join-room',
      payload: {
        roomId: this.currentRoomId,
        peerId: params.peerId,
        name: params.name,
        role: params.role,
        avatar: params.avatar,
        audioEnabled: params.audioEnabled,
        videoEnabled: params.videoEnabled,
      },
    });
  }

  sendOffer(targetId: string, sdp: RTCSessionDescriptionInit) {
    this.send({
      type: 'signal-offer',
      senderId: this.currentPeerId,
      payload: { targetId, sdp },
    });
  }

  sendAnswer(targetId: string, sdp: RTCSessionDescriptionInit) {
    this.send({
      type: 'signal-answer',
      senderId: this.currentPeerId,
      payload: { targetId, sdp },
    });
  }

  sendIceCandidate(targetId: string, candidate: RTCIceCandidateInit) {
    this.send({
      type: 'signal-ice',
      senderId: this.currentPeerId,
      payload: { targetId, candidate },
    });
  }

  sendMediaState(state: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    isScreenSharing?: boolean;
    isHandRaised?: boolean;
  }) {
    this.send({
      type: 'media-state-changed',
      payload: state,
    });
  }

  sendChatMessage(text: string) {
    this.send({
      type: 'chat-message',
      payload: {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        text,
      },
    });
  }

  leaveRoom() {
    if (this.currentRoomId) {
      this.send({
        type: 'leave-room',
        payload: { roomId: this.currentRoomId, peerId: this.currentPeerId },
      });
      this.currentRoomId = null;
      this.currentPeerId = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private handleIncomingMessage(msg: any) {
    switch (msg.type) {
      case 'pong':
        break;

      case 'joined-room':
        this.listeners.onJoinedRoom?.(msg.payload);
        break;

      case 'user-joined':
        this.listeners.onUserJoined?.(msg.payload);
        break;

      case 'user-left':
        this.listeners.onUserLeft?.(msg.payload);
        break;

      case 'signal-offer':
        if (msg.senderId && msg.payload?.sdp) {
          this.listeners.onReceiveOffer?.(msg.senderId, msg.payload.sdp);
        }
        break;

      case 'signal-answer':
        if (msg.senderId && msg.payload?.sdp) {
          this.listeners.onReceiveAnswer?.(msg.senderId, msg.payload.sdp);
        }
        break;

      case 'signal-ice':
        if (msg.senderId && msg.payload?.candidate) {
          this.listeners.onReceiveIce?.(msg.senderId, msg.payload.candidate);
        }
        break;

      case 'media-state-changed':
        if (msg.payload) {
          this.listeners.onMediaStateChanged?.(msg.payload);
        }
        break;

      case 'chat-message':
        if (msg.payload) {
          this.listeners.onChatMessage?.(msg.payload);
        }
        break;

      case 'error':
        this.listeners.onError?.(msg.payload?.message || 'Signaling error');
        break;

      default:
        break;
    }
  }
}

export const signalingClient = new SignalingClient();
