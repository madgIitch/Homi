import { chatService } from '../services/chatService';

const PREMIUM_WEEKLY_LIMIT = 3;
const FREE_TRIAL_LIMIT = 1;

export type MessageRequestUsage = {
  used: number;
  limit: number;
  remaining: number;
  periodLabel: string;
};

export const getMessageRequestUsage = async (
  userId: string,
  isPremium: boolean
): Promise<MessageRequestUsage> => {
  if (!userId) {
    return {
      used: 0,
      limit: isPremium ? PREMIUM_WEEKLY_LIMIT : FREE_TRIAL_LIMIT,
      remaining: isPremium ? PREMIUM_WEEKLY_LIMIT : FREE_TRIAL_LIMIT,
      periodLabel: isPremium ? 'esta semana' : 'prueba',
    };
  }

  try {
    const data = await chatService.getMessageRequestLimits();
    const limit = data.limit ?? (data.is_premium ? PREMIUM_WEEKLY_LIMIT : FREE_TRIAL_LIMIT);
    const used = data.used ?? 0;
    return {
      used,
      limit,
      remaining: data.remaining ?? Math.max(0, limit - used),
      periodLabel: data.is_premium ? 'esta semana' : 'prueba',
    };
  } catch {
    return {
      used: 0,
      limit: isPremium ? PREMIUM_WEEKLY_LIMIT : FREE_TRIAL_LIMIT,
      remaining: isPremium ? PREMIUM_WEEKLY_LIMIT : FREE_TRIAL_LIMIT,
      periodLabel: isPremium ? 'esta semana' : 'prueba',
    };
  }
};

export const incrementMessageRequestUsage = async (
  userId: string,
  isPremium: boolean
): Promise<MessageRequestUsage> => {
  return getMessageRequestUsage(userId, isPremium);
};
