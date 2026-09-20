export function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `\u20B9${formatted}`;
}

export function formatRelativeDate(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  if (timestamp >= todayStart) return 'Today';
  if (timestamp >= yesterdayStart) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatCardNumber(num: string, cardType?: string): string {
  const cleaned = num.replace(/\D/g, '');
  const isAmex = cardType === 'AMEX' || (!cardType && (cleaned.startsWith('34') || cleaned.startsWith('37')));
  if (isAmex) {
    const p1 = cleaned.slice(0, 4);
    const p2 = cleaned.slice(4, 10);
    const p3 = cleaned.slice(10, 15);
    return [p1, p2, p3].filter(Boolean).join(' ');
  }
  return cleaned.slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

export function maskCardNumber(num: string, cardType?: string): string {
  const cleaned = num.replace(/\D/g, '');
  const isAmex = cardType === 'AMEX' || (!cardType && (cleaned.startsWith('34') || cleaned.startsWith('37')));
  if (isAmex) {
    if (cleaned.length < 9) return formatCardNumber(cleaned, 'AMEX');
    return cleaned.slice(0, 4) + ' ****** ' + cleaned.slice(-5);
  }
  if (cleaned.length < 8) return formatCardNumber(cleaned);
  const masked = cleaned.slice(0, 4) + ' **** **** ' + cleaned.slice(-4);
  return masked;
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
