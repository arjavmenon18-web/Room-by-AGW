import { 
  User, 
  Participant, 
  ChatMessage, 
  ProjectAsset, 
  ProjectTask, 
  RecentRoom, 
  ScheduledRoom,
  RoomProjectContext
} from '../types';

export const INITIAL_USER: User = {
  id: 'usr-armengw-01',
  name: 'Arjav Menon',
  email: 'arjavmenon18@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'host',
};

export const DEFAULT_PROJECT_CONTEXT: RoomProjectContext = {
  id: 'proj-dh-2026',
  title: 'Dune Horizon — Global Release',
  client: 'Armen GlobalWorks Studio',
  phase: 'Post-Production & Sound Design',
  description: 'A cinematic science-fiction atmospheric drama exploring solitude, tactile hardware, and orbital transit.',
};

export const INITIAL_REMOTE_PARTICIPANTS: Participant[] = [
  {
    id: 'p-02',
    name: 'Julian Vance',
    email: 'julian@armenglobal.works',
    role: 'co-host',
    audioEnabled: true,
    videoEnabled: true,
    isSpeaking: true,
    audioLevel: 68,
    isScreenSharing: false,
    isHandRaised: false,
    isPinned: false,
    isWaiting: false,
    videoColor: '#1e1c19',
    initials: 'JV',
    connectionQuality: 'excellent',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-03',
    name: 'Elena Rostova',
    email: 'elena@armenglobal.works',
    role: 'guest',
    audioEnabled: false,
    videoEnabled: true,
    isSpeaking: false,
    audioLevel: 0,
    isScreenSharing: false,
    isHandRaised: true,
    handRaisedAt: Date.now() - 35000,
    isPinned: false,
    isWaiting: false,
    videoColor: '#171a1c',
    initials: 'ER',
    connectionQuality: 'excellent',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-04',
    name: 'Sora Takahashi',
    email: 'sora@armenglobal.works',
    role: 'guest',
    audioEnabled: true,
    videoEnabled: false, // Avatar mode
    isSpeaking: false,
    audioLevel: 12,
    isScreenSharing: false,
    isHandRaised: false,
    isPinned: false,
    isWaiting: false,
    videoColor: '#1c1817',
    initials: 'ST',
    connectionQuality: 'good',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  },
];

export const INITIAL_WAITING_PARTICIPANTS: Participant[] = [
  {
    id: 'p-wait-01',
    name: 'Marcus Sterling',
    email: 'marcus.sterling@production.com',
    role: 'guest',
    audioEnabled: true,
    videoEnabled: true,
    isSpeaking: false,
    audioLevel: 0,
    isScreenSharing: false,
    isHandRaised: false,
    isPinned: false,
    isWaiting: true,
    initials: 'MS',
    connectionQuality: 'good',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'p-wait-02',
    name: 'Chloe Lin',
    email: 'c.lin@distributor-group.intl',
    role: 'guest',
    audioEnabled: true,
    videoEnabled: false,
    isSpeaking: false,
    audioLevel: 0,
    isScreenSharing: false,
    isHandRaised: false,
    isPinned: false,
    isWaiting: true,
    initials: 'CL',
    connectionQuality: 'fair',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  }
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-01',
    senderId: 'sys-01',
    senderName: 'ROOM System',
    senderRole: 'host',
    content: 'Room initialized. End-to-end encrypted session by Armen GlobalWorks.',
    timestamp: '10:30 AM',
    type: 'system',
    reactions: {},
  },
  {
    id: 'msg-02',
    senderId: 'p-02',
    senderName: 'Julian Vance',
    senderRole: 'co-host',
    content: 'Elena, were you able to inspect the 35mm grain pass on reel 03? The shadow falloff in the airlock sequence looks significantly more tactile now.',
    timestamp: '10:32 AM',
    type: 'text',
    reactions: { '👍': ['Arjav Menon'], '❤️': ['Elena Rostova'] },
  },
  {
    id: 'msg-03',
    senderId: 'p-03',
    senderName: 'Elena Rostova',
    senderRole: 'guest',
    content: 'Yes! It holds up beautifully on the reference monitor. I uploaded the updated LUT and look-book to our project assets tab.',
    timestamp: '10:33 AM',
    type: 'text',
    fileAttachment: {
      name: 'Dune_Horizon_LUT_Kodak5219_v4.cube',
      size: '2.4 MB',
      url: '#',
      type: 'LUT Profile',
    },
    reactions: { '👏': ['Julian Vance', 'Arjav Menon'] },
  },
  {
    id: 'msg-04',
    senderId: 'p-04',
    senderName: 'Sora Takahashi',
    senderRole: 'guest',
    content: 'The low-frequency rumble in the sub-bass around 28Hz is perfectly aligned with the score entrance. Ready to playback whenever you want to share screens.',
    timestamp: '10:35 AM',
    type: 'text',
    reactions: {},
  }
];

