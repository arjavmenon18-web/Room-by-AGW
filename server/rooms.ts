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

  createRoom(params: {
    id?: string;
    name?: string;
    hostId: string;
    hostName: string;
    ttlHours?: number;
  }): ServerRoom {
    const code = params.id
      ? params.id.trim().toUpperCase()
      : `ROOM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const now = new Date();
    const expires = new Date(now.getTime() + (params.ttlHours || 24) * 60 * 60 * 1000);

    const room: ServerRoom = {
      id: code,
      roomCode: code,
      name: params.name || 'Studio Production Session',
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
    };

    this.rooms.set(code, room);
    return room;
  }

  getRoom(roomId: string): ServerRoom | null {
    const clean = roomId.trim().toUpperCase();
    const room = this.rooms.get(clean);
    if (!room) return null;

    // Check expiration
    if (new Date(room.expiresAt).getTime() < Date.now()) {
      this.rooms.delete(clean);
      return null;
    }

    return room;
  }

  validateRoom(roomId: string): { valid: boolean; room?: ServerRoom; reason?: string } {
    const clean = roomId.trim().toUpperCase();
    const room = this.rooms.get(clean);

    if (!room) {
      // Auto-provision room on demand for frictionless link sharing
      const newRoom = this.createRoom({
        id: clean,
        name: `Collaboration Room ${clean}`,
        hostId: 'system-host',
        hostName: 'Armen GlobalWorks',
      });
      return { valid: true, room: newRoom };
    }

    if (new Date(room.expiresAt).getTime() < Date.now()) {
      this.rooms.delete(clean);
      return { valid: false, reason: 'Room has expired' };
    }

    if (room.isLocked) {
      return { valid: false, reason: 'Room is locked by host' };
    }

    return { valid: true, room };
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
