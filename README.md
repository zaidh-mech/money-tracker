# Money Tracker

A personal income, spending, and savings tracker built with Next.js. Entries, accounts, and budget settings are stored in the browser using local storage. Salary entries enable the budget plan by default; other income sources stay undistributed until enabled. Monthly reports can be downloaded as PDFs from the selected month.

Positive “left to spend” automatically appears as income on the first day of the next month, named `Carry forward (Sep)` using the previous month's abbreviation. Carry forward updates when earlier entries or allocations change, continues through months with no transactions, and appears in monthly PDFs. It does not deposit money, transfer savings or cash, or change account and wallet balances. These automatic entries are calculated from saved transactions and cannot be deleted separately. No carry forward is created for a zero or negative remainder, or for a future month.

## Run locally

Install dependencies with `npm install`, then start the development server with `npm run dev`. Open [http://localhost:3000](http://localhost:3000).

Use `npm run build` to create a production build and `npm run start` to serve it.
