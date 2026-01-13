export type NameSource = {
  first_name?: string | null;
  last_name?: string | null;
  users?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export const getUserName = (
  source?: NameSource | null,
  fallback = 'Usuario',
  _options?: { allowDisplayNameFallback?: boolean }
): string => {
  const firstName = source?.first_name ?? source?.users?.first_name ?? '';
  const lastName = source?.last_name ?? source?.users?.last_name ?? '';
  const fullName = [firstName, lastName].map((value) => value.trim()).filter(Boolean).join(' ');
  if (fullName) return fullName;
  return fallback;
};

export const getUserInitials = (
  source?: NameSource | null,
  fallback = '?',
  options?: { allowDisplayNameFallback?: boolean }
): string => {
  const name = getUserName(source, '', options);
  if (!name) return fallback;
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};
