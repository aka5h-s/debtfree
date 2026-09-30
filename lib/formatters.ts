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

export type ReturnDateStatusType = 'OVERDUE' | 'DUE_TODAY' | 'DUE_SOON' | 'UPCOMING';

export interface ReturnDateStatus {
  type: ReturnDateStatusType;
  label: string;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean;
  daysDiff: number;
  formattedDate: string;
}

export function getReturnDateStatus(returnDateTimestamp?: number | null): ReturnDateStatus | null {
  if (!returnDateTimestamp) return null;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const returnDate = new Date(returnDateTimestamp);
  const targetStart = new Date(returnDate.getFullYear(), returnDate.getMonth(), returnDate.getDate()).getTime();

  const diffDays = Math.round((targetStart - todayStart) / 86400000);
  const formattedDate = returnDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: returnDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      type: 'OVERDUE',
      label: `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} (${formattedDate})`,
      isOverdue: true,
      isDueToday: false,
      isDueSoon: false,
      daysDiff: diffDays,
      formattedDate,
    };
  }

  if (diffDays === 0) {
    return {
      type: 'DUE_TODAY',
      label: 'Due today',
      isOverdue: false,
      isDueToday: true,
      isDueSoon: true,
      daysDiff: 0,
      formattedDate,
    };
  }

  if (diffDays <= 2) {
    return {
      type: 'DUE_SOON',
      label: `Due in ${diffDays} ${diffDays === 1 ? 'day' : 'days'} (${formattedDate})`,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: true,
      daysDiff: diffDays,
      formattedDate,
    };
  }

  return {
    type: 'UPCOMING',
    label: `Expected: ${formattedDate}`,
    isOverdue: false,
    isDueToday: false,
    isDueSoon: false,
    daysDiff: diffDays,
    formattedDate,
  };
}

