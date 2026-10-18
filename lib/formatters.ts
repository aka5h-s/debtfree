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

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const dateStr = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr}, ${timeStr}`;
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

export interface CardColorTheme {
  primary: string;
  gradient: [string, string];
}

/**
 * Automatically resolves the most prominent brand color theme for a credit card
 * based on bank name, issuer keywords, and card network.
 * Features high-energy, vibrant, visually stunning NeoPOP colors and gradients.
 */
export const CRED_CARD_THEMES = {
  KIWI_LIME: { primary: '#65D300', gradient: ['#0C2604', '#55B800'] as [string, string] },
  HDFC_ROYAL: { primary: '#004C8F', gradient: ['#031838', '#004C8F'] as [string, string] },
  ICICI_RUBY: { primary: '#B8252E', gradient: ['#2A0407', '#B8252E'] as [string, string] },
  SBI_SAPPHIRE: { primary: '#1B3F8B', gradient: ['#091538', '#214DB0'] as [string, string] },
  AXIS_BURGUNDY: { primary: '#97144D', gradient: ['#260212', '#97144D'] as [string, string] },
  KOTAK_SCARLET: { primary: '#ED1B24', gradient: ['#330306', '#D91C24'] as [string, string] },
  AMEX_TEAL: { primary: '#00A3A6', gradient: ['#002425', '#00A3A6'] as [string, string] },
  TATA_PURPLE: { primary: '#7928CA', gradient: ['#1C0438', '#7928CA'] as [string, string] },
  SWIGGY_ORANGE: { primary: '#FC8019', gradient: ['#331500', '#FC8019'] as [string, string] },
  BOB_SAFFRON: { primary: '#F37023', gradient: ['#351401', '#EA580C'] as [string, string] },
  ONECARD_OBSIDIAN: { primary: '#4A4A52', gradient: ['#18181C', '#3E3E48'] as [string, string] },
  ELECTRIC_BLUE: { primary: '#0141C9', gradient: ['#051336', '#1E88E5'] as [string, string] },
  EMERALD_GREEN: { primary: '#016C4E', gradient: ['#021B13', '#016C4E'] as [string, string] },
};

/**
 * Automatically resolves the most prominent brand color theme for a credit card
 * based on bank name, issuer keywords, and card network.
 * Accurately maps each card to vivid, distinct authentic bank palettes.
 */
export function getProminentCardTheme(cardName?: string, cardType?: string): CardColorTheme {
  const name = (cardName || '').toLowerCase().trim();

  // 1. Kiwi / Slice
  if (name.includes('kiwi') || name.includes('slice')) {
    return CRED_CARD_THEMES.KIWI_LIME;
  }
  // 2. OneCard / Metal / Infinia / Magnus / Black / Aurum
  if (name.includes('metal') || name.includes('infinia') || name.includes('magnus') || name.includes('black') || name.includes('onecard') || name.includes('aurum')) {
    return CRED_CARD_THEMES.ONECARD_OBSIDIAN;
  }
  // 3. Swiggy
  if (name.includes('swiggy')) {
    return CRED_CARD_THEMES.SWIGGY_ORANGE;
  }
  // 4. ICICI Bank / Amazon Pay
  if (name.includes('amazon')) {
    return CRED_CARD_THEMES.BOB_SAFFRON;
  }
  if (name.includes('icici') || name.includes('sapphiro') || name.includes('rubyx') || name.includes('coral')) {
    return CRED_CARD_THEMES.ICICI_RUBY;
  }
  // 5. HDFC Bank / Millennia / Regalia / Diners / MoneyBack
  if (name.includes('hdfc') || name.includes('millennia') || name.includes('regalia') || name.includes('diners') || name.includes('moneyback') || name.includes('subhashree')) {
    return CRED_CARD_THEMES.HDFC_ROYAL;
  }
  // 6. Axis Bank / ACE / Neo / Flipkart / MyZone
  if (name.includes('axis') || name.includes('flipkart') || name.includes('myzone') || name.includes('ace')) {
    return CRED_CARD_THEMES.AXIS_BURGUNDY;
  }
  // 7. SBI Card / SimplyClick / SimplySave / Prime
  if (name.includes('sbi') || name.includes('state bank') || name.includes('simplyclick') || name.includes('simplysave') || name.includes('prime') || name.includes('aurum')) {
    return CRED_CARD_THEMES.SBI_SAPPHIRE;
  }
  // 8. Kotak 811 / Kotak / White / Zen / League
  if (name.includes('kotak') || name.includes('811') || name.includes('zen') || name.includes('league')) {
    return CRED_CARD_THEMES.KOTAK_SCARLET;
  }
  // 9. Tata Neu / NeuCard
  if (name.includes('tata') || name.includes('neu')) {
    return CRED_CARD_THEMES.TATA_PURPLE;
  }
  // 10. American Express / Amex
  if (name.includes('amex') || name.includes('american express')) {
    return CRED_CARD_THEMES.AMEX_TEAL;
  }
  // 11. Bank of Baroda / BOB
  if (name.includes('baroda') || name.includes('bob')) {
    return CRED_CARD_THEMES.BOB_SAFFRON;
  }
  // 12. IndusInd / Indie / Legend / Pinnacle
  if (name.includes('indusind') || name.includes('indie') || name.includes('legend') || name.includes('pinnacle') || name.includes('tiger')) {
    return CRED_CARD_THEMES.ICICI_RUBY;
  }
  // 13. IDFC FIRST Bank
  if (name.includes('idfc') || name.includes('first')) {
    return CRED_CARD_THEMES.AXIS_BURGUNDY;
  }
  // 14. Standard Chartered / StanC
  if (name.includes('standard') || name.includes('scb') || name.includes('stanc')) {
    return CRED_CARD_THEMES.AMEX_TEAL;
  }
  // 15. Scapia / Federal / Jupiter / Fi
  if (name.includes('scapia') || name.includes('federal') || name.includes('jupiter') || name.includes('fi')) {
    return CRED_CARD_THEMES.ELECTRIC_BLUE;
  }
  // 16. Salary Se CUB / CUB
  if (name.includes('cub') || name.includes('salary')) {
    return CRED_CARD_THEMES.ELECTRIC_BLUE;
  }

  // Network Fallbacks
  switch (cardType) {
    case 'RUPAY':
      return CRED_CARD_THEMES.ELECTRIC_BLUE;
    case 'VISA':
      return CRED_CARD_THEMES.HDFC_ROYAL;
    case 'MASTERCARD':
      return CRED_CARD_THEMES.BOB_SAFFRON;
    case 'AMEX':
      return CRED_CARD_THEMES.AMEX_TEAL;
    default:
      return CRED_CARD_THEMES.TATA_PURPLE;
  }
}

export function getProminentCardColor(cardName?: string, cardType?: string): string {
  return getProminentCardTheme(cardName, cardType).primary;
}

export function getProminentCardGradient(cardName?: string, cardType?: string): [string, string] {
  return getProminentCardTheme(cardName, cardType).gradient;
}

