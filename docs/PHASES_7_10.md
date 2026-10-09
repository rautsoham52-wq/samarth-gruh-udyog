# Navratri Bhoj: Phases 7–10

## Implemented locally

- Product variants now come from PostgreSQL. The final catalog seed maintains the 12 requested products and 24 active variants (500g and 1kg for each), with the specified selling prices, cost prices, stock of 100, threshold of 20, and availability enabled. Superseded variants are marked inactive instead of deleted so existing references remain intact.
- New orders use database variant prices and cost snapshots. NEW orders reserve stock; ACCEPTED orders deduct it; cancelling a NEW order releases the reservation, while cancelling an accepted order restores the deducted stock. COMPLETED orders keep their deduction.
- Revenue and profit are recognized only when an order is COMPLETED/collected. Legacy order item prices remain unchanged. Profit is reported as unavailable when historical cost snapshots are missing rather than guessed.
- Admin pages cover inventory, expenses, sales/profit, daily/weekly/monthly reports, and public-order QR generation.
- `/track-order` verifies both order number and phone number, then refreshes the status every 15 seconds while the tracking page is open.
- AI and WhatsApp features are not included. Payment remains Pay at Shop.

## Local database setup

The migration is additive and does not reset existing tables or records. Run it from the backend directory after setting the existing local environment:

```powershell
.\venv\Scripts\python.exe .\migrate_phase7_9.py
.\venv\Scripts\python.exe .\seed_variants.py
```

The catalog seed is idempotent. It renames the existing generic `Sev` product to `Barik Sev`, adds `Masala Sev` and `Boondi Ladoo` when missing, and deactivates variants not in the final catalog. It preserves order item snapshots and adjusts stock with inventory-history entries. Review the final active product and variant counts after running it.

## Environment configuration

Use `backend/.env.example` and `frontend/.env.production.example` as variable-name references only. Keep real secrets and database connection strings in the host's secret/environment settings; never commit them.

Backend:

- `DATABASE_URL`: PostgreSQL URL. `postgres://` and `postgresql://` are normalized to the installed `psycopg` driver.
- `JWT_SECRET_KEY`: generate a unique random secret of at least 32 bytes.
- `FRONTEND_ORIGINS`: comma-separated exact frontend origins, without trailing slashes.
- `AUTH_COOKIE_SECURE=true` for HTTPS.
- `AUTH_COOKIE_SAMESITE=none` only when the selected frontend/backend origins are cross-site; `none` forces the Secure cookie flag. Cross-site cookies can still be blocked by browser privacy settings, so prefer same-site HTTPS hosting for the frontend and backend.

Frontend:

- `VITE_API_BASE_URL`: HTTPS backend base URL, without a trailing slash.
- `VITE_PUBLIC_SITE_URL`: confirmed HTTPS public frontend URL. `/admin/qr` uses this value and links the QR directly to the menu. Rebuild the frontend whenever this value changes.

## Production deployment and QR status

No provider account, production PostgreSQL target, production URL, or permission to publish this project was available during this code change. No deployment was performed, no production data was copied, and no production QR was generated. Do not point the production app at the existing local database until a deliberate, verified data-preserving export/import plan is approved.

Provider free tiers are not automatically production-safe. Render's own free-tier documentation says free instances are for hobby/testing and not production; its free web service also sleeps when idle. Neon describes its Free plan as suited to prototypes and side projects, with quotas and scale-to-zero. Check current provider limits and select a host before publishing customer data:

- [Render free instances and limitations](https://render.com/docs/free)
- [Neon pricing and quotas](https://neon.com/pricing)

After a host and production URL are selected, set the environment variables above, run the additive migration and idempotent seed against the intended production database, verify the retained products/customers/orders, enter real inventory costs/stock, and rebuild the frontend with the confirmed public URL. Then use Admin → Order QR to download the ordering QR as SVG.
