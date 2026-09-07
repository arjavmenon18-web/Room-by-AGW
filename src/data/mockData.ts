import { 
  User, 
  Participant, 
  ChatMessage, 
  ProjectAsset, 
  ProjectTask, 
  RecentRoom, 
  ScheduledRoom,
  RoomProjectContext,
  Conversation,
  DirectChatMessage,
  KeepItem,
  MeetingRecord,
  ProjectContainer
} from '../types';

export const INITIAL_USER: User = {
  id: 'usr-default',
  name: '',
  email: '',
  role: 'guest',
};

export const DEFAULT_PROJECT_CONTEXT: RoomProjectContext | undefined = undefined;

export const INITIAL_REMOTE_PARTICIPANTS: Participant[] = [];

export const INITIAL_WAITING_PARTICIPANTS: Participant[] = [];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const RECENT_ROOMS: RecentRoom[] = [];

export const SCHEDULED_ROOMS: ScheduledRoom[] = [];

export const PROJECT_ASSETS: ProjectAsset[] = [];

export const PROJECT_TASKS: ProjectTask[] = [];

export const INITIAL_MEETING_NOTES = '';

export const INITIAL_CONVERSATIONS: Conversation[] = [];

export const INITIAL_DIRECT_MESSAGES: Record<string, DirectChatMessage[]> = {};

export const INITIAL_KEEP_ITEMS: KeepItem[] = [];

export const INITIAL_MEETING_RECORDS: MeetingRecord[] = [];

export const PROJECT_CONTAINERS: ProjectContainer[] = [];
export const INITIAL_PROJECTS: ProjectContainer[] = [];
