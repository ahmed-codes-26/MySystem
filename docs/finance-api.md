# Finance API

All endpoints use the existing `/api` cookie authentication, origin checks, rate limits and error handler. Amounts are whole rupees. Write bodies reject unknown fields. Dates follow `APP_TIMEZONE` and cannot be in the future.

## Reads

- `GET /api/finance/settings`: opening balances and `setupCompleted`.
- `GET /api/finance/overview?month=YYYY-MM`: server date, selected month, settings, lifetime available/savings balances, selected/previous month spending, owed totals, active goals with computed savings, budgets with spending, active recurring items with statuses.
- `GET /api/finance/categories`: all categories, including archived ones.
- `GET /api/finance/goals`: all goals with computed saved amounts.
- `GET /api/finance/recurring?month=YYYY-MM`: all recurring items with statuses for the month.
- `GET /api/finance/owed`: open items followed by settled history, each with a server-computed `remaining` amount.
- `GET /api/finance/transactions`: `{items,total,page,pageSize,pages}`; 20 rows per page, newest first with stable tie-breaking. Query keys: `month` (defaults to current month; `all` for all time), `category` (ID), `type` (`expense`, `income`, `transfer`), `search` (literal note search), `page` (positive integer).

Overview and multi-collection reads use MongoDB snapshots. The month defaults to the current server month.

## Writes

- `PUT /settings`: `{openingAvailable,openingSavings,setupCompleted?}`. Balances permit zero; completing this request defaults `setupCompleted` to true. A dismissed setup card can send zero balances with `setupCompleted:true`.
- `POST /categories`: `{name,kind,order?}`; `PATCH /categories/:id` accepts a nonempty subset. Categories with history, budgets or recurring references cannot change kind. `POST /categories/:id/archive` takes an empty body. History and category-name snapshots are preserved.
- `POST /transactions`: `{type,amount,date,categoryId,note?}` for income/expenses. `PATCH /transactions/:id` accepts a nonempty subset. Category snapshots and recurring metadata are server-managed. Transfers cannot be edited. `DELETE /transactions/:id` removes any ledger row if bucket balances remain valid.
- `POST /transfers`: `{bucket,direction,amount,date,note?,goalId?}`; `goalId` is required only for the goal bucket. `DELETE /transfers/:id` accepts transfer IDs only.
- `POST /goals`: `{name,targetAmount,order?}`; `PATCH /goals/:id` accepts a nonempty subset. `POST /goals/:id/archive` accepts `{returnMoney?,delete?}`. A funded goal returns 409 until the user confirms `returnMoney:true`; returning funds and archive/deletion commit atomically. Use `delete:true` for deletion. Ledger history remains.
- `PUT /budgets/:categoryId`: `{limit}`; `DELETE /budgets/:categoryId` removes the limit. Each category has a single limit applied to monthly spending.
- `POST /recurring`: `{name,amount,categoryId,dueDay,isActive?}`; `PATCH /recurring/:id` accepts a nonempty subset; `DELETE /recurring/:id` preserves past ledger rows. `POST /recurring/:id/pay`: `{period,amount?,date?}`, with amount defaulting to the recurring amount and date defaulting to today. Period is `YYYY-MM` and cannot be in the future. Inactive items cannot be paid.
- `POST /owed`: `{person,direction,amount,note?,createdOn?}` with createdOn defaulting to today. `PATCH /owed/:id` accepts a nonempty subset. Payments and settlement are server-managed: `POST /owed/:id/payment` takes `{amount}` and `POST /owed/:id/settle` takes an empty body. `DELETE /owed/:id` removes the tracker only. These never write transactions or affect available money.

Paths in the write list are relative to `/api/finance`. Empty-body actions accept no additional fields. Conflicts (overdraws, duplicate recurring payments, funded-goal confirmation) return 409. Missing IDs return 404; invalid input returns 400. Delete confirmation dialogs belong to the frontend phase.

All Finance writes serialize through the settings singleton inside a MongoDB transaction. Retried transactions re-read balances; a unique partial recurring index provides an additional duplicate-payment safeguard. Editing/deleting ledger rows cannot overdraw a bucket or leave money in a deleted/archived goal. Collections and indexes are initialized before writes; defaults are insert-only.

## Validation

- `npm test`: existing tests plus Finance calculation, model and strict-schema tests; no database required.
- `npm run test:finance:integration`: real authenticated HTTP requests against a uniquely named temporary Atlas database. Tests concurrent overdraw rejection, duplicate recurring payments, CRUD, preserved history, budget totals, owed settlement and pagination. Uses the configured connection credentials, never the owner's database, and removes its temporary database in cleanup. No owner password is required.

No new dependencies were added.
