import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  type DocumentData,
  type Unsubscribe
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInAnonymously,
  type User as FirebaseUser 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import type { 
  Room, 
  ChatMessage, 
  Participant, 
  UserRole,
  Conversation,
  DirectChatMessage,
  KeepItem,
  MeetingRecord,
  ProjectContainer
} from '../types';

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

// Initialize Firestore with specific database ID if provided
const customDbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = customDbId && customDbId !== '(default)'
  ? getFirestore(app, customDbId)
  : getFirestore(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/meetings.space.created');
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in using Google OAuth Popup
 */
export async function signInWithGoogle(): Promise<{ user: FirebaseUser; accessToken?: string }> {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  return {
    user: result.user,
    accessToken: credential?.accessToken
  };
}

/**
 * Sign in anonymously for guests
 */
export async function signInAsGuest(): Promise<FirebaseUser> {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

/**
 * Sign out of Firebase
 */
export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

// ----------------------------------------------------
// FIRESTORE ROOM OPERATIONS
// ----------------------------------------------------

/**
 * Persist new or updated room in Firestore
 */
export async function saveRoomToFirestore(room: Room): Promise<void> {
  try {
    const roomRef = doc(db, 'rooms', room.id);
    const payload = {
      id: room.id,
      title: room.title || 'Studio Conference',
      hostId: room.hostId || '',
      hostName: room.hostName || 'Host',
      permissions: room.permissions || {
        waitingRoomEnabled: true,
        allowGuestScreenShare: true,
        allowGuestChat: true,
        muteOnEntry: false,
        hostApprovalRequired: true,
      },
      agenda: room.agenda || [],
      files: room.files || [],
      notes: room.notes || '',
      meetSpaceUri: room.meetSpaceUri || room.googleMeetUri || null,
      meetSpaceId: room.meetSpaceId || room.googleMeetCode || null,
      createdAt: room.createdAt || new Date().toISOString(),
      isLocked: Boolean(room.isLocked),
      status: 'active',
      updatedAt: serverTimestamp()
    };
    await setDoc(roomRef, payload, { merge: true });
  } catch (err) {
    console.warn('Firestore: Error saving room:', err);
  }
}

/**
 * Fetch a room from Firestore by its room code (e.g. ROOM-7F3A2)
 */
export async function getRoomFromFirestore(roomId: string): Promise<Room | null> {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return null;
    const data = snap.data() as DocumentData;
    return {
      id: data.id || roomId,
      title: data.title || 'Studio Conference',
      hostId: data.hostId || '',
      hostName: data.hostName || 'Host',
      createdAt: data.createdAt || new Date().toISOString(),
      durationSeconds: data.durationSeconds || 0,
      permissions: data.permissions || {
        waitingRoomEnabled: true,
        allowGuestScreenShare: true,
        allowGuestChat: true,
        muteOnEntry: false,
        hostApprovalRequired: true,
      },
      agenda: data.agenda || [],
      files: data.files || [],
      notes: data.notes || '',
      meetSpaceUri: data.meetSpaceUri || undefined,
      meetSpaceId: data.meetSpaceId || undefined,
      googleMeetUri: data.meetSpaceUri || undefined,
      googleMeetCode: data.meetSpaceId || undefined,
      isLocked: Boolean(data.isLocked),
    };
  } catch (err) {
    console.warn('Firestore: Error fetching room:', err);
    return null;
  }
}

/**
 * Subscribe in real-time to room changes (agenda, notes, features, files)
 */
export function subscribeToRoom(
  roomId: string, 
  callback: (roomData: Partial<Room>) => void
): Unsubscribe {
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(roomRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback({
        title: data.title,
        notes: data.notes,
        agenda: data.agenda,
        files: data.files,
        permissions: data.permissions,
        meetSpaceUri: data.meetSpaceUri,
        meetSpaceId: data.meetSpaceId,
        googleMeetUri: data.meetSpaceUri,
        googleMeetCode: data.meetSpaceId,
        isLocked: data.isLocked
      });
    }
  }, (err) => {
    console.warn('Firestore: Room subscription notice:', err.message);
  });
}

/**
 * Update collaborative room notes in real time
 */
export async function updateRoomNotesInFirestore(roomId: string, notes: string): Promise<void> {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      notes,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Firestore: Notes update notice:', err);
  }
}

// ----------------------------------------------------
// FIRESTORE REAL-TIME CHAT OPERATIONS
// ----------------------------------------------------

export interface SendMessagePayload {
  id?: string;
  senderId: string;
  senderName: string;
  senderRole?: UserRole;
  senderAvatar?: string;
  content: string;
  timestamp?: string | number;
  reactions?: Record<string, string[]>;
}

/**
 * Send a chat message to the room's messages subcollection
 */
export async function sendChatMessageToFirestore(
  roomId: string,
  message: SendMessagePayload
): Promise<void> {
  try {
    const msgId = message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msgRef = doc(db, 'rooms', roomId, 'messages', msgId);
    await setDoc(msgRef, {
      id: msgId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole || 'guest',
      senderAvatar: message.senderAvatar || null,
      content: message.content,
      timestamp: typeof message.timestamp === 'number' ? message.timestamp : Date.now(),
      reactions: message.reactions || {}
    });
  } catch (err) {
    console.warn('Firestore: Error sending message:', err);
  }
}

