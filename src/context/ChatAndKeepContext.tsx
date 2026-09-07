import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Conversation, 
  ConversationType, 
  DirectChatMessage, 
  KeepItem, 
  KeepCategory, 
  KeepStatus, 
  MeetingRecord, 
  ProjectContainer, 
  UnifiedSearchResult,
  ChatMessage
} from '../types';
import { 
  INITIAL_CONVERSATIONS, 
  INITIAL_DIRECT_MESSAGES, 
  INITIAL_KEEP_ITEMS, 
  INITIAL_MEETING_RECORDS, 
  INITIAL_PROJECTS,
  INITIAL_USER
} from '../data/mockData';
import {
  saveConversationToFirestore,
  subscribeToConversations,
  sendDirectChatMessageToFirestore,
  subscribeToDirectChatMessages,
  saveKeepItemToFirestore,
  deleteKeepItemFromFirestore,
  updateKeepItemStatus,
  subscribeToKeepItems,
  saveMeetingRecordToFirestore,
  subscribeToMeetingRecords,
  saveProjectToFirestore,
  subscribeToProjects
} from '../services/firebase';

export type KeepFilterType = 'all' | 'idea' | 'decision' | 'task' | 'reference' | 'question' | 'suggestions';

interface ChatAndKeepContextType {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | undefined;
  setActiveConversationId: (id: string | null) => void;
  messages: Record<string, DirectChatMessage[]>;
  activeMessages: DirectChatMessage[];
  sendDirectMessage: (
    convId: string, 
    content: string, 
    options?: { 
      replyTo?: { id: string; senderName: string; content: string };
      fileAttachment?: { name: string; size: string; type: string; url?: string };
      sharedLink?: { url: string; title?: string; description?: string };
      roomInvite?: { roomId: string; roomTitle: string; status: 'active' | 'ended' };
    }
  ) => Promise<void>;
  createConversation: (
    title: string, 
    type: ConversationType, 
    memberNames?: string[], 
    projectId?: string
  ) => Promise<string>;
  togglePinConversation: (convId: string) => void;
  toggleMuteConversation: (convId: string) => void;

  // Keep (Intelligent Memory)
  keepItems: KeepItem[];
  activeKeepFilter: KeepFilterType;
  setActiveKeepFilter: (filter: KeepFilterType) => void;
  keepSearchQuery: string;
  setKeepSearchQuery: (q: string) => void;
  filteredKeepItems: KeepItem[];
  addKeepItem: (item: Partial<KeepItem>) => Promise<KeepItem>;
  confirmKeepSuggestion: (itemId: string) => Promise<void>;
  dismissKeepSuggestion: (itemId: string) => Promise<void>;
  deleteKeepItem: (itemId: string) => Promise<void>;
  toggleTaskComplete: (itemId: string) => Promise<void>;
  saveChatToKeep: (
    content: string, 
    sourceTitle: string, 
    category?: KeepCategory, 
    options?: { author?: string; participants?: string[]; roomId?: string; conversationId?: string; projectId?: string }
  ) => Promise<KeepItem>;
  extractKeepFromMeeting: (
    meetingInfo: { roomTitle: string; notes?: string; messages?: any[]; participants?: any[]; projectTitle?: string }
  ) => Promise<KeepItem[]>;

  // Meeting Continuity & Records
  meetingRecords: MeetingRecord[];
  activeMeetingRecordId: string | null;
  setActiveMeetingRecordId: (id: string | null) => void;
  activeMeetingRecord: MeetingRecord | undefined;
  saveMeetingRecord: (record: MeetingRecord) => Promise<void>;

  // Projects
  projects: ProjectContainer[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  activeProject: ProjectContainer | undefined;
  saveProject: (project: ProjectContainer) => Promise<void>;

  // Unified Search
  unifiedSearchQuery: string;
  setUnifiedSearchQuery: (q: string) => void;
  unifiedSearchResult: UnifiedSearchResult | null;
  isSearching: boolean;
  performUnifiedSearch: (query: string) => Promise<UnifiedSearchResult>;
  clearUnifiedSearch: () => void;

  // Post-Meeting Recap Modal
  showRoomRecapModal: boolean;
  postMeetingRecapData: MeetingRecord | null;
  openRoomRecap: (record: MeetingRecord) => void;
  closeRoomRecap: () => void;
}

const ChatAndKeepContext = createContext<ChatAndKeepContextType | undefined>(undefined);

export const ChatAndKeepProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Conversations state
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string | null>('conv-nava');
  const [messagesMap, setMessagesMap] = useState<Record<string, DirectChatMessage[]>>(INITIAL_DIRECT_MESSAGES);

