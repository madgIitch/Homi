// src/theme/index.ts  
export const colors = {  
  // Colores primarios (morado)  
  primary: '#7C3AED',  
  primaryLight: '#A78BFA',  
  primaryDark: '#6D28D9',  
    
  // Colores secundarios  
  secondary: '#06B6D4',  
  secondaryLight: '#22D3EE',  
    
  // Colores neutros  
  background: '#FFFFFF',  
  surface: '#F9FAFB',  
  surfaceLight: '#F3F4F6',  
  surfaceAlt: '#F8FAFC',  
  surfaceMuted: '#F4F5F7',  
  surfaceMutedAlt: '#F2F2F7',  
    
  // Texto  
  text: '#111827',  
  textSecondary: '#6B7280',  
  textTertiary: '#9CA3AF',  
  textMuted: '#374151',  
  textStrong: '#1C1C1E',  
  textSubtle: '#3A3A3C',  
  textLight: '#6C6C70',  
  textDark: '#1F2937',  
    
  // Bordes  
  border: '#E5E7EB',  
  borderLight: '#F3F4F6',  
    
  // Estados  
  error: '#EF4444',  
  errorLight: '#FEE2E2',  
  errorSoft: '#FEF2F2',  
  errorBorder: '#FECACA',  
  errorDark: '#B91C1C',  
  errorDeep: '#991B1B',  
  success: '#10B981',  
  successLight: '#D1FAE5',  
  successSoft: '#DCFCE7',  
  successBorder: '#BBF7D0',  
  successDark: '#16A34A',  
  successDeep: '#166534',  
  warning: '#F59E0B',  
  warningLight: '#FEF3C7',  
  infoLight: '#DBEAFE',  
    
  // Especiales  
  overlay: 'rgba(0, 0, 0, 0.5)',  
  overlayLight: 'rgba(0, 0, 0, 0.4)',  
  overlayDark: 'rgba(17, 24, 39, 0.75)',  
  overlayDeep: 'rgba(0, 0, 0, 0.85)',  
  disabled: '#D1D5DB',  
  chipSelected: '#7C3AED',  
  chipUnselected: '#F3F4F6',  
  primarySoft: '#F5F3FF',  
  primarySoftAlt: '#F3E8FF',  
  primaryMuted: '#C4B5FD',  
  primaryPastel: '#EDE9FE',  
  indigoSoft: '#E0E7FF',  
  indigo: '#4338CA',  
  indigoLight: '#EEF2FF',  
  indigoDark: '#4F46E5',  
  lavenderBorder: '#D8B4FE',  
  dangerStrong: '#DC2626',  
  successSurface: '#ECFDF3',  
  black: '#000000',  
  shadowDark: '#0F172A',  
  glassSubtle: 'rgba(255, 255, 255, 0.015)',  
  glassLight: 'rgba(255, 255, 255, 0.05)',  
  glassUltraLight: 'rgba(255, 255, 255, 0.08)',  
  glassUltraLightAlt: 'rgba(255, 255, 255, 0.04)',  
  glassMid: 'rgba(255, 255, 255, 0.35)',  
  glassStrong: 'rgba(255, 255, 255, 0.8)',  
  glassSurface: 'rgba(255, 255, 255, 0.2)',  
  glassBorder: 'rgba(255, 255, 255, 0.5)',  
  glassBorderSoft: 'rgba(255, 255, 255, 0.45)',  
  glassOverlay: 'rgba(255, 255, 255, 0.6)',  
  glassOverlayStrong: 'rgba(255, 255, 255, 0.7)',  
  glassWarmStrong: 'rgba(245, 245, 247, 0.8)',  
  dangerOverlay: 'rgba(239, 68, 68, 0.9)',  
  dangerBorderSoft: 'rgba(239, 68, 68, 0.25)',  
  dangerTint: 'rgba(239, 68, 68, 0.08)',  
  primaryTint: 'rgba(124, 58, 237, 0.08)',  
  textOverlayStrong: 'rgba(17, 24, 39, 0.85)',  
  textOverlay: 'rgba(17, 24, 39, 0.8)',  
  textBorderSoft: 'rgba(17, 24, 39, 0.2)',  
};  
  
