import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { colors } from '../theme';
import { API_CONFIG } from '../config/api';
import { profilePhotoService } from '../services/profilePhotoService';
import { roomService } from '../services/roomService';
import { roomAssignmentService } from '../services/roomAssignmentService';
import { flatExpenseService } from '../services/flatExpenseService';
import type { Flat } from '../types/room';
import type { FlatExpense, FlatExpenseMember } from '../types/flatExpense';
import { FlatExpensesScreenStyles as styles } from '../styles/screens';

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

const getInitials = (name?: string | null) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join('');
};

const resolveAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
};

export const FlatExpensesScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
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
      const aName = (a.display_name || '').toLowerCase();
      const bName = (b.display_name || '').toLowerCase();
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

  useEffect(() => {
    void loadFlats();
  }, [loadFlats]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

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
    <View style={styles.container}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
        }}
        blurRadius={18}
        style={styles.background}
      >
        <LinearGradient
          colors={[colors.glassOverlay, colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={colors.glassOverlay}
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
        <TouchableOpacity
          style={[styles.headerAction, !selectedFlatId && styles.headerActionDisabled]}
          onPress={openModal}
          disabled={!selectedFlatId}
        >
          <Ionicons name="add" size={18} color="#111827" />
        </TouchableOpacity>
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
            <Ionicons name="home-outline" size={42} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Aun no perteneces a un piso</Text>
            <Text style={styles.emptySubtitle}>
              Esta funcion es solo para miembros de pisos. Cuando tengas un piso
              asignado podras registrar gastos y ver cuentas compartidas.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionCard}>
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

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Mes</Text>
              <View style={styles.monthRow}>
                <TouchableOpacity
                  style={styles.monthButton}
                  onPress={() => shiftMonth(-1)}
                >
                  <Ionicons name="chevron-back" size={18} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>
                  {formatMonthLabel(monthCursor)}
                </Text>
                <TouchableOpacity
                  style={styles.monthButton}
                  onPress={() => shiftMonth(1)}
                >
                  <Ionicons name="chevron-forward" size={18} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Total del mes</Text>
              <Text style={styles.summaryAmount}>
                {totalAmount.toFixed(2)} EUR
              </Text>
              <Text style={styles.summarySubtitle}>
                {expenses.length} gastos registrados
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settlementButton}
              onPress={() =>
                selectedFlatId
                  ? navigation.navigate('FlatSettlement', {
                      flatId: selectedFlatId,
                      month: monthKey,
                    })
                  : undefined
              }
            >
              <Ionicons name="calculator-outline" size={18} color="#1F2937" />
              <Text style={styles.settlementButtonText}>
                Ver cuentas entre companeros
              </Text>
            </TouchableOpacity>

            {loadingExpenses ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Cargando gastos...</Text>
              </View>
            ) : expenses.length === 0 ? (
              <View style={styles.emptyStateInline}>
                <Ionicons name="receipt-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>Sin gastos este mes</Text>
                <Text style={styles.emptySubtitle}>
                  Agrega el primer gasto para empezar el resumen.
                </Text>
                <TouchableOpacity style={styles.addButton} onPress={openModal}>
                  <Text style={styles.addButtonText}>Agregar gasto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.expenseList}>
                {expenses.map((expense) => (
                  <View key={expense.id} style={styles.expenseCard}>
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
                                        {getInitials(member.display_name)}
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
                      {expense.creator?.display_name
                        ? ` - ${expense.creator.display_name}`
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
            colors={[colors.overlayLight, colors.overlay]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.modalContent}>
            <BlurView
              blurType="light"
              blurAmount={14}
              reducedTransparencyFallbackColor={colors.glassUltraLightAlt}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.modalGlassFill} />
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>Nuevo gasto</Text>
              <Text style={styles.modalSubtitle}>
                Completa los datos del gasto.
              </Text>
              <View style={styles.modalHeaderDivider} />
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Tipo de gasto</Text>
                <View style={styles.scopeRow}>
                  <TouchableOpacity
                    style={[
                      styles.scopeChip,
                      expenseScope === 'community' && styles.scopeChipActive,
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
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.scopeChip,
                      expenseScope === 'specific' && styles.scopeChipActive,
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
                  </TouchableOpacity>
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
                            <TouchableOpacity
                              key={member.id}
                              style={[
                                styles.participantChip,
                                isSelected && styles.participantChipActive,
                              ]}
                              onPress={() => toggleParticipant(member.id)}
                            >
                              <Text
                                style={[
                                  styles.participantText,
                                  isSelected && styles.participantTextActive,
                                ]}
                              >
                                {member.display_name || 'Companero'}
                              </Text>
                            </TouchableOpacity>
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
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryChip,
                          isActive && styles.categoryChipActive,
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
                      </TouchableOpacity>
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
                  placeholderTextColor={colors.textTertiary}
                  style={styles.modalInput}
                  editable
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Importe</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Ej: 42.50"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  style={styles.modalInput}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Fecha</Text>
                <TextInput
                  value={expenseDate}
                  onChangeText={setExpenseDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.modalInput}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Nota (opcional)</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Detalles extra"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.modalInput, styles.modalTextArea]}
                  multiline
                />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirm,
                  saving && styles.modalButtonDisabled,
                ]}
                onPress={saveExpense}
                disabled={saving}
              >
                <Text style={styles.modalConfirmText}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