  // 2. Keep Items state
  const [keepItems, setKeepItems] = useState<KeepItem[]>(INITIAL_KEEP_ITEMS);
  const [activeKeepFilter, setActiveKeepFilter] = useState<KeepFilterType>('all');
  const [keepSearchQuery, setKeepSearchQuery] = useState('');

  // 3. Meeting Records state
  const [meetingRecords, setMeetingRecords] = useState<MeetingRecord[]>(INITIAL_MEETING_RECORDS);
  const [activeMeetingRecordId, setActiveMeetingRecordId] = useState<string | null>('rec-01');

  // 4. Projects state
  const [projects, setProjects] = useState<ProjectContainer[]>(INITIAL_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string | null>('proj-awakening-01');

  // 5. Unified Search state
  const [unifiedSearchQuery, setUnifiedSearchQuery] = useState('');
  const [unifiedSearchResult, setUnifiedSearchResult] = useState<UnifiedSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // 6. Post-meeting recap
  const [showRoomRecapModal, setShowRoomRecapModal] = useState(false);
  const [postMeetingRecapData, setPostMeetingRecapData] = useState<MeetingRecord | null>(null);

  // --- Real-time Firestore Subscriptions with Graceful Local Fallbacks ---
  useEffect(() => {
    let unsubConversations: (() => void) | null = null;
    let unsubKeep: (() => void) | null = null;
    let unsubRecords: (() => void) | null = null;
    let unsubProjects: (() => void) | null = null;

    try {
      unsubConversations = subscribeToConversations((firebaseConvs) => {
        if (firebaseConvs && firebaseConvs.length > 0) {
          // Merge with initial if not present
          setConversations((prev) => {
            const map = new Map<string, Conversation>(prev.map(c => [c.id, c]));
            firebaseConvs.forEach(fc => map.set(fc.id, fc));
            return (Array.from(map.values()) as Conversation[]).sort((a, b) => 
              new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
            );
          });
        }
      });

      unsubKeep = subscribeToKeepItems((firebaseKeep) => {
        if (firebaseKeep && firebaseKeep.length > 0) {
          setKeepItems((prev) => {
            const map = new Map<string, KeepItem>(prev.map(k => [k.id, k]));
            firebaseKeep.forEach(fk => map.set(fk.id, fk));
            return (Array.from(map.values()) as KeepItem[]).sort((a, b) => 
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
          });
        }
      });

      unsubRecords = subscribeToMeetingRecords((records) => {
        if (records && records.length > 0) {
          setMeetingRecords((prev) => {
            const map = new Map<string, MeetingRecord>(prev.map(r => [r.id, r]));
            records.forEach(r => map.set(r.id, r));
            return (Array.from(map.values()) as MeetingRecord[]).sort((a, b) => 
              new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()
            );
          });
        }
      });

      unsubProjects = subscribeToProjects((projs) => {
        if (projs && projs.length > 0) {
          setProjects((prev) => {
            const map = new Map<string, ProjectContainer>(prev.map(p => [p.id, p]));
            projs.forEach(p => map.set(p.id, p));
            return Array.from(map.values()) as ProjectContainer[];
          });
        }
      });
    } catch (e) {
      console.warn('Firebase realtime sync initialization notice:', e);
    }

    return () => {
      if (unsubConversations) unsubConversations();
      if (unsubKeep) unsubKeep();
      if (unsubRecords) unsubRecords();
      if (unsubProjects) unsubProjects();
    };
  }, []);

  // Subscribe to messages of active conversation
  useEffect(() => {
    if (!activeConversationId) return;

    let unsub: (() => void) | null = null;
    try {
      unsub = subscribeToDirectChatMessages(activeConversationId, (liveMsgs) => {
        if (liveMsgs && liveMsgs.length > 0) {
          setMessagesMap((prev) => ({
            ...prev,
            [activeConversationId]: liveMsgs
          }));
        }
      });
    } catch (e) {
      console.warn('Direct chat subscription notice:', e);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [activeConversationId]);

  // Active conversation helper
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  // Active messages helper
  const activeMessages = useMemo(() => {
    if (!activeConversationId) return [];
    return messagesMap[activeConversationId] || [];
  }, [messagesMap, activeConversationId]);

  // Active meeting record helper
  const activeMeetingRecord = useMemo(() => {
    return meetingRecords.find(r => r.id === activeMeetingRecordId);
  }, [meetingRecords, activeMeetingRecordId]);

  // Active project helper
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId);
  }, [projects, activeProjectId]);

  // Send a direct message in a conversation
  const sendDirectMessage = useCallback(async (
    convId: string,
    content: string,
    options?: {
      replyTo?: { id: string; senderName: string; content: string };
      fileAttachment?: { name: string; size: string; type: string; url?: string };
      sharedLink?: { url: string; title?: string; description?: string };
      roomInvite?: { roomId: string; roomTitle: string; status: 'active' | 'ended' };
    }
  ) => {
    if (!content.trim() && !options?.fileAttachment && !options?.roomInvite) return;

    const newMsg: DirectChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: convId,
      senderId: INITIAL_USER.id,
      senderName: INITIAL_USER.name,
      senderAvatar: INITIAL_USER.avatar,
      senderRole: 'host',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rawTimestamp: Date.now(),
      type: options?.roomInvite ? 'room-invite' : options?.fileAttachment ? 'file' : 'text',
      replyTo: options?.replyTo,
      reactions: {},
      fileAttachment: options?.fileAttachment,
      sharedLink: options?.sharedLink,
      roomInvite: options?.roomInvite,
    };

    // Optimistic local update
    setMessagesMap(prev => ({
      ...prev,
      [convId]: [...(prev[convId] || []), newMsg]
    }));

    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        return {
          ...c,
          lastMessage: {
            id: newMsg.id,
            text: content || (options?.fileAttachment?.name ? `Sent attachment ${options.fileAttachment.name}` : 'ROOM Invitation'),
            senderId: INITIAL_USER.id,
            senderName: INITIAL_USER.name,
            timestamp: newMsg.timestamp,
          },
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    }));