/**
 * Subscribe to chat messages for a room in real time
 */
export function subscribeToChatMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  const messagesCol = collection(db, 'rooms', roomId, 'messages');
  const q = query(messagesCol, orderBy('timestamp', 'asc'), limit(150));
  
  return onSnapshot(q, (snapshot) => {
    const msgs: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      const timeFormatted = typeof d.timestamp === 'number'
        ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : (d.timestamp || 'Now');

      msgs.push({
        id: docSnap.id,
        senderId: d.senderId,
        senderName: d.senderName,
        senderRole: (d.senderRole || 'guest') as UserRole,
        senderAvatar: d.senderAvatar || undefined,
        content: d.content || '',
        timestamp: timeFormatted,
        type: 'text',
        reactions: d.reactions || {}
      });
    });
    callback(msgs);
  }, (err) => {
    console.warn('Firestore: Messages subscription notice:', err.message);
  });
}

// ----------------------------------------------------
// FIRESTORE PARTICIPANT PRESENCE OPERATIONS
// ----------------------------------------------------

/**
 * Register or update a participant in the room
 */
export async function setParticipantInFirestore(
  roomId: string,
  participant: Participant
): Promise<void> {
  try {
    const partRef = doc(db, 'rooms', roomId, 'participants', participant.id);
    await setDoc(partRef, {
      id: participant.id,
      name: participant.name,
      avatar: participant.avatar || null,
      role: participant.role,
      status: participant.status || (participant.isWaiting ? 'waiting' : 'admitted'),
      isHost: participant.isHost || participant.role === 'host',
      audioEnabled: participant.audioEnabled,
      videoEnabled: participant.videoEnabled,
      isScreenSharing: Boolean(participant.isScreenSharing),
      isHandRaised: Boolean(participant.isHandRaised),
      connectionQuality: participant.connectionQuality || 'excellent',
      lastSeen: Date.now()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore: Error setting participant:', err);
  }
}

/**
 * Remove participant from the room on leave/disconnect
 */
export async function removeParticipantFromFirestore(
  roomId: string,
  participantId: string
): Promise<void> {
  try {
    const partRef = doc(db, 'rooms', roomId, 'participants', participantId);
    await deleteDoc(partRef);
  } catch (err) {
    console.warn('Firestore: Error removing participant:', err);
  }
}

/**
 * Subscribe to participant presence in real time
 */
export function subscribeToParticipants(
  roomId: string,
  callback: (participants: Participant[]) => void
): Unsubscribe {
  const partsCol = collection(db, 'rooms', roomId, 'participants');
  return onSnapshot(partsCol, (snapshot) => {
    const participants: Participant[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      participants.push({
        id: docSnap.id,
        name: d.name,
        avatar: d.avatar || undefined,
        role: (d.role || 'guest') as UserRole,
        status: d.status || 'admitted',
        isHost: Boolean(d.isHost),
        audioEnabled: Boolean(d.audioEnabled),
        videoEnabled: Boolean(d.videoEnabled),
        isSpeaking: false,
        audioLevel: 0,
        isScreenSharing: Boolean(d.isScreenSharing),
        isHandRaised: Boolean(d.isHandRaised),
        isPinned: false,
        isWaiting: d.status === 'waiting',
        connectionQuality: d.connectionQuality || 'excellent'
      });
    });
    callback(participants);
  }, (err) => {
    console.warn('Firestore: Participants subscription notice:', err.message);
  });
}

// ----------------------------------------------------
// ROOM CHAT CONVERSATIONS & MESSAGES
// ----------------------------------------------------

export async function saveConversationToFirestore(conv: Conversation): Promise<void> {
  try {
    const ref = doc(db, 'conversations', conv.id);
    await setDoc(ref, {
      id: conv.id,
      title: conv.title,
      type: conv.type,
      members: conv.members || [],
      memberIds: conv.memberIds || [],
      projectId: conv.projectId || null,
      projectTitle: conv.projectTitle || null,
      lastMessage: conv.lastMessage || null,
      unreadCount: conv.unreadCount || 0,
      isPinned: Boolean(conv.isPinned),
      isMuted: Boolean(conv.isMuted),
      activeRoomId: conv.activeRoomId || null,
      createdAt: conv.createdAt || new Date().toISOString(),
      updatedAt: conv.updatedAt || new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore: Error saving conversation:', err);
  }
}

export function subscribeToConversations(
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  const colRef = collection(db, 'conversations');
  const q = query(colRef, orderBy('updatedAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const list: Conversation[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        id: docSnap.id,
        title: d.title || 'Conversation',
        type: d.type || 'direct',
        members: d.members || [],
        memberIds: d.memberIds || [],
        projectId: d.projectId || undefined,
        projectTitle: d.projectTitle || undefined,
        lastMessage: d.lastMessage || undefined,
        unreadCount: d.unreadCount || 0,
        isPinned: Boolean(d.isPinned),
        isMuted: Boolean(d.isMuted),
        activeRoomId: d.activeRoomId || undefined,
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString()
      });
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore: Conversations subscription error:', err.message);
  });
}

export async function sendDirectChatMessageToFirestore(
  conversationId: string,
  message: DirectChatMessage
): Promise<void> {
  try {
    const msgId = message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const msgRef = doc(db, 'conversations', conversationId, 'messages', msgId);
    
    await setDoc(msgRef, {
      id: msgId,
      conversationId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar || null,
      senderRole: message.senderRole || 'guest',
      content: message.content,
      timestamp: message.timestamp,
      rawTimestamp: message.rawTimestamp || Date.now(),
      type: message.type || 'text',
      replyTo: message.replyTo || null,
      reactions: message.reactions || {},
      fileAttachment: message.fileAttachment || null,
      sharedLink: message.sharedLink || null,
      roomInvite: message.roomInvite || null,
      savedToKeepId: message.savedToKeepId || null
    });

    // Update conversation lastMessage and timestamp
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      lastMessage: {
        id: msgId,
        text: message.content,
        senderId: message.senderId,
        senderName: message.senderName,
        timestamp: message.timestamp
      },
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Firestore: Error sending direct chat message:', err);
  }
}

export function subscribeToDirectChatMessages(
  conversationId: string,
  callback: (messages: DirectChatMessage[]) => void
): Unsubscribe {
  const colRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(colRef, orderBy('rawTimestamp', 'asc'), limit(150));
  return onSnapshot(q, (snapshot) => {
    const messages: DirectChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      messages.push({
        id: docSnap.id,
        conversationId: d.conversationId || conversationId,
        senderId: d.senderId,
        senderName: d.senderName,
        senderAvatar: d.senderAvatar || undefined,
        senderRole: d.senderRole || 'guest',
        content: d.content,
        timestamp: d.timestamp || 'Now',
        rawTimestamp: d.rawTimestamp || Date.now(),
        type: d.type || 'text',
        replyTo: d.replyTo || undefined,
        reactions: d.reactions || {},
        fileAttachment: d.fileAttachment || undefined,
        sharedLink: d.sharedLink || undefined,
        roomInvite: d.roomInvite || undefined,
        savedToKeepId: d.savedToKeepId || undefined
      });
    });
    callback(messages);
  }, (err) => {
    console.warn('Firestore: Direct chat subscription error:', err.message);
  });
}

