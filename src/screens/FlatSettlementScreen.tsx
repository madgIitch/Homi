import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BlurView } from '@react-native-community/blur';
import type { RealtimeChannel } from '@supabase/supabase-js';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemeController } from '../theme/ThemeContext';
import { supabaseClient } from '../services/authService';
import { flatSettlementService } from '../services/flatSettlementService';
import type { FlatSettlementSummary } from '../types/flatSettlement';
import { FlatSettlementScreenStyles } from '../styles/screens';
import { getUserName } from '../utils/name';

type RouteParams = {
  flatId?: string;
  month?: string;
};

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

const formatMonthLabel = (value?: string | null) => {
  if (!value) return null;
  const parts = value.split('-');
  if (parts.length !== 2) return value;
  const monthIndex = Number(parts[1]) - 1;
  if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value;
  }
  return `${MONTH_LABELS[monthIndex]} ${parts[0]}`;
};

export const FlatSettlementScreen: React.FC = () => {
  const theme = useTheme();
  const { isDark } = useThemeController();
  const styles = useMemo(() => FlatSettlementScreenStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const { flatId, month } = (route.params ?? {}) as RouteParams;
  const isMountedRef = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [summary, setSummary] = useState<FlatSettlementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingTransfer, setUpdatingTransfer] = useState<string | null>(null);
  const headerSubtitle = useMemo(() => {
    if (!summary) return formatMonthLabel(month) ?? null;
    const addressParts = [
      summary.flat_address ?? null,
      summary.flat_district ? ` - ${summary.flat_district}` : null,
    ].filter((item): item is string => Boolean(item));
    const addressLine = addressParts.join('');
    const monthLabel = formatMonthLabel(summary.month);
    if (addressLine && monthLabel) {
      return `${addressLine} - ${monthLabel}`;
    }
    return addressLine || monthLabel || null;
  }, [month, summary]);
  const updateTransferPaid = useCallback(
    async (
      transferKey: string,
      payload: { from_id: string; to_id: string; amount: number; paid: boolean }
    ) => {
      if (!summary?.flat_id || !summary.month) return;
      try {
        setUpdatingTransfer(transferKey);
        await flatSettlementService.setTransferPaid({
          flat_id: summary.flat_id,
          month: summary.month,
          from_id: payload.from_id,
          to_id: payload.to_id,
          amount: payload.amount,
          paid: payload.paid,
        });
        setSummary((prev) => {
          if (!prev) return prev;
          const payments = prev.payments ?? [];
          const matchesPayment = (payment: {
            from_id: string;
            to_id: string;
            amount: number;
          }) =>
            payment.from_id === payload.from_id &&
            payment.to_id === payload.to_id &&
            Math.abs(payment.amount - payload.amount) < 0.01;
          const nextPayments = payload.paid
            ? payments.some(matchesPayment)
              ? payments
              : [
                  ...payments,
                  {
                    from_id: payload.from_id,
                    to_id: payload.to_id,
                    amount: payload.amount,
                  },
                ]
            : payments.filter((payment) => !matchesPayment(payment));
          return {
            ...prev,
            transfers: prev.transfers.map((transfer, index) => {
              const key = `${transfer.from_id}-${transfer.to_id}-${transfer.amount}-${index}`;
              if (key !== transferKey) return transfer;
              return { ...transfer, paid: payload.paid };
            }),
            payments: nextPayments,
          };
        });
      } catch (error) {
        console.error('Error actualizando pago:', error);
      } finally {
        setUpdatingTransfer(null);
      }
    },
    [summary]
  );
  const loadSummary = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!flatId) {
        setErrorMessage('No se encontro el piso.');
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
      }
      setErrorMessage(null);
      try {
        const data = await flatSettlementService.getSettlement(flatId, month);
        if (isMountedRef.current) {
          setSummary(data);
        }
      } catch (error) {
        console.error('Error cargando cuentas:', error);
        if (isMountedRef.current) {
          setErrorMessage('No se pudieron cargar las cuentas.');
        }
      } finally {
        if (isMountedRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [flatId, month]
  );

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      loadSummary({ silent: true }).catch(() => undefined);
    }, 400);
  }, [loadSummary]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadSummary().catch(() => undefined);
  }, [loadSummary]);

  useEffect(() => {
    if (!flatId) return;
    let isMounted = true;

    const subscribeToPayments = async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        supabaseClient.realtime.setAuth(token);
      }

      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const filter = month
        ? `flat_id=eq.${flatId},month=eq.${month}`
        : `flat_id=eq.${flatId}`;

      const channel = supabaseClient
        .channel(`flat-settlements:${flatId}:${month ?? 'all'}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'flat_settlement_payments',
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
            table: 'flat_settlement_payments',
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
            table: 'flat_settlement_payments',
            filter,
          },
          () => {
            if (!isMounted) return;
            scheduleRefresh();
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    subscribeToPayments().catch(() => undefined);

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [flatId, month, scheduleRefresh]);
  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    summary?.members.forEach((member) => {
      map.set(member.id, getUserName(member, 'Companero'));
    });
    return map;
  }, [summary]);

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
          colors={[theme.colors.glassOverlay, theme.colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BlurView
          blurType={isDark ? 'dark' : 'light'}
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerFill} />
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textStrong} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Cuentas entre companeros
          </Text>
          {headerSubtitle ? (
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Calculando cuentas...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.body}>
            <Ionicons name="alert-circle-outline" size={40} color={theme.colors.textTertiary} />
            <Text style={styles.title}>{errorMessage}</Text>
          </View>
        ) : summary ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total del mes</Text>
              <Text style={styles.summaryValue}>
                {summary.total.toFixed(2)} EUR
              </Text>
              <Text style={styles.summaryMeta}>
                {summary.member_count} companeros - {summary.per_member.toFixed(2)} EUR c/u
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Aportaciones</Text>
              {summary.members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {getUserName(member, 'Companero')}
                    </Text>
                    <Text style={styles.memberMeta}>
                      Pagado: {member.paid.toFixed(2)} EUR
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.memberBalanceChip,
                      member.balance >= 0 && styles.memberBalancePositive,
                      member.balance < 0 && styles.memberBalanceNegative,
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberBalanceText,
                        member.balance >= 0 && styles.memberBalancePositiveText,
                        member.balance < 0 && styles.memberBalanceNegativeText,
                      ]}
                    >
                      {member.balance >= 0 ? '+' : ''}
                      {member.balance.toFixed(2)} EUR
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Sugerencias de pago</Text>
              {summary.transfers.length === 0 ? (
                <Text style={styles.emptyText}>
                  Todos estan equilibrados.
                </Text>
              ) : (
                summary.transfers.map((transfer, index) => {
                  const transferKey = `${transfer.from_id}-${transfer.to_id}-${transfer.amount}-${index}`;
                  const isPaid = transfer.paid ?? false;
                  return (
                    <View
                      key={transferKey}
                      style={styles.transferRow}
                    >
                      <Ionicons name="swap-horizontal" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.transferText}>
                        {memberNameById.get(transfer.from_id) ?? 'Companero'} paga a{' '}
                        {memberNameById.get(transfer.to_id) ?? 'Companero'}{' '}
                        {transfer.amount.toFixed(2)} EUR
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.transferAction,
                          isPaid && styles.transferActionDone,
                        ]}
                        onPress={() =>
                          updateTransferPaid(transferKey, {
                            from_id: transfer.from_id,
                            to_id: transfer.to_id,
                            amount: transfer.amount,
                            paid: !isPaid,
                          })
                        }
                        disabled={updatingTransfer === transferKey}
                      >
                        <Ionicons
                          name={isPaid ? 'checkmark-circle' : 'checkmark'}
                          size={16}
                          color={isPaid ? theme.colors.successDark : theme.colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.transferActionText,
                            isPaid && styles.transferActionTextDone,
                          ]}
                        >
                          Pago hecho
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Historico de pagos</Text>
              {summary.payments.length === 0 ? (
                <Text style={styles.emptyText}>
                  Aun no hay pagos registrados.
                </Text>
              ) : (
                summary.payments.map((payment, index) => (
                  <View
                    key={`${payment.from_id}-${payment.to_id}-${payment.amount}-${index}`}
                    style={styles.paymentRow}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.successDark} />
                    <Text style={styles.paymentText}>
                      {memberNameById.get(payment.from_id) ?? 'Companero'} pago a{' '}
                      {memberNameById.get(payment.to_id) ?? 'Companero'}
                    </Text>
                    <View style={styles.paymentAmountChip}>
                      <Text style={styles.paymentAmountText}>
                        {payment.amount.toFixed(2)} EUR
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};











