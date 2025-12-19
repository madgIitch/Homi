import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { chatService } from '../services/chatService';
import type { Message } from '../types/chat';
import type { Profile } from '../types/profile';

type RouteParams = {
  chatId: string;
  name: string;
  avatarUrl: string;
  profile?: Profile;
};

export const ChatScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const { chatId, name, avatarUrl, profile } = route.params as RouteParams;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await chatService.getMessages(chatId);
        setMessages(data);
        await chatService.markMessagesAsRead(chatId);
      } catch (error) {
        console.error('Error cargando mensajes:', error);
      }
    };

    void loadMessages();
  }, [chatId]);

  const orderedMessages = useMemo(() => {
    return [...messages];
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setInputValue('');
    try {
      const next = await chatService.sendMessage(chatId, trimmed);
      setMessages((prev) => [...prev, next]);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.isMine;
    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.messageRowMine : styles.messageRowOther,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
          ]}
        >
          <Text style={[styles.bubbleText, { color: '#111827' }]}>
            {item.text}
          </Text>
          <View style={styles.bubbleMeta}>
            <Text style={styles.bubbleTime}>{item.createdAt}</Text>
            {isMine && item.status && (
              <Text style={styles.bubbleStatus}>{statusLabel(item.status)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerProfile}
          onPress={() => {
            if (profile) {
              navigation.navigate('ProfileDetail', { profile });
            }
          }}
          disabled={!profile}
        >
          <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
          <Text style={[styles.headerName, { color: theme.colors.text }]}>
            {name}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={orderedMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
      >
        <View style={styles.inputRow}>
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const statusLabel = (status: Message['status']) => {
  switch (status) {
    case 'delivered':
      return 'Entregado';
    case 'read':
      return 'Leido';
    default:
      return 'Enviado';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 22,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: '#EDE9FE',
    borderTopRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleMeta: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  bubbleTime: {
    fontSize: 10,
    color: '#6B7280',
  },
  bubbleStatus: {
    fontSize: 10,
    color: '#7C3AED',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    fontSize: 14,
    color: '#111827',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
