import React, { useState } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Button } from '../../components/Button';
import { useTheme } from '../../theme/ThemeContext';
import { Phase4InvitationStyles as styles } from '../../styles/screens';

interface Phase4InvitationProps {
  onNext: (data: { hasInvite: boolean; inviteCode?: string }) => void;
  onBack: () => void;
  loading: boolean;
}

export const Phase4Invitation: React.FC<Phase4InvitationProps> = ({
  onNext,
  onBack,
  loading,
}) => {
  const theme = useTheme();
  const [hasInvite, setHasInvite] = useState<boolean | null>(null);
  const [inviteCode, setInviteCode] = useState('');

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
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Invitacion al piso
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Paso 4 de 5
        </Text>
        <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>
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
                    backgroundColor: theme.colors.primaryTint,
                    borderColor: theme.colors.primaryMuted,
                  },
                ]}
                onPress={() => setHasInvite(option.id)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    { color: theme.colors.text },
                    isActive && { color: theme.colors.primary },
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
