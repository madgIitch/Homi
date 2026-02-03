// src/screens/AccountOptionsScreen.tsx
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';
import { usePremium } from '../context/PremiumContext';
import { AuthContext } from '../context/AuthContext';
import { profileService } from '../services/profileService';
import { stripeService, type SubscriptionStatus } from '../services/stripeService';

export const AccountOptionsScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isPremium } = usePremium();
  const authContext = useContext(AuthContext);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await stripeService.getSubscriptionStatus();
        setStatus(data);
      } catch (error) {
        console.warn('[AccountOptionsScreen] Failed to load status:', error);
      } finally {
        setLoadingStatus(false);
      }
    };

    void loadStatus();
  }, []);

  const formattedPeriodEnd = useMemo(() => {
    if (!status?.currentPeriodEnd) return null;
    const date = new Date(status.currentPeriodEnd);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [status?.currentPeriodEnd]);

  const isPremiumDisplay = status?.isPremium ?? isPremium;

  const cadenceLabel = useMemo(() => {
    if (!status?.interval) return null;
    const count = status.intervalCount && status.intervalCount > 1 ? status.intervalCount : 1;
    const unit =
      status.interval === 'year'
        ? count > 1
          ? 'años'
          : 'año'
        : count > 1
        ? 'meses'
        : 'mes';
    return `Cada ${count} ${unit}`;
  }, [status?.interval, status?.intervalCount]);

  const handleUpgrade = () => {
    navigation.navigate('Subscription');
  };

  const handleLogout = useCallback(() => {
    if (!authContext?.logout) return;
    Alert.alert('Cerrar sesion', 'Quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await authContext.logout();
          } finally {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
      },
    ]);
  }, [authContext, navigation]);

  const handleDeleteAccount = useCallback(() => {
    if (processing) return;
    Alert.alert(
      'Eliminar cuenta',
      'Esta accion elimina tu cuenta y todos tus datos. ?Quieres continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              await profileService.deleteProfile();
              await authContext?.logout();
            } catch (error) {
              console.error('Error eliminando perfil:', error);
              Alert.alert('Error', 'No se pudo eliminar la cuenta');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  }, [authContext, processing]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
        }}
        blurRadius={18}
        style={StyleSheet.absoluteFillObject}
      >
        <LinearGradient
          colors={[theme.colors.glassOverlay, theme.colors.glassWarmStrong]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>
      <View style={[styles.header, { paddingTop: spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <View
            style={[
              styles.headerIcon,
              { backgroundColor: theme.colors.glassSurface },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Opciones de cuenta
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.statusCard,
            {
              borderColor: theme.colors.glassBorderSoft,
              backgroundColor: theme.colors.glassSurface,
            },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
            Tipo de cuenta
          </Text>
          <View style={styles.statusRow}>
            <Ionicons
              name={isPremiumDisplay ? 'sparkles' : 'sparkles-outline'}
              size={20}
              color={isPremiumDisplay ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.statusText, { color: theme.colors.text }]}>
              {isPremiumDisplay ? 'Premium' : 'Gratuita'}
            </Text>
          </View>
          {loadingStatus ? (
            <Text style={[styles.statusHint, { color: theme.colors.textSecondary }]}>
              Cargando estado...
            </Text>
          ) : (
            <>
              <Text style={[styles.statusHint, { color: theme.colors.textSecondary }]}>
                {isPremiumDisplay
                  ? 'Tienes acceso completo a todas las ventajas.'
                  : 'Actualiza a Premium para desbloquear ventajas.'}
              </Text>
              {status?.status ? (
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  Estado: {status.status}
                </Text>
              ) : null}
              {status?.cancelAtPeriodEnd && formattedPeriodEnd ? (
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  Activo hasta {formattedPeriodEnd} (no se renueva)
                </Text>
              ) : formattedPeriodEnd ? (
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  Proxima renovacion: {formattedPeriodEnd}
                </Text>
              ) : null}
              {cadenceLabel ? (
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {cadenceLabel}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleUpgrade}
        >
          <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>
            {isPremiumDisplay ? 'Gestionar suscripcion' : 'Actualizar a Premium'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: theme.colors.glassBorderSoft }]} />

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              borderColor: theme.colors.glassBorderSoft,
              backgroundColor: theme.colors.surfaceLight,
            },
          ]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.text} />
          <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
            Cerrar sesion
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.dangerButton,
            {
              borderColor: theme.colors.dangerBorderSoft,
              backgroundColor: theme.colors.dangerTint,
            },
          ]}
          onPress={handleDeleteAccount}
          disabled={processing}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          <Text style={[styles.dangerButtonText, { color: theme.colors.error }]}>
            {processing ? 'Eliminando cuenta...' : 'Eliminar cuenta'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.s18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.s18,
  },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.s18,
    gap: spacing.s10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusHint: {
    fontSize: 13,
  },
  metaText: {
    fontSize: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s10,
    paddingVertical: spacing.s14,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s10,
    paddingVertical: spacing.s14,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s10,
    paddingVertical: spacing.s14,
    borderRadius: 14,
    borderWidth: 1,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
