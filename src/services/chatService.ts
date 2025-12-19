import type { Chat, Match, Message } from '../types/chat';

const matches: Match[] = [
  {
    id: 'match-1',
    profileId: 'profile-1',
    name: 'Clara',
    avatarUrl:
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'match-2',
    profileId: 'profile-2',
    name: 'Mario',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'match-3',
    profileId: 'profile-3',
    name: 'Sofia',
    avatarUrl:
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=70',
  },
];

const chats: Chat[] = [
  {
    id: 'chat-1',
    matchId: 'match-1',
    name: 'Clara',
    avatarUrl:
      'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80',
    lastMessage: 'Genial, hablamos luego!',
    lastMessageAt: '14:32',
    unreadCount: 2,
  },
  {
    id: 'chat-2',
    matchId: 'match-2',
    name: 'Mario',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    lastMessage: 'Vale, gracias!',
    lastMessageAt: '11:05',
    unreadCount: 0,
  },
];

const messagesByChatId: Record<string, Message[]> = {
  'chat-1': [
    {
      id: 'msg-1',
      chatId: 'chat-1',
      text: 'Hola! te gusta la zona de Triana?',
      createdAt: '10:21',
      isMine: false,
    },
    {
      id: 'msg-2',
      chatId: 'chat-1',
      text: 'Si, me queda cerca del trabajo.',
      createdAt: '10:22',
      isMine: true,
      status: 'read',
    },
    {
      id: 'msg-3',
      chatId: 'chat-1',
      text: 'Genial, hablamos luego!',
      createdAt: '14:32',
      isMine: false,
    },
  ],
  'chat-2': [
    {
      id: 'msg-4',
      chatId: 'chat-2',
      text: 'Que presupuesto manejas?',
      createdAt: '09:10',
      isMine: false,
    },
    {
      id: 'msg-5',
      chatId: 'chat-2',
      text: 'Entre 350 y 450, mas o menos.',
      createdAt: '09:12',
      isMine: true,
      status: 'delivered',
    },
    {
      id: 'msg-6',
      chatId: 'chat-2',
      text: 'Vale, gracias!',
      createdAt: '11:05',
      isMine: false,
    },
  ],
};

class ChatService {
  async getMatches(): Promise<Match[]> {
    return matches;
  }

  async getChats(): Promise<Chat[]> {
    return chats;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    return messagesByChatId[chatId] ?? [];
  }

  async sendMessage(chatId: string, text: string): Promise<Message> {
    const message: Message = {
      id: `msg-${Date.now()}`,
      chatId,
      text,
      createdAt: new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isMine: true,
      status: 'sent',
    };

    if (!messagesByChatId[chatId]) {
      messagesByChatId[chatId] = [];
    }
    messagesByChatId[chatId].push(message);
    return message;
  }
}

export const chatService = new ChatService();
