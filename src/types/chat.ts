export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MatchStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'room_offer'
  | 'room_assigned'
  | 'room_declined';

export interface Match {
  id: string;
  profileId: string;
  name: string;
  avatarUrl: string;
  status?: MatchStatus;
}

import type { Profile } from './profile';

export interface Chat {
  id: string;
  matchId: string;
  name: string;
  avatarUrl: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  profileId?: string;
  profile?: Profile;
  matchStatus?: MatchStatus;
}

export interface Message {
  id: string;
  chatId: string;
  text: string;
  createdAt: string;
  isMine: boolean;
  status?: MessageStatus;
  readAt?: string | null;
}
