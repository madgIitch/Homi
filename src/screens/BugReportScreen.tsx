import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { bugReportService } from '../services/bugReportService';
import type { BugReport } from '../types/bugReport';

type ScreenshotItem = {
  uri: string;
  fileName?: string;
  type?: string;
};

const MAX_SCREENSHOTS = 5;

export const BugReportScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reports, setReports] = useState<BugReport[]>([]);

  const statusLabel = useMemo(
    () =>
      new Map([
        ['pending', 'Pendiente'],
        ['in_progress', 'En progreso'],
        ['resolved', 'Resuelto'],
      ]),
    []
  );

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await bugReportService.getMyReports();
      setReports(data);
    } catch (error) {
      console.warn('[BugReportScreen] Error loading reports:', error);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handlePickImages = async () => {
    if (screenshots.length >= MAX_SCREENSHOTS) {
      Alert.alert('Limite alcanzado', 'Puedes adjuntar hasta 5 capturas.');
      return;
    }

    const remaining = MAX_SCREENSHOTS - screenshots.length;
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: remaining,
    });

    if (result.didCancel || !result.assets?.length) return;

    const nextShots = result.assets
      .filter((asset) => !!asset.uri)
      .map((asset) => ({
        uri: asset.uri as string,
        fileName: asset.fileName,
        type: asset.type,
      }));

    setScreenshots((prev) => [...prev, ...nextShots].slice(0, MAX_SCREENSHOTS));
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      Alert.alert('Faltan datos', 'Completa el titulo y la descripcion.');
      return;
    }

    try {
      setSubmitting(true);
      const report = await bugReportService.createReport({
        title: trimmedTitle,
        description: trimmedDescription,
      });

      if (screenshots.length > 0) {
        await Promise.all(
          screenshots.map((shot, index) =>
            bugReportService.uploadScreenshot(
              report.id,
              shot.uri,
              shot.fileName,
              shot.type,
              index + 1
            )
          )
        );
      }

      Alert.alert('Reporte enviado', 'Gracias por ayudarnos a mejorar HomiMatch.');
      setTitle('');
      setDescription('');
      setScreenshots([]);
      await loadReports();
    } catch (error) {
      console.error('[BugReportScreen] submit error:', error);
      Alert.alert('Error', 'No se pudo enviar el reporte.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.headerIcon, { backgroundColor: theme.colors.glassSurface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Reportar un problema
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Describe el problema
          </Text>
          <TextInput
            placeholder="Titulo o asunto"
            placeholderTextColor={theme.colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.glassSurface,
                borderColor: theme.colors.glassBorderSoft,
                color: theme.colors.text,
              },
            ]}
          />
          <TextInput
            placeholder="Que ocurrio? Incluye pasos para reproducirlo si puedes."
            placeholderTextColor={theme.colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            style={[
              styles.textArea,
              {
                backgroundColor: theme.colors.glassSurface,
                borderColor: theme.colors.glassBorderSoft,
                color: theme.colors.text,
              },
            ]}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Capturas
            </Text>
            <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
              {screenshots.length}/{MAX_SCREENSHOTS}
            </Text>
          </View>
          <Button
            title="Adjuntar capturas"
            onPress={handlePickImages}
            variant="secondary"
            disabled={screenshots.length >= MAX_SCREENSHOTS}
          />
          {screenshots.length > 0 && (
            <View style={styles.screenshotGrid}>
              {screenshots.map((shot, index) => (
                <View
                  key={`${shot.uri}-${index}`}
                  style={[
                    styles.screenshotCard,
                    {
                      borderColor: theme.colors.glassBorderSoft,
                      backgroundColor: theme.colors.glassSurface,
                    },
                  ]}
                >
                  <Image source={{ uri: shot.uri }} style={styles.screenshotImage} />
                  <TouchableOpacity
                    style={[
                      styles.removeButton,
                      { backgroundColor: theme.colors.overlayDark },
                    ]}
                    onPress={() => handleRemoveScreenshot(index)}
                  >
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Button title="Enviar reporte" onPress={handleSubmit} loading={submitting} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Mis reportes
          </Text>
          {loadingReports ? (
            <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
              Cargando reportes...
            </Text>
          ) : reports.length === 0 ? (
            <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
              Aun no tienes reportes enviados.
            </Text>
          ) : (
            <View style={styles.reportList}>
              {reports.map((report) => {
                const date = new Date(report.created_at);
                const dateLabel = Number.isNaN(date.getTime())
                  ? ''
                  : date.toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                return (
                  <View
                    key={report.id}
                    style={[
                      styles.reportCard,
                      {
                        borderColor: theme.colors.glassBorderSoft,
                        backgroundColor: theme.colors.glassSurface,
                      },
                    ]}
                  >
                    <View style={styles.reportHeader}>
                      <Text style={[styles.reportTitle, { color: theme.colors.text }]}>
                        {report.title}
                      </Text>
                      <View
                        style={[
                          styles.statusChip,
                          { backgroundColor: theme.colors.primaryTint },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: theme.colors.primary }]}>
                          {statusLabel.get(report.status) ?? report.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.reportMeta, { color: theme.colors.textSecondary }]}>
                      {dateLabel}
                    </Text>
                    <Text
                      style={[styles.reportDescription, { color: theme.colors.text }]}
                      numberOfLines={2}
                    >
                      {report.description}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  screenshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  screenshotCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportList: {
    gap: 12,
    marginTop: 4,
  },
  reportCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reportTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reportMeta: {
    fontSize: 12,
    marginTop: 6,
  },
  reportDescription: {
    marginTop: 8,
    fontSize: 13,
  },
});
