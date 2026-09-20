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

export function formatCardNumber(num: string): string {
  const cleaned = num.replace(/\s/g, '');
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

export function maskCardNumber(num: string): string {
  const cleaned = num.replace(/\s/g, '');
  if (cleaned.length < 8) return formatCardNumber(cleaned);
  const masked = cleaned.slice(0, 4) + ' **** **** ' + cleaned.slice(-4);
  return masked;
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
