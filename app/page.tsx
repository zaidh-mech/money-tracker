"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";

type Kind = "income" | "expense";
type Budget = { id: string; name: string; percent: number };
type Allocation = { budgetId: string; name: string; amount: number };
type Entry = {
  id: string; kind: Kind; description: string; account: string; accountId: string;
  amount: number; date: string; created: number; allocationsEnabled?: boolean;
  savingsAmount?: number; savingsAccountId?: string; allocations?: Allocation[];
};
type Account = { id: string; name: string; openingBalance: number };
type State = { entries: Entry[]; accounts: Account[]; rate: number; budgets: Budget[] };

const STORAGE_KEY = "simple-money-tracker-v1";
const defaultBudgets: Budget[] = [
  { id: "phone", name: "Phone bill", percent: 0 },
  { id: "home", name: "Home use", percent: 0 },
  { id: "entertainment", name: "Entertainment", percent: 0 },
];
const emptyState: State = { entries: [], accounts: [], rate: 20, budgets: defaultBudgets };

function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "LKR", maximumFractionDigits: 2 }).format(Number(value) || 0);
}
function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function newId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}
function isNdb(name: string) {
  return /^(national development bank|ndb)$/i.test(name.trim());
}

export default function Home() {
  const today = useMemo(() => localDate(), []);
  const [state, setState] = useState<State>(emptyState);
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [kind, setKind] = useState<Kind>("income");
  const [description, setDescription] = useState("");
  const [account, setAccount] = useState("");
  const [depositAccount, setDepositAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [accountName, setAccountName] = useState("");
  const [opening, setOpening] = useState("");
  const [applyPlan, setApplyPlan] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const [budgetPercent, setBudgetPercent] = useState("");
  const [accountError, setAccountError] = useState("");
  const [entryError, setEntryError] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [dayLabel, setDayLabel] = useState("");

  useEffect(() => {
    setDayLabel(new Intl.DateTimeFormat(undefined, { weekday: "short", month: "long", day: "numeric" }).format(new Date()));
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && Array.isArray(saved.entries)) {
        setState({
          entries: saved.entries.filter((e: Entry) => e && ["income", "expense"].includes(e.kind) && Number.isFinite(Number(e.amount))),
          accounts: Array.isArray(saved.accounts) ? saved.accounts.filter((a: Account) => a && typeof a.id === "string" && typeof a.name === "string" && Number.isFinite(Number(a.openingBalance))).map((a: Account) => ({ ...a, openingBalance: Number(a.openingBalance) })) : [],
          rate: Math.max(0, Math.min(100, Number.isFinite(Number(saved.rate)) ? Number(saved.rate) : 20)),
          budgets: Array.isArray(saved.budgets) ? saved.budgets.filter((b: Budget) => b && typeof b.id === "string" && typeof b.name === "string").map((b: Budget) => ({ ...b, percent: Math.max(0, Math.min(100, Number(b.percent) || 0)) })) : defaultBudgets,
        });
      }
    } catch { /* Ignore invalid or unavailable saved data. */ }
    setReady(true);
  }, []);

  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [ready, state]);

  const accountMovement = (id: string) => state.entries.reduce((sum, e) => {
    const transaction = e.accountId === id ? (e.kind === "income" ? 1 : -1) * Number(e.amount) : 0;
    const saved = Number(e.savingsAmount) || 0;
    const transferOut = e.kind === "income" && e.accountId === id ? saved : 0;
    const transferIn = e.kind === "income" && e.savingsAccountId === id ? saved : 0;
    return sum + transaction - transferOut + transferIn;
  }, 0);
  const accountBalance = (item: Account) => item.openingBalance + accountMovement(item.id);
  const entries = state.entries.filter(e => e.date && e.date.slice(0, 7) === month);
  const income = entries.filter(e => e.kind === "income").reduce((sum, e) => sum + e.amount, 0);
  const expenses = entries.filter(e => e.kind === "expense").reduce((sum, e) => sum + e.amount, 0);
  const setAside = entries.reduce((sum, e) => sum + (Number(e.savingsAmount) || 0), 0);
  const ndbAccount = state.accounts.find(a => isNdb(a.name));
  const spentFromSavings = entries.filter(e => e.kind === "expense" && (e.account.toLowerCase() === "savings" || (!!ndbAccount && e.accountId === ndbAccount.id))).reduce((sum, e) => sum + e.amount, 0);
  const monthSaved = setAside - spentFromSavings;
  const allSaved = state.entries.reduce((sum, e) => sum + (Number(e.savingsAmount) || 0), 0);
  const budgetTotals = state.budgets.map(budget => ({
    ...budget,
    allocated: entries.reduce((sum, e) => sum + (e.allocations || []).filter(a => a.budgetId === budget.id).reduce((total, a) => total + a.amount, 0), 0),
    spent: entries.filter(e => e.kind === "expense" && e.description.trim().toLowerCase() === budget.name.trim().toLowerCase()).reduce((sum, e) => sum + e.amount, 0),
  }));
  const budgetAllocated = budgetTotals.reduce((sum, b) => sum + b.allocated, 0);
  const plannedPercent = state.rate + state.budgets.reduce((sum, b) => sum + b.percent, 0);
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (!description.trim() || !Number.isFinite(value) || value <= 0 || !date || (kind === "expense" && !account.trim())) return;
    if (kind === "income" && applyPlan && plannedPercent > 100) { setEntryError("Your savings and category percentages add up to more than 100%."); return; }
    const linked = kind === "expense" ? state.accounts.find(a => a.name.toLowerCase() === account.trim().toLowerCase()) : state.accounts.find(a => a.id === depositAccount);
    const usePlan = kind === "income" && applyPlan;
    const savingsAmount = usePlan ? roundMoney(value * state.rate / 100) : 0;
    const allocations = usePlan ? state.budgets.map(b => ({ budgetId: b.id, name: b.name, amount: roundMoney(value * b.percent / 100) })).filter(a => a.amount > 0) : [];
    const savingsAccount = savingsAmount > 0 ? state.accounts.find(a => isNdb(a.name)) : undefined;
    const ensuredSavingsAccount = savingsAmount > 0 ? (savingsAccount || { id: newId(), name: "National Development Bank", openingBalance: 0 }) : undefined;
    const entry: Entry = { id: newId(), kind, description: description.trim(), account: kind === "expense" ? account.trim() : "", accountId: linked?.id || "", amount: value, date, created: Date.now(), allocationsEnabled: usePlan, savingsAmount, savingsAccountId: ensuredSavingsAccount?.id || "", allocations };
    setState(current => ({
      ...current,
      accounts: ensuredSavingsAccount && !current.accounts.some(a => a.id === ensuredSavingsAccount.id) ? [...current.accounts, ensuredSavingsAccount] : current.accounts,
      entries: [...current.entries, entry],
    }));
    setEntryError(""); setDescription(""); setAccount(""); setDepositAccount(""); setAmount(""); setDate(today); setKind("income"); setApplyPlan(false);
  }

  function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const name = accountName.trim(); const balance = Number(opening);
    if (!name || !Number.isFinite(balance)) return;
    if (state.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) { setAccountError("That account is already on your list."); return; }
    setAccountError(""); setState(current => ({ ...current, accounts: [...current.accounts, { id: newId(), name, openingBalance: balance }] })); setAccountName(""); setOpening("");
  }

  function updateAccount(item: Account) {
    const input = window.prompt(`Enter the current balance for ${item.name}`, String(accountBalance(item)));
    if (input === null) return;
    const next = Number(input);
    if (!Number.isFinite(next)) { window.alert("Enter a valid number for the balance."); return; }
    setState(current => ({ ...current, accounts: current.accounts.map(a => a.id === item.id ? { ...a, openingBalance: next - accountMovement(item.id) } : a) }));
  }

  function addBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const name = budgetName.trim(); const percent = Number(budgetPercent);
    if (!name || !Number.isFinite(percent) || percent < 0 || percent > 100) return;
    if (state.budgets.some(b => b.name.toLowerCase() === name.toLowerCase())) { setBudgetError("That budget category is already on your list."); return; }
    setBudgetError(""); setState(current => ({ ...current, budgets: [...current.budgets, { id: newId(), name, percent }] })); setBudgetName(""); setBudgetPercent("");
  }

  function downloadReport() {
    const doc = new jsPDF();
    const title = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00`));
    const reportEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.created - b.created);
    const reportMoney = (value: number) => `LKR ${Number(value || 0).toFixed(2)}`;
    let y = 18;
    doc.setFontSize(19); doc.text("Monthly budget report", 15, y); y += 9;
    doc.setFontSize(11); doc.text(title, 15, y); y += 10;
    doc.setFontSize(12); doc.text("Monthly summary", 15, y); y += 7;
    doc.setFontSize(10);
    [`Income: ${reportMoney(income)}`, `Expenses: ${reportMoney(expenses)}`, `Moved to NDB savings: ${reportMoney(setAside)}`, `Budget categories reserved: ${reportMoney(budgetAllocated)}`, `Left after spending and allocations: ${reportMoney(income - expenses - setAside - budgetAllocated)}`].forEach(line => { doc.text(line, 15, y); y += 6; });
    y += 4; doc.setFontSize(12); doc.text("Budget categories", 15, y); y += 7; doc.setFontSize(10);
    budgetTotals.forEach(b => { if (y > 275) { doc.addPage(); y = 18; } doc.text(`${b.name} (${b.percent}%): reserved ${reportMoney(b.allocated)} | spent ${reportMoney(b.spent)}`, 15, y); y += 6; });
    y += 4; doc.setFontSize(12); doc.text("Transactions", 15, y); y += 7; doc.setFontSize(10);
    reportEntries.forEach(e => {
      if (y > 275) { doc.addPage(); y = 18; }
      const label = `${e.date}  ${e.kind === "income" ? "Income" : "Expense"}  ${e.description}  ${e.kind === "income" ? "+" : "-"}${reportMoney(e.amount)}`;
      doc.text(label.slice(0, 100), 15, y); y += 6;
      if (e.kind === "income" && (e.savingsAmount || e.allocations?.length)) {
        const reserved = [`NDB savings ${reportMoney(e.savingsAmount || 0)}`, ...(e.allocations || []).map(a => `${a.name} ${reportMoney(a.amount)}`)].join("; ");
        doc.text(`  Reserved: ${reserved}`.slice(0, 100), 15, y); y += 6;
      }
    });
    doc.save(`money-report-${month}.pdf`);
  }

  return <div className="shell">
    <header className="topbar"><div className="brand"><div className="mark" aria-hidden="true">$</div><span>My money</span></div><div className="today">{dayLabel}</div></header>
    <main>
      <div className="heading"><div><p className="eyebrow">Your overview</p><h1>Money, made simple.</h1></div><div className="heading-actions"><label className="period"><span>Month</span><input type="month" aria-label="Choose month" value={month} onChange={e => setMonth(e.target.value)} /></label><button className="report-button" type="button" onClick={downloadReport}>Download monthly PDF</button></div></div>
      <section className="cards" aria-label="Monthly totals">
        <article className="card"><div className="card-label"><span className="dot" />Income</div><div className="amount">{money(income)}</div><div className="card-note">this month</div></article>
        <article className="card"><div className="card-label"><span className="dot" />Expenses</div><div className="amount">{money(expenses)}</div><div className="card-note">this month</div></article>
        <article className="card"><div className="card-label"><span className="dot" />Saved</div><div className="amount">{money(monthSaved)}</div><div className="card-note">to National Development Bank{spentFromSavings ? ` · ${money(spentFromSavings)} used` : ""}</div></article>
        <article className="card"><div className="card-label"><span className="dot" />Left to spend</div><div className="amount">{money(income - expenses - setAside - budgetAllocated)}</div><div className="card-note">after expenses and planned allocations</div></article>
      </section>
      <section className="panel accounts" aria-labelledby="accountsHeading"><div className="accounts-head"><h2 id="accountsHeading">Bank accounts</h2><span className="accounts-total">{money(state.accounts.reduce((sum, a) => sum + accountBalance(a), 0))} total</span></div>
        <div className="account-list">{state.accounts.length ? state.accounts.map(a => <div className="account-item" key={a.id}><div className="account-info"><div className="account-name">{a.name}</div><div className="account-balance">{money(accountBalance(a))}</div></div><button className="account-edit" type="button" onClick={() => updateAccount(a)} aria-label={`Update ${a.name} balance`}>Update</button></div>) : <div className="account-empty">Add your accounts and their balances to see them here.</div>}</div>
        <form className="account-add" onSubmit={addAccount}><div className="field"><label htmlFor="accountName">Account name</label><input id="accountName" required maxLength={40} placeholder="e.g. Main bank account" value={accountName} onChange={e => { setAccountName(e.target.value); setAccountError(""); }} /></div><div className="field"><label htmlFor="accountOpening">Balance today</label><div className="amount-wrap"><span>LKR</span><input id="accountOpening" type="number" step="0.01" placeholder="0.00" inputMode="decimal" required value={opening} onChange={e => setOpening(e.target.value)} /></div></div><button type="submit">Add account</button></form>{accountError && <div className="form-error" role="alert">{accountError}</div>}
        <div className="account-tip">Balances update when you log income into an account or spending from one.</div></section>

      <section className="panel budget-plan" aria-labelledby="budgetHeading">
        <div className="budget-heading"><div><h2 id="budgetHeading">Your budget plan</h2><p className="panel-caption">Percentages apply only to income you choose to distribute.</p></div><div className="budget-total">{plannedPercent}% planned</div></div>
        <div className="plan-row savings-plan"><div><strong>Savings to National Development Bank</strong><span>Moved into your NDB account when income is distributed</span></div><label className="percent-input"><span className="sr-only">Savings percentage</span><input type="number" min="0" max="100" step="1" aria-label="Savings percentage" value={state.rate} onChange={e => setState(s => ({ ...s, rate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} /><span>%</span></label></div>
        {state.budgets.map(b => <div className="plan-row" key={b.id}><div className="plan-name"><input aria-label="Budget category name" maxLength={40} value={b.name} onChange={e => setState(s => ({ ...s, budgets: s.budgets.map(item => item.id === b.id ? { ...item, name: e.target.value } : item) }))} /><span>This month: {money(budgetTotals.find(item => item.id === b.id)?.allocated || 0)} reserved · {money(budgetTotals.find(item => item.id === b.id)?.spent || 0)} spent</span></div><label className="percent-input"><span className="sr-only">{b.name} percentage</span><input type="number" min="0" max="100" step="1" aria-label={`${b.name} percentage`} value={b.percent} onChange={e => setState(s => ({ ...s, budgets: s.budgets.map(item => item.id === b.id ? { ...item, percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } : item) }))} /><span>%</span></label><button className="delete budget-delete" type="button" aria-label={`Remove ${b.name}`} onClick={() => setState(s => ({ ...s, budgets: s.budgets.filter(item => item.id !== b.id) }))}>×</button></div>)}
        <form className="budget-add" onSubmit={addBudget}><div className="field"><label htmlFor="budgetName">Add a category</label><input id="budgetName" required maxLength={40} placeholder="e.g. Transport" value={budgetName} onChange={e => { setBudgetName(e.target.value); setBudgetError(""); }} /></div><div className="field"><label htmlFor="budgetPercent">Percentage</label><div className="amount-wrap"><input id="budgetPercent" type="number" min="0" max="100" step="1" required placeholder="0" value={budgetPercent} onChange={e => setBudgetPercent(e.target.value)} /><span className="suffix">%</span></div></div><button type="submit">Add category</button></form>{budgetError && <p className="form-error" role="alert">{budgetError}</p>}
        {plannedPercent > 100 && <p className="form-error" role="alert">Your savings and category percentages add up to more than 100%. Reduce them before distributing income.</p>}
      </section>

      <section className="main">
        <form className="panel forms" onSubmit={submitEntry}><h2 className="panel-title">Add a transaction</h2><p className="panel-caption">Keep track as money comes in and goes out.</p>
          <div className="tabs" role="tablist" aria-label="Transaction type">{(["income", "expense"] as Kind[]).map(k => <button className={`tab ${kind === k ? "active" : ""}`} type="button" role="tab" aria-selected={kind === k} key={k} onClick={() => { setKind(k); if (k === "income") setApplyPlan(/salary/i.test(description)); }}>{k === "income" ? "Income" : "Expense"}</button>)}</div>
          <div className="field"><label htmlFor="description">{kind === "income" ? "Income source" : "Expense type"}</label><input id="description" required maxLength={60} placeholder={kind === "income" ? "e.g. Salary, ICBT fees, Monthly deposit" : "e.g. Phone bill"} autoComplete="off" value={description} onChange={e => { setDescription(e.target.value); if (kind === "income") setApplyPlan(/salary/i.test(e.target.value)); }} /></div>
          {kind === "income" && <label className="distribution-toggle"><input type="checkbox" checked={applyPlan} onChange={e => setApplyPlan(e.target.checked)} /><span className="toggle-track" aria-hidden="true" /><span><strong>Distribute this income</strong><small>{applyPlan ? `Apply ${state.rate}% savings and your budget percentages` : "Leave this income untouched"}</small></span></label>}
          {kind === "expense" ? <div className="field"><label htmlFor="account">Paid from account</label><input id="account" required maxLength={40} list="accountOptions" placeholder="e.g. Checking, Cash or Savings" autoComplete="off" value={account} onChange={e => setAccount(e.target.value)} /><datalist id="accountOptions">{state.accounts.map(a => <option value={a.name} key={a.id} />)}</datalist></div> : <div className="field"><label htmlFor="depositAccount">Deposited into <span className="optional">(optional)</span></label><select id="depositAccount" value={depositAccount} onChange={e => setDepositAccount(e.target.value)}><option value="">Don&apos;t update an account balance</option>{state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
          <div className="field"><label htmlFor="amount">Amount</label><div className="amount-wrap"><span>LKR</span><input id="amount" type="number" required min="0.01" step="0.01" placeholder="0.00" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></div></div>
          <div className="field"><label htmlFor="date">Date</label><input id="date" type="date" required value={date} onChange={e => setDate(e.target.value)} /></div>{entryError && <div className="form-error" role="alert">{entryError}</div>}<button className="submit" type="submit">Add {kind}</button></form>
        <div className="rightcol">
          <section className="panel savings" aria-labelledby="savingsHeading"><div className="savings-head"><div className="savings-title"><div className="savings-icon" aria-hidden="true">↗</div><div><h2 id="savingsHeading">NDB savings</h2><p className="savings-sub">Salary distributes automatically; other income stays untouched unless enabled.</p></div></div><strong className="savings-rate">{state.rate}%</strong></div><div className="bar" aria-label="Monthly savings progress"><div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, state.rate))}%` }} /></div><div className="savings-foot"><span>{money(Math.max(0, setAside))} moved this month</span><strong>{money(allSaved)} total moved</strong></div></section>
          <section className="panel activity" aria-labelledby="activityHeading"><div className="activity-head"><h2 id="activityHeading">Transactions</h2><span className="count">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span></div><div className="rows">{sorted.length ? sorted.map(e => { const linked = state.accounts.find(a => a.id === e.accountId); const details = e.kind === "income" ? (linked ? `Income to ${linked.name}` : "Income") : `From ${e.account}`; return <div className="row" key={e.id}><div className="row-main"><div className={`row-icon ${e.kind === "expense" ? "expense" : ""}`} aria-hidden="true">{e.kind === "income" ? "+" : "−"}</div><div className="row-copy"><div className="row-name">{e.description}</div><div className="row-meta">{details} · {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${e.date}T00:00:00`))}</div></div></div><div className={`row-value ${e.kind}`}>{e.kind === "income" ? "+" : "−"}{money(e.amount)}</div><button className="delete" type="button" onClick={() => setState(s => ({ ...s, entries: s.entries.filter(entry => entry.id !== e.id) }))} aria-label={`Delete ${e.description}`}>×</button></div>; }) : <div className="empty">No transactions for this month yet.<br />Add your income or an expense to get started.</div>}</div></section>
        </div>
      </section>
    </main><footer className="footer">Your entries stay saved in this browser. Download a PDF for any selected month.</footer>
  </div>;
}
