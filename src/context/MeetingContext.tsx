import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  UserRole,
  Room,
  Participant,
  ChatMessage,
  ReactionEvent,
  ProjectAsset,
  ProjectTask,
  RecentRoom,
  ScheduledRoom,
  DeviceSettings,
  AppView,
  ActiveDrawerTab,
  WorkspaceSubTab,
  VideoLayoutMode,
  RoomPermissions,
  AtmosphereMode,
} from '../types';
import {
  INITIAL_USER,
  DEFAULT_PROJECT_CONTEXT,
  INITIAL_REMOTE_PARTICIPANTS,
  INITIAL_WAITING_PARTICIPANTS,
  INITIAL_CHAT_MESSAGES,
  RECENT_ROOMS,
  SCHEDULED_ROOMS,
  PROJECT_ASSETS,
  PROJECT_TASKS,
  INITIAL_MEETING_NOTES,
} from '../data/mockData';
import { mediaService } from '../services/webrtc';
import { meetApiService } from '../services/meetApi';
import { aiService } from '../services/aiService';
import { signalingClient, type ConnectionStatus } from '../services/signaling/SignalingClient';
import { webRTCManager } from '../services/webrtc/WebRTCManager';
import {
  auth,
  saveRoomToFirestore,
  getRoomFromFirestore,
  subscribeToRoom,
  updateRoomNotesInFirestore,
  sendChatMessageToFirestore,
  subscribeToChatMessages,
  setParticipantInFirestore,
  removeParticipantFromFirestore,
  signInWithGoogle as fbSignInWithGoogle,
  signOutFirebase as fbSignOutFirebase,
} from '../services/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

interface MeetingContextType {
  // Firebase Live Sync & Auth
  isFirebaseConnected: boolean;
  firebaseUser: FirebaseUser | null;
  signInWithGoogleAuth: () => Promise<void>;
  signOutFirebaseAuth: () => Promise<void>;
  syncStatus: 'synced' | 'syncing' | 'offline';

  // WebRTC Signaling & Connection State
  signalingStatus: ConnectionStatus;
  shareableRoomUrl: string;

  // Navigation & View
  view: AppView;
  currentView: AppView;
  setView: (view: AppView) => void;
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;

  // Active Room
  room: Room | null;
  durationSeconds: number;
  durationFormatted: string;
  isHost: boolean;
  createInstantRoom: (title?: string, permissions?: Partial<RoomPermissions>, createMeetBridge?: boolean, customRoomId?: string) => Promise<string>;
  joinRoomById: (roomId: string, displayName?: string) => Promise<boolean>;
  enterMeetingRoom: (enteredDisplayName?: string) => void;
  leaveRoom: (endForAll?: boolean) => void;
  roomNotFoundCode: string | null;
  setRoomNotFoundCode: (code: string | null) => void;
  isValidatingRoom: boolean;

  // Media & Hardware
  audioEnabled: boolean;
  videoEnabled: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  localStream: MediaStream | null;
  displayStream: MediaStream | null;
  isScreenSharing: boolean;
  toggleScreenShare: () => Promise<void>;
  screenSharePresenterName: string | null;
  localAudioLevel: number;
  isLocalSpeaking: boolean;
  deviceSettings: DeviceSettings;
  updateDeviceSettings: (settings: Partial<DeviceSettings>) => void;
  availableDevices: {
    audioInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  };
  refreshDevices: () => Promise<void>;

  // Participants
  participants: Participant[];
  waitingParticipants: Participant[];
  pinnedParticipantId: string | null;
  setPinnedParticipantId: (id: string | null) => void;
  activeSpeakerId: string;
  isHandRaised: boolean;
  toggleRaiseHand: () => void;

  // Host Controls
  muteParticipant: (id: string) => void;
  muteAllParticipants: () => void;
  kickParticipant: (id: string) => void;
  toggleParticipantRole: (id: string) => void;
  admitParticipant: (id: string) => void;
  denyParticipant: (id: string) => void;
  admitAllParticipants: () => void;
  toggleRoomLock: () => void;
  updateRoomPermissions: (perms: Partial<RoomPermissions>) => void;

  // Chat & Reactions
  chatMessages: ChatMessage[];
  unreadChatCount: number;
  sendChatMessage: (content: string, fileAttachment?: any) => void;
  reactToChatMessage: (messageId: string, emoji: string) => void;
  activeReactions: ReactionEvent[];
  triggerReaction: (emoji: string) => void;

  // UI Panels & Layout
  activeDrawer: ActiveDrawerTab;
  setActiveDrawer: (tab: ActiveDrawerTab) => void;
  workspaceTab: WorkspaceSubTab;
  setWorkspaceTab: (tab: WorkspaceSubTab) => void;
  videoLayout: VideoLayoutMode;
  setVideoLayout: (layout: VideoLayoutMode) => void;

  // Contextual Workspace (Notes, Files, Project, AI)
  notes: string;
  updateNotes: (content: string) => void;
  projectAssets: ProjectAsset[];
  addProjectAsset: (asset: Omit<ProjectAsset, 'id' | 'lastUpdated'>) => void;
  projectTasks: ProjectTask[];
  toggleTask: (taskId: string) => void;
  aiSummary: string | null;
  isAiSummarizing: boolean;
  generateMeetingSummary: () => Promise<void>;
  aiChatQuery: string;
  setAiChatQuery: (q: string) => void;
  aiChatHistory: { role: 'user' | 'assistant'; text: string }[];
  askAiAssistant: (question: string) => Promise<void>;
  isAiAsking: boolean;

  // History & Schedule
  recentRooms: RecentRoom[];
  scheduledRooms: ScheduledRoom[];

  // Google Meet Bridge
  createGoogleMeetBridge: () => Promise<string>;
  isGoogleMeetConnecting: boolean;

