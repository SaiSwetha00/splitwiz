import { toCents, splitEqual } from "./money";

export type ParticipantInput = { memberId: string; amount?: number | string };

export type ParsedExpense = {
  description: string;
  amountCents: number;
  category: string | null;
  paidById: string;
  splitType: "EQUAL" | "CUSTOM";
  shares: { memberId: string; amount: number }[];
};

// Validate raw expense input against the trip's member list and produce the
// per-member share amounts (in cents). Returns { error } on any problem.
export function parseExpenseInput(
  body: unknown,
  validMemberIds: Set<string>
): { data: ParsedExpense } | { error: string } {
  const b = (body ?? {}) as {
    description?: unknown;
    amount?: unknown;
    category?: unknown;
    paidById?: unknown;
    splitType?: unknown;
    participants?: unknown;
  };

  const description =
    typeof b.description === "string" ? b.description.trim() : "";
  if (!description) return { error: "Description is required" };

  const amountCents = toCents(
    typeof b.amount === "number" || typeof b.amount === "string" ? b.amount : NaN
  );
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { error: "Amount must be greater than 0" };
  }

  const paidById = typeof b.paidById === "string" ? b.paidById : "";
  if (!validMemberIds.has(paidById)) {
    return { error: "Payer must be a member of this trip" };
  }

  const splitType = b.splitType === "CUSTOM" ? "CUSTOM" : "EQUAL";

  if (!Array.isArray(b.participants) || b.participants.length === 0) {
    return { error: "Select at least one participant" };
  }

  const participants = b.participants as ParticipantInput[];
  const seen = new Set<string>();
  for (const p of participants) {
    if (!p || !validMemberIds.has(p.memberId)) {
      return { error: "Participants must be members of this trip" };
    }
    if (seen.has(p.memberId)) {
      return { error: "Duplicate participant" };
    }
    seen.add(p.memberId);
  }

  let shares: { memberId: string; amount: number }[];

  if (splitType === "EQUAL") {
    const amounts = splitEqual(amountCents, participants.length);
    shares = participants.map((p, i) => ({
      memberId: p.memberId,
      amount: amounts[i],
    }));
  } else {
    shares = [];
    let sum = 0;
    for (const p of participants) {
      const c = toCents(
        typeof p.amount === "number" || typeof p.amount === "string"
          ? p.amount
          : NaN
      );
      if (!Number.isFinite(c) || c < 0) {
        return { error: "Each custom share must be 0 or more" };
      }
      sum += c;
      shares.push({ memberId: p.memberId, amount: c });
    }
    if (sum !== amountCents) {
      return {
        error: "Custom shares must add up to the total amount",
      };
    }
  }

  const category =
    typeof b.category === "string" && b.category.trim()
      ? b.category.trim()
      : null;

  return {
    data: { description, amountCents, category, paidById, splitType, shares },
  };
}
