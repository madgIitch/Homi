import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Keyboard,
  UIManager,
  findNodeHandle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BlurView } from '@react-native-community/blur';
import type { RealtimeChannel } from '@supabase/supabase-js';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { API_CONFIG } from '../config/api';
import { supabaseClient } from '../services/authService';
import { profilePhotoService } from '../services/profilePhotoService';
import { roomService } from '../services/roomService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { flatExpenseService } from '../services/flatExpenseService';
import { expenseGroupService } from '../services/expenseGroupService';
import type { Flat } from '../types/room';
import type { FlatExpense, FlatExpenseMember } from '../types/flatExpense';
import type {
  ExpenseGroup,
  ExpenseGroupMember,
  GroupExpense,
  GroupExpenseParticipantDetail,
} from '../types/expenseGroup';
import { FlatExpensesScreenStyles } from '../styles/screens';
import { getUserInitials, getUserName } from '../utils/name';

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const EXPENSE_CATEGORIES = [
  'Luz',
  'Agua',
  'Gas',
  'Internet',
  'Limpieza',
  'Comunidad',
  'Mantenimiento',
  'Seguro',
  'Basura',
  'Otros',
];

const toMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

const formatMonthLabel = (date: Date) =>
  `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;

const formatDateLabel = (value?: string | null) => {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const parseAmount = (value: string) => Number(value.replace(',', '.'));

const resolveAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
};

type ExpenseItem = FlatExpense | GroupExpense;
type ExpenseMember = FlatExpenseMember | ExpenseGroupMember;

export const FlatExpensesScreen: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => FlatExpensesScreenStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const modalScrollRef = useRef<ScrollView>(null);
  const focusedInputHandle = useRef<number | null>(null);
  const keyboardHeightRef = useRef(0);
  const keyboardTopRef = useRef(Dimensions.get('window').height);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const participantsChannelRef = useRef<RealtimeChannel | null>(null);
  const membersChannelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const modalScrollYRef = useRef(0);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [selectedFlatId, setSelectedFlatId] = useState<string | null>(null);
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [expenseMode, setExpenseMode] = useState<'flat' | 'group'>('flat');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loadingFlats, setLoadingFlats] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [creatingInviteLink, setCreatingInviteLink] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Luz');
  const [expenseScope, setExpenseScope] = useState<'community' | 'specific'>(
    'community'
  );
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(toInputDate(new Date()));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<ExpenseMember[]>([]);
  const [memberPhotosById, setMemberPhotosById] = useState<
    Record<string, string>
  >({});
  const [showMembersModal, setShowMembersModal] = useState(false);

  const scrollToFocusedInput = useCallback(
    (extraOffset?: number) => {
      const scrollNode = modalScrollRef.current;
      const target = focusedInputHandle.current;
      if (!scrollNode || !target) return;

      UIManager.measureInWindow(
        target,
        (_x, y, _width, height) => {
          const windowHeight = Dimensions.get('window').height;
          const keyboardOffset =
            keyboardHeightRef.current > 0
              ? keyboardHeightRef.current * 0.18
              : 0;
          const resolvedOffset =
            extraOffset ??
            Math.round(
              Math.min(80, Math.max(12, windowHeight * 0.035, keyboardOffset))
            );
          const resolvedKeyboardTop =
            keyboardHeightRef.current > 0
              ? keyboardTopRef.current
              : windowHeight;
          const targetBottom = y + height;
          const targetTop = y;

          if (
            keyboardHeightRef.current > 0 &&
            targetBottom > resolvedKeyboardTop - resolvedOffset
          ) {
            const delta = targetBottom - (resolvedKeyboardTop - resolvedOffset);
            scrollNode.scrollTo({
              y: Math.max(0, modalScrollYRef.current + delta),
              animated: true,
            });
            return;
          }

          const safeTop = insets.top + 16;
          if (targetTop < safeTop) {
            const delta = safeTop - targetTop;
            scrollNode.scrollTo({
              y: Math.max(0, modalScrollYRef.current - delta),
              animated: true,
            });
          }
        }
      );
    },
    [insets.top]
  );

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      requestAnimationFrame(() => scrollToFocusedInput());
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeightRef.current = 0;
      keyboardTopRef.current = Dimensions.get('window').height;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollToFocusedInput]);

  const handleInputFocus = useCallback(
    (event: any) => {
      const rawTarget = event?.target ?? event?.nativeEvent?.target;
      let target: number | null = null;

      if (typeof rawTarget === 'number') {
        target = rawTarget;
      } else if (rawTarget) {
        const handle = findNodeHandle(rawTarget as any);
        if (typeof handle === 'number') {
          target = handle;
        }
      }

      if (target != null) {
        focusedInputHandle.current = target;
      }

      setTimeout(() => scrollToFocusedInput(), 50);
    },
    [scrollToFocusedInput]
  );

  const monthKey = useMemo(() => toMonthKey(monthCursor), [monthCursor]);
  const selectedFlat = flats.find((flat) => flat.id === selectedFlatId) ?? null;
  const selectedGroup =
    expenseGroups.find((group) => group.id === selectedGroupId) ?? null;

  const totalAmount = useMemo(
    () =>
      expenses.reduce(
        (acc, item) => acc + (Number(item.amount) || 0),
        0
      ),
    [expenses]
  );
  const isLoadingSelector = expenseMode === 'flat' ? loadingFlats : loadingGroups;
  const orderedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aName = getUserName(a, '').toLowerCase();
      const bName = getUserName(b, '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [members]);
  const membersById = useMemo(() => {
    return new Map(members.map((member) => [member.id, member] as const));
  }, [members]);

  const toggleParticipant = useCallback((memberId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  }, []);

  const loadFlats = useCallback(async () => {
    setLoadingFlats(true);
    try {
      const ownedFlats = await roomService.getMyFlats();
      let assignedFlats: Flat[] = [];

      try {
        const assigned = await roomAssignmentService.getAssignmentsForAssignee();
        assignedFlats = assigned.assignments
          .map((assignment) => assignment.room?.flat)
          .filter((flat): flat is Flat => Boolean(flat && flat.id));
      } catch (error) {
        console.warn('Error cargando pisos asignados:', error);
      }

      const merged = new Map<string, Flat>();
      ownedFlats.forEach((flat) => merged.set(flat.id, flat));
      assignedFlats.forEach((flat) => {
        if (!merged.has(flat.id)) {
          merged.set(flat.id, flat);
        }
      });

      const nextFlats = Array.from(merged.values());
      setFlats(nextFlats);
      setSelectedFlatId((prev) =>
        prev && merged.has(prev) ? prev : nextFlats[0]?.id ?? null
      );
    } catch (error) {
      console.error('Error cargando pisos:', error);
      Alert.alert('Error', 'No se pudieron cargar los pisos');
    } finally {
      setLoadingFlats(false);
    }
  }, []);

  const loadExpenseGroups = useCallback(async (): Promise<ExpenseGroup[]> => {
    setLoadingGroups(true);
    try {
      const groups = await expenseGroupService.getUserGroups();
      setExpenseGroups(groups);
      setSelectedGroupId((prev) =>
        prev && groups.some((group) => group.id === prev)
          ? prev
          : groups[0]?.id ?? null
      );
      return groups;
    } catch (error) {
      console.error('Error cargando grupos:', error);
      Alert.alert('Error', 'No se pudieron cargar los grupos de gastos');
      return [];
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoadingExpenses(true);
    try {
      if (expenseMode === 'flat') {
        if (!selectedFlatId) {
          setExpenses([]);
          setMembers([]);
          return;
        }
        const data = await flatExpenseService.getExpenses(selectedFlatId, monthKey, {
          includeMembers: true,
        });
        setExpenses(data.expenses);
        setMembers(data.members);
      } else {
        if (!selectedGroupId) {
          setExpenses([]);
          setMembers([]);
          return;
        }
        const data = await expenseGroupService.getGroupExpenses(
          selectedGroupId,
          monthKey,
          { includeMembers: true }
        );
        setExpenses(data.expenses);
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Error cargando gastos:', error);
      Alert.alert('Error', 'No se pudieron cargar los gastos');
    } finally {
      setLoadingExpenses(false);
    }
  }, [expenseMode, monthKey, selectedFlatId, selectedGroupId]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      loadExpenses().catch((error) => {
        console.error('Error cargando gastos:', error);
      });
    }, 400);
  }, [loadExpenses]);

  useEffect(() => {
    loadFlats().catch((error) => {
      console.error('Error cargando pisos:', error);
    });
  }, [loadFlats]);

  useEffect(() => {
    loadExpenseGroups().catch((error) => {
      console.error('Error cargando grupos:', error);
    });
  }, [loadExpenseGroups]);

  useFocusEffect(
    useCallback(() => {
      loadExpenseGroups().catch((error) => {
        console.error('Error refrescando grupos:', error);
      });
    }, [loadExpenseGroups])
  );

  useEffect(() => {
    const params = route.params as
      | { initialMode?: string; initialGroupId?: string }
      | undefined;
    if (params?.initialMode !== 'group' || !params.initialGroupId) return;
    setExpenseMode('group');
    loadExpenseGroups()
      .then((groups) => {
        const target = groups.find(
          (group) => group.id === params.initialGroupId
        );
        if (target) {
          setSelectedGroupId(target.id);
        }
      })
      .catch((error) => {
        console.error('Error cargando grupos desde notificacion:', error);
      });
  }, [loadExpenseGroups, route.params]);

  useEffect(() => {
    loadExpenses().catch((error) => {
      console.error('Error cargando gastos:', error);
    });
  }, [loadExpenses]);

  useEffect(() => {
    if (isInitialLoad) {
      if (expenseMode === 'flat' && flats.length === 0 && expenseGroups.length > 0) {
        setExpenseMode('group');
      } else if (expenseMode === 'group' && expenseGroups.length === 0 && flats.length > 0) {
        setExpenseMode('flat');
      }
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, expenseGroups.length, expenseMode, flats.length]);

  useEffect(() => {
    const activeId = expenseMode === 'flat' ? selectedFlatId : selectedGroupId;
    if (!activeId) {
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (participantsChannelRef.current) {
        supabaseClient.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }
      if (membersChannelRef.current) {
        supabaseClient.removeChannel(membersChannelRef.current);
        membersChannelRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const subscribeToExpenses = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const tableName = expenseMode === 'flat' ? 'flat_expenses' : 'group_expenses';
      const filterField = expenseMode === 'flat' ? 'flat_id' : 'group_id';

      const channel = supabaseClient
        .channel(`${tableName}:${activeId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: tableName,
            filter: `${filterField}=eq.${activeId}`,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: tableName,
            filter: `${filterField}=eq.${activeId}`,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: tableName,
            filter: `${filterField}=eq.${activeId}`,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    subscribeToExpenses().catch((error) => {
      console.warn('[FlatExpenses] Error suscribiendo gastos:', error);
    });

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (participantsChannelRef.current) {
        supabaseClient.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }
      if (membersChannelRef.current) {
        supabaseClient.removeChannel(membersChannelRef.current);
        membersChannelRef.current = null;
      }
      if (membersChannelRef.current) {
        supabaseClient.removeChannel(membersChannelRef.current);
        membersChannelRef.current = null;
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [expenseMode, scheduleRefresh, selectedFlatId, selectedGroupId]);

  useEffect(() => {
    const activeId = expenseMode === 'flat' ? selectedFlatId : selectedGroupId;
    if (!activeId || expenses.length === 0) {
      if (participantsChannelRef.current) {
        supabaseClient.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }
      if (membersChannelRef.current) {
        supabaseClient.removeChannel(membersChannelRef.current);
        membersChannelRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const subscribeToParticipants = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (participantsChannelRef.current) {
        supabaseClient.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }

      const expenseIds = expenses.map((expense) => expense.id).filter(Boolean);
      if (expenseIds.length === 0) return;
      const filter = `expense_id=in.(${expenseIds.join(',')})`;
      const tableName =
        expenseMode === 'flat'
          ? 'flat_expense_participants'
          : 'group_expense_participants';

      const channel = supabaseClient
        .channel(`${tableName}:${activeId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: tableName,
            filter,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: tableName,
            filter,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: tableName,
            filter,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .subscribe();

      participantsChannelRef.current = channel;
    };

    subscribeToParticipants().catch((error) => {
      console.warn('[FlatExpenses] Error suscribiendo participantes:', error);
    });

    if (expenseMode === 'group' && selectedGroupId) {
      const subscribeToMembers = async () => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          supabaseClient.realtime.setAuth(token);
        }

        if (membersChannelRef.current) {
          supabaseClient.removeChannel(membersChannelRef.current);
          membersChannelRef.current = null;
        }

        const channel = supabaseClient
          .channel(`expense-group-members:${selectedGroupId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'expense_group_members',
              filter: `group_id=eq.${selectedGroupId}`,
            },
            () => {
              if (!isMounted) return;
              loadExpenseGroups()
                .then(() => loadExpenses())
                .catch((error) => {
                  console.warn('[FlatExpenses] Error refrescando miembros:', error);
                });
            }
          )
          .subscribe();

        membersChannelRef.current = channel;
      };

      subscribeToMembers().catch((error) => {
        console.warn('[FlatExpenses] Error suscribiendo miembros:', error);
      });
    }

    return () => {
      isMounted = false;
      if (participantsChannelRef.current) {
        supabaseClient.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }
      if (membersChannelRef.current) {
        supabaseClient.removeChannel(membersChannelRef.current);
        membersChannelRef.current = null;
      }
    };
  }, [
    expenseMode,
    expenses,
    loadExpenseGroups,
    loadExpenses,
    scheduleRefresh,
    selectedFlatId,
    selectedGroupId,
  ]);

  // Subscribe to expense_group_members for realtime membership updates
  useEffect(() => {
    // Only subscribe in group mode with a selected group
    if (expenseMode !== 'group' || !selectedGroupId) {
      if (membersChannelRef.current) {
        supabaseClient.removeChannel(membersChannelRef.current);
        membersChannelRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const subscribeToMembers = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (membersChannelRef.current) {
        supabaseClient.removeChannel(membersChannelRef.current);
        membersChannelRef.current = null;
      }

      const channel = supabaseClient
        .channel(`expense_group_members:${selectedGroupId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'expense_group_members',
            filter: `group_id=eq.${selectedGroupId}`,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'expense_group_members',
            filter: `group_id=eq.${selectedGroupId}`,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'expense_group_members',
            filter: `group_id=eq.${selectedGroupId}`,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .subscribe();

      membersChannelRef.current = channel;
    };

    subscribeToMembers().catch((error) => {
      console.warn('[FlatExpenses] Error suscribiendo miembros:', error);
    });

    return () => {
      isMounted = false;
      if (membersChannelRef.current) {
        supabaseClient.removeChannel(membersChannelRef.current);
        membersChannelRef.current = null;
      }
    };
  }, [expenseMode, scheduleRefresh, selectedGroupId]);

  useEffect(() => {
    if (members.length === 0) return;
    const missingMembers = members.filter(
      (member) => !memberPhotosById[member.id]
    );
    if (missingMembers.length === 0) return;

    let isActive = true;
    const loadMemberPhotos = async () => {
      await Promise.all(
        missingMembers.map(async (member) => {
          try {
            const photos = await profilePhotoService.getPhotosForProfile(member.id);
            const url =
              photos[0]?.signedUrl ?? resolveAvatarUrl(member.avatar_url);
            if (url && isActive) {
              setMemberPhotosById((prev) =>
                prev[member.id] ? prev : { ...prev, [member.id]: url }
              );
            }
          } catch {
            const url = resolveAvatarUrl(member.avatar_url);
            if (url && isActive) {
              setMemberPhotosById((prev) =>
                prev[member.id] ? prev : { ...prev, [member.id]: url }
              );
            }
          }
        })
      );
    };

    loadMemberPhotos().catch((error) => {
      console.warn('[FlatExpenses] Error cargando fotos:', error);
    });
    return () => {
      isActive = false;
    };
  }, [members, memberPhotosById]);

  const shiftMonth = (delta: number) => {
    setMonthCursor(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  };

  const resetForm = () => {
    setSelectedCategory('Luz');
    setExpenseScope('community');
    setSelectedParticipants([]);
    setConcept('Luz');
    setAmount('');
    setNote('');
    setExpenseDate(toInputDate(new Date()));
  };

  useEffect(() => {
    if (selectedCategory !== 'Otros') {
      setConcept(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (expenseScope === 'community') {
      setSelectedParticipants([]);
    }
  }, [expenseScope]);

  useEffect(() => {
    setSelectedParticipants([]);
  }, [expenseMode, selectedFlatId, selectedGroupId]);

  const openModal = () => {
    if (expenseMode === 'flat' && !selectedFlatId) {
      Alert.alert('Aviso', 'Selecciona un piso primero.');
      return;
    }
    if (expenseMode === 'group' && !selectedGroupId) {
      Alert.alert('Aviso', 'Selecciona un grupo primero.');
      return;
    }
    resetForm();
    focusedInputHandle.current = null;
    modalScrollYRef.current = 0;
    setModalVisible(true);
  };

  const resetGroupForm = () => {
    setNewGroupName('');
    setNewGroupDescription('');
  };

  const handleCreateGroup = async () => {
    const nameValue = newGroupName.trim();
    if (!nameValue) {
      Alert.alert('Falta el nombre', 'Escribe un nombre para el grupo.');
      return;
    }

    try {
      setSaving(true);
      const created = await expenseGroupService.createGroup({
        name: nameValue,
        description: newGroupDescription.trim() || undefined,
      });
      await loadExpenseGroups();
      setSelectedGroupId(created.id);
      setExpenseMode('group');
      setShowCreateGroupModal(false);
      resetGroupForm();
    } catch (error) {
      console.error('Error creando grupo:', error);
      Alert.alert('Error', 'No se pudo crear el grupo.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInviteLink = async () => {
    if (!selectedGroupId) {
      Alert.alert('Aviso', 'Selecciona un grupo primero.');
      return;
    }
    try {
      setCreatingInviteLink(true);
      const { link, code } = await expenseGroupService.createInviteLink(
        selectedGroupId
      );
      Clipboard.setString(link);
      setInviteCode(code);
      setShowInviteCodeModal(true);
    } catch (error) {
      console.error('Error creando link:', error);
      Alert.alert('Error', 'No se pudo generar el link.');
    } finally {
      setCreatingInviteLink(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Introduce un codigo valido');
      return;
    }

    try {
      setJoining(true);
      await expenseGroupService.joinByCode(joinCode.trim());
      await loadExpenseGroups();
      setShowJoinModal(false);
      setJoinCode('');
      Alert.alert('Exito', 'Te has unido al grupo correctamente');
    } catch (error) {
      console.error('Error uniendose al grupo:', error);
      Alert.alert('Error', 'No se pudo unir al grupo. Verifica el codigo.');
    } finally {
      setJoining(false);
    }
  };

  const togglePaymentStatus = async (
    expenseId: string,
    participantId: string,
    isPaid: boolean
  ) => {
    if (expenseMode !== 'group') return;
    try {
      await expenseGroupService.updatePaymentStatus(expenseId, participantId, isPaid);
      await loadExpenses();
    } catch (error) {
      console.error('Error actualizando estado de pago:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado de pago.');
    }
  };

  const saveExpense = async () => {
    if (expenseMode === 'flat' && !selectedFlatId) return;
    if (expenseMode === 'group' && !selectedGroupId) return;
    const trimmedConcept = concept.trim();
    const parsedAmount = parseAmount(amount);

    if (!trimmedConcept) {
      Alert.alert('Falta el concepto', 'Describe el gasto para guardarlo.');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Importe invalido', 'Ingresa un importe valido.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
      Alert.alert('Fecha invalida', 'Usa el formato YYYY-MM-DD.');
      return;
    }

    if (expenseScope === 'specific' && selectedParticipants.length === 0) {
      Alert.alert('Faltan personas', 'Selecciona al menos una persona.');
      return;
    }

    // Validate that selected participants are valid members
    if (expenseScope === 'specific' && selectedParticipants.length > 0) {
      const memberIds = members.map(m => m.id);
      const invalidParticipants = selectedParticipants.filter(id => !memberIds.includes(id));
      if (invalidParticipants.length > 0) {
        Alert.alert('Error', 'Algunos participantes seleccionados no son miembros del grupo.');
        return;
      }
    }

    setSaving(true);
    try {
      if (expenseMode === 'flat') {
        await flatExpenseService.createExpense({
          flat_id: selectedFlatId as string,
          concept: trimmedConcept,
          amount: parsedAmount,
          expense_date: expenseDate,
          note: note.trim() ? note.trim() : undefined,
          participants:
            expenseScope === 'specific' ? selectedParticipants : undefined,
        });
      } else {
        await expenseGroupService.createGroupExpense({
          group_id: selectedGroupId as string,
          concept: trimmedConcept,
          amount: parsedAmount,
          expense_date: expenseDate,
          note: note.trim() ? note.trim() : undefined,
          participants:
            expenseScope === 'specific' ? selectedParticipants : undefined,
        });
      }
      setModalVisible(false);
      resetForm();
      await loadExpenses();
    } catch (error) {
      console.error('Error guardando gasto:', error);
      Alert.alert('Error', 'No se pudo guardar el gasto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceMutedAlt }]}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
        }}
        blurRadius={18}
        style={styles.background}
      >
        <LinearGradient
          colors={[theme.colors.glassOverlay, theme.colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerFill} />
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Gastos compartidos
          </Text>
          {expenseMode === 'flat' && selectedFlat ? (
            <Text style={styles.headerSubtitle}>{selectedFlat.address}</Text>
          ) : null}
          {expenseMode === 'group' && selectedGroup ? (
            <Text style={styles.headerSubtitle}>{selectedGroup.name}</Text>
          ) : null}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.headerAction,
            !(
              expenseMode === 'flat'
                ? selectedFlatId
                : selectedGroupId
            ) && styles.headerActionDisabled,
            pressed &&
              (expenseMode === 'flat'
                ? selectedFlatId
                : selectedGroupId) && { backgroundColor: theme.colors.glassUltraLightAlt },
          ]}
          onPress={openModal}
          disabled={
            expenseMode === 'flat' ? !selectedFlatId : !selectedGroupId
          }
        >
          <Ionicons name="add" size={18} color={theme.colors.text} />
        </Pressable>
        {expenseMode === 'group' && (
          <Pressable
            style={({ pressed }) => [
              styles.headerAction,
              pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
            ]}
            onPress={() => setShowJoinModal(true)}
          >
            <Ionicons name="log-in-outline" size={18} color={theme.colors.text} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110 },
        ]}
      >
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.glassSurface,
              borderColor: theme.colors.glassBorderSoft,
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Vista</Text>
          <View style={styles.modeChips}>
            <Pressable
              style={({ pressed }) => [
                styles.modeChip,
                expenseMode === 'flat' && styles.modeChipActive,
                pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
              ]}
              onPress={() => setExpenseMode('flat')}
            >
              <Text
                style={[
                  styles.modeChipText,
                  expenseMode === 'flat' && styles.modeChipTextActive,
                ]}
              >
                Mis pisos
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modeChip,
                expenseMode === 'group' && styles.modeChipActive,
                pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
              ]}
              onPress={() => setExpenseMode('group')}
            >
              <Text
                style={[
                  styles.modeChipText,
                  expenseMode === 'group' && styles.modeChipTextActive,
                ]}
              >
                Mis grupos
              </Text>
            </Pressable>
          </View>
        </View>

        {isLoadingSelector ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {expenseMode === 'flat' ? 'Cargando pisos...' : 'Cargando grupos...'}
            </Text>
          </View>
        ) : expenseMode === 'flat' ? (
          flats.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={42} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>Aun no perteneces a un piso</Text>
              <Text style={styles.emptySubtitle}>
                Puedes crear un grupo de gastos y empezar a registrar cuentas.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                ]}
                onPress={() => {
                  setExpenseMode('group');
                  setShowCreateGroupModal(true);
                }}
              >
                <Text style={styles.addButtonText}>Crear grupo</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: theme.colors.glassSurface,
                    borderColor: theme.colors.glassBorderSoft,
                  },
                ]}
              >
                <Text style={styles.sectionTitle}>Pisos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.flatChips}>
                    {flats.map((flat) => {
                      const isActive = flat.id === selectedFlatId;
                      return (
                        <TouchableOpacity
                          key={flat.id}
                          style={[styles.flatChip, isActive && styles.flatChipActive]}
                          onPress={() => setSelectedFlatId(flat.id)}
                        >
                          <Text
                            style={[
                              styles.flatChipText,
                              isActive && styles.flatChipTextActive,
                            ]}
                          >
                            {flat.address}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: theme.colors.glassSurface,
                    borderColor: theme.colors.glassBorderSoft,
                  },
                ]}
              >
                <Text style={styles.sectionTitle}>Mes</Text>
                <View style={styles.monthRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.monthButton,
                      pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                    ]}
                    onPress={() => shiftMonth(-1)}
                  >
                    <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
                  </Pressable>
                  <Text style={styles.monthLabel}>
                    {formatMonthLabel(monthCursor)}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.monthButton,
                      pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                    ]}
                    onPress={() => shiftMonth(1)}
                  >
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
                  </Pressable>
                </View>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: theme.colors.glassSurface,
                    borderColor: theme.colors.glassBorderSoft,
                  },
                ]}
              >
                <Text style={styles.summaryTitle}>Total del mes</Text>
                <Text style={styles.summaryAmount}>
                  {totalAmount.toFixed(2)} EUR
                </Text>
                <Text style={styles.summarySubtitle}>
                  {expenses.length} gastos registrados
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.settlementButton,
                  {
                    backgroundColor: theme.colors.surfaceLight,
                    borderColor: theme.colors.border,
                  },
                  pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                ]}
                onPress={() =>
                  selectedFlatId
                    ? navigation.navigate('FlatSettlement', {
                        flatId: selectedFlatId,
                        month: monthKey,
                      })
                    : undefined
                }
              >
                <Ionicons name="calculator-outline" size={18} color={theme.colors.text} />
                <Text style={styles.settlementButtonText}>
                  Ver cuentas entre companeros
                </Text>
              </Pressable>
              {loadingExpenses ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Cargando gastos...</Text>
                </View>
              ) : expenses.length === 0 ? (
                <View style={styles.emptyStateInline}>
                  <Ionicons name="receipt-outline" size={36} color={theme.colors.textTertiary} />
                  <Text style={styles.emptyTitle}>Sin gastos este mes</Text>
                  <Text style={styles.emptySubtitle}>
                    Agrega el primer gasto para empezar el resumen.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.addButton,
                      pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                    ]}
                    onPress={openModal}
                  >
                    <Text style={styles.addButtonText}>Agregar gasto</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.expenseList}>
                  {expenses.map((expense) => (
                    <View
                      key={expense.id}
                      style={[
                        styles.expenseCard,
                        {
                          backgroundColor: theme.colors.glassSurface,
                          borderColor: theme.colors.glassBorderSoft,
                        },
                      ]}
                    >
                      <View style={styles.expenseHeader}>
                        <Text style={styles.expenseTitle}>{expense.concept}</Text>
                        <View style={styles.expenseAside}>
                          <View style={styles.amountBadge}>
                            <Text style={styles.amountBadgeText}>
                              {Number(expense.amount).toFixed(2)} EUR
                            </Text>
                          </View>
                          {(() => {
                            const participantIds =
                              expense.participants && expense.participants.length > 0
                                ? expense.participants
                                : members.map((member) => member.id);
                            const involvedMembers = participantIds
                              .map((id) => membersById.get(id))
                              .filter(
                                (member): member is ExpenseMember => Boolean(member)
                              );
                            if (involvedMembers.length === 0) return null;
                            const visible = involvedMembers.slice(0, 4);
                            const remaining = involvedMembers.length - visible.length;
                            return (
                              <View style={styles.avatarStack}>
                                {visible.map((member, index) => {
                                  const avatarUrl =
                                    memberPhotosById[member.id] ??
                                    resolveAvatarUrl(member.avatar_url);
                                  return (
                                    <View
                                      key={member.id}
                                      style={[
                                        styles.avatarCircle,
                                        index === 0
                                          ? styles.avatarStackFirst
                                          : styles.avatarStackOverlap,
                                      ]}
                                    >
                                      {avatarUrl ? (
                                        <Image
                                          source={{ uri: avatarUrl }}
                                          style={styles.avatarImage}
                                        />
                                      ) : (
                                        <Text style={styles.avatarText}>
                                          {getUserInitials(member, 'U')}
                                        </Text>
                                      )}
                                    </View>
                                  );
                                })}
                                {remaining > 0 ? (
                                  <View style={[styles.avatarCircle, styles.avatarOverflow]}>
                                    <Text style={styles.avatarOverflowText}>+{remaining}</Text>
                                  </View>
                                ) : null}
                              </View>
                            );
                          })()}
                        </View>
                      </View>
                      <Text style={styles.expenseMeta}>
                        {formatDateLabel(expense.expense_date)}
                        {expense.creator
                          ? ` - ${getUserName(expense.creator, 'Companero')}`
                          : ''}
                      </Text>
                      {expense.note ? (
                        <Text style={styles.expenseNote}>{expense.note}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </>
          )
        ) : expenseGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={42} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>Aun no tienes grupos creados</Text>
            <Text style={styles.emptySubtitle}>
              Crea un grupo para registrar gastos compartidos con otras personas.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
              ]}
              onPress={() => setShowCreateGroupModal(true)}
            >
              <Text style={styles.addButtonText}>Crear grupo</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.colors.glassSurface,
                  borderColor: theme.colors.glassBorderSoft,
                },
              ]}
            >
              <Text style={styles.sectionTitle}>Grupos de gastos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.groupChips}>
                  <TouchableOpacity
                    style={styles.newGroupChip}
                    onPress={() => setShowCreateGroupModal(true)}
                  >
                    <Ionicons name="add" size={16} color={theme.colors.primary} />
                    <Text style={styles.newGroupChipText}>Nuevo grupo</Text>
                  </TouchableOpacity>
                  {expenseGroups.map((group) => {
                    const isActive = group.id === selectedGroupId;
                    return (
                      <TouchableOpacity
                        key={group.id}
                        style={[styles.groupChip, isActive && styles.groupChipActive]}
                        onPress={() => setSelectedGroupId(group.id)}
                      >
                        <Text
                          style={[
                            styles.groupChipText,
                            isActive && styles.groupChipTextActive,
                          ]}
                        >
                          {group.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={styles.groupActionsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.inviteLinkButton,
                    pressed && { opacity: 0.9 },
                    (!selectedGroupId || creatingInviteLink) &&
                      styles.inviteLinkButtonDisabled,
                  ]}
                  onPress={handleCreateInviteLink}
                  disabled={!selectedGroupId || creatingInviteLink}
                >
                  <Ionicons
                    name="link-outline"
                    size={16}
                    color={theme.colors.text}
                  />
                  <Text style={styles.inviteLinkText}>
                    {creatingInviteLink ? 'Generando link...' : 'Invitar con link'}
                  </Text>
                </Pressable>
                {selectedGroupId && (
                  <TouchableOpacity
                    style={styles.membersButton}
                    onPress={() => setShowMembersModal(true)}
                  >
                    <Ionicons
                      name="people-outline"
                      size={14}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.membersButtonText}>Miembros</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.colors.glassSurface,
                  borderColor: theme.colors.glassBorderSoft,
                },
              ]}
            >
              <Text style={styles.sectionTitle}>Mes</Text>
              <View style={styles.monthRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.monthButton,
                    pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                  ]}
                  onPress={() => shiftMonth(-1)}
                >
                  <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
                </Pressable>
                <Text style={styles.monthLabel}>
                  {formatMonthLabel(monthCursor)}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.monthButton,
                    pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                  ]}
                  onPress={() => shiftMonth(1)}
                >
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
                </Pressable>
              </View>
            </View>
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: theme.colors.glassSurface,
                  borderColor: theme.colors.glassBorderSoft,
                },
              ]}
            >
              <Text style={styles.summaryTitle}>Total del mes</Text>
              <Text style={styles.summaryAmount}>
                {totalAmount.toFixed(2)} EUR
              </Text>
              <Text style={styles.summarySubtitle}>
                {expenses.length} gastos registrados
              </Text>
            </View>
            {loadingExpenses ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Cargando gastos...</Text>
              </View>
            ) : expenses.length === 0 ? (
              <View style={styles.emptyStateInline}>
                <Ionicons name="receipt-outline" size={36} color={theme.colors.textTertiary} />
                <Text style={styles.emptyTitle}>Sin gastos este mes</Text>
                <Text style={styles.emptySubtitle}>
                  Agrega el primer gasto para empezar el resumen.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.addButton,
                    pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                  ]}
                  onPress={openModal}
                >
                  <Text style={styles.addButtonText}>Agregar gasto</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.expenseList}>
                {expenses.map((expense) => (
                  <View
                    key={expense.id}
                    style={[
                      styles.expenseCard,
                      {
                        backgroundColor: theme.colors.glassSurface,
                        borderColor: theme.colors.glassBorderSoft,
                      },
                    ]}
                  >
                    <View style={styles.expenseHeader}>
                      <Text style={styles.expenseTitle}>{expense.concept}</Text>
                      <View style={styles.expenseAside}>
                        <View style={styles.amountBadge}>
                          <Text style={styles.amountBadgeText}>
                            {Number(expense.amount).toFixed(2)} EUR
                          </Text>
                        </View>
                        {(() => {
                          const participantIds =
                            expense.participants && expense.participants.length > 0
                              ? expense.participants
                              : members.map((member) => member.id);
                          const involvedMembers = participantIds
                            .map((id) => membersById.get(id))
                            .filter(
                              (member): member is ExpenseMember => Boolean(member)
                            );
                          if (involvedMembers.length === 0) return null;
                          const visible = involvedMembers.slice(0, 4);
                          const remaining = involvedMembers.length - visible.length;
                          return (
                            <View style={styles.avatarStack}>
                              {visible.map((member, index) => {
                                const avatarUrl =
                                  memberPhotosById[member.id] ??
                                  resolveAvatarUrl(member.avatar_url);
                                return (
                                  <View
                                    key={member.id}
                                    style={[
                                      styles.avatarCircle,
                                      index === 0
                                        ? styles.avatarStackFirst
                                        : styles.avatarStackOverlap,
                                    ]}
                                  >
                                    {avatarUrl ? (
                                      <Image
                                        source={{ uri: avatarUrl }}
                                        style={styles.avatarImage}
                                      />
                                    ) : (
                                      <Text style={styles.avatarText}>
                                        {getUserInitials(member, 'U')}
                                      </Text>
                                    )}
                                  </View>
                                );
                              })}
                              {remaining > 0 ? (
                                <View style={[styles.avatarCircle, styles.avatarOverflow]}>
                                  <Text style={styles.avatarOverflowText}>+{remaining}</Text>
                                </View>
                              ) : null}
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                    <Text style={styles.expenseMeta}>
                      {formatDateLabel(expense.expense_date)}
                      {expense.creator
                        ? ` - ${getUserName(expense.creator, 'Companero')}`
                        : ''}
                    </Text>
                    {expense.note ? (
                      <Text style={styles.expenseNote}>{expense.note}</Text>
                    ) : null}
                    {(() => {
                      const groupExpense = expense as GroupExpense;
                      const details = groupExpense.participant_details;
                      if (!details || details.length === 0) return null;
                      return (
                        <View style={styles.participantPaymentList}>
                          {details.map((detail) => {
                            const member = membersById.get(detail.user_id);
                            const avatarUrl =
                              memberPhotosById[detail.user_id] ??
                              (member ? resolveAvatarUrl(member.avatar_url) : null);
                            return (
                              <View key={detail.user_id} style={styles.participantPaymentRow}>
                                <View style={styles.participantPaymentInfo}>
                                  {avatarUrl ? (
                                    <Image
                                      source={{ uri: avatarUrl }}
                                      style={styles.participantPaymentAvatar}
                                    />
                                  ) : (
                                    <View style={styles.participantPaymentAvatarPlaceholder}>
                                      <Text style={styles.participantPaymentAvatarText}>
                                        {getUserInitials(member, 'U')}
                                      </Text>
                                    </View>
                                  )}
                                  <View style={styles.participantPaymentDetails}>
                                    <Text style={styles.participantPaymentName}>
                                      {getUserName(member, 'Miembro')}
                                    </Text>
                                    <Text style={styles.participantPaymentShare}>
                                      {detail.share_amount.toFixed(2)} EUR
                                    </Text>
                                  </View>
                                </View>
                                <TouchableOpacity
                                  onPress={() =>
                                    togglePaymentStatus(
                                      expense.id,
                                      detail.user_id,
                                      !detail.is_paid
                                    )
                                  }
                                  style={[
                                    styles.paymentCheckbox,
                                    detail.is_paid && styles.paymentCheckboxPaid,
                                  ]}
                                >
                                  <Ionicons
                                    name={detail.is_paid ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={22}
                                    color={
                                      detail.is_paid
                                        ? theme.colors.success
                                        : theme.colors.textSecondary
                                    }
                                  />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })()}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal transparent animationType="slide" visible={showCreateGroupModal}>
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={[theme.colors.overlayLight, theme.colors.overlay]}
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowCreateGroupModal(false)}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.glassUltraLightAlt,
                borderColor: theme.colors.glassBorderSoft,
              },
            ]}
          >
            <BlurView
              blurType="light"
              blurAmount={14}
              reducedTransparencyFallbackColor={theme.colors.glassUltraLightAlt}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.modalGlassFill} />
            <ScrollView
              ref={modalScrollRef}
              contentContainerStyle={[
                styles.modalScroll,
                { paddingBottom: insets.bottom + keyboardHeight + 24 },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScroll={(event) => {
                modalScrollYRef.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            >
              <Text style={styles.modalTitle}>Crear grupo de gastos</Text>
              <Text style={styles.modalSubtitle}>
                Organiza gastos con quienes quieras, sin depender de un piso.
              </Text>
              <View style={styles.modalHeaderDivider} />
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Nombre del grupo</Text>
                <TextInput
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder="Ej: Viaje Lisboa"
                  placeholderTextColor={theme.colors.textTertiary}
                  style={[
                    styles.modalInput,
                    {
                      borderColor: theme.colors.glassBorderSoft,
                      backgroundColor: theme.colors.glassSurface,
                      color: theme.colors.text,
                    },
                  ]}
                  onFocus={handleInputFocus}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Descripcion (opcional)</Text>
                <TextInput
                  value={newGroupDescription}
                  onChangeText={setNewGroupDescription}
                  placeholder="Agrega contexto para tu grupo"
                  placeholderTextColor={theme.colors.textTertiary}
                  style={[
                    styles.modalInput,
                    styles.modalTextArea,
                    {
                      borderColor: theme.colors.glassBorderSoft,
                      backgroundColor: theme.colors.glassSurface,
                      color: theme.colors.text,
                    },
                  ]}
                  onFocus={handleInputFocus}
                  multiline
                />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancel,
                  pressed && !saving && { backgroundColor: theme.colors.glassUltraLightAlt },
                ]}
                onPress={() => {
                  setShowCreateGroupModal(false);
                  resetGroupForm();
                }}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalConfirm,
                  saving && styles.modalButtonDisabled,
                  pressed && !saving && { opacity: 0.9 },
                ]}
                onPress={handleCreateGroup}
                disabled={saving}
              >
                <Text style={styles.modalConfirmText}>
                  {saving ? 'Creando...' : 'Crear grupo'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={showInviteCodeModal}>
        <View style={styles.modalOverlay}>
          <BlurView
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor={theme.colors.glassUltraLightAlt}
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowInviteCodeModal(false)}
          />
          <View
            style={[
              styles.inviteCodeModal,
              {
                backgroundColor: theme.colors.glassUltraLightAlt,
                borderColor: theme.colors.glassBorderSoft,
              },
            ]}
          >
            <Text style={styles.modalTitle}>Codigo de invitacion</Text>
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{inviteCode}</Text>
              <TouchableOpacity
                style={styles.copyCodeButton}
                onPress={() => {
                  Clipboard.setString(inviteCode);
                  Alert.alert('Copiado', 'Codigo copiado al portapapeles');
                }}
              >
                <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.codeSubtitle}>Comparte este codigo o el link</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalConfirm]}
              onPress={() => setShowInviteCodeModal(false)}
            >
              <Text style={styles.modalConfirmText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={showJoinModal}>
        <View style={styles.modalOverlay}>
          <BlurView
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor={theme.colors.glassUltraLightAlt}
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowJoinModal(false)}
          />
          <View
            style={[
              styles.joinCodeModal,
              {
                backgroundColor: theme.colors.glassUltraLightAlt,
                borderColor: theme.colors.glassBorderSoft,
              },
            ]}
          >
            <Text style={styles.modalTitle}>Unirse a grupo</Text>
            <Text style={styles.modalSubtitle}>Introduce el codigo de invitacion</Text>
            <TextInput
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="Codigo de invitacion"
              placeholderTextColor={theme.colors.textTertiary}
              style={[
                styles.modalInput,
                {
                  borderColor: theme.colors.glassBorderSoft,
                  backgroundColor: theme.colors.glassSurface,
                  color: theme.colors.text,
                },
              ]}
              autoCapitalize="characters"
              textAlign="center"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                }}
                disabled={joining}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirm,
                  joining && styles.modalButtonDisabled,
                ]}
                onPress={handleJoinByCode}
                disabled={joining || !joinCode.trim()}
              >
                <Text style={styles.modalConfirmText}>
                  {joining ? 'Uniendose...' : 'Unirse'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={[theme.colors.overlayLight, theme.colors.overlay]}
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setModalVisible(false)}
          />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.glassUltraLightAlt,
                borderColor: theme.colors.glassBorderSoft,
              },
            ]}
          >
            <BlurView
              blurType="light"
              blurAmount={14}
              reducedTransparencyFallbackColor={theme.colors.glassUltraLightAlt}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.modalGlassFill} />
            <ScrollView
              ref={modalScrollRef}
              contentContainerStyle={[
                styles.modalScroll,
                { paddingBottom: insets.bottom + keyboardHeight + 24 },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScroll={(event) => {
                modalScrollYRef.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            >
              <Text style={styles.modalTitle}>Nuevo gasto</Text>
              <Text style={styles.modalSubtitle}>
                Completa los datos del gasto.
              </Text>
              <View style={styles.modalHeaderDivider} />
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Tipo de gasto</Text>
                <View style={styles.scopeRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.scopeChip,
                      expenseScope === 'community' && styles.scopeChipActive,
                      pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                    ]}
                    onPress={() => setExpenseScope('community')}
                  >
                    <Text
                      style={[
                        styles.scopeText,
                        expenseScope === 'community' && styles.scopeTextActive,
                      ]}
                    >
                      Comunitario
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.scopeChip,
                      expenseScope === 'specific' && styles.scopeChipActive,
                      pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                    ]}
                    onPress={() => setExpenseScope('specific')}
                  >
                    <Text
                      style={[
                        styles.scopeText,
                        expenseScope === 'specific' && styles.scopeTextActive,
                      ]}
                    >
                      Personas concretas
                    </Text>
                  </Pressable>
                </View>
                {expenseScope === 'specific' && (
                  <>
                    {orderedMembers.length === 0 ? (
                      <Text style={styles.participantsEmpty}>
                        {expenseMode === 'flat'
                          ? 'No hay personas disponibles en este piso.'
                          : 'No hay personas disponibles en este grupo.'}
                      </Text>
                    ) : (
                      <View style={styles.participantsGrid}>
                        {orderedMembers.map((member) => {
                          const isSelected = selectedParticipants.includes(member.id);
                          return (
                            <Pressable
                              key={member.id}
                              style={({ pressed }) => [
                                styles.participantChip,
                                isSelected && styles.participantChipActive,
                                pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                              ]}
                              onPress={() => toggleParticipant(member.id)}
                            >
                              <Text
                                style={[
                                  styles.participantText,
                                  isSelected && styles.participantTextActive,
                                ]}
                              >
                                {getUserName(member, 'Companero')}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                    {orderedMembers.length > 0 &&
                    selectedParticipants.length === 0 ? (
                      <Text style={styles.participantsHint}>
                        Selecciona al menos una persona.
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Categoria</Text>
                <View style={styles.categoryGrid}>
                  {EXPENSE_CATEGORIES.map((category) => {
                    const isActive = selectedCategory === category;
                    return (
                      <Pressable
                        key={category}
                        style={({ pressed }) => [
                          styles.categoryChip,
                          isActive && styles.categoryChipActive,
                          pressed && { backgroundColor: theme.colors.glassUltraLightAlt },
                        ]}
                        onPress={() => setSelectedCategory(category)}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            isActive && styles.categoryTextActive,
                          ]}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Concepto</Text>
                <TextInput
                  value={concept}
                  onChangeText={setConcept}
                  placeholder="Ej: Luz, internet"
                  placeholderTextColor={theme.colors.textTertiary}
                  style={[
                    styles.modalInput,
                    {
                      borderColor: theme.colors.glassBorderSoft,
                      backgroundColor: theme.colors.glassSurface,
                      color: theme.colors.text,
                    },
                  ]}
                  onFocus={handleInputFocus}
                  editable
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Importe</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Ej: 42.50"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="decimal-pad"
                  style={[
                    styles.modalInput,
                    {
                      borderColor: theme.colors.glassBorderSoft,
                      backgroundColor: theme.colors.glassSurface,
                      color: theme.colors.text,
                    },
                  ]}
                  onFocus={handleInputFocus}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Fecha</Text>
                <TextInput
                  value={expenseDate}
                  onChangeText={setExpenseDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textTertiary}
                  style={[
                    styles.modalInput,
                    {
                      borderColor: theme.colors.glassBorderSoft,
                      backgroundColor: theme.colors.glassSurface,
                      color: theme.colors.text,
                    },
                  ]}
                  onFocus={handleInputFocus}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Nota (opcional)</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Detalles extra"
                  placeholderTextColor={theme.colors.textTertiary}
                  style={[
                    styles.modalInput,
                    styles.modalTextArea,
                    {
                      borderColor: theme.colors.glassBorderSoft,
                      backgroundColor: theme.colors.glassSurface,
                      color: theme.colors.text,
                    },
                  ]}
                  onFocus={handleInputFocus}
                  multiline
                />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancel,
                  pressed && !saving && { backgroundColor: theme.colors.glassUltraLightAlt },
                ]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalConfirm,
                  saving && styles.modalButtonDisabled,
                  pressed && !saving && { opacity: 0.9 },
                ]}
                onPress={saveExpense}
                disabled={saving}
              >
                <Text style={styles.modalConfirmText}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={showMembersModal}>
        <View style={styles.membersModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowMembersModal(false)}
          />
          <View
            style={[
              styles.membersModalContent,
              {
                backgroundColor: theme.colors.glassUltraLightAlt,
                borderColor: theme.colors.glassBorderSoft,
              },
            ]}
          >
            <View style={styles.membersModalHeader}>
              <Text style={[styles.membersModalTitle, { color: theme.colors.text }]}>
                Miembros
              </Text>
              <Pressable
                style={styles.membersModalClose}
                onPress={() => setShowMembersModal(false)}
              >
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.membersModalScroll}
              showsVerticalScrollIndicator={false}
            >
              {members.length === 0 ? (
                <View style={styles.emptyMembersState}>
                  <Ionicons name="people-outline" size={32} color={theme.colors.textTertiary} />
                  <Text style={[styles.emptyMembersText, { color: theme.colors.textSecondary }]}>
                    No hay miembros en este grupo todavia
                  </Text>
                </View>
              ) : (
                orderedMembers.map((member) => {
                  const avatarUrl =
                    memberPhotosById[member.id] ??
                    resolveAvatarUrl(member.avatar_url);
                  return (
                    <View
                      key={member.id}
                      style={[
                        styles.memberModalCard,
                        {
                          backgroundColor: theme.colors.glassSurface,
                          borderColor: theme.colors.glassBorderSoft,
                        },
                      ]}
                    >
                      <View style={styles.memberModalAvatar}>
                        {avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            style={styles.memberModalAvatarImage}
                          />
                        ) : (
                          <Text style={[styles.memberModalAvatarText, { color: theme.colors.textMuted }]}>
                            {getUserInitials(member, 'U')}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[styles.memberModalName, { color: theme.colors.text }]}
                        numberOfLines={1}
                      >
                        {getUserName(member, 'Miembro')}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

