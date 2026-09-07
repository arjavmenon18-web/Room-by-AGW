export type UserRole = 'host' | 'co-host' | 'guest';

export interface User {
  id: string;
  sessionId?: string;
  participantId?: string;
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
  id: string; // Unique peer/connection ID in the room
  userId?: string;
  sessionId?: string;
  participantId?: string;
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
export type AppView = 
  | 'home' 
  | 'chat' 
  | 'keep' 
  | 'rooms' 
  | 'create-room' 
  | 'join-room' 
  | 'pre-join' 
  | 'meeting' 
  | 'waiting-room' 
  | 'settings' 
  | 'not-found' 
  | 'room-not-found';
export type AtmosphereMode = 'linen' | 'obsidian' | 'studio';

// ==========================================
// ROOM CHAT TYPES
// ==========================================

export type ConversationType = 'direct' | 'group' | 'project';

export interface ConversationMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  status?: 'online' | 'offline' | 'in-room';
}

export interface DirectChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: UserRole;
  content: string;
  timestamp: string;
  rawTimestamp?: number;
  type?: 'text' | 'file' | 'system' | 'room-invite';
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  reactions: Record<string, string[]>; // emoji -> [userNames]
  fileAttachment?: {
    name: string;
    size: string;
    url?: string;
    type: string;
  };
  sharedLink?: {
    url: string;
    title?: string;
    description?: string;
  };
  roomInvite?: {
    roomId: string;
    roomTitle: string;
    status: 'active' | 'ended';
  };
  savedToKeepId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  type: ConversationType;
  members: ConversationMember[];
  memberIds: string[];
  projectId?: string;
  projectTitle?: string;
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string;
  };
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  activeRoomId?: string; // If a meeting is live linked to this chat
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ROOM KEEP TYPES (INTELLIGENT MEMORY)
// ==========================================

export type KeepCategory = 'idea' | 'decision' | 'task' | 'reference' | 'question';
export type KeepStatus = 'suggested' | 'confirmed' | 'dismissed';

export interface KeepSource {
  type: 'meeting' | 'meeting-chat' | 'chat' | 'note' | 'file' | 'explicit';
  id?: string;
  title: string;
  date: string; // e.g. "September 6, 2026"
  timestamp?: number;
  participants?: string[];
  roomId?: string;
  conversationId?: string;
}

export interface KeepItem {
  id: string;
  title: string;
  content: string;
  category: KeepCategory;
  status: KeepStatus; // 'suggested' (AI suggestion) | 'confirmed' | 'dismissed'
  confidence?: number;
  source: KeepSource;
  projectId?: string;
  projectTitle?: string;
  assignedTo?: string; // for tasks
  dueDate?: string; // for tasks
  completed?: boolean; // for tasks
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  createdBy?: string;
  isAiGenerated?: boolean;
}

// ==========================================
// MEETING RECORD (POST-MEETING CONTINUITY)
// ==========================================

export interface MeetingRecord {
  id: string;
  roomId: string;
  roomTitle: string;
  date: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  durationFormatted: string;
  hostName: string;
  hostId: string;
  participantCount: number;
  participants: { id: string; name: string; avatar?: string; role?: string }[];
  summary?: string;
  notes?: string;
  chatMessages: ChatMessage[];
  decisions: string[];
  tasks: { title: string; assignee?: string; completed?: boolean }[];
  files: any[];
  projectId?: string;
  projectTitle?: string;
  associatedConversationId?: string;
}

// ==========================================
// PROJECT CONTAINER (UNIFIED LIVING MEMORY)
// ==========================================

export interface ProjectTimelineItem {
  id: string;
  date: string;
  timestamp: number;
  type: 'idea' | 'discussion' | 'decision' | 'task' | 'meeting';
  title: string;
  description: string;
  source: string;
  sourceId?: string;
  author?: string;
}

export interface ProjectContainer {
  id: string;
  title: string;
  description: string;
  client?: string;
  phase?: string;
  members: ConversationMember[];
  conversationId?: string;
  linkedRoomIds: string[];
  recentMeetings: {
    id: string;
    title: string;
    date: string;
    durationFormatted: string;
  }[];
  timeline: ProjectTimelineItem[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// UNIFIED SEARCH ACROSS EVERYTHING
// ==========================================

export interface UnifiedSearchResult {
  query: string;
  aiSynthesis?: string;
  sourceTitle?: string;
  items: {
    id: string;
    type: 'chat' | 'keep' | 'meeting' | 'project';
    category?: KeepCategory;
    title: string;
    snippet: string;
    date: string;
    sourceContext?: string;
    relevanceScore?: number;
    metadata?: Record<string, any>;
  }[];
}