  // Appearance & Atmosphere
  atmosphere: AtmosphereMode;
  setAtmosphere: (mode: AtmosphereMode) => void;
  restrainedIndicators: boolean;
  setRestrainedIndicators: (val: boolean) => void;
  filmGrain: boolean;
  setFilmGrain: (val: boolean) => void;
}

const MeetingContext = createContext<MeetingContextType | null>(null);

// Helper to normalize room code into canonical Room-agw-xxxx format
function normalizeRoomCode(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{4}$/.test(trimmed)) {
    return `Room-agw-${trimmed}`;
  }
  const agwMatch = trimmed.match(/^room-agw-(\d{4})$/i);
  if (agwMatch) {
    return `Room-agw-${agwMatch[1]}`;
  }
  const genericAgwMatch = trimmed.match(/^room-agw-([a-z0-9]+)$/i);
  if (genericAgwMatch) {
    return `Room-agw-${genericAgwMatch[1]}`;
  }
  return trimmed;
}

// Generate or retrieve per-tab session identity
function getOrCreateSessionId(): string {
  try {
    let existing = sessionStorage.getItem('room_session_id');
    if (existing && existing.startsWith('sess-')) return existing;
    const newId = `sess-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('room_session_id', newId);
    return newId;
  } catch {
    return `sess-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Generate or retrieve tab-isolated user identity for guest sessions
function getOrCreateUserId(): string {
  try {
    let existing = sessionStorage.getItem('room_user_id');
    if (existing && existing.startsWith('usr-')) return existing;
    const newId = `usr-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('room_user_id', newId);
    return newId;
  } catch {
    return `usr-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Retrieve saved display name if user configured it previously in this session
function getSavedDisplayName(): string {
  try {
    return sessionStorage.getItem('room_display_name') || localStorage.getItem('room_display_name') || '';
  } catch {
    return '';
  }
}

export const MeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & User - decoupled from host identity
  const [view, setView] = useState<AppView>('home');
  const [user, setUser] = useState<User>(() => {
    const userId = getOrCreateUserId();
    const sessionId = getOrCreateSessionId();
    const savedName = getSavedDisplayName();
    return {
      id: userId,
      sessionId,
      participantId: `part-${sessionId}`,
      name: savedName || 'Guest User',
      email: '',
      role: 'guest',
    };
  });

  // Firebase Live Sync & Auth State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // WebRTC Signaling state
  const [signalingStatus, setSignalingStatus] = useState<ConnectionStatus>('disconnected');

  // Monitor Firebase Auth
  useEffect(() => {
    try {
      const unsub = onAuthStateChanged(auth, (fbUser) => {
        setFirebaseUser(fbUser);
        setIsFirebaseConnected(true);
        if (fbUser) {
          setUser((prev) => ({
            ...prev,
            id: fbUser.uid,
            name: fbUser.displayName || prev.name,
            email: fbUser.email || prev.email,
            avatar: fbUser.photoURL || prev.avatar,
          }));
        }
      });
      return () => unsub();
    } catch (err) {
      console.warn('Firebase auth listener notice:', err);
    }
  }, []);

  const signInWithGoogleAuth = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      const res = await fbSignInWithGoogle();
      if (res.user) {
        setUser((prev) => ({
          ...prev,
          id: res.user.uid,
          name: res.user.displayName || prev.name,
          email: res.user.email || prev.email,
          avatar: res.user.photoURL || prev.avatar,
        }));
      }
      setSyncStatus('synced');
    } catch (err) {
      console.warn('Firebase Google Sign-In notice:', err);
      setSyncStatus('synced');
    }
  }, []);

  const signOutFirebaseAuth = useCallback(async () => {
    try {
      await fbSignOutFirebase();
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      setUser({
        id: `usr-${randomSuffix}`,
        name: 'Guest User',
        email: '',
        role: 'guest',
      });
    } catch (err) {
      console.warn('Firebase Sign-Out notice:', err);
    }
  }, []);

  // Active Room State
  const [room, setRoom] = useState<Room | null>(null);
  const [roomNotFoundCode, setRoomNotFoundCode] = useState<string | null>(null);
  const [isValidatingRoom, setIsValidatingRoom] = useState<boolean>(false);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const durationTimerRef = useRef<any>(null);

  // Hardware & Local Media State
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [screenSharePresenterName, setScreenSharePresenterName] = useState<string | null>(null);
  const [localAudioLevel, setLocalAudioLevel] = useState<number>(0);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);

  const [availableDevices, setAvailableDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  }>({ audioInputs: [], audioOutputs: [], videoInputs: [] });

  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings>({
    audioInputId: 'default',
    audioOutputId: 'default',
    videoInputId: 'default',
    noiseSuppression: true,
    echoCancellation: true,
    videoResolution: '1080p',
    mirrorVideo: true,
  });

  // REAL PARTICIPANTS: Empty by default. Populated ONLY when real users connect via WebRTC/Signaling
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitingParticipants, setWaitingParticipants] = useState<Participant[]>([]);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>('local-user');

  // Real Chat & Reactions
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [activeReactions, setActiveReactions] = useState<ReactionEvent[]>([]);

  // UI Panels & Layout
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawerTab>(null);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceSubTab>('notes');
  const [videoLayout, setVideoLayout] = useState<VideoLayoutMode>('grid');

  // Contextual Workspace
  const [notes, setNotes] = useState<string>(INITIAL_MEETING_NOTES);
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>(PROJECT_ASSETS);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>(PROJECT_TASKS);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiSummarizing, setIsAiSummarizing] = useState<boolean>(false);
  const [aiChatQuery, setAiChatQuery] = useState<string>('');
  const [aiChatHistory, setAiChatHistory] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [isAiAsking, setIsAiAsking] = useState<boolean>(false);

  // History & Schedule
  const [recentRooms] = useState<RecentRoom[]>(RECENT_ROOMS);
  const [scheduledRooms] = useState<ScheduledRoom[]>(SCHEDULED_ROOMS);

  // Google Meet bridge
  const [isGoogleMeetConnecting, setIsGoogleMeetConnecting] = useState<boolean>(false);

  // Atmosphere & Appearance State
  const [atmosphere, setAtmosphereState] = useState<AtmosphereMode>(() => {
    try {
      return (localStorage.getItem('room_atmosphere') as AtmosphereMode) || 'linen';
    } catch {
      return 'linen';
    }
  });

  const [restrainedIndicators, setRestrainedIndicatorsState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('room_restrained_indicators') !== 'false';
    } catch {
      return true;
    }
  });

  const [filmGrain, setFilmGrainState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('room_film_grain') !== 'false';
    } catch {
      return true;
    }
  });

  const setAtmosphere = useCallback((mode: AtmosphereMode) => {
    setAtmosphereState(mode);
    try {
      localStorage.setItem('room_atmosphere', mode);
      document.body.classList.remove('atmosphere-linen', 'atmosphere-obsidian', 'atmosphere-studio');
      document.body.classList.add(`atmosphere-${mode}`);
    } catch (e) {
      // ignore
    }
  }, []);

  const setRestrainedIndicators = useCallback((val: boolean) => {
    setRestrainedIndicatorsState(val);
    try {
      localStorage.setItem('room_restrained_indicators', String(val));
    } catch (e) {
      // ignore
    }
  }, []);

  const setFilmGrain = useCallback((val: boolean) => {
    setFilmGrainState(val);
    try {
      localStorage.setItem('room_film_grain', String(val));
      if (val) {
        document.body.classList.remove('no-grain');
      } else {
        document.body.classList.add('no-grain');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      document.body.classList.remove('atmosphere-linen', 'atmosphere-obsidian', 'atmosphere-studio');
      document.body.classList.add(`atmosphere-${atmosphere}`);
      if (!filmGrain) {
        document.body.classList.add('no-grain');
      } else {
        document.body.classList.remove('no-grain');
      }
    } catch (e) {
      // ignore
    }
  }, [atmosphere, filmGrain]);

  // Refresh hardware device list
  const refreshDevices = useCallback(async () => {
    const devs = await mediaService.getDevices();
    setAvailableDevices(devs);
  }, []);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Duration Timer
  useEffect(() => {
    if (view === 'meeting') {
      durationTimerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [view]);

  // Format Duration MM:SS or HH:MM:SS
  const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Local stream & room refs for stable lifecycle management
  const localStreamRef = useRef<MediaStream | null>(null);
  localStreamRef.current = localStream;
  const viewRef = useRef<AppView>(view);
  viewRef.current = view;
  const roomRef = useRef<Room | null>(room);
  roomRef.current = room;

  // Local media hardware initialization
  const initLocalMedia = useCallback(async () => {
    const { stream } = await mediaService.getUserMedia(
      audioEnabled,
      videoEnabled,
      deviceSettings.videoInputId !== 'default' ? deviceSettings.videoInputId : undefined,
      deviceSettings.audioInputId !== 'default' ? deviceSettings.audioInputId : undefined
    );

    if (stream) {
      setLocalStream(stream);
      webRTCManager.setLocalStream(stream);
      mediaService.setAudioCallback((level) => {
        setLocalAudioLevel(level);
        const speaking = level > 25 && audioEnabled;
        setIsLocalSpeaking(speaking);
        if (speaking) {
          setActiveSpeakerId('local-user');
        }
      });
    }
  }, [audioEnabled, videoEnabled, deviceSettings.videoInputId, deviceSettings.audioInputId]);

  // Handle Audio toggle
  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = next;
        });
      }
      webRTCManager.setAudioEnabled(next);
      signalingClient.sendMediaState({
        audioEnabled: next,
        videoEnabled,
        isScreenSharing,
        isHandRaised,
      });
      if (!next) {
        setIsLocalSpeaking(false);
        setLocalAudioLevel(0);
      }
      return next;
    });
  }, [videoEnabled, isScreenSharing, isHandRaised]);

  // Handle Video toggle with real camera hardware sensor release
  const toggleVideo = useCallback(async () => {
    if (videoEnabled) {
      // 1. User is turning video OFF:
      setVideoEnabled(false);
      videoEnabledRef.current = false;

      // Physically stop video tracks so camera sensor & hardware LED turn completely OFF
      mediaService.stopVideo();
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
          localStreamRef.current?.removeTrack(track);
        });
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      await webRTCManager.replaceVideoTrack(null);
      webRTCManager.setVideoEnabled(false);
      signalingClient.sendMediaState({
        audioEnabled,
        videoEnabled: false,
        isScreenSharing,
        isHandRaised,
      });
    } else {
      // 2. User is turning video ON:
      setVideoEnabled(true);
      videoEnabledRef.current = true;

      try {
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          deviceId:
            deviceSettings.videoInputId !== 'default' && deviceSettings.videoInputId
              ? { exact: deviceSettings.videoInputId }
              : undefined,
        };

        const media = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
        const newTrack = media.getVideoTracks()[0];

        if (newTrack) {
          if (localStreamRef.current) {
            localStreamRef.current.addTrack(newTrack);
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          } else {
            setLocalStream(new MediaStream([newTrack]));
          }
          await webRTCManager.replaceVideoTrack(newTrack);
        }
      } catch (err) {
        console.warn('Could not re-acquire camera device:', err);
        const simulated = mediaService.createSimulatedLocalStream(true, false);
        const simTrack = simulated.getVideoTracks()[0];
        if (simTrack) {
          if (localStreamRef.current) {
            localStreamRef.current.addTrack(simTrack);
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          } else {
            setLocalStream(simulated);
          }
          await webRTCManager.replaceVideoTrack(simTrack);
        }
      }

      webRTCManager.setVideoEnabled(true);
      signalingClient.sendMediaState({
        audioEnabled,
        videoEnabled: true,
        isScreenSharing,
        isHandRaised,
      });
    }
  }, [videoEnabled, audioEnabled, isScreenSharing, isHandRaised, deviceSettings.videoInputId]);

  // Screen sharing toggle with live WebRTC track replacement
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      mediaService.stopScreenShare();
      setDisplayStream(null);
      setIsScreenSharing(false);
      setScreenSharePresenterName(null);
      await webRTCManager.replaceVideoTrack(localStream?.getVideoTracks()[0] || null);
      signalingClient.sendMediaState({
        audioEnabled,
        videoEnabled,
        isScreenSharing: false,
        isHandRaised,
      });
    } else {
      const { stream, error } = await mediaService.getDisplayMedia();
      if (stream) {
        setDisplayStream(stream);
        setIsScreenSharing(true);
        setScreenSharePresenterName(user.name);
        await webRTCManager.replaceVideoTrack(stream.getVideoTracks()[0]);
        signalingClient.sendMediaState({
          audioEnabled,
          videoEnabled,
          isScreenSharing: true,
          isHandRaised,
        });

        stream.getVideoTracks()[0].onended = async () => {
          setIsScreenSharing(false);
          setDisplayStream(null);
          setScreenSharePresenterName(null);
          await webRTCManager.replaceVideoTrack(localStream?.getVideoTracks()[0] || null);
          signalingClient.sendMediaState({
            audioEnabled,
            videoEnabled,
            isScreenSharing: false,
            isHandRaised,
          });
        };
      }
    }
  }, [isScreenSharing, user.name, localStream, audioEnabled, videoEnabled, isHandRaised]);

  // Raise hand toggle
  const toggleRaiseHand = useCallback(() => {
    setIsHandRaised((prev) => {
      const next = !prev;
      signalingClient.sendMediaState({
        audioEnabled,
        videoEnabled,
        isScreenSharing,
        isHandRaised: next,
      });
      return next;
    });
  }, [audioEnabled, videoEnabled, isScreenSharing]);

  // Reactions
  const triggerReaction = useCallback((emoji: string) => {
    const newReaction: ReactionEvent = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      senderName: user.name,
      xPosition: 20 + Math.random() * 60, // 20% to 80% screen width
    };

    setActiveReactions((prev) => [...prev, newReaction]);

    // Cleanup after floating animation
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 3200);
  }, [user.name]);

  // Send chat message
  const sendChatMessage = useCallback((content: string, fileAttachment?: any) => {
    if (!content.trim() && !fileAttachment) return;

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: ChatMessage = {
      id: msgId,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      senderAvatar: user.avatar,
      content,
      timestamp: timeFormatted,
      type: fileAttachment ? 'file' : 'text',
      fileAttachment,
      reactions: {},
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Send real-time message through WebSocket signaling
    signalingClient.sendChatMessage(content);

    // Increment unread count if drawer is not chat
    if (activeDrawer !== 'chat') {
      setUnreadChatCount((prev) => prev + 1);
    }

    // Persist to Firestore if room is active
    if (room?.id) {
      sendChatMessageToFirestore(room.id, {
        id: msgId,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar,
        content,
        timestamp: Date.now(),
        reactions: {},
      });
    }
  }, [user, activeDrawer, room?.id]);

  // Add emoji reaction to message
  const reactToChatMessage = useCallback((messageId: string, emoji: string) => {
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentReactions = { ...msg.reactions };
        const existingUsers = currentReactions[emoji] || [];
        if (existingUsers.includes(user.name)) {
          currentReactions[emoji] = existingUsers.filter((u) => u !== user.name);
          if (currentReactions[emoji].length === 0) {
            delete currentReactions[emoji];
          }
        } else {
          currentReactions[emoji] = [...existingUsers, user.name];
        }
        return { ...msg, reactions: currentReactions };
      })
    );
  }, [user.name]);

  // Host Controls
  const muteParticipant = useCallback((id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, audioEnabled: false, isSpeaking: false } : p))
    );
  }, []);

  const muteAllParticipants = useCallback(() => {
    setParticipants((prev) =>
      prev.map((p) => ({ ...p, audioEnabled: false, isSpeaking: false }))
    );
  }, []);

  const kickParticipant = useCallback((id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggleParticipantRole = useCallback((id: string) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextRole = p.role === 'co-host' ? 'guest' : 'co-host';
        return { ...p, role: nextRole };
      })
    );
  }, []);

  const admitParticipant = useCallback((id: string) => {
    const pToAdmit = waitingParticipants.find((p) => p.id === id);
    if (!pToAdmit) return;

    setWaitingParticipants((prev) => prev.filter((p) => p.id !== id));
    setParticipants((prev) => [
      ...prev,
      { ...pToAdmit, isWaiting: false, isSpeaking: false, audioLevel: 0 },
    ]);

    // Announce in chat
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [
      ...prev,
      {
        id: `sys-join-${Date.now()}`,
        senderId: 'sys',
        senderName: 'ROOM System',
        senderRole: 'host',
        content: `${pToAdmit.name} was admitted to the room by host.`,
        timestamp: timeFormatted,
        type: 'system',
        reactions: {},
      },
    ]);
  }, [waitingParticipants]);

  const denyParticipant = useCallback((id: string) => {
    setWaitingParticipants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const admitAllParticipants = useCallback(() => {
    if (!waitingParticipants.length) return;
    setParticipants((prev) => [
      ...prev,
      ...waitingParticipants.map((p) => ({ ...p, isWaiting: false, isSpeaking: false })),
    ]);
    setWaitingParticipants([]);
  }, [waitingParticipants]);

  const toggleRoomLock = useCallback(() => {
    setRoom((prev) => (prev ? { ...prev, isLocked: !prev.isLocked } : null));
  }, []);

  const updateRoomPermissions = useCallback((perms: Partial<RoomPermissions>) => {
    setRoom((prev) =>
      prev ? { ...prev, permissions: { ...prev.permissions, ...perms } } : null
    );
  }, []);

  // Notes update
  const updateNotes = useCallback((content: string) => {
    setNotes(content);
    if (room?.id) {
      updateRoomNotesInFirestore(room.id, content);
    }
  }, [room?.id]);

  // Project Assets
  const addProjectAsset = useCallback((asset: Omit<ProjectAsset, 'id' | 'lastUpdated'>) => {
    const newAsset: ProjectAsset = {
      ...asset,
      id: `ast-${Date.now()}`,
      lastUpdated: 'Just now',
    };
    setProjectAssets((prev) => [newAsset, ...prev]);
  }, []);

  // Toggle Task
  const toggleTask = useCallback((taskId: string) => {
    setProjectTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  // Generate AI Summary with Gemini
  const generateMeetingSummary = useCallback(async () => {
    if (!room) return;
    setIsAiSummarizing(true);
    try {
      const summary = await aiService.generateMeetingSummary({
        roomName: room.title,
        notes,
        messages: chatMessages,
        participants: [
          { name: user.name, role: user.role },
          ...participants.map((p) => ({ name: p.name, role: p.role })),
        ],
        projectContext: room.projectContext,
      });
      setAiSummary(summary);
      setWorkspaceTab('ai');
      setActiveDrawer('workspace');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiSummarizing(false);
    }
  }, [room, notes, chatMessages, user, participants]);

  // Ask AI Assistant
  const askAiAssistant = useCallback(async (question: string) => {
    if (!question.trim()) return;
    const userMsg = { role: 'user' as const, text: question };
    setAiChatHistory((prev) => [...prev, userMsg]);
    setAiChatQuery('');
    setIsAiAsking(true);

    try {
      const answer = await aiService.askAi(question, {
        roomName: room?.title,
        projectContext: room?.projectContext,
        notesLength: notes.length,
      });
      setAiChatHistory((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiAsking(false);
    }
  }, [room, notes]);

  // Google Meet Bridge Creation
  const createGoogleMeetBridge = useCallback(async (): Promise<string> => {
    setIsGoogleMeetConnecting(true);
    try {
      const space = await meetApiService.createMeetingSpace(room?.title || 'ROOM Session');
      if (room) {
        setRoom((prev) =>
          prev ? { ...prev, meetSpaceUri: space.meetingUri, meetSpaceId: space.meetingCode } : null
        );
      }
      return space.meetingUri;
    } catch (err) {
      console.error('Could not create Google Meet space:', err);
      return '';
    } finally {
      setIsGoogleMeetConnecting(false);
    }
  }, [room]);

  // Create Instant Room
  const createInstantRoom = useCallback(
    async (
      title: string = 'ROOM Session',
      permissions: Partial<RoomPermissions> = {},
      createMeetBridge: boolean = false,
      customRoomId?: string
    ): Promise<string> => {
      let roomId: string;
      if (customRoomId && customRoomId.trim()) {
        roomId = normalizeRoomCode(customRoomId);
      } else {
        const numericalCode = Math.floor(1000 + Math.random() * 9000);
        roomId = `Room-agw-${numericalCode}`;
      }

      let meetUri: string | undefined = undefined;
      if (createMeetBridge) {
        try {
          const space = await meetApiService.createMeetingSpace(title);
          meetUri = space.meetingUri;
        } catch (e) {
          // ignore
        }
      }

      const hostDisplayName = (user.name && user.name !== 'Guest User') 
        ? user.name 
        : (getSavedDisplayName() || 'Room Host');

      const newRoom: Room = {
        id: roomId,
        title: title?.trim() || `Room ${roomId}`,
        hostId: user.id,
        hostName: hostDisplayName,
        createdAt: new Date().toISOString(),
        durationSeconds: 0,
        permissions: {
          waitingRoomEnabled: permissions.waitingRoomEnabled ?? false,
          allowGuestScreenShare: permissions.allowGuestScreenShare ?? true,
          allowGuestChat: permissions.allowGuestChat ?? true,
          muteOnEntry: permissions.muteOnEntry ?? false,
          hostApprovalRequired: permissions.hostApprovalRequired ?? false,
        },
        projectContext: undefined,
        meetSpaceUri: meetUri,
        isLocked: false,
      };

      setRoom(newRoom);
      setDurationSeconds(0);
      const hostUser: User = { ...user, role: 'host', name: hostDisplayName };
      userRef.current = hostUser;
      setUser(hostUser);
      setParticipants([]);
      setChatMessages([]);

      setSyncStatus('syncing');
      saveRoomToFirestore(newRoom).then(() => {
        setSyncStatus('synced');
      }).catch(() => {
        setSyncStatus('synced');
      });

      // Authoritatively register room in Server RoomManager
      try {
        await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: roomId,
            name: newRoom.title,
            hostId: user.id,
            hostName: hostDisplayName,
          }),
        });
      } catch (e) {
        console.warn('Could not register room in server room manager:', e);
      }

      setRoomNotFoundCode(null);
      await initLocalMedia();
      try {
        window.history.pushState(null, '', `/join/${roomId}`);
      } catch (e) {
        // ignore
      }
      setView('pre-join');
      return roomId;
    },
    [user, initLocalMedia]
  );

  // Join Room by Code or Link with real backend validation
  const joinRoomById = useCallback(
    async (roomId: string, displayName?: string): Promise<boolean> => {
      const cleanId = normalizeRoomCode(roomId);

      // If user is already active in a meeting for this room, do not interrupt
      if (viewRef.current === 'meeting' && roomRef.current?.id === cleanId) {
        return true;
      }

      setIsValidatingRoom(true);
      setRoomNotFoundCode(null);

      setSyncStatus('syncing');
      let remote: any = null;

      // 1. Authoritative check against Server RoomManager
      try {
        const joinRes = await fetch(`/api/rooms/${encodeURIComponent(cleanId)}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userRef.current.id,
            participantId: `part-${userRef.current.sessionId || userRef.current.id}`,
            name: displayName || userRef.current.name,
          }),
        });
        if (joinRes.ok) {
          const joinData = await joinRes.json();
          if (joinData.success && joinData.room) {
            remote = {
              id: joinData.room.id,
              title: joinData.room.name || `ROOM Session (${cleanId})`,
              hostId: joinData.room.hostId || 'host',
              hostName: joinData.room.hostName || 'Host',
              createdAt: joinData.room.createdAt,
              durationSeconds: 0,
              permissions: joinData.room.permissions,
              isLocked: joinData.room.isLocked,
              assignedRole: joinData.assignedRole,
            };
          }
        }
      } catch (e) {
        // network fallback
      }

      // 2. Fallback check against Firestore
      if (!remote) {
        const firestoreRoom = await getRoomFromFirestore(cleanId);
        if (firestoreRoom) {
          remote = firestoreRoom;
          // Synchronize room to server room manager
          try {
            await fetch('/api/rooms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: firestoreRoom.id,
                name: firestoreRoom.title,
                hostId: firestoreRoom.hostId,
                hostName: firestoreRoom.hostName,
              }),
            });
          } catch {}
        }
      }

      setSyncStatus('synced');
      setIsValidatingRoom(false);

      if (!remote) {
        // Room does NOT exist! Do NOT create a fake room or participants.
        setRoom(null);
        setRoomNotFoundCode(cleanId);
        setView('room-not-found');
        return false;
      }

      // CRITICAL ARCHITECTURAL SEPARATION:
      // Host identity vs Guest identity:
      // If user.id === remote.hostId, role is 'host'.
      // If user.id !== remote.hostId, role is 'guest'. Never inherit host identity!
      const currentUserId = userRef.current.id;
      const isActuallyHost = Boolean(remote.hostId && remote.hostId === currentUserId);
      const assignedRole: UserRole = remote.assignedRole || (isActuallyHost ? 'host' : 'guest');

      const savedDisplayName = getSavedDisplayName();
      let resolvedName: string;
      if (displayName?.trim()) {
        resolvedName = displayName.trim();
      } else if (isActuallyHost) {
        resolvedName = userRef.current.name && userRef.current.name !== 'Guest User' ? userRef.current.name : (remote.hostName || 'Room Host');
      } else {
        // GUEST USER - NEVER inherit hostName!
        resolvedName = (savedDisplayName && savedDisplayName !== remote.hostName) 
          ? savedDisplayName 
          : (userRef.current.name && userRef.current.name !== 'Guest User' && userRef.current.name !== remote.hostName ? userRef.current.name : 'Guest Participant');
      }

      setUser((u) => {
        const updated: User = {
          ...u,
          role: assignedRole,
          name: resolvedName,
        };
        userRef.current = updated;
        return updated;
      });

      const targetRoom: Room = {
        id: cleanId,
        title: remote.title || `ROOM Session (${cleanId})`,
        hostId: remote.hostId || 'host',
        hostName: remote.hostName || 'Host',
        createdAt: remote.createdAt || new Date().toISOString(),
        durationSeconds: 0,
        permissions: remote.permissions || {
          waitingRoomEnabled: false,
          allowGuestScreenShare: true,
          allowGuestChat: true,
          muteOnEntry: false,
          hostApprovalRequired: false,
        },
        projectContext: remote.projectContext || DEFAULT_PROJECT_CONTEXT,
        meetSpaceUri: remote.meetSpaceUri,
        meetSpaceId: remote.meetSpaceId,
        isLocked: Boolean(remote.isLocked),
      };

      setRoom(targetRoom);
      setDurationSeconds(0);
      setParticipants([]);
      setChatMessages([]);
      await initLocalMedia();
      try {
        window.history.replaceState(null, '', `/join/${cleanId}`);
      } catch (e) {
        // ignore
      }
      setView('pre-join');
      return true;
    },
    [initLocalMedia]
  );

  // Transition from PreJoinView into the active meeting room with user-confirmed name
  const enterMeetingRoom = useCallback((enteredDisplayName?: string) => {
    const currentRoom = roomRef.current;
    const currentUserId = userRef.current.id;

    // Check whether current user is actually the host of this room
    const isActuallyHost = Boolean(currentRoom && currentRoom.hostId && currentRoom.hostId === currentUserId);
    const assignedRole: UserRole = isActuallyHost ? 'host' : 'guest';

    let finalName = enteredDisplayName?.trim();
    if (!finalName) {
      if (isActuallyHost) {
        finalName = userRef.current.name || currentRoom?.hostName || 'Room Host';
      } else {
        const saved = getSavedDisplayName();
        finalName = (saved && saved !== currentRoom?.hostName) 
          ? saved 
          : (userRef.current.name && userRef.current.name !== 'Guest User' && userRef.current.name !== currentRoom?.hostName ? userRef.current.name : 'Guest Participant');
      }
    }

    try {
      sessionStorage.setItem('room_display_name', finalName);
      localStorage.setItem('room_display_name', finalName);
    } catch {}

    const updatedUser: User = {
      ...userRef.current,
      name: finalName,
      role: assignedRole,
    };

    userRef.current = updatedUser;
    setUser(updatedUser);

    if (currentRoom?.permissions?.waitingRoomEnabled && assignedRole === 'guest') {
      setView('waiting-room');
    } else {
      setView('meeting');
    }
  }, []);

  // Leave room with full WebRTC and WebSocket teardown
  const leaveRoom = useCallback(
    (endForAll: boolean = false) => {
      signalingClient.leaveRoom();
      webRTCManager.closeAll();
      mediaService.stopAll();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });
      }
      setLocalStream(null);
      setDisplayStream(null);
      setIsScreenSharing(false);
      setIsHandRaised(false);
      setActiveDrawer(null);
      setParticipants([]);
      setWaitingParticipants([]);

      if (endForAll) {
        setRoom(null);
      }
      setRoomNotFoundCode(null);
      try {
        window.history.pushState(null, '', '/');
      } catch (e) {
        // ignore
      }
      setView('home');
    },
    []
  );

  // Refs to avoid unnecessary re-subscriptions in signaling effect
  const userRef = useRef(user);
  userRef.current = user;
  const audioEnabledRef = useRef(audioEnabled);
  audioEnabledRef.current = audioEnabled;
  const videoEnabledRef = useRef(videoEnabled);
  videoEnabledRef.current = videoEnabled;

  // Keep active localStream synced to WebRTCManager while in meeting
  useEffect(() => {
    if (view === 'meeting' && localStream) {
      webRTCManager.setLocalStream(localStream);
    }
  }, [view, localStream]);

  // Real-time WebRTC & WebSocket Signaling Integration
  useEffect(() => {
    if (view !== 'meeting' || !room?.id) return;

    let isMounted = true;

    // 1. Setup signaling event listeners
    signalingClient.setListeners({
      onStatusChange: (status) => {
        if (isMounted) setSignalingStatus(status);
      },
      onJoinedRoom: (payload) => {
        console.log('[WebRTC Signaling] Successfully joined room:', payload);
        if (!isMounted) return;

        if (payload.assignedRole && payload.assignedRole !== userRef.current.role) {
          setUser((u) => {
            const updated = { ...u, role: payload.assignedRole as UserRole };
            userRef.current = updated;
            return updated;
          });
        }

        const myParticipantId = userRef.current.participantId || `part-${userRef.current.sessionId || userRef.current.id}`;

        if (payload.existingParticipants && payload.existingParticipants.length > 0) {
          const peers: Participant[] = payload.existingParticipants
            .filter((p) => p.id !== myParticipantId && p.participantId !== myParticipantId && p.id !== userRef.current.id)
            .map((p) => {
              const peerId = p.participantId || p.id;
              return {
                id: peerId,
                participantId: peerId,
                userId: p.userId,
                sessionId: p.sessionId,
                name: p.name,
                role: p.role || 'guest',
                avatar: p.avatar,
                audioEnabled: p.audioEnabled ?? true,
                videoEnabled: p.videoEnabled ?? true,
                isSpeaking: false,
                audioLevel: 0,
                isScreenSharing: p.isScreenSharing ?? false,
                isHandRaised: p.isHandRaised ?? false,
                isPinned: false,
                isWaiting: false,
                initials: p.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'P',
                connectionQuality: 'excellent',
                stream: null,
              };
            });

          setParticipants(peers);

          // As newly joined peer, initiate WebRTC offer to each existing peer
          payload.existingParticipants
            .filter((p) => p.id !== myParticipantId && p.participantId !== myParticipantId && p.id !== userRef.current.id)
            .forEach((peer) => {
              const targetId = peer.participantId || peer.id;
              webRTCManager.createOfferToPeer(targetId);
            });
        }
      },
      onUserJoined: (newUser) => {
        console.log('[WebRTC Signaling] New user joined:', newUser);
        if (!isMounted) return;
        const myParticipantId = userRef.current.participantId || `part-${userRef.current.sessionId || userRef.current.id}`;
        const newPeerId = newUser.participantId || newUser.id;
        if (newPeerId === myParticipantId || newUser.id === userRef.current.id) return;

        setParticipants((prev) => {
          if (prev.some((p) => (p.participantId || p.id) === newPeerId)) return prev;
          const initials = newUser.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'P';
          return [
            ...prev,
            {
              id: newPeerId,
              participantId: newPeerId,
              userId: newUser.userId,
              sessionId: newUser.sessionId,
              name: newUser.name,
              role: newUser.role || 'guest',
              avatar: newUser.avatar,
              audioEnabled: newUser.audioEnabled ?? true,
              videoEnabled: newUser.videoEnabled ?? true,
              isSpeaking: false,
              audioLevel: 0,
              isScreenSharing: newUser.isScreenSharing ?? false,
              isHandRaised: newUser.isHandRaised ?? false,
              isPinned: false,
              isWaiting: false,
              initials,
              connectionQuality: 'excellent',
              stream: null,
            },
          ];
        });
      },
      onUserLeft: ({ id, name }) => {
        console.log(`[WebRTC Signaling] Peer left: ${name} (${id})`);
        if (!isMounted) return;
        setParticipants((prev) => prev.filter((p) => p.id !== id && p.participantId !== id));
        webRTCManager.removePeer(id);
      },
      onMediaStateChanged: (payload) => {
        if (!isMounted) return;
        const targetId = (payload as any).participantId || payload.peerId || (payload as any).id;
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.id !== targetId && p.participantId !== targetId) return p;
            return {
              ...p,
              ...(payload.audioEnabled !== undefined && { audioEnabled: payload.audioEnabled }),
              ...(payload.videoEnabled !== undefined && { videoEnabled: payload.videoEnabled }),
              ...(payload.isScreenSharing !== undefined && { isScreenSharing: payload.isScreenSharing }),
              ...(payload.isHandRaised !== undefined && { isHandRaised: payload.isHandRaised }),
            };
          })
        );
      },
      onChatMessage: (msg) => {
        if (!isMounted) return;
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const messageContent = msg.text || (msg as any).content || '';
          return [
            ...prev,
            {
              id: msg.id,
              senderId: msg.senderId,
              senderName: msg.senderName,
              senderRole: 'guest',
              content: messageContent,
              text: messageContent,
              timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'text',
              reactions: {},
            },
          ];
        });
      },
      onError: (err) => {
        console.warn('[WebRTC Signaling] Error:', err);
      },
    });

    // 2. Setup WebRTC Manager callbacks
    webRTCManager.setCallbacks({
      onRemoteStream: (peerId, remoteStream) => {
        console.log(`[WebRTC Manager] Attached remote stream for peer: ${peerId}`);
        if (!isMounted) return;
        setParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, stream: remoteStream } : p))
        );
      },
      onPeerConnectionStateChange: (peerId, state) => {
        console.log(`[WebRTC Manager] Peer connection state for ${peerId}: ${state}`);
        if (state === 'failed' || state === 'closed') {
          if (!isMounted) return;
          setParticipants((prev) => prev.filter((p) => p.id !== peerId));
        }
      },
      onPeerDisconnected: (peerId) => {
        if (!isMounted) return;
        setParticipants((prev) => prev.filter((p) => p.id !== peerId));
      },
    });

    // 3. Connect local stream
    if (localStream) {
      webRTCManager.setLocalStream(localStream);
    }

    // 4. Connect to signaling server and join room
    const currentUser = userRef.current;
    const participantId = currentUser.participantId || `part-${currentUser.sessionId || currentUser.id}`;
    signalingClient.connect().then(() => {
      if (!isMounted) return;
      signalingClient.joinRoom({
        roomId: room.id,
        participantId,
        peerId: participantId,
        userId: currentUser.id,
        sessionId: currentUser.sessionId || participantId,
        name: currentUser.name,
        role: currentUser.role,
        avatar: currentUser.avatar,
        audioEnabled: audioEnabledRef.current,
        videoEnabled: videoEnabledRef.current,
      });
    });

    try {
      window.history.pushState(null, '', `/room/${room.id}`);
    } catch (e) {
      // ignore
    }

    return () => {
      isMounted = false;
      signalingClient.leaveRoom();
      webRTCManager.closeAll();
    };
  }, [view, room?.id]);

  // Clear unread count when chat opens
  useEffect(() => {
    if (activeDrawer === 'chat') {
      setUnreadChatCount(0);
    }
  }, [activeDrawer]);

  // Helper values
  const isHost = Boolean(room && user.id === room.hostId) || user.role === 'host';
  const durationFormatted = formatDuration(durationSeconds);
  const shareableRoomUrl = room?.id ? `${window.location.origin}/join/${room.id}` : window.location.origin;

  const updateDeviceSettings = (settings: Partial<DeviceSettings>) => {
    setDeviceSettings((prev) => ({ ...prev, ...settings }));
  };

  // Real-time Firestore Subscriptions for Room Data & Chat
  useEffect(() => {
    if (!room?.id) return;

    // 1. Subscribe to room doc (notes, agenda, bridge)
    const unsubRoom = subscribeToRoom(room.id, (remoteData) => {
      if (remoteData.notes !== undefined && remoteData.notes !== notes) {
        setNotes(remoteData.notes);
      }
      if (remoteData.googleMeetUri) {
        setRoom((prev) => prev ? {
          ...prev,
          meetSpaceUri: remoteData.googleMeetUri,
          meetSpaceId: remoteData.googleMeetCode || prev.meetSpaceId
        } : null);
      }
    });

    // 2. Subscribe to room chat messages
    const unsubChat = subscribeToChatMessages(room.id, (firestoreMsgs) => {
      if (firestoreMsgs && firestoreMsgs.length > 0) {
        setChatMessages(firestoreMsgs.map((m) => {
          const isMe = m.senderId === user.id;
          return {
            ...m,
            senderRole: isMe ? user.role : (m.senderRole || 'guest'),
          };
        }));
      }
    });

    return () => {
      unsubRoom();
      unsubChat();
    };
  }, [room?.id, user.id, user.role]);

  // Real-time Participant Presence in Firestore
  useEffect(() => {
    if (view !== 'meeting' || !room?.id) return;

    const currentParticipant: Participant = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      audioEnabled,
      videoEnabled,
      isSpeaking: isLocalSpeaking,
      audioLevel: localAudioLevel,
      isScreenSharing,
      isHandRaised,
      isPinned: false,
      isWaiting: false,
      connectionQuality: 'excellent',
    };

    setParticipantInFirestore(room.id, currentParticipant);

    return () => {
      removeParticipantFromFirestore(room.id, user.id);
    };
  }, [view, room?.id, user, audioEnabled, videoEnabled, isLocalSpeaking, localAudioLevel, isScreenSharing, isHandRaised]);

  return (
    <MeetingContext.Provider
      value={{
        isFirebaseConnected,
        firebaseUser,
        signInWithGoogleAuth,
        signOutFirebaseAuth,
        syncStatus,
        signalingStatus,
        shareableRoomUrl,
        view,
        currentView: view,
        setView,
        user,
        setUser,
        room,
        roomNotFoundCode,
        setRoomNotFoundCode,
        isValidatingRoom,
        durationSeconds,
        durationFormatted,
        isHost,
        createInstantRoom,
        joinRoomById,
        enterMeetingRoom,
        leaveRoom,
        audioEnabled,
        videoEnabled,
        toggleAudio,
        toggleVideo,
        localStream,
        displayStream,
        isScreenSharing,
        toggleScreenShare,
        screenSharePresenterName,
        localAudioLevel,
        isLocalSpeaking,
        deviceSettings,
        updateDeviceSettings,
        availableDevices,
        refreshDevices,
        participants,
        waitingParticipants,
        pinnedParticipantId,
        setPinnedParticipantId,
        activeSpeakerId,
        isHandRaised,
        toggleRaiseHand,
        muteParticipant,
        muteAllParticipants,
        kickParticipant,
        toggleParticipantRole,
        admitParticipant,
        denyParticipant,
        admitAllParticipants,
        toggleRoomLock,
        updateRoomPermissions,
        chatMessages,
        unreadChatCount,
        sendChatMessage,
        reactToChatMessage,
        activeReactions,
        triggerReaction,
        activeDrawer,
        setActiveDrawer,
        workspaceTab,
        setWorkspaceTab,
        videoLayout,
        setVideoLayout,
        notes,
        updateNotes,
        projectAssets,
        addProjectAsset,
        projectTasks,
        toggleTask,
        aiSummary,
        isAiSummarizing,
        generateMeetingSummary,
        aiChatQuery,
        setAiChatQuery,
        aiChatHistory,
        askAiAssistant,
        isAiAsking,
        recentRooms,
        scheduledRooms,
        createGoogleMeetBridge,
        isGoogleMeetConnecting,
        atmosphere,
        setAtmosphere,
        restrainedIndicators,
        setRestrainedIndicators,
        filmGrain,
        setFilmGrain,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
};

export const useMeeting = () => {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
};
