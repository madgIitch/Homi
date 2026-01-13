// src/theme/responsive.ts
import { Dimensions, PixelRatio, Platform } from 'react-native';

// Dimensiones base de diseño (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Escala un valor horizontal basado en el ancho de pantalla
 * Útil para: padding horizontal, margin horizontal, widths
 */
export const scaleWidth = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

/**
 * Escala un valor vertical basado en la altura de pantalla
 * Útil para: padding vertical, margin vertical, heights
 */
export const scaleHeight = (size: number): number => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

/**
 * Escala moderada - usa un factor de escala reducido para evitar
 * que los elementos crezcan demasiado en pantallas grandes
 * Útil para: font sizes, icon sizes, border radius
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size + (scale - 1) * size * factor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Escala fonts de manera responsiva con límites min/max
 * Evita fonts demasiado pequeños o grandes
 */
export const scaleFont = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  
  // Limitar entre 80% y 120% del tamaño original
  const minSize = size * 0.8;
  const maxSize = size * 1.2;
  
  const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
  return Math.round(PixelRatio.roundToNearestPixel(clampedSize));
};

/**
 * Retorna un porcentaje del ancho de pantalla
 */
export const widthPercent = (percent: number): number => {
  return Math.round((SCREEN_WIDTH * percent) / 100);
};

/**
 * Retorna un porcentaje de la altura de pantalla
 */
export const heightPercent = (percent: number): number => {
  return Math.round((SCREEN_HEIGHT * percent) / 100);
};

/**
 * Detecta si es una pantalla pequeña (< 360dp de ancho)
 */
export const isSmallScreen = (): boolean => SCREEN_WIDTH < 360;

/**
 * Detecta si es una pantalla grande (>= 414dp de ancho)
 */
export const isLargeScreen = (): boolean => SCREEN_WIDTH >= 414;

/**
 * Valores de pantalla actuales
 */
export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: isSmallScreen(),
  isLarge: isLargeScreen(),
};

/**
 * Padding extra para Android debido a navigation bar
 * Usar cuando SafeAreaView no es suficiente
 */
export const androidBottomPadding = Platform.OS === 'android' ? 16 : 0;

/**
 * Altura segura para botones en la parte inferior
 * Considera la navigation bar de Android
 */
export const safeBottomHeight = (insetBottom: number): number => {
  return Math.max(insetBottom, Platform.OS === 'android' ? 24 : 0);
};

/**
 * Helper para crear estilos condicionales por tamaño de pantalla
 */
export const responsive = <T>(options: {
  small?: T;
  default: T;
  large?: T;
}): T => {
  if (isSmallScreen() && options.small !== undefined) {
    return options.small;
  }
  if (isLargeScreen() && options.large !== undefined) {
    return options.large;
  }
  return options.default;
};

/**
 * Crea un listener para cambios de dimensiones (rotación, split screen)
 */
export const createDimensionsListener = (
  callback: (width: number, height: number) => void
) => {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    callback(window.width, window.height);
  });
  
  return () => subscription.remove();
};
