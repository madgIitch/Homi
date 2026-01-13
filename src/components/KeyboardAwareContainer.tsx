// src/components/KeyboardAwareContainer.tsx
import React from 'react';
import {
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface KeyboardAwareContainerProps {
  children: React.ReactNode;
  /** Estilo del contenedor exterior */
  style?: StyleProp<ViewStyle>;
  /** Estilo del contenido interior */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Color de fondo (default: colors.background) */
  backgroundColor?: string;
  /** Añadir padding para safe area bottom */
  withSafeAreaBottom?: boolean;
  /** Añadir padding para safe area top */
  withSafeAreaTop?: boolean;
  /** Padding extra en el bottom (además del safe area) */
  extraBottomPadding?: number;
  /** Habilitar scroll incluso si el contenido no lo requiere */
  alwaysScroll?: boolean;
  /** Desactivar el scroll completamente */
  scrollEnabled?: boolean;
  /** Ref para el scroll view */
  scrollRef?: React.RefObject<KeyboardAwareScrollView>;
  /** Espacio extra cuando el teclado está abierto */
  extraScrollHeight?: number;
  /** Habilitar reseteo de scroll cuando el teclado se cierra */
  enableResetScrollToCoords?: boolean;
}

/**
 * Contenedor que maneja automáticamente el teclado y safe areas.
 * Usa KeyboardAwareScrollView para evitar que el teclado tape inputs.
 * 
 * @example
 * ```tsx
 * <KeyboardAwareContainer withSafeAreaBottom>
 *   <Input label="Email" />
 *   <Input label="Password" />
 *   <Button title="Submit" />
 * </KeyboardAwareContainer>
 * ```
 */
export const KeyboardAwareContainer: React.FC<KeyboardAwareContainerProps> = ({
  children,
  style,
  contentContainerStyle,
  backgroundColor = colors.background,
  withSafeAreaBottom = true,
  withSafeAreaTop = false,
  extraBottomPadding = 0,
  alwaysScroll = false,
  scrollEnabled = true,
  scrollRef,
  extraScrollHeight = Platform.OS === 'android' ? 100 : 20,
  enableResetScrollToCoords = false,
}) => {
  const insets = useSafeAreaInsets();

  const bottomPadding = withSafeAreaBottom
    ? Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0) + extraBottomPadding
    : extraBottomPadding;

  const topPadding = withSafeAreaTop ? insets.top : 0;

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingBottom: bottomPadding,
            paddingTop: topPadding,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={true}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={extraScrollHeight}
        extraHeight={Platform.OS === 'android' ? 150 : 100}
        enableResetScrollToCoords={enableResetScrollToCoords}
        scrollEnabled={scrollEnabled}
        alwaysBounceVertical={alwaysScroll}
      >
        {children}
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});

export default KeyboardAwareContainer;
