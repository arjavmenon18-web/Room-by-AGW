export interface ActiveParticipant {
  participantId: string;
  userId: string;
  sessionId: string;
  name: string;
  role: 'host' | 'co-host' | 'guest';
  avatar?: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  joinedAt: number;
}

export interface ServerRoom {
  id: string;
  roomCode: string;
  name: string;
  hostId: string;
  hostName: string;
  createdAt: string;
  expiresAt: string;
  isLocked: boolean;
  permissions: {
    waitingRoomEnabled: boolean;
    allowGuestScreenShare: boolean;
    allowGuestChat: boolean;
    muteOnEntry: boolean;
    hostApprovalRequired: boolean;
  };
  participants: Map<string, ActiveParticipant>;
}

export interface ServerUser {
  id: string;
  displayName: string;
  avatar?: string;
  role: 'host' | 'co-host' | 'guest';
  createdAt: string;
}

export interface ServerRoomParticipant {
  roomId: string;
  userId: string;
  displayName: string;
  role: 'host' | 'co-host' | 'guest';
  joinedAt: string;
  leftAt?: string;
}

class RoomManager {
  private rooms = new Map<string, ServerRoom>();

  private normalizeKey(rawId: string): string {
    const trimmed = (rawId || '').trim();
    if (/^\d{4}$/.test(trimmed)) {
      return `room-agw-${trimmed}`;
    }
    const match = trimmed.match(/^room-agw-(\d{4})$/i);
    if (match) {
      return `room-agw-${match[1]}`;
    }
    return trimmed.toLowerCase();
  }

  private formatCanonicalId(rawId?: string): string {
    if (!rawId || !rawId.trim()) {
      return `Room-agw-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const trimmed = rawId.trim();
    if (/^\d{4}$/.test(trimmed)) {
      return `Room-agw-${trimmed}`;
    }
    const match = trimmed.match(/^room-agw-(\d{4})$/i);
    if (match) {
      return `Room-agw-${match[1]}`;
    }
    return trimmed;
  }

  createRoom(params: {
    id?: string;
    name?: string;
    hostId: string;
    hostName: string;
    ttlHours?: number;
  }): ServerRoom {
    const canonicalId = this.formatCanonicalId(params.id);
    const lookupKey = this.normalizeKey(canonicalId);

    const existing = this.rooms.get(lookupKey);
    if (existing) {
      if (params.hostId && params.hostId !== 'host-user') {
        existing.hostId = params.hostId;
      }
      if (params.hostName && params.hostName !== 'Room Host') {
        existing.hostName = params.hostName;
      }
      if (params.name && params.name.trim()) {
        existing.name = params.name.trim();
      }
      return existing;
    }

    const now = new Date();
    const expires = new Date(now.getTime() + (params.ttlHours || 48) * 60 * 60 * 1000);

    const room: ServerRoom = {
      id: canonicalId,
      roomCode: canonicalId,
      name: params.name || `ROOM Session (${canonicalId})`,
      hostId: params.hostId,
      hostName: params.hostName,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      isLocked: false,
      permissions: {
        waitingRoomEnabled: false,
        allowGuestScreenShare: true,
        allowGuestChat: true,
        muteOnEntry: false,
        hostApprovalRequired: false,
      },
      participants: new Map<string, ActiveParticipant>(),
    };

    this.rooms.set(lookupKey, room);
    console.log(`[RoomManager] Canonical room created/registered: ${canonicalId} (hostId: ${params.hostId}, hostName: ${params.hostName})`);
    return room;
  }

  getRoom(roomId: string): ServerRoom | null {
    if (!roomId) return null;
    const key = this.normalizeKey(roomId);
    const room = this.rooms.get(key);
    if (!room) return null;

    // Check expiration
    if (new Date(room.expiresAt).getTime() < Date.now()) {
      this.rooms.delete(key);
      return null;
    }

    return room;
  }

  validateRoom(roomId: string): { valid: boolean; room?: ServerRoom; reason?: string } {
    if (!roomId) {
      return { valid: false, reason: 'Room ID is required' };
    }
    const key = this.normalizeKey(roomId);
    const room = this.rooms.get(key);

    if (!room) {
      return { valid: false, reason: 'Room not found' };
    }

    if (new Date(room.expiresAt).getTime() < Date.now()) {
      this.rooms.delete(key);
      return { valid: false, reason: 'Room has expired' };
    }

    if (room.isLocked) {
      return { valid: false, reason: 'Room is locked by host' };
    }

    return { valid: true, room };
  }

  addParticipant(roomId: string, participant: ActiveParticipant): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;

    room.participants.set(participant.participantId, participant);
    console.log(`[RoomManager] Added participant ${participant.name} (${participant.participantId}) to room ${room.id}. Total active: ${room.participants.size}`);
    return true;
  }

  removeParticipant(roomId: string, participantId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;

    const removed = room.participants.delete(participantId);
    console.log(`[RoomManager] Removed participant (${participantId}) from room ${room.id}. Total active: ${room.participants.size}`);
    return removed;
  }

  getParticipants(roomId: string): ActiveParticipant[] {
    const room = this.getRoom(roomId);
    if (!room) return [];
    return Array.from(room.participants.values());
  }

  updateParticipantMedia(
    roomId: string,
    participantId: string,
    mediaState: { audioEnabled?: boolean; videoEnabled?: boolean; isScreenSharing?: boolean; isHandRaised?: boolean }
  ): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;

    const participant = room.participants.get(participantId);
    if (!participant) return false;

    if (mediaState.audioEnabled !== undefined) participant.audioEnabled = mediaState.audioEnabled;
    if (mediaState.videoEnabled !== undefined) participant.videoEnabled = mediaState.videoEnabled;
    if (mediaState.isScreenSharing !== undefined) participant.isScreenSharing = mediaState.isScreenSharing;
    if (mediaState.isHandRaised !== undefined) participant.isHandRaised = mediaState.isHandRaised;

    return true;
  }

  setLock(roomId: string, locked: boolean): boolean {
    const room = this.getRoom(roomId);
    if (room) {
      room.isLocked = locked;
      return true;
    }
    return false;
  }
}

export const roomManager = new RoomManager();
