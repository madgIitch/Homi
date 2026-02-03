import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Button } from '../../components/Button';
import { useTheme, useThemeController } from '../../theme/ThemeContext';
import { Phase4InvitationStyles } from '../../styles/screens';

interface Phase4InvitationProps {
  onNext: (data: { hasInvite: boolean; inviteCode?: string }) => void;
  onBack: () => void;
  onInputFocus?: (event: any) => void;
  loading: boolean;
}

export const Phase4Invitation: React.FC<Phase4InvitationProps> = ({
  onNext,
  onBack,
  onInputFocus,
  loading,
}) => {
  const theme = useTheme();
  const { isDark } = useThemeController();
  const styles = useMemo(() => Phase4InvitationStyles(theme), [theme]);
  const [hasInvite, setHasInvite] = useState<boolean | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const titleColor = isDark ? theme.colors.textLight : theme.colors.text;
  const subtitleColor = isDark ? theme.colors.textTertiary : theme.colors.textSecondary;
  const helperColor = isDark ? theme.colors.textTertiary : theme.colors.textSecondary;

  const handleNext = () => {
    if (hasInvite === null) {
      Alert.alert('Error', 'Selecciona si tienes invitacion');
      return;
    }
    const normalizedCode = inviteCode.trim();
    if (hasInvite && !normalizedCode) {
      Alert.alert('Error', 'Introduce el codigo de invitacion');
      return;
    }

    onNext({
      hasInvite,
      inviteCode: hasInvite ? normalizedCode : undefined,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: titleColor }]}>
          Invitacion al piso
        </Text>
        <Text style={[styles.subtitle, { color: subtitleColor }]}>
          Paso 4 de 5
        </Text>
        <Text style={[styles.helper, { color: helperColor }]}>
          Si ya vives en un piso, puedes unirte con un codigo de invitacion.
        </Text>
        <View style={styles.stepper}>
          <View
            style={[
              styles.progressFill,
              { width: '80%', backgroundColor: theme.colors.primary },
            ]}
          />
        </View>
        <View style={styles.divider} />

        <View style={styles.segmentRow}>
          {[
            { id: true, label: 'Tengo codigo' },
            { id: false, label: 'No tengo' },
          ].map((option) => {
            const isActive = hasInvite === option.id;
            return (
              <TouchableOpacity
                key={String(option.id)}
                style={[
                  styles.segmentButton,
                  isActive && {
                    backgroundColor: theme.colors.chipSelectedBackground,
                    borderColor: theme.colors.chipSelectedBorder,
                  },
                ]}
                onPress={() => setHasInvite(option.id)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    { color: theme.colors.text },
                    isActive && { color: theme.colors.chipSelectedText },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {hasInvite ? (
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
              },
            ]}
          placeholder="Codigo de invitacion"
          placeholderTextColor={theme.colors.textTertiary}
          value={inviteCode}
          onChangeText={setInviteCode}
          onFocus={onInputFocus}
          autoCapitalize="characters"
        />
        ) : null}

        <View style={styles.buttonContainer}>
          <Button title="Anterior" onPress={onBack} variant="tertiary" />
          <Button title="Continuar" onPress={handleNext} loading={loading} />
        </View>
      </View>
    </View>
  );
};
