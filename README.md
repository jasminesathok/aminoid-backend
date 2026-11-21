# Amnoid Backend — Node.js / Express + MySQL

REST API backend for the Amnoid Dashboard, backed by **MySQL**. 
This project uses a modular **MVC (Model-View-Controller)** architecture for high maintainability and scalability.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and fill in your MySQL credentials. The application will automatically create the database schema and seed initial data on first run if they don't exist.

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=amnoid_db
JWT_SECRET=change_this_to_a_long_random_string
ALLOWED_ORIGINS=http://localhost:5173
```

### 3. Start the server
```bash
npm run dev    # development (nodemon, auto-restart)
npm start      # production
```
Server starts on **http://localhost:5000** when using the provided `.env` file. If `PORT` is unset, it falls back to **5000**. Database migrations will run automatically on startup.

---

## Project Structure

The backend follows an industry-standard modular architecture:

```
amnoid_backend/
├── src/
│   ├── config/             ← Database & environment configuration
│   ├── database/           ← Migration & schema logic (auto-run)
│   ├── middleware/         ← JWT protection & role-based guards
│   ├── models/             ← Data layer (SQL query wrappers)
│   ├── modules/            ← Feature modules (Controller + Routes)
│   │   ├── auth/
│   │   ├── hr/
│   │   ├── projects/
│   │   └── ... (others)
│   ├── utils/              ← Shared utilities & helpers
│   └── index.js            ← Main entry point
├── .env.example
├── package.json
└── README.md
```

### Key Layers:
- **Models**: Centralized SQL queries. No raw SQL in s.
- **Modules**: Each feature is self-contained with its own routes and business logic.
- **Database**: Automatic schema management using a dedicated migration script.

---

## API Reference

All protected routes require an `Authorization: Bearer <token>` header.

| Module      | Base Path          | Key Features |
|-------------|--------------------|--------------|
| Auth        | `/api/auth`        | Login, Signup, Session management |
| Dashboard   | `/api/dashboard`   | Global stats, Activity, Revenue charts |
| Projects    | `/api/projects`    | Project CRUD, Tasks, Timeline (Gantt) |
| HR          | `/api/hr`          | Employee management, Payroll, Attendance, Leaves |
| Marketing   | `/api/marketing`   | Campaigns, Leads, Social media stats |
| Accounts    | `/api/accounts`    | Invoices, Expenses, Transactions |
| Reports     | `/api/reports`     | Sales, Performance, Analytics, Custom reports |
| Profile     | `/api/profile`     | User settings & Password updates |
| Kanban      | `/api/kanban`      | Board management & card CRUD |
| Files       | `/api/files`       | File tracking |
| FAQ         | `/api/faq`         | Help center data |
| Superadmin  | `/api/superadmin`  | System-wide stats & user management |

---

## Seed Credentials

| Email               | Password  | Role  |
|---------------------|-----------|-------|
| admin@gmail.com     | `123`     | admin |
| user@aminoid.com    | `123`     | member|
| test@test.com       | `test123` | member|
