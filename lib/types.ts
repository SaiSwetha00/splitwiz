// Client-facing shapes returned by the API. Kept free of server-only imports
// so they can be used in client components.

export type Member = { id: string; name: string };

export type Share = { memberId: string; amount: number };

export type Expense = {
  id: string;
  description: string;
  amount: number; // cents
  category: string | null;
  splitType: "EQUAL" | "CUSTOM";
  createdAt: string;
  paidById: string;
  paidByName: string;
  shares: Share[];
};

export type Balance = {
  memberId: string;
  name: string;
  paid: number;
  owed: number;
  net: number;
};

export type Settlement = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

export type TripState = {
  id: string;
  code: string;
  name: string;
  currency: string;
  createdAt: string;
  totalSpent: number;
  members: Member[];
  expenses: Expense[];
  balances: Balance[];
  settlements: Settlement[];
};
