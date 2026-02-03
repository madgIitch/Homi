// src/screens/SubscriptionScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { API_CONFIG } from '../config/api';
import { stripeService, type SubscriptionStatus } from '../services/stripeService';
import { usePremium } from '../context/PremiumContext';

type Plan = {
  id: 'monthly' | 'yearly';
  label: string;
  price: string;
  priceId: string;
};

export const SubscriptionScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isPremium, setPremium } = usePremium();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  const plans = useMemo<Plan[]>(
    () => [
      {
        id: 'monthly',
        label: 'Mensual',
        price: '€2.99',
        priceId: API_CONFIG.STRIPE_PRICE_ID_MONTHLY,
      },
      {
        id: 'yearly',
        label: 'Anual',
        price: '€29.99',
        priceId: API_CONFIG.STRIPE_PRICE_ID_YEARLY,
      },
    ],
    []
  );

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await stripeService.getSubscriptionStatus();
        setStatus(data);
        await setPremium(Boolean(data.isPremium));
      } catch (error) {
        console.warn('[SubscriptionScreen] Failed to load status:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadStatus();
  }, [setPremium]);

  const openUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      throw new Error('No se pudo abrir el enlace');
    }
    await Linking.openURL(url);
  };

  const handleSubscribe = async (priceId: string) => {
    if (!priceId) {
      Alert.alert('Error', 'Falta configurar el precio de Stripe');
      return;
    }

    const returnBase = 'homimatch://subscription';
    const successUrl = `${returnBase}?status=success`;
    const cancelUrl = `${returnBase}?status=cancel`;

    setProcessing(true);
    try {
      const session = await stripeService.createCheckoutSession(
        priceId,
        successUrl,
        cancelUrl
      );
      await openUrl(session.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', message || 'No se pudo abrir el checkout');
    } finally {
      setProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    const returnUrl = 'homimatch://subscription';
    setProcessing(true);
    try {
      const session = await stripeService.openCustomerPortal(returnUrl);
      await openUrl(session.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', message || 'No se pudo abrir el portal');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
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

      {/* Header con gradiente */}
      <View style={styles.header}>
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
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backButton, { backgroundColor: theme.colors.glassSurface, borderColor: theme.colors.glassBorderSoft }]}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <View style={[styles.sparklesIcon, { backgroundColor: theme.colors.glassSurface, borderColor: theme.colors.glassBorderSoft }]}>
                <Ionicons name="sparkles" size={32} color={theme.colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>HomiMatch Premium</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Acceso ilimitado y ventajas exclusivas</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Plans Comparison */}
        <View style={styles.plansComparison}>
          {/* Free Plan */}
          <View style={[styles.comparisonCard, { backgroundColor: 'rgba(255, 255, 255, 0.8)' }]}>
            <Text style={styles.comparisonTitle}>Plan gratuito</Text>
            <View style={styles.comparisonList}>
              <View style={styles.comparisonItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.comparisonText}>Límite diario de swipes</Text>
              </View>
              <View style={styles.comparisonItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.comparisonText}>Un mensaje de prueba</Text>
              </View>
              <View style={styles.comparisonItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.comparisonText}>Acceso básico a filtros</Text>
              </View>
            </View>
          </View>

          {/* Premium Plan */}
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.9)', 'rgba(236, 72, 153, 0.9)']}
            style={[styles.comparisonCard, styles.premiumCard]}
          >
            <Text style={styles.comparisonTitlePremium}>Plan Premium</Text>
            <View style={styles.comparisonList}>
              <View style={styles.comparisonItem}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.comparisonTextPremium}>Swipes ilimitados</Text>
              </View>
              <View style={styles.comparisonItem}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.comparisonTextPremium}>Filtros avanzados y personalizados</Text>
              </View>
              <View style={styles.comparisonItem}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.comparisonTextPremium}>Mensajes directos semanales</Text>
              </View>
              <View style={styles.comparisonItem}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.comparisonTextPremium}>Visibilidad priorizada</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Cargando estado...</Text>
          </View>
        ) : (
          <>
            {/* Active Status */}
            {isPremium && (
              <LinearGradient
                colors={['rgba(254, 243, 199, 0.9)', 'rgba(253, 230, 138, 0.9)']}
                style={styles.activeStatusCard}
              >
                <View style={styles.activeStatusIcon}>
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B']}
                    style={styles.starGradient}
                  >
                    <Ionicons name="star" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.activeStatusInfo}>
                  <Text style={styles.activeStatusTitle}>Plan Premium activo</Text>
                  {status?.currentPeriodEnd && (
                    <Text style={styles.activeStatusSubtitle}>
                      {status.cancelAtPeriodEnd ? 'Caduca el' : 'Renovación el'}{' '}
                      {new Date(status.currentPeriodEnd).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
              </LinearGradient>
            )}

            {/* Subscription Options */}
            <View style={styles.subscriptionOptions}>
              {plans.map((plan) => {
                const isYearly = plan.id === 'yearly';

                return (
                  <TouchableOpacity
                    key={plan.id}
                    disabled={processing}
                    onPress={() => handleSubscribe(plan.priceId)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['rgba(139, 92, 246, 0.9)', 'rgba(236, 72, 153, 0.9)']}
                      style={styles.planOptionCard}
                    >
                      {isYearly && (
                        <View style={styles.saveBadge}>
                          <Text style={styles.saveBadgeText}>Ahorra 20%</Text>
                        </View>
                      )}
                      <View style={styles.planOptionContent}>
                        <View style={styles.planOptionLeft}>
                          <Text style={styles.planOptionLabel}>{plan.label}</Text>
                          <Text style={styles.planOptionPrice}>{plan.price}</Text>
                        </View>
                        <View style={styles.subscribeButton}>
                          <Text style={styles.subscribeButtonText}>
                            {processing ? 'Procesando...' : 'Suscribirse'}
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Manage Subscription */}
            <TouchableOpacity
              style={styles.manageButton}
              disabled={processing}
              onPress={handleManageSubscription}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={20} color="#374151" />
              <Text style={styles.manageButtonText}>Gestionar suscripción</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingBottom: 32,
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
  },
  headerCenter: {
    alignItems: 'center',
  },
  sparklesIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  plansComparison: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  comparisonCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  premiumCard: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  comparisonTitlePremium: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  comparisonList: {
    gap: 8,
  },
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletPoint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  comparisonText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  comparisonTextPremium: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  activeStatusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.8)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  activeStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  starGradient: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStatusInfo: {
    flex: 1,
  },
  activeStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  activeStatusSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  subscriptionOptions: {
    gap: 12,
    marginBottom: 24,
  },
  planOptionCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },
  saveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    elevation: 5,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78350F',
  },
  planOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planOptionLeft: {
    gap: 4,
  },
  planOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planOptionPrice: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  subscribeButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  subscribeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  manageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});
