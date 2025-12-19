export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Match {
  id: string;
  profileId: string;
  name: string;
  avatarUrl: string;
}

export interface Chat {
  id: string;
  matchId: string;
  name: string;
  avatarUrl: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  chatId: string;
  text: string;
  createdAt: string;
  isMine: boolean;
  status?: MessageStatus;
}
