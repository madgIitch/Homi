// src/components/LocationSelector.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { locationService } from '../services/locationService';
import { LocationSearchInput } from './LocationSearchInput';
import { ChipGroup } from './ChipGroup';

interface ChipOption {
  id: string;
  label: string;
}

interface LocationSelectorProps {
  // Ciudades seleccionadas
  selectedCities: ChipOption[];
  onCitiesChange: (cities: ChipOption[]) => void;

  // Zonas seleccionadas (IDs)
  selectedZones: string[];
  onZonesChange: (zones: string[]) => void;

  // Mapa de zona a ciudad (para filtrar al deseleccionar ciudad)
  zoneCityById: Record<string, string>;
  onZoneCityMapChange: (map: Record<string, string>) => void;

  // Opciones (opcional - para mostrar zonas seleccionadas con labels)
  selectedZoneOptions?: ChipOption[];
  onSelectedZoneOptionsChange?: (options: ChipOption[]) => void;

  // Configuración
  showCities?: boolean;
  showZones?: boolean;
  minCharacters?: number;
  recentZonesStorageKey?: string;
}

const RECENT_ZONES_LIMIT = 5;

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedCities,
  onCitiesChange,
  selectedZones,
  onZonesChange,
  zoneCityById,
  onZoneCityMapChange,
  selectedZoneOptions = [],
  onSelectedZoneOptionsChange,
  showCities = true,
  showZones = true,
  minCharacters = 2,
  recentZonesStorageKey = '@recentZones',
}) => {
  const theme = useTheme();

  // Estados de búsqueda de ciudades
  const [cityQuery, setCityQuery] = useState('');
  const [cityOptions, setCityOptions] = useState<ChipOption[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  // Estados de búsqueda de zonas
  const [zoneQuery, setZoneQuery] = useState('');
  const [zoneOptions, setZoneOptions] = useState<ChipOption[]>([]);
  const [suggestedZones, setSuggestedZones] = useState<ChipOption[]>([]);
  const [recentZones, setRecentZones] = useState<ChipOption[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);

  // Mapa de cityId a cityName para mostrar ciudades en zonas seleccionadas
  const [cityNamesById, setCityNamesById] = useState<Record<string, string>>({});

  // Cargar zonas recientes desde AsyncStorage
  useEffect(() => {
    if (!showZones) return;

    const loadRecentZones = async () => {
      try {
        const raw = await AsyncStorage.getItem(recentZonesStorageKey);
        if (raw) {
          const parsed: ChipOption[] = JSON.parse(raw);
          setRecentZones(parsed.slice(0, RECENT_ZONES_LIMIT));
        }
      } catch (error) {
        console.warn('[LocationSelector] Error loading recent zones:', error);
      }
    };

    loadRecentZones();
  }, [showZones, recentZonesStorageKey]);

  // Búsqueda de ciudades
  useEffect(() => {
    if (!showCities) return;
    if (cityQuery.trim().length < minCharacters) {
      setCityOptions([]);
      return;
    }

    let mounted = true;
    const searchCities = async () => {
      setIsLoadingCities(true);
      try {
        const results = await locationService.getCities({ query: cityQuery.trim() });
        if (mounted) {
          setCityOptions(results.map((city) => ({ id: city.id, label: city.name })));
        }
      } catch (error) {
        if (mounted) {
          console.error('[LocationSelector] Error searching cities:', error);
          setCityOptions([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingCities(false);
        }
      }
    };

    const timeoutId = setTimeout(searchCities, 300);
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [cityQuery, minCharacters, showCities]);

  // Búsqueda de zonas - busca en todas las ciudades seleccionadas
  useEffect(() => {
    if (!showZones || selectedCities.length === 0) {
      setZoneOptions([]);
      setSuggestedZones([]);
      return;
    }

    // Si no hay query, cargar sugerencias (top places de todas las ciudades)
    if (zoneQuery.trim().length < minCharacters) {
      let mounted = true;
      const loadSuggestions = async () => {
        setIsLoadingZones(true);
        try {
          // Cargar top places de todas las ciudades seleccionadas
          const allSuggestions: Array<ChipOption & { cityId: string; cityName: string }> = [];
          for (const city of selectedCities) {
            const results = await locationService.getPlaces(city.id, {
              top: true,
              limit: 20,
            });
            allSuggestions.push(
              ...results.map((place) => ({
                id: place.id,
                label: place.name, // Sin incluir la ciudad
                cityId: city.id,
                cityName: city.label,
              }))
            );
          }

          if (mounted) {
            // Eliminar duplicados por ID
            const uniqueSuggestions = allSuggestions.filter(
              (item, index, arr) => arr.findIndex((t) => t.id === item.id) === index
            );

            // Actualizar el mapa de zona a ciudad
            const newZoneCityMap = { ...zoneCityById };
            const newCityNames = { ...cityNamesById };
            uniqueSuggestions.forEach((suggestion) => {
              if (!newZoneCityMap[suggestion.id]) {
                newZoneCityMap[suggestion.id] = suggestion.cityId;
              }
              if (!newCityNames[suggestion.cityId]) {
                newCityNames[suggestion.cityId] = suggestion.cityName;
              }
            });
            onZoneCityMapChange(newZoneCityMap);
            setCityNamesById(newCityNames);

            setSuggestedZones(
              uniqueSuggestions.slice(0, 12).map(s => ({ id: s.id, label: s.label }))
            );
          }
        } catch (error) {
          if (mounted) {
            console.error('[LocationSelector] Error loading zone suggestions:', error);
            setSuggestedZones([]);
          }
        } finally {
          if (mounted) {
            setIsLoadingZones(false);
          }
        }
      };

      loadSuggestions();
      return () => {
        mounted = false;
      };
    }

    // Búsqueda con query
    let mounted = true;
    const searchZones = async () => {
      setIsLoadingZones(true);
      try {
        // Buscar en todas las ciudades seleccionadas
        const allResults: Array<ChipOption & { cityId: string; cityName: string }> = [];
        for (const city of selectedCities) {
          const results = await locationService.getPlaces(city.id, {
            query: zoneQuery.trim(),
            limit: 50,
          });
          allResults.push(
            ...results.map((place) => ({
              id: place.id,
              label: place.name, // Sin incluir la ciudad
              cityId: city.id,
              cityName: city.label,
            }))
          );
        }

        if (mounted) {
          // Eliminar duplicados por ID
          const uniqueResults = allResults.filter(
            (item, index, arr) => arr.findIndex((t) => t.id === item.id) === index
          );

          setZoneOptions(uniqueResults.map(r => ({ id: r.id, label: r.label })));

          // Actualizar el mapa de zona a ciudad y nombres de ciudad
          const newZoneCityMap = { ...zoneCityById };
          const newCityNames = { ...cityNamesById };
          uniqueResults.forEach((result) => {
            if (!newZoneCityMap[result.id]) {
              newZoneCityMap[result.id] = result.cityId;
            }
            if (!newCityNames[result.cityId]) {
              newCityNames[result.cityId] = result.cityName;
            }
          });
          onZoneCityMapChange(newZoneCityMap);
          setCityNamesById(newCityNames);
        }
      } catch (error) {
        if (mounted) {
          console.error('[LocationSelector] Error searching zones:', error);
          setZoneOptions([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingZones(false);
        }
      }
    };

    const timeoutId = setTimeout(searchZones, 300);
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [zoneQuery, selectedCities, minCharacters, showZones, zoneCityById, onZoneCityMapChange]);

  // Manejar selección de ciudad
  const handleCitySelect = useCallback(
    (cityId: string) => {
      const isSelected = selectedCities.some((c) => c.id === cityId);
      const picked = cityOptions.find((c) => c.id === cityId);

      if (isSelected) {
        // Deseleccionar la ciudad activa
        onCitiesChange([]);
      } else if (picked) {
        // Seleccionar nueva ciudad (reemplaza la anterior)
        // Solo puede haber una ciudad activa a la vez
        onCitiesChange([picked]);

        // Guardar el nombre de la ciudad en el mapa
        setCityNamesById((prev) => ({
          ...prev,
          [picked.id]: picked.label,
        }));

        console.log(`[LocationSelector] Ciudad activa cambiada a: ${picked.label}`);
      }

      setCityQuery('');
    },
    [
      selectedCities,
      cityOptions,
      onCitiesChange,
    ]
  );

  // Manejar selección de zona
  const handleZoneSelect = useCallback(
    async (zoneId: string) => {
      const isSelected = selectedZones.includes(zoneId);

      if (isSelected) {
        // Deseleccionar zona
        const nextZones = selectedZones.filter((z) => z !== zoneId);
        onZonesChange(nextZones);

        if (onSelectedZoneOptionsChange) {
          const nextZoneOptions = selectedZoneOptions.filter((z) => z.id !== zoneId);
          onSelectedZoneOptionsChange(nextZoneOptions);
        }
      } else {
        // Seleccionar zona
        const nextZones = [...selectedZones, zoneId];
        onZonesChange(nextZones);

        // Encontrar el label de la zona
        const allZoneOptions = [
          ...zoneOptions,
          ...suggestedZones,
          ...recentZones,
        ];
        const selected = allZoneOptions.find((z) => z.id === zoneId);

        if (selected) {
          if (onSelectedZoneOptionsChange) {
            const nextZoneOptions = [...selectedZoneOptions, selected];
            onSelectedZoneOptionsChange(nextZoneOptions);
          }

          // Guardar en recientes
          try {
            const nextRecent = [
              selected,
              ...recentZones.filter((z) => z.id !== selected.id),
            ].slice(0, RECENT_ZONES_LIMIT);
            setRecentZones(nextRecent);
            await AsyncStorage.setItem(
              recentZonesStorageKey,
              JSON.stringify(nextRecent)
            );
          } catch (error) {
            console.warn('[LocationSelector] Error saving recent zones:', error);
          }
        }
      }
    },
    [
      selectedZones,
      selectedZoneOptions,
      zoneOptions,
      suggestedZones,
      recentZones,
      onZonesChange,
      onSelectedZoneOptionsChange,
      recentZonesStorageKey,
    ]
  );

  // Manejar deselección de ciudad desde chips seleccionados
  const handleRemoveCity = useCallback(
    (cityId: string) => {
      // Limpiar la ciudad activa (solo puede haber una)
      onCitiesChange([]);
      console.log('[LocationSelector] Ciudad activa removida, manteniendo zonas seleccionadas');
    },
    [onCitiesChange]
  );

  // Enriquecer zonas seleccionadas con el nombre de la ciudad
  const displayZoneOptions = useMemo(() => {
    return selectedZoneOptions.map((zone) => {
      const cityId = zoneCityById[zone.id];
      const cityName = cityNamesById[cityId];

      // Si ya tiene el formato "(Ciudad)", mantenerlo
      if (zone.label.includes('(') && zone.label.includes(')')) {
        return zone;
      }

      // Si no, agregar la ciudad
      if (cityName) {
        return { ...zone, label: `${zone.label} (${cityName})` };
      }

      return zone;
    });
  }, [selectedZoneOptions, zoneCityById, cityNamesById]);

  return (
    <View style={styles.container}>
      {/* Búsqueda y selección de ciudades */}
      {showCities && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textStrong }]}>
            Ciudades de interés
          </Text>
          <LocationSearchInput
            searchQuery={cityQuery}
            onSearchChange={setCityQuery}
            placeholder="Buscar ciudades"
            isLoading={isLoadingCities}
            searchResults={cityOptions}
            selectedIds={selectedCities.map((c) => c.id)}
            onSelect={handleCitySelect}
            minCharacters={minCharacters}
            showResultCount
            emptyMessage="No se encontraron ciudades"
          />

          {/* Ciudad activa */}
          {selectedCities.length > 0 && (
            <View style={styles.selectedSection}>
              <Text
                style={[
                  styles.selectedLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Ciudad activa
              </Text>
              <ChipGroup
                options={selectedCities}
                selectedIds={selectedCities.map((c) => c.id)}
                onSelect={handleRemoveCity}
                multiline
              />
            </View>
          )}

          {/* Zonas seleccionadas */}
          {selectedZones.length > 0 && onSelectedZoneOptionsChange && (
            <View style={styles.selectedSection}>
              <Text
                style={[
                  styles.selectedLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {selectedZones.length} zona{selectedZones.length !== 1 ? 's' : ''}{' '}
                seleccionada{selectedZones.length !== 1 ? 's' : ''}
              </Text>
              <ChipGroup
                options={displayZoneOptions}
                selectedIds={selectedZones}
                onSelect={handleZoneSelect}
                multiline
              />
            </View>
          )}
        </View>
      )}

      {/* Búsqueda y selección de zonas */}
      {showZones && selectedCities.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textStrong }]}>
            Zonas específicas
          </Text>
          <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
            Buscando en {selectedCities[0]?.label || 'ciudad seleccionada'}
          </Text>
          <LocationSearchInput
            searchQuery={zoneQuery}
            onSearchChange={setZoneQuery}
            placeholder="Buscar zonas o barrios"
            isLoading={isLoadingZones}
            searchResults={zoneOptions}
            selectedIds={selectedZones}
            onSelect={handleZoneSelect}
            recentItems={recentZones}
            suggestedItems={suggestedZones}
            minCharacters={minCharacters}
            showResultCount
            emptyMessage="No se encontraron zonas en las ciudades seleccionadas"
          />
        </View>
      )}

      {/* Mensaje cuando no hay ciudades seleccionadas pero showZones = true */}
      {showZones && selectedCities.length === 0 && showCities && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Primero selecciona al menos una ciudad para buscar zonas
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 13,
    marginTop: -6,
  },
  selectedSection: {
    gap: 8,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