// ----------------------------------------------------
// ROOM KEEP (INTELLIGENT MEMORY)
// ----------------------------------------------------

export async function saveKeepItemToFirestore(item: KeepItem): Promise<void> {
  try {
    const ref = doc(db, 'keepItems', item.id);
    await setDoc(ref, {
      ...item,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore: Error saving keep item:', err);
  }
}

export async function deleteKeepItemFromFirestore(itemId: string): Promise<void> {
  try {
    const ref = doc(db, 'keepItems', itemId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Firestore: Error deleting keep item:', err);
  }
}

export async function updateKeepItemStatus(
  itemId: string, 
  status: 'confirmed' | 'dismissed'
): Promise<void> {
  try {
    const ref = doc(db, 'keepItems', itemId);
    await updateDoc(ref, {
      status,
      confirmedAt: status === 'confirmed' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Firestore: Error updating keep item status:', err);
  }
}

export function subscribeToKeepItems(
  callback: (items: KeepItem[]) => void
): Unsubscribe {
  const colRef = collection(db, 'keepItems');
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    const list: KeepItem[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data() as KeepItem;
      list.push({
        ...d,
        id: docSnap.id
      });
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore: KeepItems subscription error:', err.message);
  });
}

// ----------------------------------------------------
// MEETING RECORDS (POST-MEETING CONTINUITY)
// ----------------------------------------------------

export async function saveMeetingRecordToFirestore(record: MeetingRecord): Promise<void> {
  try {
    const ref = doc(db, 'meetingRecords', record.id);
    await setDoc(ref, {
      ...record
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore: Error saving meeting record:', err);
  }
}

export function subscribeToMeetingRecords(
  callback: (records: MeetingRecord[]) => void
): Unsubscribe {
  const colRef = collection(db, 'meetingRecords');
  const q = query(colRef, orderBy('startedAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const list: MeetingRecord[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data() as MeetingRecord;
      list.push({
        ...d,
        id: docSnap.id
      });
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore: Meeting records subscription error:', err.message);
  });
}

// ----------------------------------------------------
// PROJECTS
// ----------------------------------------------------

export async function saveProjectToFirestore(proj: ProjectContainer): Promise<void> {
  try {
    const ref = doc(db, 'projects', proj.id);
    await setDoc(ref, {
      ...proj,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore: Error saving project:', err);
  }
}

export function subscribeToProjects(
  callback: (projects: ProjectContainer[]) => void
): Unsubscribe {
  const colRef = collection(db, 'projects');
  return onSnapshot(colRef, (snapshot) => {
    const list: ProjectContainer[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data() as ProjectContainer;
      list.push({
        ...d,
        id: docSnap.id
      });
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore: Projects subscription error:', err.message);
  });
}
