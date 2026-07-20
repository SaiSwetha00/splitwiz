export type TripType = 'travel' | 'roommates' | 'dinner' | 'event' | 'vacation' | 'other';

export const TRIP_TYPES: { value: TripType; label: string; emoji: string }[] = [
  { value: 'travel',    label: 'Travel',     emoji: '✈️' },
  { value: 'roommates', label: 'Roommates',  emoji: '🏠' },
  { value: 'dinner',    label: 'Dinner',     emoji: '🍽️' },
  { value: 'event',     label: 'Event',      emoji: '🎉' },
  { value: 'vacation',  label: 'Vacation',   emoji: '🏖️' },
  { value: 'other',     label: 'Other',      emoji: '📦' },
];

export type TripMember = {
  id: string;
  trip_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  avatar_color: string;
  is_creator: boolean;
  joined_at: string;
};

export type Trip = {
  id: string;
  user_id: string | null;
  name: string;
  type: string | null;
  currency: string;
  description: string | null;
  status: string;
  total_spent: number;
  created_at: string;
  updated_at: string;
  members: TripMember[];
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  member_id: string;
  amount: number;
  is_settled: boolean;
  settled_at: string | null;
  member?: TripMember;
};

export type TripExpense = {
  id: string;
  trip_id: string;
  title: string | null;
  amount: number | null;
  currency: string | null;
  category: string | null;
  category_icon: string | null;
  paid_by_member_id: string | null;
  date: string;
  note: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  paid_by?: TripMember;
  splits: ExpenseSplit[];
};

export type Settlement = {
  id: string;
  trip_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  method: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
  from_member?: TripMember;
  to_member?: TripMember;
};

export type ActivityEntry = {
  id: string;
  trip_id: string | null;
  user_id: string;
  action_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type MemberBalance = {
  member_id: string;
  net_balance: number;
  member?: TripMember;
};

export type DebtSimplification = {
  from_member_id: string;
  to_member_id: string;
  amount: number;
  from_member?: TripMember;
  to_member?: TripMember;
};

export type CategorySuggestion = {
  category: string;
  icon: string;
  confidence: number;
};

export type SplitType = 'equal' | 'exact' | 'percentage';

export const EXPENSE_CATEGORIES = [
  { key: 'Food & Drinks', icon: '🍕', color: '#f59e0b' },
  { key: 'Transport',     icon: '🚕', color: '#3b82f6' },
  { key: 'Hotel',         icon: '🏨', color: '#8b5cf6' },
  { key: 'Travel',        icon: '✈️', color: '#06b6d4' },
  { key: 'Shopping',      icon: '🛒', color: '#10b981' },
  { key: 'Bills',         icon: '⚡', color: '#f97316' },
  { key: 'Fun',           icon: '🎭', color: '#ec4899' },
  { key: 'Other',         icon: '📦', color: '#6b7280' },
] as const;

export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORIES)[number]['key'];

export const TRIP_SUGGESTIONS: Record<string, string[]> = {
  travel:    ['Hotel', 'Flight', 'Taxi', 'Dinner', 'Breakfast', 'Museum', 'Souvenir'],
  dinner:    ['Food', 'Drinks', 'Dessert', 'Tip'],
  roommates: ['Rent', 'Electricity', 'WiFi', 'Groceries', 'Cleaning'],
  event:     ['Tickets', 'Food', 'Drinks', 'Decoration', 'Transport'],
  vacation:  ['Hotel', 'Flight', 'Tours', 'Dinner', 'Shopping', 'Activities'],
  other:     [],
};
