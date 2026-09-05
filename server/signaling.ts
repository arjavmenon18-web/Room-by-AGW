import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage, Server } from 'http';

export interface ParticipantSession {
  ws: WebSocket;
  peerId: string;
  roomId: string;
  name: string;
  role: 'host' | 'co-host' | 'guest';
  avatar?: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  joinedAt: number;
}

export interface SignalingMessage {
  type: 
    | 'join-room'
    | 'leave-room'
    | 'joined-room'
    | 'user-joined'
    | 'user-left'
    | 'signal-offer'
    | 'signal-answer'
    | 'signal-ice'
    | 'media-state-changed'
    | 'chat-message'
    | 'room-locked'
    | 'kick-participant'
    | 'ping'
    | 'pong'
    | 'error';
  roomId?: string;
  peerId?: string;
  targetId?: string;
  senderId?: string;
  senderName?: string;
  payload?: any;
}

export class RoomSignalingServer {
  private wss: WebSocketServer | null = null;
  // roomId -> Map<peerId, ParticipantSession>
  private rooms = new Map<string, Map<string, ParticipantSession>>();
  // ws -> ParticipantSession
  private socketToSession = new Map<WebSocket, ParticipantSession>();

  init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      ws.on('message', (raw: string | Buffer) => {
        try {
          const msg: SignalingMessage = JSON.parse(raw.toString());
          this.handleMessage(ws, msg);
        } catch (err) {
          console.error('[Signaling] Failed to parse message:', err);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (err) => {
        console.warn('[Signaling] WebSocket error:', err.message);
        this.handleDisconnect(ws);
      });

      // Send initial connection acknowledgement
      ws.send(JSON.stringify({
        type: 'pong',
        payload: { status: 'connected', time: Date.now() }
      }));
    });

