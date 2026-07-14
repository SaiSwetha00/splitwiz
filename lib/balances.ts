// Compute per-member balances and a minimal set of settle-up transactions.

export type MemberLike = { id: string; name: string };

export type ExpenseLike = {
  amount: number; // total in cents
  paidById: string;
  shares: { memberId: string; amount: number }[];
};

export type Balance = {
  memberId: string;
  name: string;
  paid: number; // total this member paid, in cents
  owed: number; // total this member's share of expenses, in cents
  net: number; // paid - owed; positive => is owed money, negative => owes
};

export type Settlement = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number; // cents
};

export function computeBalances(
  members: MemberLike[],
  expenses: ExpenseLike[]
): Balance[] {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  for (const m of members) {
    paid.set(m.id, 0);
    owed.set(m.id, 0);
  }
  for (const e of expenses) {
    paid.set(e.paidById, (paid.get(e.paidById) ?? 0) + e.amount);
    for (const s of e.shares) {
      owed.set(s.memberId, (owed.get(s.memberId) ?? 0) + s.amount);
    }
  }
  return members.map((m) => {
    const p = paid.get(m.id) ?? 0;
    const o = owed.get(m.id) ?? 0;
    return { memberId: m.id, name: m.name, paid: p, owed: o, net: p - o };
  });
}

// Greedy settlement: repeatedly match the biggest debtor to the biggest
// creditor. Produces at most (n-1) transactions.
export function computeSettlements(balances: Balance[]): Settlement[] {
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ id: b.memberId, name: b.name, amount: b.net }));
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ id: b.memberId, name: b.name, amount: -b.net }));

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0) {
      settlements.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount,
      });
    }
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }
  return settlements;
}
