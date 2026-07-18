import type { CategorySuggestion } from '@/types/trips';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Drinks': [
    'zomato', 'swiggy', 'restaurant', 'dinner', 'lunch', 'breakfast',
    'cafe', 'coffee', 'food', 'pizza', 'burger', 'hotel food', 'chai',
    'tea', 'snack', 'drinks', 'bar', 'pub', 'biryani', 'thali', 'dosa',
  ],
  'Transport': [
    'uber', 'ola', 'rapido', 'taxi', 'auto', 'bus', 'metro', 'train',
    'petrol', 'fuel', 'parking', 'cab', 'rickshaw', 'bike', 'ferry', 'toll',
  ],
  'Hotel': [
    'hotel', 'resort', 'airbnb', 'hostel', 'accommodation', 'stay',
    'room', 'lodge', 'inn', 'motel', 'oyo',
  ],
  'Travel': [
    'flight', 'air india', 'indigo', 'spicejet', 'airport', 'visa',
    'passport', 'airline', 'ticket', 'go air', 'akasa',
  ],
  'Shopping': [
    'amazon', 'flipkart', 'mall', 'shop', 'grocery', 'bigbasket',
    'blinkit', 'zepto', 'store', 'market', 'supermarket', 'myntra',
  ],
  'Fun': [
    'netflix', 'hotstar', 'movie', 'cinema', 'concert', 'game',
    'spotify', 'entertainment', 'show', 'park', 'amusement', 'sports',
    'bowling', 'escape', 'arcade',
  ],
  'Bills': [
    'electricity', 'water', 'wifi', 'internet', 'recharge', 'mobile',
    'phone bill', 'gas', 'cable', 'broadband', 'dth',
  ],
};

const CATEGORY_ICONS: Record<string, string> = {
  'Food & Drinks': '🍕',
  'Transport':     '🚕',
  'Hotel':         '🏨',
  'Travel':        '✈️',
  'Shopping':      '🛒',
  'Fun':           '🎭',
  'Bills':         '⚡',
  'Other':         '📦',
};

export function autoDetectCategory(title: string): CategorySuggestion {
  const lower = title.toLowerCase().trim();
  if (!lower) return { category: 'Other', icon: '📦', confidence: 0 };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower === kw) {
        return { category, icon: CATEGORY_ICONS[category] ?? '📦', confidence: 1.0 };
      }
    }
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return { category, icon: CATEGORY_ICONS[category] ?? '📦', confidence: 0.8 };
      }
    }
  }

  return { category: 'Other', icon: '📦', confidence: 0 };
}
