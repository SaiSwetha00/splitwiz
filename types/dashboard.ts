export interface DailyExpense {
  date: string;
  amount: number;
}

export interface CategoryStat {
  name: string;
  amount: number;
}

export interface BalanceSparkPoint {
  date: string;
  value: number;
}

export interface DueSoonSub {
  id: string;
  name: string;
  amount_cents: number;
  billing_cycle: string;
  next_billing_date: string | null;
}

export interface SavingsGoalStat {
  id: string;
  name: string;
  deadline: string | null;
  current_cents: number;
  target_cents: number;
}

export interface RecentTx {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface DashboardStats {
  trips: {
    count: number;
    activeCount: number;
  };
  expenses: {
    thisMonthTotal: number;
    lastMonthTotal: number;
    dailyData: DailyExpense[];
  };
  categoryData: CategoryStat[];
  savings: {
    totalSaved: number;
    totalTarget: number;
    goalsCount: number;
    goals: SavingsGoalStat[];
  };
  subscriptions: {
    monthlyTotal: number;
    dueSoon: DueSoonSub[];
    dueSoonTotal: number;
    dueSoonCount: number;
  };
  notifications: { unreadCount: number };
  balance: {
    net: number;
    moneyIn: number;
    moneyOut: number;
    sparkline: BalanceSparkPoint[];
  };
  recent: RecentTx[];
  currency: string;
}
