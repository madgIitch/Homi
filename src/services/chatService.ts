import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import { authService } from './authService';
import type { Chat, Match, Message, MessageStatus } from '../types/chat';

type ApiProfile = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

type ApiMatch = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  matched_at?: string;
  user_a?: ApiProfile;
  user_b?: ApiProfile;
};

type ApiChat = {
  id: string;
  match_id: string;
  created_at: string;
  updated_at: string;
  match?: ApiMatch;
};

type ApiMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80';

const MATCHES_ENDPOINT = `${API_CONFIG.FUNCTIONS_URL}/matches`;
const CHATS_ENDPOINT = `${API_CONFIG.FUNCTIONS_URL}/chats`;

const resolveAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return FALLBACK_AVATAR;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
};

const formatTime = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

class ChatService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async getCurrentUserId(): Promise<string | null> {
    const stored = await AsyncStorage.getItem('authUser');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as { id?: string };
      return parsed.id ?? null;
    } catch {
      return null;
    }
  }

  private async fetchWithAuth(input: RequestInfo, init: RequestInit) {
    let headers = await this.getAuthHeaders();
    const tryFetch = () => fetch(input, { ...init, headers });
    let response = await tryFetch();

    if (response.status === 401) {
      const newToken = await authService.refreshToken();
      if (newToken) {
        headers = await this.getAuthHeaders();
        response = await tryFetch();
      }
    }

    return response;
  }

  async getMatches(): Promise<Match[]> {
    const response = await this.fetchWithAuth(MATCHES_ENDPOINT, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener matches');
    }

    const payload = (await response.json()) as ApiResponse<ApiMatch[]>;
    const data = payload.data ?? [];
    const currentUserId = await this.getCurrentUserId();

    return data.map((match) => {
      const isUserA = currentUserId && match.user_a_id === currentUserId;
      const otherProfile = isUserA ? match.user_b : match.user_a;
      return {
        id: match.id,
        profileId: otherProfile?.id ?? '',
        name: otherProfile?.display_name ?? 'Usuario',
        avatarUrl: resolveAvatarUrl(otherProfile?.avatar_url ?? undefined),
      };
    });
  }

  async getChats(): Promise<Chat[]> {
    const response = await this.fetchWithAuth(CHATS_ENDPOINT, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener chats');
    }

    const payload = (await response.json()) as ApiResponse<ApiChat[]>;
    const data = payload.data ?? [];
    const currentUserId = await this.getCurrentUserId();

    const chatsWithMessages = await Promise.all(
      data.map(async (chat) => {
        const messages = await this.getMessages(chat.id);
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(
          (message) => !message.isMine && !message.readAt
        ).length;

        const isUserA =
          currentUserId && chat.match?.user_a_id === currentUserId;
        const otherProfile = isUserA
          ? chat.match?.user_b
          : chat.match?.user_a;

        return {
          id: chat.id,
          matchId: chat.match_id,
          name: otherProfile?.display_name ?? 'Usuario',
          avatarUrl: resolveAvatarUrl(otherProfile?.avatar_url ?? undefined),
          lastMessage: lastMessage?.text ?? '',
          lastMessageAt: lastMessage?.createdAt ?? formatTime(chat.updated_at),
          unreadCount,
        };
      })
    );

    return chatsWithMessages;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    const response = await this.fetchWithAuth(
      `${CHATS_ENDPOINT}?chat_id=${chatId}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener mensajes');
    }

    const payload = (await response.json()) as ApiResponse<ApiMessage[]>;
    const data = payload.data ?? [];
    const currentUserId = await this.getCurrentUserId();

    return data.map((message) => {
      const isMine = currentUserId === message.sender_id;
      const status: MessageStatus | undefined = isMine
        ? message.read_at
          ? 'read'
          : 'sent'
        : undefined;

      return {
        id: message.id,
        chatId: message.chat_id,
        text: message.body,
        createdAt: formatTime(message.created_at),
        isMine,
        status,
        readAt: message.read_at ?? null,
      };
    });
  }

  async sendMessage(chatId: string, text: string): Promise<Message> {
    const response = await this.fetchWithAuth(
      `${CHATS_ENDPOINT}?type=message`,
      {
        method: 'POST',
        body: JSON.stringify({ chat_id: chatId, body: text }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al enviar mensaje');
    }

    const payload = (await response.json()) as ApiResponse<ApiMessage>;
    const message = payload.data;
    if (!message) {
      throw new Error('Respuesta invalida al enviar mensaje');
    }

    const currentUserId = await this.getCurrentUserId();
    const isMine = currentUserId === message.sender_id;

    return {
      id: message.id,
      chatId: message.chat_id,
      text: message.body,
      createdAt: formatTime(message.created_at),
      isMine,
      status: isMine ? 'sent' : undefined,
      readAt: message.read_at ?? null,
    };
  }

  async markMessagesAsRead(chatId: string): Promise<void> {
    const response = await this.fetchWithAuth(
      `${CHATS_ENDPOINT}?chat_id=${chatId}`,
      { method: 'PATCH' }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al marcar mensajes como leidos');
    }
  }
}

export const chatService = new ChatService();
