export type TransactionType = 'settlement_paid' | 'settlement_received' | 'expense';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export type Transaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string | null;
  payment_card_id: string | null;
  related_expense_id: string | null;
  related_settlement_id: string | null;
  status: TransactionStatus;
  created_at: string;
  // Enriched server-side
  trip_name?: string;
  expense_title?: string;
};

export type TransactionSummary = {
  money_in: number;
  money_out: number;
  total_owed: number;
};

export type TransactionsResponse = {
  transactions: Transaction[];
  summary: TransactionSummary;
};
