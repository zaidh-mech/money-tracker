export type Allocation = { budgetId: string; name: string; amount: number };
export type Entry = {
  id: string; kind: "income" | "expense"; description: string; account: string; accountId: string;
  amount: number; date: string; created: number; allocationsEnabled?: boolean;
  savingsAmount?: number; savingsAccountId?: string; allocations?: Allocation[];
  cashAmount?: number; cashAccountId?: string; carryForwardFrom?: string;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function monthlyLeftToSpend(entries: Entry[], budgetIds: readonly string[]) {
  return entries.reduce((sum, entry) => sum
    + (entry.kind === "income" ? Number(entry.amount) : -Number(entry.amount))
    - (Number(entry.savingsAmount) || 0)
    - (entry.allocations || []).reduce((allocated, allocation) =>
      allocated + (budgetIds.includes(allocation.budgetId) ? allocation.amount : 0), 0), 0);
}

// Carry forward is derived from the real ledger, so reloads and cloud sync cannot
// duplicate it. It has no account, transfers, or allocations of its own.
export function withCarryForward(entries: Entry[], budgetIds: readonly string[], currentMonth: string): Entry[] {
  const realEntries = entries.filter(entry => !entry.carryForwardFrom);
  const byMonth = new Map<string, Entry[]>();
  for (const entry of realEntries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;
    const month = entry.date.slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) || []), entry]);
  }
  const firstMonth = [...byMonth.keys()].filter(month => month < currentMonth).sort()[0];
  if (!firstMonth) return realEntries;

  const result = [...realEntries];
  let month = firstMonth;
  let carried = 0;
  while (month < currentMonth) {
    const remaining = roundMoney(carried + monthlyLeftToSpend(byMonth.get(month) || [], budgetIds));
    const [year, monthNumber] = month.split("-").map(Number);
    const nextMonth = monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
    carried = Math.max(0, remaining);
    if (carried > 0) {
      const shortMonth = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" })
        .format(new Date(`${month}-01T00:00:00Z`));
      result.push({
        id: `carry-forward-${nextMonth}`, kind: "income", description: `Carry forward (${shortMonth})`,
        account: "", accountId: "", amount: carried, date: `${nextMonth}-01`, created: 0,
        carryForwardFrom: month,
      });
    }
    month = nextMonth;
  }
  return result;
}

export function entryMovement(entry: Entry, accountId: string) {
  if (entry.carryForwardFrom) return 0;
  const transaction = entry.accountId === accountId ? (entry.kind === "income" ? 1 : -1) * Number(entry.amount) : 0;
  const saved = Number(entry.savingsAmount) || 0;
  const cash = Number(entry.cashAmount) || 0;
  return transaction
    - (entry.kind === "income" && entry.accountId === accountId ? saved + cash : 0)
    + (entry.kind === "income" && entry.savingsAccountId === accountId ? saved : 0)
    + (entry.kind === "income" && entry.cashAccountId === accountId ? cash : 0);
}
