import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export type RuleType =
  | 'ruido'
  | 'visitas'
  | 'limpieza'
  | 'fumar'
  | 'mascotas'
  | 'cocina'
  | 'banos'
  | 'basura'
  | 'seguridad'
  | 'otros';

export type ServiceType =
  | 'luz'
  | 'agua'
  | 'gas'
  | 'internet'
  | 'limpieza'
  | 'calefaccion'
  | 'otros';

export interface RuleIconResult {
  iconName: string;
  isNegative: boolean;
  ruleType: RuleType;
}

export interface ServiceIconResult {
  iconName: string;
  serviceType: ServiceType;
}

const SUB_RULE_TYPE_MAP = new Map<
  string,
  { ruleType: 'visitas' | 'fumar' | 'mascotas'; isNegative: boolean }
>([
  ['si, con aviso', { ruleType: 'visitas', isNegative: false }],
  ['no permitidas', { ruleType: 'visitas', isNegative: true }],
  ['si, pero sin dormir', { ruleType: 'visitas', isNegative: false }],
  ['sin problema', { ruleType: 'visitas', isNegative: false }],
  ['no fumar', { ruleType: 'fumar', isNegative: true }],
  ['solo en terraza/balcon', { ruleType: 'fumar', isNegative: false }],
  ['permitido en zonas comunes', { ruleType: 'fumar', isNegative: false }],
  ['no se permiten', { ruleType: 'mascotas', isNegative: true }],
  ['solo gatos', { ruleType: 'mascotas', isNegative: false }],
  ['solo perros', { ruleType: 'mascotas', isNegative: false }],
  ['permitidas bajo acuerdo', { ruleType: 'mascotas', isNegative: false }],
]);

const RULE_ICON_MAP: Record<RuleType, { positive: string; negative: string }> = {
  ruido: { positive: 'volume-high', negative: 'volume-mute' },
  visitas: { positive: 'people', negative: 'people' },
  limpieza: { positive: 'sparkles', negative: 'sparkles' },
  fumar: { positive: 'flame', negative: 'flame' },
  mascotas: { positive: 'paw', negative: 'paw' },
  cocina: { positive: 'restaurant', negative: 'restaurant' },
  banos: { positive: 'water', negative: 'water' },
  basura: { positive: 'trash', negative: 'trash' },
  seguridad: { positive: 'lock-closed', negative: 'lock-open' },
  otros: { positive: 'ellipsis-horizontal', negative: 'ellipsis-horizontal' },
};

const SERVICE_ICON_MAP: Record<ServiceType, string> = {
  luz: 'flash',
  agua: 'water',
  gas: 'flame',
  internet: 'wifi',
  limpieza: 'sparkles',
  calefaccion: 'thermometer',
  otros: 'construct',
};

export const getRuleIconData = (rule?: string | null): RuleIconResult => {
  const normalized = typeof rule === 'string' ? rule.toLowerCase().trim() : '';
  const subRuleMatch = SUB_RULE_TYPE_MAP.get(normalized);

  const ruleType: RuleType = subRuleMatch?.ruleType ?? (() => {
    if (
      normalized.includes('ruido') ||
      normalized.includes('silencio') ||
      normalized.includes('horario flexible')
    ) {
      return 'ruido';
    }
    if (normalized.includes('visitas')) return 'visitas';
    if (normalized.includes('limpieza')) return 'limpieza';
    if (normalized.includes('fumar')) return 'fumar';
    if (normalized.includes('mascotas') || normalized.includes('mascot')) return 'mascotas';
    if (normalized.includes('cocina')) return 'cocina';
    if (normalized.includes('banos') || normalized.includes('baños')) return 'banos';
    if (normalized.includes('basura')) return 'basura';
    if (
      normalized.includes('puerta') ||
      normalized.includes('llave') ||
      normalized.includes('seguridad')
    ) {
      return 'seguridad';
    }
    return 'otros';
  })();

  const isNegative =
    subRuleMatch?.isNegative ??
    ((ruleType === 'visitas' && normalized.includes('no permitidas')) ||
      (ruleType === 'fumar' && normalized.includes('no fumar')) ||
      (ruleType === 'mascotas' && normalized.includes('no se permiten')));

  const iconSet = RULE_ICON_MAP[ruleType] ?? RULE_ICON_MAP.otros;
  const iconName = isNegative ? iconSet.negative : iconSet.positive;

  return { iconName, isNegative, ruleType };
};

export const getServiceIconData = (serviceName?: string | null): ServiceIconResult => {
  const normalized = typeof serviceName === 'string' ? serviceName.toLowerCase() : '';

  let serviceType: ServiceType = 'otros';

  if (normalized.includes('luz') || normalized.includes('electric')) {
    serviceType = 'luz';
  } else if (normalized.includes('agua')) {
    serviceType = 'agua';
  } else if (normalized.includes('gas')) {
    serviceType = 'gas';
  } else if (normalized.includes('internet') || normalized.includes('wifi')) {
    serviceType = 'internet';
  } else if (normalized.includes('limpieza')) {
    serviceType = 'limpieza';
  } else if (normalized.includes('calefaccion') || normalized.includes('calefacción')) {
    serviceType = 'calefaccion';
  }

  return {
    iconName: SERVICE_ICON_MAP[serviceType],
    serviceType,
  };
};

interface RuleIconProps {
  rule?: string | null;
  size?: number;
  color?: string;
  negativeColor?: string;
}

interface ServiceIconProps {
  serviceName?: string | null;
  size?: number;
  color?: string;
}

const iconStyles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prohibitedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const RuleIcon: React.FC<RuleIconProps> = ({
  rule,
  size = 18,
  color = '#6B7280',
  negativeColor = '#EF4444',
}) => {
  const { iconName, isNegative, ruleType } = getRuleIconData(rule);

  const needsProhibitedOverlay =
    isNegative &&
    (ruleType === 'visitas' ||
      ruleType === 'fumar' ||
      ruleType === 'mascotas' ||
      ruleType === 'limpieza' ||
      ruleType === 'cocina' ||
      ruleType === 'banos' ||
      ruleType === 'basura');

  if (needsProhibitedOverlay) {
    return (
      <View style={[iconStyles.container, { width: size, height: size }]}>
        <Ionicons
          name={iconName}
          size={size * 0.75}
          color={color}
        />
        <View style={iconStyles.prohibitedOverlay}>
          <Ionicons
            name="ban"
            size={size}
            color={negativeColor}
          />
        </View>
      </View>
    );
  }

  return (
    <Ionicons
      name={iconName}
      size={size}
      color={isNegative ? negativeColor : color}
    />
  );
};

export const ServiceIcon: React.FC<ServiceIconProps> = ({
  serviceName,
  size = 18,
  color = '#6B7280',
}) => {
  const { iconName } = getServiceIconData(serviceName);

  return (
    <Ionicons
      name={iconName}
      size={size}
      color={color}
    />
  );
};
