import { jsPDF } from "jspdf";

export type ReportBudget = { name: string; percent: number; allocated: number; spent: number };
export type ReportAccount = { name: string; balance: number };
export type ReportEntry = {
  date: string;
  kind: "income" | "expense";
  description: string;
  account: string;
  amount: number;
  savingsAmount?: number;
  cashAmount?: number;
};
export type MonthlyReport = {
  month: string;
  income: number;
  expenses: number;
  savingsMoved: number;
  leftToSpend: number;
  cashTransfers: number;
  directCashIncome: number;
  cashBalance: number;
  bankAccounts: ReportAccount[];
  budgets: ReportBudget[];
  entries: ReportEntry[];
};

const pageWidth = 210;
const pageHeight = 297;
const left = 16;
const right = 194;
const contentWidth = right - left;
const green: [number, number, number] = [37, 68, 55];
const pale: [number, number, number] = [244, 247, 239];
const muted: [number, number, number] = [105, 117, 109];
const red: [number, number, number] = [163, 80, 67];

const amount = (value: number) => `LKR ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function createMonthlyReport(report: MonthlyReport) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const monthTitle = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(`${report.month}-01T00:00:00`));
  let y = 0;

  const startPage = (continued = false) => {
    if (continued) doc.addPage();
    doc.setFillColor(...green);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Monthly budget report", left, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(monthTitle, left, 26);
    if (continued) doc.text("Continued", right, 26, { align: "right" });
    doc.setTextColor(...green);
    y = 45;
  };
  const needSpace = (height: number) => { if (y + height > 277) startPage(true); };
  const sectionTitle = (title: string, following = 6) => {
    needSpace(7 + following);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...green);
    doc.text(title, left, y);
    y += 7;
  };
  const cellText = (text: string, x: number, rowY: number, width: number, align: "left" | "right" = "left") => {
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(text, width) as string[];
    doc.text(lines, x, rowY + 4.5, { align });
  };
  const tableHeader = (labels: { text: string; x: number; align?: "left" | "right" }[]) => {
    doc.setFillColor(...green);
    doc.rect(left, y, contentWidth, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    labels.forEach(label => doc.text(label.text, label.x, y + 5.8, { align: label.align || "left" }));
    doc.setTextColor(...green);
    doc.setFont("helvetica", "normal");
    y += 9;
  };

  startPage();
  const cards = [
    ["Income", amount(report.income)],
    ["Expenses", amount(report.expenses)],
    ["NDB savings moved", amount(report.savingsMoved)],
    ["Left to spend", amount(report.leftToSpend)],
    ["Bank accounts", amount(report.bankAccounts.reduce((sum, account) => sum + account.balance, 0))],
    ["Cash Wallet", amount(report.cashBalance)],
  ];
  cards.forEach(([label, value], index) => {
    const x = left + (index % 2) * 91;
    const top = y + Math.floor(index / 2) * 24;
    doc.setFillColor(...pale);
    doc.roundedRect(x, top, 87, 20, 2, 2, "F");
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(label, x + 4, top + 6);
    doc.setTextColor(...green);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(value, x + 4, top + 15);
  });
  y += 77;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(`Cash received: ${amount(report.cashTransfers)} transferred + ${amount(report.directCashIncome)} directly`, left, y);
  y += 12;

  sectionTitle("Budget at a glance");
  const chartBudgets = [...report.budgets].sort((a, b) => b.allocated - a.allocated).slice(0, 5);
  const chartMax = Math.max(1, ...chartBudgets.map(b => Math.max(b.allocated, b.spent)));
  if (chartBudgets.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text("No budget categories yet.", left, y + 3);
    y += 11;
  } else {
    chartBudgets.forEach(budget => {
      needSpace(13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...green);
      doc.text(doc.splitTextToSize(budget.name, 46)[0], left, y + 3);
      const trackX = 67;
      const trackWidth = 75;
      doc.setFillColor(232, 238, 225);
      doc.roundedRect(trackX, y, trackWidth, 5, 1.5, 1.5, "F");
      if (budget.spent > 0) {
        doc.setFillColor(...(budget.spent > budget.allocated ? red : green));
        doc.roundedRect(trackX, y, Math.max(0.8, trackWidth * budget.spent / chartMax), 5, 1.5, 1.5, "F");
      }
      doc.setTextColor(...muted);
      doc.text(`${amount(budget.spent)} / ${amount(budget.allocated)}`, right, y + 3.5, { align: "right" });
      y += 11;
    });
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("Bar = spent; pale track = scale of the largest category. Red means over the reserved amount.", left, y);
    y += 8;
  }

  sectionTitle("Budget categories", 18);
  const budgetColumns = [
    { text: "Category", x: left + 3 },
    { text: "Plan", x: 96, align: "right" as const },
    { text: "Reserved", x: 128, align: "right" as const },
    { text: "Spent", x: 160, align: "right" as const },
    { text: "Remaining", x: right - 3, align: "right" as const },
  ];
  tableHeader(budgetColumns);
  if (report.budgets.length === 0) {
    doc.setFontSize(8);
    doc.text("No budget categories for this month.", left + 3, y + 6);
    y += 11;
  }
  report.budgets.forEach((budget, index) => {
    const rowHeight = Math.max(10, (doc.splitTextToSize(budget.name, 67) as string[]).length * 4 + 4);
    if (y + rowHeight > 277) { startPage(true); sectionTitle("Budget categories (continued)"); tableHeader(budgetColumns); }
    if (index % 2 === 0) { doc.setFillColor(...pale); doc.rect(left, y, contentWidth, rowHeight, "F"); }
    doc.setTextColor(...green);
    cellText(budget.name, left + 3, y, 67);
    cellText(`${budget.percent}%`, 96, y, 15, "right");
    cellText(amount(budget.allocated), 128, y, 29, "right");
    cellText(amount(budget.spent), 160, y, 29, "right");
    doc.setTextColor(...(budget.spent > budget.allocated ? red : green));
    cellText(amount(budget.allocated - budget.spent), right - 3, y, 30, "right");
    y += rowHeight;
  });
  y += 10;

  sectionTitle("Transactions", 18);
  const transactionColumns = [
    { text: "Date", x: left + 3 },
    { text: "Type", x: 41 },
    { text: "Description", x: 62 },
    { text: "Account", x: 126 },
    { text: "Amount", x: right - 3, align: "right" as const },
  ];
  tableHeader(transactionColumns);
  if (report.entries.length === 0) {
    doc.setFontSize(8);
    doc.text("No transactions for this month.", left + 3, y + 6);
    y += 11;
  }
  report.entries.forEach((entry, index) => {
    const descriptionLines = doc.splitTextToSize(entry.description, 59) as string[];
    const accountLines = doc.splitTextToSize(entry.account || "-", 37) as string[];
    const rowHeight = Math.max(10, Math.max(descriptionLines.length, accountLines.length) * 4 + 4);
    if (y + rowHeight > 277) { startPage(true); sectionTitle("Transactions (continued)"); tableHeader(transactionColumns); }
    if (index % 2 === 0) { doc.setFillColor(...pale); doc.rect(left, y, contentWidth, rowHeight, "F"); }
    doc.setTextColor(...green);
    cellText(entry.date, left + 3, y, 23);
    cellText(entry.kind === "income" ? "Income" : "Expense", 41, y, 18);
    cellText(entry.description, 62, y, 59);
    cellText(entry.account || "-", 126, y, 37);
    doc.setTextColor(...(entry.kind === "expense" ? red : green));
    cellText(`${entry.kind === "expense" ? "-" : "+"}${amount(entry.amount)}`, right - 3, y, 30, "right");
    y += rowHeight;
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setDrawColor(224, 231, 221);
    doc.line(left, 284, right, 284);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text("My Money - monthly budget report", left, 289);
    doc.text(`${page} / ${pageCount}`, right, 289, { align: "right" });
  }
  return doc;
}
