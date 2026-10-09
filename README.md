# JNTU-GV University Guest House Management Portal

A full-stack portal for Jawaharlal Nehru Technological University Gurajada Vizianagaram (JNTU-GV) to manage guest house operations, including guest registration, room reservations, booking approvals, payment workflows, email notifications, and administrative records.

## Features

- Role-based access for students, staff, outsiders, and administrators
- Guest registration, room booking, and date-overlap checks
- Staff verification and booking approval workflows
- Payment order, settlement, and Razorpay webhook support
- Email notifications and OTP verification
- Guest document uploads, audit records, and server-sent event updates

## Technology

- React 19 and Vite
- Node.js and Express
- Sequelize with PostgreSQL for persistent data
- SQLite in-memory mode for local development and automated tests

## Requirements

- Node.js 18 or later and npm
- PostgreSQL for persistent local or production data (optional for a temporary SQLite development session)

## Local development

1. Clone the repository and install dependencies:

   ```bash
   git clone <repository-url>
   cd university-guest-house-portal
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env`.

   Edit `.env` for local use: set `NODE_ENV=development`, configure `FRONTEND_URL=http://localhost:3000`, and set a local `DATABASE_URL` if you want data to persist. Never commit `.env` or put real credentials in `.env.example`.

   If no database connection is configured in development, the backend uses an in-memory SQLite database. Its data is temporary and is lost when the server stops. A failed configured database connection also falls back to in-memory SQLite in non-production mode.

3. Start the API server in one terminal:

   ```bash
   npm start
   ```

   The API listens on port `5000` by default. Set `PORT` in `.env` to change it.

4. Start the Vite frontend in another terminal:

   ```bash
   npm run dev
   ```

   Open the URL printed by Vite (normally `http://localhost:3000`).

## Database initialization and first admin

On an empty database, the backend creates the tables and seeds rooms 101–106. It also creates an administrator account:

- Login: `admin@university.edu`
- Password: the value of `INITIAL_ADMIN_PASSWORD` when the empty database is first initialized

Set a unique password in your local `.env` before the first startup. In development/test only, the code has a fallback password if this variable is unset; do not use that fallback for a real deployment. The password is not reset automatically if the account already exists.

## Tests and build

Run the backend integration test suite:

```bash
npm test
```

Build the frontend for production:

```bash
npm run build
```

Preview the generated frontend locally with `npm run preview`.

## Configuration

See [.env.example](./.env.example) for the supported environment variables. Each developer or deployment should create and maintain its own `.env`; do not commit secrets, database connection strings, uploaded documents, or real guest data.

Important settings include:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Set to `development` locally and `production` for deployment. |
| `PORT` | Express server port; defaults to `5000`. |
| `FRONTEND_URL` | Allowed frontend origin(s), comma-separated if needed. |
| `DATABASE_URL` | PostgreSQL connection string for persistent storage. |
| `JWT_SECRET` | Secret used to sign authentication tokens. Use a strong, unique value outside local development/tests. |
| `INITIAL_ADMIN_PASSWORD` | Password used only when the initial administrator is seeded into an empty database. |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | SMTP configuration for email delivery. |
| `PAYMENT_MODE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Payment gateway configuration. |
| `STORAGE_DRIVER` | Upload storage selection; configure storage carefully for deployment. |

## Production deployment

The Express server serves the built frontend when `NODE_ENV=production`.

1. Provision a persistent PostgreSQL database and configure its connection string.
2. Configure production environment variables in your hosting provider's secret manager. At minimum, set `NODE_ENV=production`, `FRONTEND_URL`, `DATABASE_URL`, `JWT_SECRET`, and `INITIAL_ADMIN_PASSWORD`. Configure SMTP, Razorpay, and storage credentials if those features are enabled.
3. Build and start the application:

   ```bash
   npm install
   npm run build
   npm start
   ```

Do not use in-memory SQLite for production; its data is temporary. Back up the database, use HTTPS, restrict production access to credentials, and verify payment, email, and file-storage configuration before launch. Review schema changes and deployment procedures before applying them to a database containing important data.

## Test plan

See [TEST_PLAN.md](./TEST_PLAN.md) for additional manual test scenarios.