    console.log('[Signaling] Room WebSocket Signaling Server initialized on /ws');
  }

  private handleMessage(ws: WebSocket, msg: SignalingMessage) {
    switch (msg.type) {
      case 'ping': {
        ws.send(JSON.stringify({ type: 'pong', payload: { time: Date.now() } }));
        break;
      }

      case 'join-room': {
        const { roomId, peerId, name, role, audioEnabled, videoEnabled, avatar } = msg.payload || {};
        if (!roomId || !peerId) {
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'roomId and peerId are required to join' }
          }));
          return;
        }

        const cleanRoomId = roomId.trim().toUpperCase();

        // Create room bucket if not existing
        if (!this.rooms.has(cleanRoomId)) {
          this.rooms.set(cleanRoomId, new Map());
        }
        const roomPeers = this.rooms.get(cleanRoomId)!;

        // Create session
        const session: ParticipantSession = {
          ws,
          peerId,
          roomId: cleanRoomId,
          name: name || 'Guest User',
          role: role || (roomPeers.size === 0 ? 'host' : 'guest'),
          avatar: avatar || undefined,
          audioEnabled: audioEnabled !== false,
          videoEnabled: videoEnabled !== false,
          isScreenSharing: false,
          isHandRaised: false,
          joinedAt: Date.now()
        };

        roomPeers.set(peerId, session);
        this.socketToSession.set(ws, session);

        // Collect existing peers to return to the new joiner
        const existingParticipants = Array.from(roomPeers.values())
          .filter((s) => s.peerId !== peerId)
          .map((s) => ({
            id: s.peerId,
            name: s.name,
            role: s.role,
            avatar: s.avatar,
            audioEnabled: s.audioEnabled,
            videoEnabled: s.videoEnabled,
            isScreenSharing: s.isScreenSharing,
            isHandRaised: s.isHandRaised
          }));

        // Acknowledge joining and return existing peers in the room
        ws.send(JSON.stringify({
          type: 'joined-room',
          roomId: cleanRoomId,
          peerId,
          payload: {
            assignedRole: session.role,
            existingParticipants,
            totalParticipants: roomPeers.size
          }
        }));

        // Broadcast to all other peers in the room that a new user joined
        this.broadcastToRoom(cleanRoomId, peerId, {
          type: 'user-joined',
          roomId: cleanRoomId,
          peerId,
          payload: {
            id: peerId,
            name: session.name,
            role: session.role,
            avatar: session.avatar,
            audioEnabled: session.audioEnabled,
            videoEnabled: session.videoEnabled,
            isScreenSharing: false,
            isHandRaised: false
          }
        });

        console.log(`[Signaling] Peer ${peerId} (${session.name}) joined room ${cleanRoomId}. Total: ${roomPeers.size}`);
        break;
      }

      case 'signal-offer': {
        // Forward WebRTC SDP offer directly to target peer
        const { targetId, sdp } = msg.payload || {};
        if (targetId) {
          this.sendToPeer(targetId, {
            type: 'signal-offer',
            senderId: msg.senderId || msg.peerId,
            senderName: msg.senderName,
            payload: { sdp }
          });
        }
        break;
      }

      case 'signal-answer': {
        // Forward WebRTC SDP answer directly to target peer
        const { targetId, sdp } = msg.payload || {};
        if (targetId) {
          this.sendToPeer(targetId, {
            type: 'signal-answer',
            senderId: msg.senderId || msg.peerId,
            payload: { sdp }
          });
        }
        break;
      }

      case 'signal-ice': {
        // Forward ICE Candidate to target peer
        const { targetId, candidate } = msg.payload || {};
        if (targetId && candidate) {
          this.sendToPeer(targetId, {
            type: 'signal-ice',
            senderId: msg.senderId || msg.peerId,
            payload: { candidate }
          });
        }
        break;
      }

      case 'media-state-changed': {
        // Broadcast mute/camera/screenshare status update to room
        const session = this.socketToSession.get(ws);
        if (session) {
          const { audioEnabled, videoEnabled, isScreenSharing, isHandRaised } = msg.payload || {};
          if (audioEnabled !== undefined) session.audioEnabled = audioEnabled;
          if (videoEnabled !== undefined) session.videoEnabled = videoEnabled;
          if (isScreenSharing !== undefined) session.isScreenSharing = isScreenSharing;
          if (isHandRaised !== undefined) session.isHandRaised = isHandRaised;

          this.broadcastToRoom(session.roomId, session.peerId, {
            type: 'media-state-changed',
            peerId: session.peerId,
            roomId: session.roomId,
            payload: {
              peerId: session.peerId,
              audioEnabled: session.audioEnabled,
              videoEnabled: session.videoEnabled,
              isScreenSharing: session.isScreenSharing,
              isHandRaised: session.isHandRaised
            }
          });
        }
        break;
      }

      case 'chat-message': {
        // Forward real-time chat message to all peers in room
        const session = this.socketToSession.get(ws);
        if (session) {
          this.broadcastToRoom(session.roomId, null, {
            type: 'chat-message',
            roomId: session.roomId,
            payload: {
              id: msg.payload?.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              senderId: session.peerId,
              senderName: session.name,
              text: msg.payload?.text || '',
              timestamp: Date.now()
            }
          });
        }
        break;
      }

      case 'leave-room': {
        this.handleDisconnect(ws);
        break;
      }

      default:
        console.log('[Signaling] Unknown message type:', msg.type);
    }
  }

  private handleDisconnect(ws: WebSocket) {
    const session = this.socketToSession.get(ws);
    if (!session) return;

    const { roomId, peerId, name } = session;
    this.socketToSession.delete(ws);

    const roomPeers = this.rooms.get(roomId);
    if (roomPeers) {
      roomPeers.delete(peerId);

      // Notify remaining room members
      this.broadcastToRoom(roomId, peerId, {
        type: 'user-left',
        roomId,
        peerId,
        payload: {
          id: peerId,
          name,
          remainingParticipants: roomPeers.size
        }
      });

      console.log(`[Signaling] Peer ${peerId} left room ${roomId}. Remaining: ${roomPeers.size}`);

      // Clean up empty room
      if (roomPeers.size === 0) {
        this.rooms.delete(roomId);
        console.log(`[Signaling] Room ${roomId} is now empty and cleaned up.`);
      }
    }
  }

  private sendToPeer(peerId: string, msg: SignalingMessage): boolean {
    for (const session of this.socketToSession.values()) {
      if (session.peerId === peerId && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify(msg));
        return true;
      }
    }
    return false;
  }

  private broadcastToRoom(roomId: string, excludePeerId: string | null, msg: SignalingMessage) {
    const roomPeers = this.rooms.get(roomId);
    if (!roomPeers) return;

    const serialized = JSON.stringify(msg);
    for (const [peerId, session] of roomPeers.entries()) {
      if (peerId !== excludePeerId && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(serialized);
      }
    }
  }

  getStats() {
    let totalConnections = this.socketToSession.size;
    let activeRooms = this.rooms.size;
    const roomList = Array.from(this.rooms.entries()).map(([id, peers]) => ({
      id,
      participantsCount: peers.size
    }));

    return {
      activeRooms,
      totalConnections,
      roomList
    };
  }
}

export const signalingServer = new RoomSignalingServer();
