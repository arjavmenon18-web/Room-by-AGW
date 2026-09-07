import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage, Server } from 'http';
import { roomManager } from './rooms';

export interface ParticipantSession {
  ws: WebSocket;
  participantId: string;
  peerId: string;
  userId: string;
  sessionId: string;
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
        const {
          roomId,
          participantId,
          peerId,
          userId,
          sessionId,
          name,
          role,
          audioEnabled,
          videoEnabled,
          avatar
        } = msg.payload || {};

        if (!roomId) {
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'roomId is required to join' }
          }));
          return;
        }

        // 1. Canonical Room lookup & validation
        let canonicalRoom = roomManager.getRoom(roomId);
        if (!canonicalRoom) {
          // If role was explicitly host and room does not exist, initialize canonical room
          if (role === 'host') {
            canonicalRoom = roomManager.createRoom({
              id: roomId,
              hostId: userId || peerId || `usr-${Math.random().toString(36).substring(2, 9)}`,
              hostName: (name && name.trim()) ? name.trim() : 'Room Host',
            });
          } else {
            // Strictly JOIN EXISTING ROOM: do not create room for guest
            ws.send(JSON.stringify({
              type: 'error',
              payload: { code: 'ROOM_NOT_FOUND', message: `Room ${roomId} does not exist.` }
            }));
            return;
          }
        }

        const cleanRoomId = canonicalRoom.id;

        // 2. Strict Identity Separation:
        // Participant ID / Peer ID: unique per connection / tab
        const effectiveParticipantId = participantId || peerId || sessionId || `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        // User ID: identifies the person
        const effectiveUserId = userId || `usr-${effectiveParticipantId}`;
        // Session ID: identifies the connection/tab
        const effectiveSessionId = sessionId || `sess-${effectiveParticipantId}`;

        // 3. Strict Role Resolution:
        // ONLY the user whose userId matches canonicalRoom.hostId can be 'host'!
        const isHost = Boolean(canonicalRoom.hostId && canonicalRoom.hostId === effectiveUserId);
        const assignedRole: 'host' | 'co-host' | 'guest' = isHost ? 'host' : 'guest';

        // 4. Display Name Resolution:
        // Distinct participant identity - never copy room host's name for guest joiners!
        const participantName = (name && name.trim()) 
          ? name.trim() 
          : (isHost ? (canonicalRoom.hostName || 'Room Host') : 'Guest Participant');

        // Create room bucket if not existing
        if (!this.rooms.has(cleanRoomId)) {
          this.rooms.set(cleanRoomId, new Map());
        }
        const roomPeers = this.rooms.get(cleanRoomId)!;

        // Create session
        const session: ParticipantSession = {
          ws,
          participantId: effectiveParticipantId,
          peerId: effectiveParticipantId,
          userId: effectiveUserId,
          sessionId: effectiveSessionId,
          roomId: cleanRoomId,
          name: participantName,
          role: assignedRole,
          avatar: avatar || undefined,
          audioEnabled: audioEnabled !== false,
          videoEnabled: videoEnabled !== false,
          isScreenSharing: false,
          isHandRaised: false,
          joinedAt: Date.now()
        };

        roomPeers.set(effectiveParticipantId, session);
        this.socketToSession.set(ws, session);

        // Synchronize with authoritative RoomManager
        roomManager.addParticipant(cleanRoomId, {
          participantId: effectiveParticipantId,
          userId: effectiveUserId,
          sessionId: effectiveSessionId,
          name: participantName,
          role: assignedRole,
          avatar: session.avatar,
          audioEnabled: session.audioEnabled,
          videoEnabled: session.videoEnabled,
          isScreenSharing: false,
          isHandRaised: false,
          joinedAt: session.joinedAt
        });

        // Collect existing peers in the room to return to the new joiner
        const existingParticipants = Array.from(roomPeers.values())
          .filter((s) => s.participantId !== effectiveParticipantId)
          .map((s) => ({
            id: s.participantId,
            participantId: s.participantId,
            userId: s.userId,
            sessionId: s.sessionId,
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
          peerId: effectiveParticipantId,
          payload: {
            assignedRole: session.role,
            roomId: cleanRoomId,
            roomName: canonicalRoom.name,
            hostId: canonicalRoom.hostId,
            hostName: canonicalRoom.hostName,
            participantId: effectiveParticipantId,
            userId: effectiveUserId,
            sessionId: effectiveSessionId,
            existingParticipants,
            totalParticipants: roomPeers.size
          }
        }));

        // Broadcast to all other peers in the room that a new user joined
        this.broadcastToRoom(cleanRoomId, effectiveParticipantId, {
          type: 'user-joined',
          roomId: cleanRoomId,
          peerId: effectiveParticipantId,
          payload: {
            id: effectiveParticipantId,
            participantId: effectiveParticipantId,
            userId: effectiveUserId,
            sessionId: effectiveSessionId,
            name: session.name,
            role: session.role,
            avatar: session.avatar,
            audioEnabled: session.audioEnabled,
            videoEnabled: session.videoEnabled,
            isScreenSharing: false,
            isHandRaised: false,
            totalParticipants: roomPeers.size
          }
        });

        console.log(`[Signaling] Participant joined: "${session.name}" (id: ${effectiveParticipantId}, userId: ${effectiveUserId}, role: ${session.role}) into room ${cleanRoomId}. Total active in room: ${roomPeers.size}`);
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

          // Update canonical RoomManager
          roomManager.updateParticipantMedia(session.roomId, session.participantId, {
            audioEnabled: session.audioEnabled,
            videoEnabled: session.videoEnabled,
            isScreenSharing: session.isScreenSharing,
            isHandRaised: session.isHandRaised,
          });

          this.broadcastToRoom(session.roomId, session.peerId, {
            type: 'media-state-changed',
            peerId: session.peerId,
            roomId: session.roomId,
            payload: {
              id: session.participantId,
              peerId: session.peerId,
              participantId: session.participantId,
              userId: session.userId,
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

    const { roomId, peerId, participantId, userId, name } = session;
    this.socketToSession.delete(ws);

    // Remove from canonical RoomManager
    roomManager.removeParticipant(roomId, participantId);

    const roomPeers = this.rooms.get(roomId);
    if (roomPeers) {
      roomPeers.delete(peerId);

      // Notify remaining room members
      this.broadcastToRoom(roomId, peerId, {
        type: 'user-left',
        roomId,
        peerId,
        payload: {
          id: participantId || peerId,
          participantId: participantId || peerId,
          userId,
          name,
          remainingParticipants: roomPeers.size,
          totalParticipants: roomPeers.size
        }
      });

      console.log(`[Signaling] Participant "${name}" (${peerId}) left room ${roomId}. Remaining in room: ${roomPeers.size}`);

      // Clean up empty active connection map for this room
      if (roomPeers.size === 0) {
        this.rooms.delete(roomId);
        console.log(`[Signaling] Room ${roomId} has 0 active connections. Preserving canonical metadata in RoomManager.`);
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
