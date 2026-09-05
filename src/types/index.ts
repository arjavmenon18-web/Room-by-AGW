export type UserRole = 'host' | 'co-host' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
}

export interface RoomPermissions {
  waitingRoomEnabled: boolean;
  allowGuestScreenShare: boolean;
  allowGuestChat: boolean;
  muteOnEntry: boolean;
  hostApprovalRequired: boolean;
}

export interface RoomProjectContext {
  id: string;
  title: string;
  client: string;
  phase: string;
  description: string;
}

export interface Room {
  id: string; // e.g. Room-agw-1234
  title: string;
  hostId: string;
  hostName: string;
  createdAt: string;
  durationSeconds: number;
  permissions: RoomPermissions;
  features?: RoomPermissions;
  projectContext?: RoomProjectContext;
  meetSpaceUri?: string;
  meetSpaceId?: string;
  googleMeetUri?: string;
  googleMeetCode?: string;
  notes?: string;
  agenda?: string[];
  files?: any[];
  isHost?: boolean;
  isLocked: boolean;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isSpeaking: boolean;
  audioLevel: number; // 0 - 100
  isScreenSharing: boolean;
  isHandRaised: boolean;
  handRaisedAt?: number;
  isPinned: boolean;
  isWaiting: boolean; // in waiting room
  status?: 'waiting' | 'admitted' | 'left';
  isHost?: boolean;
  audioMuted?: boolean;
  videoMuted?: boolean;
  screenSharing?: boolean;
  handRaised?: boolean;
  stream?: MediaStream | null;
  videoColor?: string;
  initials?: string;
  connectionQuality: 'excellent' | 'good' | 'fair';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar?: string;
  content: string;
  text?: string;
  timestamp: string;
  type: 'text' | 'file' | 'system';
  fileAttachment?: {
    name: string;
    size: string;
    url: string;
    type: string;
  };
  reactions: Record<string, string[]>; // emoji -> [userNames]
}

export interface ReactionEvent {
  id: string;
  emoji: string;
  senderName: string;
  xPosition: number; // percentage across screen
}

export interface ProjectAsset {
  id: string;
  title: string;
  category: 'script' | 'document' | 'image' | 'video' | 'reference' | 'task';
  size?: string;
  version?: string;
  lastUpdated: string;
  author: string;
  url?: string;
  status?: 'draft' | 'in-review' | 'approved' | 'in-progress' | 'completed';
}

export interface ProjectTask {
  id: string;
  title: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  dueDate: string;
}

export interface RecentRoom {
  id: string;
  title: string;
  date: string;
  durationFormatted: string;
  participantCount: number;
  hostName: string;
  hasRecording: boolean;
  hasNotes: boolean;
  projectTitle?: string;
}

export interface ScheduledRoom {
  id: string;
  title: string;
  timeFormatted: string;
  dateFormatted: string;
  hostName: string;
  participantsCount: number;
  projectTitle?: string;
  meetSpaceUri?: string;
}

export interface DeviceSettings {
  audioInputId: string;
  audioOutputId: string;
  videoInputId: string;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  videoResolution: '720p' | '1080p' | '4k';
  mirrorVideo: boolean;
}

export type ActiveDrawerTab = 'chat' | 'participants' | 'workspace' | null;
export type WorkspaceSubTab = 'notes' | 'files' | 'project' | 'ai';
export type VideoLayoutMode = 'grid' | 'spotlight' | 'sidebar';
export type AppView = 'home' | 'create-room' | 'join-room' | 'pre-join' | 'meeting' | 'waiting-room' | 'settings';
export type AtmosphereMode = 'linen' | 'obsidian' | 'studio';
