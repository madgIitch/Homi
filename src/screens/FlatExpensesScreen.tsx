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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BlurView } from '@react-native-community/blur';
import type { RealtimeChannel } from '@supabase/supabase-js';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { colors } from '../theme';
import { API_CONFIG } from '../config/api';
import { supabaseClient } from '../services/authService';
import { profilePhotoService } from '../services/profilePhotoService';
import { roomService } from '../services/roomService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { flatExpenseService } from '../services/flatExpenseService';
import type { Flat } from '../types/room';
import type { FlatExpense, FlatExpenseMember } from '../types/flatExpense';
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

export const FlatExpensesScreen: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => FlatExpensesScreenStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const modalScrollRef = useRef<ScrollView>(null);
  const focusedInputHandle = useRef<number | null>(null);
  const keyboardHeightRef = useRef(0);
  const keyboardTopRef = useRef(Dimensions.get('window').height);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const participantsChannelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const modalScrollYRef = useRef(0);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [selectedFlatId, setSelectedFlatId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<FlatExpense[]>([]);
  const [loadingFlats, setLoadingFlats] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [modalVisible, setModalVisible] = useState(false);
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
  const [members, setMembers] = useState<FlatExpenseMember[]>([]);
  const [memberPhotosById, setMemberPhotosById] = useState<
    Record<string, string>
  >({});

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

  const totalAmount = useMemo(
    () =>
      expenses.reduce(
        (acc, item) => acc + (Number(item.amount) || 0),
        0
      ),
    [expenses]
  );
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

  const loadExpenses = useCallback(async () => {
    if (!selectedFlatId) {
      setExpenses([]);
      setMembers([]);
      return;
    }

    setLoadingExpenses(true);
    try {
      const data = await flatExpenseService.getExpenses(selectedFlatId, monthKey, {
        includeMembers: true,
      });
      setExpenses(data.expenses);
      setMembers(data.members);
    } catch (error) {
      console.error('Error cargando gastos:', error);
      Alert.alert('Error', 'No se pudieron cargar los gastos');
    } finally {
      setLoadingExpenses(false);
    }
  }, [monthKey, selectedFlatId]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      void loadExpenses();
    }, 400);
  }, [loadExpenses]);

  useEffect(() => {
    void loadFlats();
  }, [loadFlats]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    if (!selectedFlatId) {
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (participantsChannelRef.current) {
        supabaseClient.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
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

      const channel = supabaseClient
        .channel(`flat-expenses:${selectedFlatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'flat_expenses',
            filter: `flat_id=eq.${selectedFlatId}`,
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
            table: 'flat_expenses',
            filter: `flat_id=eq.${selectedFlatId}`,
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
            table: 'flat_expenses',
            filter: `flat_id=eq.${selectedFlatId}`,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    void subscribeToExpenses();

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
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [scheduleRefresh, selectedFlatId]);

  useEffect(() => {
    if (!selectedFlatId || expenses.length === 0) {
      if (participantsChannelRef.current) {
        supabaseClient.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
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

      const channel = supabaseClient
        .channel(`flat-expense-participants:${selectedFlatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'flat_expense_participants',
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
            table: 'flat_expense_participants',
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
            table: 'flat_expense_participants',
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

    void subscribeToParticipants();

    return () => {
      isMounted = false;
      if (participantsChannelRef.current) {
        supabaseClient.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }
    };
  }, [expenses, scheduleRefresh, selectedFlatId]);

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
          } catch (error) {
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

    loadMemberPhotos().catch(() => undefined);
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

  const openModal = () => {
    if (!selectedFlatId) {
      Alert.alert('Aviso', 'Selecciona un piso primero.');
      return;
    }
    resetForm();
    focusedInputHandle.current = null;
    modalScrollYRef.current = 0;
    setModalVisible(true);
  };

  const saveExpense = async () => {
    if (!selectedFlatId) return;
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

    setSaving(true);
    try {
      await flatExpenseService.createExpense({
        flat_id: selectedFlatId,
        concept: trimmedConcept,
        amount: parsedAmount,
        expense_date: expenseDate,
        note: note.trim() ? note.trim() : undefined,
        participants: expenseScope === 'specific' ? selectedParticipants : undefined,
      });
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
            Gastos del piso
          </Text>
          {selectedFlat ? (
            <Text style={styles.headerSubtitle}>{selectedFlat.address}</Text>
          ) : null}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.headerAction,
            !selectedFlatId && styles.headerActionDisabled,
            pressed && selectedFlatId && { backgroundColor: theme.colors.glassUltraLightAlt },
          ]}
          onPress={openModal}
          disabled={!selectedFlatId}
        >
          <Ionicons name="add" size={18} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110 },
        ]}
      >
        {loadingFlats ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Cargando pisos...</Text>
          </View>
        ) : flats.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={42} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>Aun no perteneces a un piso</Text>
            <Text style={styles.emptySubtitle}>
              Esta funcion es solo para miembros de pisos. Cuando tengas un piso
              asignado podras registrar gastos y ver cuentas compartidas.
            </Text>
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
                              (member): member is FlatExpenseMember => Boolean(member)
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
                                      { marginLeft: index === 0 ? 0 : -6 },
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
        )}
      </ScrollView>

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
                        No hay personas disponibles en este piso.
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
    </View>
  );
};

