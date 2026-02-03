const DNS_RESOLVER_BASE = 'https://dns.google/resolve';

const hasDnsAnswer = (data: any): boolean => {
  return Array.isArray(data?.Answer) && data.Answer.length > 0;
};

const checkDnsRecord = async (
  domain: string,
  recordType: 'MX' | 'A' | 'AAAA'
): Promise<boolean> => {
  const url = `${DNS_RESOLVER_BASE}?name=${encodeURIComponent(
    domain
  )}&type=${recordType}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/dns-json' },
  });
  if (!response.ok) {
    return false;
  }
  const data = await response.json();
  return hasDnsAnswer(data);
};

export const hasValidEmailDomain = async (email: string): Promise<boolean> => {
  const atIndex = email.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return false;
  }

  const domain = email.slice(atIndex + 1).toLowerCase();

  try {
    if (await checkDnsRecord(domain, 'MX')) {
      return true;
    }
    if (await checkDnsRecord(domain, 'A')) {
      return true;
    }
    if (await checkDnsRecord(domain, 'AAAA')) {
      return true;
    }
  } catch (error) {
    console.error('[hasValidEmailDomain] DNS lookup failed:', error);
  }

  return false;
};
