"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Kind = "income" | "expense";
type Entry = { id: string; kind: Kind; description: string; account: string; accountId: string; amount: number; date: string; created: number };
type Account = { id: string; name: string; openingBalance: number };
type State = { entries: Entry[]; accounts: Account[]; rate: number };
const STORAGE_KEY = "simple-money-tracker-v1";
const emptyState: State = { entries: [], accounts: [], rate: 20 };

function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "LKR", maximumFractionDigits: 2 }).format(Number(value) || 0);
}
function newId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
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
  const [error, setError] = useState("");
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
        });
      }
    } catch { /* Ignore invalid or unavailable saved data. */ }
    setReady(true);
  }, []);

  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [ready, state]);
  const accountMovement = (id: string) => state.entries.filter(e => e.accountId === id).reduce((sum, e) => sum + (e.kind === "income" ? 1 : -1) * Number(e.amount), 0);
  const accountBalance = (item: Account) => item.openingBalance + accountMovement(item.id);
  const entries = state.entries.filter(e => e.date && e.date.slice(0, 7) === month);
  const income = entries.filter(e => e.kind === "income").reduce((sum, e) => sum + e.amount, 0);
  const expenses = entries.filter(e => e.kind === "expense").reduce((sum, e) => sum + e.amount, 0);
  const setAside = income * state.rate / 100;
  const spentFromSavings = entries.filter(e => e.kind === "expense" && e.account.toLowerCase() === "savings").reduce((sum, e) => sum + e.amount, 0);
  const monthSaved = setAside - spentFromSavings;
  const allIncome = state.entries.filter(e => e.kind === "income").reduce((sum, e) => sum + e.amount, 0);
  const savingsSpent = state.entries.filter(e => e.kind === "expense" && e.account.toLowerCase() === "savings").reduce((sum, e) => sum + e.amount, 0);
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (!description.trim() || !Number.isFinite(value) || value <= 0 || !date || (kind === "expense" && !account.trim())) return;
    const linked = kind === "expense" ? state.accounts.find(a => a.name.toLowerCase() === account.trim().toLowerCase()) : state.accounts.find(a => a.id === depositAccount);
    setState(current => ({ ...current, entries: [...current.entries, { id: newId(), kind, description: description.trim(), account: kind === "expense" ? account.trim() : "", accountId: linked?.id || "", amount: value, date, created: Date.now() }] }));
    setDescription(""); setAccount(""); setDepositAccount(""); setAmount(""); setDate(today); setKind("income");
  }
  function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const name = accountName.trim(); const balance = Number(opening);
    if (!name || !Number.isFinite(balance)) return;
    if (state.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) { setError("That account is already on your list."); return; }
    setError(""); setState(current => ({ ...current, accounts: [...current.accounts, { id: newId(), name, openingBalance: balance }] })); setAccountName(""); setOpening("");
  }
  function updateAccount(item: Account) {
    const input = window.prompt(`Enter the current balance for ${item.name}`, String(accountBalance(item)));
    if (input === null) return;
    const next = Number(input);
    if (!Number.isFinite(next)) { window.alert("Enter a valid number for the balance."); return; }
    setState(current => ({ ...current, accounts: current.accounts.map(a => a.id === item.id ? { ...a, openingBalance: next - accountMovement(item.id) } : a) }));
  }

  return <div className="shell">
    <header className="topbar"><div className="brand"><div className="mark" aria-hidden="true">$</div><span>My money</span></div><div className="today">{dayLabel}</div></header>
    <main>
      <div className="heading"><div><p className="eyebrow">Your overview</p><h1>Money, made simple.</h1></div><label className="period"><span>Month</span><input type="month" aria-label="Choose month" value={month} onChange={e => setMonth(e.target.value)} /></label></div>
      <section className="cards" aria-label="Monthly totals">
        <article className="card"><div className="card-label"><span className="dot" />Income</div><div className="amount">{money(income)}</div><div className="card-note">this month</div></article>
        <article className="card"><div className="card-label"><span className="dot" />Expenses</div><div className="amount">{money(expenses)}</div><div className="card-note">this month</div></article>
        <article className="card"><div className="card-label"><span className="dot" />Saved</div><div className="amount">{money(monthSaved)}</div><div className="card-note">{state.rate}% set aside{spentFromSavings ? ` · ${money(spentFromSavings)} used` : ""}</div></article>
        <article className="card"><div className="card-label"><span className="dot" />Left to spend</div><div className="amount">{money(income - expenses - setAside)}</div><div className="card-note">after savings and expenses</div></article>
      </section>
      <section className="panel accounts" aria-labelledby="accountsHeading"><div className="accounts-head"><h2 id="accountsHeading">Bank accounts</h2><span className="accounts-total">{money(state.accounts.reduce((sum, a) => sum + accountBalance(a), 0))} total</span></div>
        <div className="account-list">{state.accounts.length ? state.accounts.map(a => <div className="account-item" key={a.id}><div className="account-info"><div className="account-name">{a.name}</div><div className="account-balance">{money(accountBalance(a))}</div></div><button className="account-edit" type="button" onClick={() => updateAccount(a)} aria-label={`Update ${a.name} balance`}>Update</button></div>) : <div className="account-empty">Add your accounts and their balances to see them here.</div>}</div>
        <form className="account-add" onSubmit={addAccount}><div className="field"><label htmlFor="accountName">Account name</label><input id="accountName" required maxLength={40} placeholder="e.g. Main bank account" value={accountName} onChange={e => { setAccountName(e.target.value); setError(""); }} /></div><div className="field"><label htmlFor="accountOpening">Balance today</label><div className="amount-wrap"><span>LKR</span><input id="accountOpening" type="number" step="0.01" placeholder="0.00" inputMode="decimal" required value={opening} onChange={e => setOpening(e.target.value)} /></div></div><button type="submit">Add account</button></form>{error && <div className="form-error" role="alert">{error}</div>}
        <div className="account-tip">Balances update when you log income into an account or spending from one.</div></section>
      <section className="main">
        <form className="panel forms" onSubmit={submitEntry}><h2 className="panel-title">Add a transaction</h2><p className="panel-caption">Keep track as money comes in and goes out.</p>
          <div className="tabs" role="tablist" aria-label="Transaction type">{(["income", "expense"] as Kind[]).map(k => <button className={`tab ${kind === k ? "active" : ""}`} type="button" role="tab" aria-selected={kind === k} key={k} onClick={() => setKind(k)}>{k === "income" ? "Income" : "Expense"}</button>)}</div>
          <div className="field"><label htmlFor="description">{kind === "income" ? "Income source" : "Expense type"}</label><input id="description" required maxLength={60} placeholder={kind === "income" ? "e.g. Salary" : "e.g. Groceries"} autoComplete="off" value={description} onChange={e => setDescription(e.target.value)} /></div>
          {kind === "expense" ? <div className="field"><label htmlFor="account">Paid from account</label><input id="account" maxLength={40} list="accountOptions" placeholder="e.g. Checking, Cash or Savings" autoComplete="off" value={account} onChange={e => setAccount(e.target.value)} /><datalist id="accountOptions">{state.accounts.map(a => <option value={a.name} key={a.id} />)}</datalist></div> : <div className="field"><label htmlFor="depositAccount">Deposited into <span className="optional">(optional)</span></label><select id="depositAccount" value={depositAccount} onChange={e => setDepositAccount(e.target.value)}><option value="">Don&apos;t update an account balance</option>{state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
          <div className="field"><label htmlFor="amount">Amount</label><div className="amount-wrap"><span>LKR</span><input id="amount" type="number" required min="0.01" step="0.01" placeholder="0.00" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></div></div>
          <div className="field"><label htmlFor="date">Date</label><input id="date" type="date" required value={date} onChange={e => setDate(e.target.value)} /></div><button className="submit" type="submit">Add {kind}</button></form>
        <div className="rightcol">
          <section className="panel savings" aria-labelledby="savingsHeading"><div className="savings-head"><div className="savings-title"><div className="savings-icon" aria-hidden="true">↗</div><div><h2 id="savingsHeading">Your savings</h2><p className="savings-sub">Automatically set aside from income</p></div></div><label className="rate"><span className="sr-only">Savings percentage</span><input type="number" min="0" max="100" step="1" aria-label="Savings percentage" value={state.rate} onChange={e => setState(s => ({ ...s, rate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} /><span>%</span></label></div><div className="bar" aria-label="Monthly savings progress"><div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, state.rate))}%` }} /></div><div className="savings-foot"><span>{money(Math.max(0, setAside))} set aside this month</span><strong>{money(allIncome * state.rate / 100 - savingsSpent)} total saved</strong></div></section>
          <section className="panel activity" aria-labelledby="activityHeading"><div className="activity-head"><h2 id="activityHeading">Transactions</h2><span className="count">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span></div><div className="rows">{sorted.length ? sorted.map(e => { const linked = state.accounts.find(a => a.id === e.accountId); const details = e.kind === "income" ? (linked ? `Income · To ${linked.name}` : "Income") : `From ${e.account}`; return <div className="row" key={e.id}><div className="row-main"><div className={`row-icon ${e.kind === "expense" ? "expense" : ""}`} aria-hidden="true">{e.kind === "income" ? "↘" : "↗"}</div><div className="row-copy"><div className="row-name">{e.description}</div><div className="row-meta">{details} · {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${e.date}T00:00:00`))}</div></div></div><div className={`row-value ${e.kind}`}>{e.kind === "income" ? "+" : "−"}{money(e.amount)}</div><button className="delete" type="button" onClick={() => setState(s => ({ ...s, entries: s.entries.filter(entry => entry.id !== e.id) }))} aria-label={`Delete ${e.description}`}>×</button></div>; }) : <div className="empty">No transactions for this month yet.<br />Add your income or an expense to get started.</div>}</div></section>
        </div>
      </section>
    </main><footer className="footer">Your entries stay saved in this browser.</footer>
  </div>;
}