    // Firestore persistence
    try {
      await sendDirectChatMessageToFirestore(convId, newMsg);
    } catch (e) {
      console.warn('Failed to persist direct message to Firestore:', e);
    }
  }, []);

  // Create conversation
  const createConversation = useCallback(async (
    title: string,
    type: ConversationType,
    memberNames?: string[],
    projectId?: string
  ): Promise<string> => {
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title,
      type,
      members: [
        { id: INITIAL_USER.id, name: INITIAL_USER.name, avatar: INITIAL_USER.avatar, role: 'Creator', status: 'online' },
        ...(memberNames || []).map((name, i) => ({
          id: `usr-ext-${i}-${Date.now()}`,
          name,
          role: 'Member',
          status: 'offline' as const,
        }))
      ],
      memberIds: [INITIAL_USER.id, ...(memberNames || []).map((_, i) => `usr-ext-${i}`)],
      projectId,
      isPinned: false,
      isMuted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newId);

    try {
      await saveConversationToFirestore(newConv);
    } catch (e) {
      console.warn('Firestore conversation save error:', e);
    }

    return newId;
  }, []);

  // Toggle pin conversation
  const togglePinConversation = useCallback((convId: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        const updated = { ...c, isPinned: !c.isPinned };
        saveConversationToFirestore(updated).catch(() => {});
        return updated;
      }
      return c;
    }));
  }, []);

  // Toggle mute conversation
  const toggleMuteConversation = useCallback((convId: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        const updated = { ...c, isMuted: !c.isMuted };
        saveConversationToFirestore(updated).catch(() => {});
        return updated;
      }
      return c;
    }));
  }, []);

  // Filtered Keep Items
  const filteredKeepItems = useMemo(() => {
    let items = keepItems;

    if (activeKeepFilter === 'suggestions') {
      items = items.filter(i => i.status === 'suggested');
    } else if (activeKeepFilter !== 'all') {
      items = items.filter(i => i.category === activeKeepFilter && i.status !== 'dismissed');
    } else {
      // 'all' shows both confirmed and pending suggestions
      items = items.filter(i => i.status !== 'dismissed');
    }

    if (keepSearchQuery.trim()) {
      const q = keepSearchQuery.toLowerCase();
      items = items.filter(i => 
        i.title.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q) ||
        i.source?.title?.toLowerCase().includes(q) ||
        (i.tags && i.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    return items;
  }, [keepItems, activeKeepFilter, keepSearchQuery]);

  // Add Keep item (explicit or system)
  const addKeepItem = useCallback(async (itemData: Partial<KeepItem>): Promise<KeepItem> => {
    const newItem: KeepItem = {
      id: itemData.id || `keep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: itemData.title || 'Untitled Note',
      content: itemData.content || '',
      category: itemData.category || 'idea',
      status: itemData.status || 'confirmed',
      confidence: itemData.confidence ?? 1.0,
      source: itemData.source || {
        type: 'explicit',
        title: 'Explicit Capture',
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      },
      projectId: itemData.projectId || activeProjectId || undefined,
      projectTitle: itemData.projectTitle,
      assignedTo: itemData.assignedTo,
      dueDate: itemData.dueDate,
      completed: itemData.completed || false,
      tags: itemData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedAt: itemData.status === 'confirmed' ? new Date().toISOString() : undefined,
      createdBy: INITIAL_USER.name,
      isAiGenerated: itemData.isAiGenerated || false,
    };

    setKeepItems(prev => [newItem, ...prev]);

    try {
      await saveKeepItemToFirestore(newItem);
    } catch (e) {
      console.warn('Firestore keep save notice:', e);
    }

    return newItem;
  }, [activeProjectId]);

  // Confirm AI suggestion
  const confirmKeepSuggestion = useCallback(async (itemId: string) => {
    setKeepItems(prev => prev.map(k => {
      if (k.id === itemId) {
        return {
          ...k,
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return k;
    }));

    try {
      await updateKeepItemStatus(itemId, 'confirmed');
    } catch (e) {
      console.warn('Failed to confirm suggestion in Firestore:', e);
    }
  }, []);

  // Dismiss AI suggestion
  const dismissKeepSuggestion = useCallback(async (itemId: string) => {
    setKeepItems(prev => prev.filter(k => k.id !== itemId));

    try {
      await updateKeepItemStatus(itemId, 'dismissed');
    } catch (e) {
      console.warn('Failed to dismiss suggestion in Firestore:', e);
    }
  }, []);

  // Delete Keep item permanently
  const deleteKeepItem = useCallback(async (itemId: string) => {
    setKeepItems(prev => prev.filter(k => k.id !== itemId));

    try {
      await deleteKeepItemFromFirestore(itemId);
    } catch (e) {
      console.warn('Failed to delete keep item:', e);
    }
  }, []);

  // Toggle task completion in Keep
  const toggleTaskComplete = useCallback(async (itemId: string) => {
    setKeepItems(prev => prev.map(k => {
      if (k.id === itemId) {
        const updated = {
          ...k,
          completed: !k.completed,
          updatedAt: new Date().toISOString()
        };
        saveKeepItemToFirestore(updated).catch(() => {});
        return updated;
      }
      return k;
    }));
  }, []);

  // Contextual "Save to Keep" from Chat or Notes
  const saveChatToKeep = useCallback(async (
    content: string,
    sourceTitle: string,
    category?: KeepCategory,
    options?: { author?: string; participants?: string[]; roomId?: string; conversationId?: string; projectId?: string }
  ): Promise<KeepItem> => {
    let resolvedCategory: KeepCategory = category || 'idea';
    let cleanTitle = content.length > 50 ? content.substring(0, 48) + '...' : content;

    // Call server AI classifier if category wasn't explicitly selected
    if (!category) {
      try {
        const res = await fetch('/api/ai/classify-keep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content, context: sourceTitle })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.item?.category) {
            resolvedCategory = data.item.category;
            cleanTitle = data.item.title || cleanTitle;
          }
        }
      } catch (e) {}
    }

    return addKeepItem({
      title: cleanTitle,
      content,
      category: resolvedCategory,
      status: 'confirmed',
      confidence: 1.0,
      source: {
        type: options?.roomId ? 'meeting-chat' : 'chat',
        id: options?.roomId || options?.conversationId,
        title: sourceTitle,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        participants: options?.participants || [options?.author || 'Team Member'],
        roomId: options?.roomId,
        conversationId: options?.conversationId
      },
      projectId: options?.projectId || activeProjectId || undefined,
      isAiGenerated: false
    });
  }, [addKeepItem, activeProjectId]);

  // Extract Keep items from meeting transcript & notes using server Gemini 3.8 Flash
  const extractKeepFromMeeting = useCallback(async (
    meetingInfo: { roomTitle: string; notes?: string; messages?: any[]; participants?: any[]; projectTitle?: string }
  ): Promise<KeepItem[]> => {
    try {
      const res = await fetch('/api/ai/extract-keep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingInfo)
      });

      if (res.ok) {
        const data = await res.json();
        const suggestions = data.suggestions || [];
        const newKeepItems: KeepItem[] = suggestions.map((s: any, idx: number) => ({
          id: `keep-sug-${Date.now()}-${idx}`,
          title: s.title,
          content: s.content,
          category: s.category || 'idea',
          status: 'suggested' as KeepStatus,
          confidence: s.confidence || 0.9,
          source: {
            type: 'meeting',
            title: meetingInfo.roomTitle,
            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            participants: (meetingInfo.participants || []).map((p: any) => p.name || p),
          },
          projectId: activeProjectId || undefined,
          projectTitle: meetingInfo.projectTitle,
          assignedTo: s.assignedTo || undefined,
          dueDate: s.dueDate || undefined,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isAiGenerated: true
        }));

        setKeepItems(prev => [...newKeepItems, ...prev]);
        newKeepItems.forEach(item => {
          saveKeepItemToFirestore(item).catch(() => {});
        });

        return newKeepItems;
      }
    } catch (err) {
      console.warn('Error extracting keep items from meeting:', err);
    }
    return [];
  }, [activeProjectId]);

  // Save Meeting Record
  const saveMeetingRecord = useCallback(async (record: MeetingRecord) => {
    setMeetingRecords(prev => [record, ...prev.filter(r => r.id !== record.id)]);
    try {
      await saveMeetingRecordToFirestore(record);
    } catch (e) {
      console.warn('Failed to persist meeting record to Firestore:', e);
    }
  }, []);

  // Save Project Container
  const saveProject = useCallback(async (project: ProjectContainer) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    try {
      await saveProjectToFirestore(project);
    } catch (e) {
      console.warn('Failed to persist project:', e);
    }
  }, []);

  // Unified Search across Chat, Keep, Meeting Records, and Projects
  const performUnifiedSearch = useCallback(async (query: string): Promise<UnifiedSearchResult> => {
    setIsSearching(true);
    setUnifiedSearchQuery(query);

    const q = query.toLowerCase();

    // 1. Search in Keep Items
    const keepMatches = keepItems
      .filter(k => 
        k.title.toLowerCase().includes(q) || 
        k.content.toLowerCase().includes(q) ||
        (k.tags && k.tags.some(t => t.toLowerCase().includes(q)))
      )
      .map(k => ({
        id: k.id,
        type: 'keep' as const,
        category: k.category,
        title: k.title,
        snippet: k.content,
        date: k.source?.date || 'Recent',
        sourceContext: `Keep (${k.category.toUpperCase()}) · ${k.source?.title || 'Workspace'}`,
        metadata: { status: k.status, confidence: k.confidence }
      }));

    // 2. Search in Meeting Records
    const meetingMatches = meetingRecords
      .filter(m => 
        m.roomTitle.toLowerCase().includes(q) ||
        (m.summary && m.summary.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        (m.decisions && m.decisions.some(d => d.toLowerCase().includes(q)))
      )
      .map(m => ({
        id: m.id,
        type: 'meeting' as const,
        title: m.roomTitle,
        snippet: m.summary || m.notes || m.decisions.join(', '),
        date: m.date,
        sourceContext: `Meeting Archive · ${m.durationFormatted} · ${m.participantCount} participants`,
        metadata: { roomId: m.roomId, decisionsCount: m.decisions?.length }
      }));

    // 3. Search in Direct Chat Messages
    const chatMatches: {
      id: string;
      type: 'chat';
      title: string;
      snippet: string;
      date: string;
      sourceContext: string;
      metadata: Record<string, any>;
    }[] = [];

    Object.entries(messagesMap).forEach(([convId, rawMsgs]) => {
      const conv = conversations.find(c => c.id === convId);
      const msgs = (rawMsgs || []) as DirectChatMessage[];
      msgs.forEach(m => {
        if (m.content.toLowerCase().includes(q)) {
          chatMatches.push({
            id: m.id,
            type: 'chat',
            title: `Message from ${m.senderName}`,
            snippet: m.content,
            date: m.timestamp,
            sourceContext: `Chat · ${conv?.title || 'Conversation'}`,
            metadata: { conversationId: convId, senderId: m.senderId }
          });
        }
      });
    });

    const allMatches = [...keepMatches, ...meetingMatches, ...chatMatches];

    // Call server AI endpoint to synthesize an executive answer
    let aiSynthesis = '';
    try {
      const response = await fetch('/api/ai/unified-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          keepItems: keepItems.slice(0, 15),
          chatMessages: Object.values(messagesMap).flat().slice(-30),
          meetingRecords: meetingRecords.slice(0, 5)
        })
      });
      if (response.ok) {
        const data = await response.json();
        aiSynthesis = data.synthesis || '';
      }
    } catch (e) {
      console.warn('AI search synthesis notice:', e);
    }

    const result: UnifiedSearchResult = {
      query,
      aiSynthesis: aiSynthesis || (allMatches.length > 0 
        ? `Found ${allMatches.length} references matching "${query}" across ROOM Keep memories, past meeting archives, and communication threads.`
        : `No direct records found for "${query}". You can capture an explicit memory in Keep.`),
      items: allMatches
    };

    setUnifiedSearchResult(result);
    setIsSearching(false);
    return result;
  }, [keepItems, meetingRecords, messagesMap, conversations]);

  const clearUnifiedSearch = useCallback(() => {
    setUnifiedSearchQuery('');
    setUnifiedSearchResult(null);
  }, []);

  // Open / Close Post-meeting recap
  const openRoomRecap = useCallback((record: MeetingRecord) => {
    setPostMeetingRecapData(record);
    setShowRoomRecapModal(true);
  }, []);

  const closeRoomRecap = useCallback(() => {
    setShowRoomRecapModal(false);
  }, []);

  return (
    <ChatAndKeepContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        setActiveConversationId,
        messages: messagesMap,
        activeMessages,
        sendDirectMessage,
        createConversation,
        togglePinConversation,
        toggleMuteConversation,

        keepItems,
        activeKeepFilter,
        setActiveKeepFilter,
        keepSearchQuery,
        setKeepSearchQuery,
        filteredKeepItems,
        addKeepItem,
        confirmKeepSuggestion,
        dismissKeepSuggestion,
        deleteKeepItem,
        toggleTaskComplete,
        saveChatToKeep,
        extractKeepFromMeeting,

        meetingRecords,
        activeMeetingRecordId,
        setActiveMeetingRecordId,
        activeMeetingRecord,
        saveMeetingRecord,

        projects,
        activeProjectId,
        setActiveProjectId,
        activeProject,
        saveProject,

        unifiedSearchQuery,
        setUnifiedSearchQuery,
        unifiedSearchResult,
        isSearching,
        performUnifiedSearch,
        clearUnifiedSearch,

        showRoomRecapModal,
        postMeetingRecapData,
        openRoomRecap,
        closeRoomRecap,
      }}
    >
      {children}
    </ChatAndKeepContext.Provider>
  );
};

export const useChatAndKeep = (): ChatAndKeepContextType => {
  const context = useContext(ChatAndKeepContext);
  if (!context) {
    throw new Error('useChatAndKeep must be used within a ChatAndKeepProvider');
  }
  return context;
};
