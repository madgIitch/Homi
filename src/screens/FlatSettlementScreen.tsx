import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { colors } from '../theme';
import { flatSettlementService } from '../services/flatSettlementService';
import type { FlatSettlementSummary } from '../types/flatSettlement';
import { FlatSettlementScreenStyles as styles } from '../styles/screens';

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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();
  const { flatId, month } = (route.params ?? {}) as RouteParams;
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
  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      if (!flatId) {
        setErrorMessage('No se encontro el piso.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await flatSettlementService.getSettlement(flatId, month);
        if (isMounted) {
          setSummary(data);
        }
      } catch (error) {
        console.error('Error cargando cuentas:', error);
        if (isMounted) {
          setErrorMessage('No se pudieron cargar las cuentas.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSummary();
    return () => {
      isMounted = false;
    };
  }, [flatId, month]);
  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    summary?.members.forEach((member) => {
      map.set(member.id, member.display_name || 'Companero');
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
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
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
            <Ionicons name="alert-circle-outline" size={40} color="#9CA3AF" />
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
                      {member.display_name || 'Companero'}
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
                      <Ionicons name="swap-horizontal" size={16} color="#6B7280" />
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
                          color={isPaid ? '#16A34A' : '#6B7280'}
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
                    <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
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











