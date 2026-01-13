// src/screens/ResetPasswordScreen.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ImageBackground,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../components/Button';
import { KeyboardAwareContainer } from '../components/KeyboardAwareContainer';
import { useTheme } from '../theme/ThemeContext';
import { authService } from '../services/authService';
import { ResetPasswordScreenStyles } from '../styles/screens';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

type ResetPasswordNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ResetPassword'
>;

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordNavigationProp>();
  const theme = useTheme();
  const styles = useMemo(() => ResetPasswordScreenStyles(theme), [theme]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      const active = await authService.hasActiveSession();
      if (isMounted) {
        setHasSession(active);
      }
    };

    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleReset = async () => {
    if (hasSession !== true) {
      Alert.alert('Error', 'No hay una sesion de recuperacion activa');
      return;
    }

    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Completa ambos campos');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contrasena debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contrasenas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await authService.updatePassword(password);
      await authService.logout();
      await AsyncStorage.removeItem('authUser');
      Alert.alert('Listo', 'Tu contrasena fue actualizada');
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
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        withSafeAreaBottom
        extraScrollHeight={120}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Nueva contrasena
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Ingresa una contrasena nueva para tu cuenta.
          </Text>
          {hasSession === null && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
                Verificando enlace...
              </Text>
            </View>
          )}
          {hasSession === false && (
            <Text style={[styles.notice, { color: theme.colors.error }]}>
              Este enlace ya no es valido o expiro. Solicita uno nuevo.
            </Text>
          )}
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
            placeholder="Nueva contrasena"
            placeholderTextColor={theme.colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

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
            placeholder="Repite la contrasena"
            placeholderTextColor={theme.colors.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Button
            title="Actualizar"
            onPress={handleReset}
            loading={loading}
            disabled={hasSession !== true}
          />

          {hasSession === false ? (
            <Button
              title="Solicitar nuevo enlace"
              onPress={() => navigation.navigate('ForgotPassword')}
              variant="tertiary"
            />
          ) : (
            <Button
              title="Volver a inicio de sesion"
              onPress={() => navigation.navigate('Login')}
              variant="tertiary"
            />
          )}
        </View>
      </KeyboardAwareContainer>
    </View>
  );
};
