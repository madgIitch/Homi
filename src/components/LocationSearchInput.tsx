// src/components/LocationSearchInput.tsx
import React, { useMemo } from 'react';
import { View, TextInput, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { ChipGroup } from './ChipGroup';

interface ChipOption {
  id: string;
  label: string;
}

interface LocationSearchInputProps {
  // Búsqueda
  searchQuery: string;
  onSearchChange: (text: string) => void;
  placeholder: string;

  // Estado de carga
  isLoading: boolean;

  // Resultados
  searchResults: ChipOption[];
  selectedIds: string[];
  onSelect: (id: string) => void;

  // Recientes y sugerencias
  recentItems?: ChipOption[];
  suggestedItems?: ChipOption[];

  // Configuración
  minCharacters?: number;
  showResultCount?: boolean;
  emptyMessage?: string;

  // Estilo
  containerStyle?: object;
}

const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const theme = useTheme();

  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonChip,
            {
              backgroundColor: theme.colors.glassUltraLightAlt,
              borderRadius: theme.borderRadius.full,
            },
          ]}
        />
      ))}
    </View>
  );
};

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  searchQuery,
  onSearchChange,
  placeholder,
  isLoading,
  searchResults,
  selectedIds,
  onSelect,
  recentItems = [],
  suggestedItems = [],
  minCharacters = 2,
  showResultCount = true,
  emptyMessage = 'No se encontraron resultados',
  containerStyle,
}) => {
  const theme = useTheme();

  const trimmedQuery = searchQuery.trim();
  const isSearching = trimmedQuery.length >= minCharacters;
  const hasRecentItems = recentItems.length > 0;
  const hasSuggestedItems = suggestedItems.length > 0;
  const hasResults = searchResults.length > 0;

  const inputStyle = useMemo(
    () => ({
      borderColor: theme.colors.glassBorderSoft,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.s12,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceLight,
    }),
    [theme]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Input de búsqueda */}
      <View style={styles.searchInputContainer}>
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          selectionColor={theme.colors.primary}
          style={[styles.searchInput, inputStyle]}
        />
        {isLoading && (
          <View style={styles.searchInputIcon}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}
      </View>

      {/* Feedback visual */}
      {!isSearching && trimmedQuery.length > 0 && (
        <View style={styles.feedbackContainer}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.feedbackText, { color: theme.colors.textSecondary }]}>
            Escribe al menos {minCharacters} caracteres para buscar
          </Text>
        </View>
      )}

      {/* Resultados de búsqueda */}
      {isSearching ? (
        <>
          {isLoading ? (
            <SkeletonLoader count={4} />
          ) : hasResults ? (
            <>
              {showResultCount && (
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing.s10,
                    },
                  ]}
                >
                  {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}
                </Text>
              )}
              <ChipGroup
                options={searchResults}
                selectedIds={selectedIds}
                onSelect={onSelect}
                multiline
              />
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="search-outline"
                size={24}
                color={theme.colors.textTertiary}
              />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {emptyMessage}
              </Text>
            </View>
          )}
        </>
      ) : (
        <>
          {/* Recientes */}
          {hasRecentItems && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={theme.colors.primary}
                  style={styles.sectionIcon}
                />
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: theme.colors.textStrong,
                      fontWeight: '600',
                    },
                  ]}
                >
                  Recientes
                </Text>
              </View>
              <ChipGroup
                options={recentItems}
                selectedIds={selectedIds}
                onSelect={onSelect}
                multiline
              />
            </View>
          )}

          {/* Sugerencias */}
          {hasSuggestedItems && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="sparkles-outline"
                  size={16}
                  color={theme.colors.primary}
                  style={styles.sectionIcon}
                />
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: theme.colors.textStrong,
                      fontWeight: '600',
                    },
                  ]}
                >
                  Sugerencias
                </Text>
              </View>
              <ChipGroup
                options={suggestedItems}
                selectedIds={selectedIds}
                onSelect={onSelect}
                multiline
              />
            </View>
          )}

          {!hasRecentItems && !hasSuggestedItems && (
            <Text style={[styles.feedbackText, { color: theme.colors.textSecondary }]}>
              Escribe para buscar {placeholder.toLowerCase()}
            </Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  searchInputContainer: {
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1,
    fontSize: 14,
  },
  searchInputIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  feedbackText: {
    fontSize: 13,
    flex: 1,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionIcon: {
    marginRight: 2,
  },
  sectionLabel: {
    fontSize: 13,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skeletonChip: {
    width: 80,
    height: 32,
    opacity: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