export const typography = {  
  h1: {  
    fontSize: 32,  
    fontWeight: '700' as const,  
    lineHeight: 40,  
    letterSpacing: -0.5,  
  },  
  h2: {  
    fontSize: 28,  
    fontWeight: '700' as const,  
    lineHeight: 36,  
    letterSpacing: -0.3,  
  },  
  h3: {  
    fontSize: 24,  
    fontWeight: '600' as const,  
    lineHeight: 32,  
  },  
  h4: {  
    fontSize: 20,  
    fontWeight: '600' as const,  
    lineHeight: 28,  
  },  
  sectionTitle: {  
    fontSize: 18,  
    fontWeight: '600' as const,  
    lineHeight: 26,  
  },  
  body: {  
    fontSize: 16,  
    fontWeight: '400' as const,  
    lineHeight: 24,  
  },  
  bodyMedium: {  
    fontSize: 16,  
    fontWeight: '500' as const,  
    lineHeight: 24,  
  },  
  bodyBold: {  
    fontSize: 16,  
    fontWeight: '600' as const,  
    lineHeight: 24,  
  },  
  label: {  
    fontSize: 14,  
    fontWeight: '500' as const,  
    lineHeight: 20,  
  },  
  caption: {  
    fontSize: 14,  
    fontWeight: '400' as const,  
    lineHeight: 20,  
  },  
  captionMedium: {  
    fontSize: 14,  
    fontWeight: '500' as const,  
    lineHeight: 20,  
  },  
  small: {  
    fontSize: 12,  
    fontWeight: '400' as const,  
    lineHeight: 16,  
  },  
  smallMedium: {  
    fontSize: 12,  
    fontWeight: '500' as const,  
    lineHeight: 16,  
  },  
};
  
export const spacing = {  
  xxs: 2,  
  xs: 4,  
  sm: 8,  
  s6: 6,  
  s10: 10,  
  s12: 12,  
  s14: 14,  
  s18: 18,  
  s20: 20,  
  s40: 40,  
  md: 16,  
  lg: 24,  
  xl: 32,  
  xxl: 48,  
};  
  
export const borderRadius = {  
  xs: 4,  
  s6: 6,  
  sm: 8,  
  s10: 10,  
  md: 12,  
  s14: 14,  
  s18: 18,  
  lg: 16,  
  s22: 22,  
  xl: 20,  
  xxl: 24,  
  s27: 27,  
  s28: 28,  
  s29: 29,  
  full: 9999,  
};  
  
export const sizes = {  
  s18: 18,  
  s20: 20,  
  s22: 22,  
  s24: 24,  
  s26: 26,  
  s28: 28,  
  s30: 30,  
  s32: 32,  
  s34: 34,  
  s36: 36,  
  s40: 40,  
  s44: 44,  
  s48: 48,  
  s52: 52,  
  s54: 54,  
  s56: 56,  
  s58: 58,  
  s64: 64,  
  s72: 72,  
  s84: 84,  
  s86: 86,  
  s90: 90,  
  s96: 96,  
  s140: 140,  
  s180: 180,  
  s320: 320,  
};  
  
export const semanticSizes = {  
  avatarLg: sizes.s96,  
  avatarMd: sizes.s64,  
  avatarSm: sizes.s48,  
  avatarXs: sizes.s36,  
  badge: sizes.s24,  
  buttonHeight: sizes.s44,  
  chipHeight: sizes.s30,  
  control: sizes.s36,  
  ctaButton: sizes.s54,  
  headerAction: sizes.s34,  
  iconLg: sizes.s24,  
  iconMd: sizes.s20,  
  iconSm: sizes.s18,  
  thumb: sizes.s20,  
};  
  
export const semanticRadii = {  
  card: borderRadius.lg,  
  chip: borderRadius.full,  
  pill: borderRadius.full,  
  sheet: borderRadius.xl,  
  soft: borderRadius.md,  
};  
  
export const shadows = {  
  sm: {  
    shadowColor: '#000',  
    shadowOffset: { width: 0, height: 1 },  
    shadowOpacity: 0.1,  
    shadowRadius: 2,  
    elevation: 2,  
  },  
  md: {  
    shadowColor: '#000',  
    shadowOffset: { width: 0, height: 4 },  
    shadowOpacity: 0.12,  
    shadowRadius: 8,  
    elevation: 4,  
  },  
  card: {  
    shadowColor: '#000',  
    shadowOffset: { width: 0, height: 8 },  
    shadowOpacity: 0.08,  
    shadowRadius: 16,  
    elevation: 4,  
  },  
  input: {  
    shadowColor: '#000',  
    shadowOffset: { width: 0, height: 4 },  
    shadowOpacity: 0.06,  
    shadowRadius: 8,  
    elevation: 2,  
  },  
  soft: {  
    shadowColor: '#000',  
    shadowOffset: { width: 0, height: 4 },  
    shadowOpacity: 0.08,  
    shadowRadius: 10,  
    elevation: 3,  
  },  
  lg: {  
    shadowColor: '#000',  
    shadowOffset: { width: 0, height: 8 },  
    shadowOpacity: 0.15,  
    shadowRadius: 16,  
    elevation: 8,  
  },  
};  
  
export const theme = {  
  colors,  
  typography,  
  spacing,  
  borderRadius,  
  sizes,  
  semanticSizes,  
  semanticRadii,  
  shadows,  
};  
  
export type Theme = typeof theme;
