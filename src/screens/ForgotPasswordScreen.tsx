// src/screens/ForgotPasswordScreen.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { KeyboardAwareContainer } from '../components/KeyboardAwareContainer';
import { useTheme } from '../theme/ThemeContext';
import { authService } from '../services/authService';
import { API_CONFIG } from '../config/api';
import { ForgotPasswordScreenStyles } from '../styles/screens';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type ForgotPasswordNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ForgotPassword'
>;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const theme = useTheme();
  const styles = useMemo(() => ForgotPasswordScreenStyles(theme), [theme]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    setLoading(true);
    try {
      await authService.requestPasswordReset(
        email,
        API_CONFIG.PASSWORD_RESET_REDIRECT_URL
      );
      Alert.alert(
        'Correo enviado',
        'Revisa tu bandeja de entrada para recuperar tu contrasena.'
      );
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    } finally {
      setLoading(false);
    }
  };

  const insets = useSafeAreaInsets();

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
      <KeyboardAwareContainer
        style={styles.transparentBackground}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        withSafeAreaBottom
        extraScrollHeight={120}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Recupera tu contrasena
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Te enviaremos un enlace a tu correo para restablecerla.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                borderRadius: theme.borderRadius.md,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
              },
            ]}
            placeholder="Email"
            placeholderTextColor={theme.colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Button
            title="Enviar enlace"
            onPress={handleSendReset}
            loading={loading}
          />

          <Button
            title="Volver a inicio de sesion"
            onPress={() => navigation.navigate('Login')}
            variant="tertiary"
          />
        </View>
      </KeyboardAwareContainer>
    </View>
  );
};
