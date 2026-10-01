import assert from "node:assert/strict";
import test from "node:test";
import { entryMovement, monthlyLeftToSpend, withCarryForward } from "../lib/carry-forward.ts";

const entry = (overrides = {}) => ({
  id: "salary", kind: "income", description: "Salary", account: "Bank", accountId: "bank",
  amount: 1000, date: "2026-09-05", created: 1, ...overrides,
});
const carries = entries => entries.filter(e => e.carryForwardFrom);

test("carries the displayed remainder as income without moving bank, savings or wallet balances", () => {
  const entries = [entry({ savingsAmount: 200, savingsAccountId: "savings", cashAmount: 100, cashAccountId: "wallet",
    allocations: [{ budgetId: "home", name: "Home", amount: 150 }] }),
  entry({ id: "expense", kind: "expense", amount: 250 })];
  const ledger = withCarryForward(entries, ["home"], "2026-10");
  const [carry] = carries(ledger);
  assert.equal(monthlyLeftToSpend(entries, ["home"]), 400);
  assert.equal(carry.amount, 400);
  assert.equal(carry.description, "Carry forward (Sep)");
  assert.equal(carry.date, "2026-10-01");
  assert.equal(carry.kind, "income");
  assert.equal(carry.accountId, "");
  assert.equal(monthlyLeftToSpend([carry], ["home"]), 400);
  for (const id of ["bank", "savings", "wallet"]) {
    assert.equal(ledger.reduce((sum, e) => sum + entryMovement(e, id), 0),
      entries.reduce((sum, e) => sum + entryMovement(e, id), 0));
    assert.equal(entryMovement({ ...carry, accountId: id, savingsAmount: 50, savingsAccountId: id }, id), 0);
  }
});

test("chains across empty months and December into January", () => {
  const ledger = withCarryForward([entry({ date: "2025-11-15" })], [], "2026-02");
  assert.deepEqual(carries(ledger).map(e => [e.date, e.description, e.amount]), [
    ["2025-12-01", "Carry forward (Nov)", 1000],
    ["2026-01-01", "Carry forward (Dec)", 1000],
    ["2026-02-01", "Carry forward (Jan)", 1000],
  ]);
});

test("recalculates following months after an earlier transaction changes or is deleted", () => {
  const entries = [entry(), entry({ id: "oct-expense", kind: "expense", date: "2026-10-02", amount: 300 })];
  assert.deepEqual(carries(withCarryForward(entries, [], "2026-11")).map(e => e.amount), [1000, 700]);
  const edited = entries.map(e => e.id === "salary" ? { ...e, amount: 500 } : e);
  assert.deepEqual(carries(withCarryForward(edited, [], "2026-11")).map(e => e.amount), [500, 200]);
  assert.deepEqual(carries(withCarryForward(entries.slice(1), [], "2026-11")), []);
});

test("repeated calculation and existing automatic entries do not duplicate income", () => {
  const entries = [entry()];
  const ledger = withCarryForward(entries, [], "2026-11");
  assert.deepEqual(withCarryForward(ledger, [], "2026-11"), ledger);
  assert.equal(entries.length, 1);
});

test("zero or negative remainders produce no carry forward", () => {
  for (const spent of [1000, 1200]) {
    assert.deepEqual(carries(withCarryForward([entry(), entry({ kind: "expense", amount: spent })], [], "2026-10")), []);
  }
});

test("does not generate future income or carry opening account balances", () => {
  assert.deepEqual(withCarryForward([], [], "2026-10"), []);
  const entries = [entry({ date: "2026-10-01" }), entry({ date: "2026-11-01", id: "future" })];
  assert.deepEqual(withCarryForward(entries, [], "2026-10"), entries);
});

test("rounds to cents and follows the displayed allocation calculation", () => {
  const entries = [entry({ amount: 100.1, savingsAmount: 20,
    allocations: [{ budgetId: "deleted", name: "Removed", amount: 10 }] }), entry({ kind: "expense", amount: 0.2 })];
  assert.equal(carries(withCarryForward(entries, [], "2026-10"))[0].amount, 79.9);
  assert.equal(carries(withCarryForward(entries, ["deleted"], "2026-10"))[0].amount, 69.9);
});
