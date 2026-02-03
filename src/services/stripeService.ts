// src/services/stripeService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import { authService } from './authService';

export type SubscriptionStatus = {
  isPremium: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  cancelAtPeriodEnd: boolean;
  interval: string | null;
  intervalCount: number | null;
  customerId: string | null;
  subscriptionId: string | null;
};

type CheckoutSessionResponse = {
  sessionId: string;
  url: string;
};

type PortalSessionResponse = {
  url: string;
};

const devLog = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

class StripeService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
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

  async createCheckoutSession(
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ url: string; sessionId: string }> {
    devLog('[StripeService.createCheckoutSession] priceId:', priceId);
    const response = await this.fetchWithAuth(
      `${API_CONFIG.FUNCTIONS_URL}/stripe-create-checkout-session`,
      {
        method: 'POST',
        body: JSON.stringify({ priceId, successUrl, cancelUrl }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error('[StripeService.createCheckoutSession] Error:', detail);
      throw new Error('No se pudo iniciar el pago');
    }

    const data = (await response.json()) as CheckoutSessionResponse;
    return { url: data.url, sessionId: data.sessionId };
  }

  async openCustomerPortal(returnUrl: string): Promise<{ url: string }> {
    const response = await this.fetchWithAuth(
      `${API_CONFIG.FUNCTIONS_URL}/stripe-create-portal-session`,
      {
        method: 'POST',
        body: JSON.stringify({ returnUrl }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error('[StripeService.openCustomerPortal] Error:', detail);
      throw new Error('No se pudo abrir el portal de Stripe');
    }

    const data = (await response.json()) as PortalSessionResponse;
    return { url: data.url };
  }

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const response = await this.fetchWithAuth(
      `${API_CONFIG.FUNCTIONS_URL}/stripe-subscription-status`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error('[StripeService.getSubscriptionStatus] Error:', detail);
      throw new Error('No se pudo cargar la suscripcion');
    }

    const data = (await response.json()) as SubscriptionStatus;
    return data;
  }

  async isPremium(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    return Boolean(status.isPremium);
  }
}

export const stripeService = new StripeService();