export const RECENT_ROOMS: RecentRoom[] = [
  {
    id: 'ROOM-7F3A2',
    title: 'Dune Horizon — Post-Production & Edit Lock',
    date: 'Today, 9:15 AM',
    durationFormatted: '42 min',
    participantCount: 5,
    hostName: 'Arjav Menon',
    hasRecording: true,
    hasNotes: true,
    projectTitle: 'Dune Horizon',
  },
  {
    id: 'ROOM-9B1C4',
    title: 'Armen GlobalWorks — Brand Architecture 2026',
    date: 'Yesterday, 3:30 PM',
    durationFormatted: '58 min',
    participantCount: 8,
    hostName: 'Arjav Menon',
    hasRecording: false,
    hasNotes: true,
    projectTitle: 'Brand Strategy',
  },
  {
    id: 'ROOM-3E8D0',
    title: 'Cinematic Score & Stem Mix Session',
    date: 'Sep 2, 2026',
    durationFormatted: '1h 14m',
    participantCount: 4,
    hostName: 'Sora Takahashi',
    hasRecording: true,
    hasNotes: true,
    projectTitle: 'Dune Horizon',
  },
  {
    id: 'ROOM-1F5E8',
    title: 'Autumn Campaign Look-Book Review',
    date: 'Aug 29, 2026',
    durationFormatted: '35 min',
    participantCount: 6,
    hostName: 'Elena Rostova',
    hasRecording: false,
    hasNotes: false,
    projectTitle: 'Horizon of Autumn',
  },
];

export const SCHEDULED_ROOMS: ScheduledRoom[] = [
  {
    id: 'ROOM-2C8A9',
    title: 'Key Stakeholder Presentation & Color Grade Lock',
    timeFormatted: '2:00 PM – 3:30 PM',
    dateFormatted: 'Today',
    hostName: 'Arjav Menon',
    participantsCount: 6,
    projectTitle: 'Dune Horizon',
    meetSpaceUri: 'https://meet.google.com/qzw-mrjt-vka',
  },
  {
    id: 'ROOM-4D7F1',
    title: 'Spatial Audio Multichannel Surround Master',
    timeFormatted: '11:00 AM – 12:00 PM',
    dateFormatted: 'Tomorrow',
    hostName: 'Sora Takahashi',
    participantsCount: 4,
    projectTitle: 'Dune Horizon',
  },
  {
    id: 'ROOM-6E2B3',
    title: 'Armen GlobalWorks Executive Quarterly Planning',
    timeFormatted: '4:00 PM – 5:30 PM',
    dateFormatted: 'Sep 8, 2026',
    hostName: 'Arjav Menon',
    participantsCount: 12,
  },
];

export const PROJECT_ASSETS: ProjectAsset[] = [
  {
    id: 'ast-01',
    title: 'Dune_Horizon_Master_Script_v4.2.pdf',
    category: 'script',
    size: '1.8 MB',
    version: '4.2 Locked',
    lastUpdated: '2 hours ago',
    author: 'Julian Vance',
    status: 'approved',
  },
  {
    id: 'ast-02',
    title: 'Color_Bible_Vision3_500T_Profiles.pdf',
    category: 'document',
    size: '8.4 MB',
    version: '2.0',
    lastUpdated: 'Yesterday',
    author: 'Elena Rostova',
    status: 'in-review',
  },
  {
    id: 'ast-03',
    title: 'Airlock_Sequence_Moodboard_Keyframes.png',
    category: 'image',
    size: '14.2 MB',
    version: 'Final',
    lastUpdated: 'Sep 2',
    author: 'Elena Rostova',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'ast-04',
    title: 'Binaural_Spatial_Cue_Sheet_Reel3.wav',
    category: 'video',
    size: '42.1 MB',
    version: 'v3 Mix',
    lastUpdated: 'Today',
    author: 'Sora Takahashi',
    status: 'in-progress',
  },
  {
    id: 'ast-05',
    title: 'Kodak_Vision3_Exposure_Curves.ref',
    category: 'reference',
    size: '340 KB',
    version: 'v1.0',
    lastUpdated: 'Aug 28',
    author: 'Armen GlobalWorks Lab',
  }
];

export const PROJECT_TASKS: ProjectTask[] = [
  {
    id: 'tsk-01',
    title: 'Finalize high-contrast optical pass on Sequence 04',
    assignee: 'Elena Rostova',
    priority: 'high',
    completed: true,
    dueDate: 'Sep 4',
  },
  {
    id: 'tsk-02',
    title: 'Calibrate sub-bass frequencies below 30Hz for theatrical DCP',
    assignee: 'Sora Takahashi',
    priority: 'high',
    completed: false,
    dueDate: 'Sep 5',
  },
  {
    id: 'tsk-03',
    title: 'Export ProRes 4444 XQ master for international distribution',
    assignee: 'Julian Vance',
    priority: 'medium',
    completed: false,
    dueDate: 'Sep 6',
  },
  {
    id: 'tsk-04',
    title: 'Executive sign-off from Armen GlobalWorks Creative Council',
    assignee: 'Arjav Menon',
    priority: 'high',
    completed: false,
    dueDate: 'Sep 7',
  }
];

export const INITIAL_MEETING_NOTES = `# Dune Horizon — Post-Production & Color Lock
*Host: Arjav Menon | Studio: Armen GlobalWorks*
*Location: ROOM Private Suite 01*

### 1. Aesthetic Objectives
- Maintain our signature tactile 35mm grain texture without introducing artificial electronic noise.
- Ensure shadow details preserve deep espresso and warm charcoal tones rather than clipped digital black.

### 2. Sound Design & Score Alignment
- Sora confirmed the spatial soundscape aligns with Dolby Atmos multichannel deliverables.
- Low-frequency environmental atmospheric sweep begins at minute 03:14.

### 3. Decisions Reached
- [x] Locked picture edit for Act 1 and Act 2.
- [ ] Final sign-off on sound mix (scheduled for tomorrow).
- [ ] Confirm export settings for client preview link.`;
