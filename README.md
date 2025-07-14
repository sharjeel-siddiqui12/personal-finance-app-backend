# Personal Finance App Backend

Backend for a personal finance application built with Node.js, Express, and Oracle Database. It provides secure RESTful APIs for managing users, transactions, budgets, categories, savings goals, and generating financial reports.

## Features
- User registration, login, JWT authentication, and role-based access control
- Transaction management (income, expense, category assignment)
- Budget creation, validation, and performance tracking
- Category management (custom and system categories)
- Savings goals (create, update, allocate funds)
- Dashboard analytics (income vs expense, trends, spending by category)
- Financial reports (monthly, custom date range)
- Export reports as PDF and CSV
- Audit logging for user actions
- Admin features: user management, statistics

## Tech Stack
- Node.js
- Express.js
- Oracle Database (via `oracledb`)
- JWT for authentication
- PDFKit, csv-writer for report exports
- dotenv for environment variables
- Helmet, CORS, Morgan for security and logging

## Project Structure

```
backend/
├── app.js                # Express app setup and routes
├── server.js             # Server entry point, DB initialization
├── config/db.js          # Oracle DB connection and pool
├── controllers/          # Route handlers (auth, user, transaction, budget, etc.)
├── middleware/           # Auth and role-based middleware
├── models/               # Database models (User, Transaction, Budget, etc.)
├── routes/               # API route definitions
├── utils/                # Error handling, JWT utilities
├── package.json          # Dependencies and scripts
├── README.md             # Project documentation
```

## Setup & Installation
1. Clone the repository:
   ```
   git clone https://github.com/sharjeel-siddiqui12/personal-finance-app-backend.git
   cd personal-finance-app-backend/backend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env` and fill in Oracle DB credentials, JWT secrets, etc.
4. Start the server:
   ```
   npm run dev   # For development (nodemon)
   npm start     # For production
   ```

## Environment Variables
Required variables in `.env`:
- `PORT` - Server port (default: 5000)
- `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` - Oracle DB credentials
- `JWT_SECRET`, `JWT_EXPIRE` - JWT access token settings
- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRE` - JWT refresh token settings

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh-token` - Refresh JWT
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/me` - Get profile
- `PUT /api/users/me` - Update profile
- `PUT /api/users/password` - Change password
- `GET /api/users/` - List all users (admin)
- `GET /api/users/:id` - Get user by ID (admin)
- `DELETE /api/users/:id` - Delete user (admin)
- `PUT /api/users/:id/role` - Update user role (admin)

### Transactions
- `GET /api/transactions/` - List transactions
- `POST /api/transactions/` - Add transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/date-range` - Transactions by date range
- `GET /api/transactions/dashboard-summary` - Dashboard summary
- `GET /api/transactions/income-vs-expense` - Monthly income vs expense
- `GET /api/transactions/spending-by-category` - Spending by category
- `GET /api/transactions/financial-trends` - Financial trends
- `GET /api/transactions/admin/stats` - Admin stats

### Budgets
- `GET /api/budgets/` - List budgets
- `POST /api/budgets/` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget
- `GET /api/budgets/performance` - Budget performance
- `GET /api/budgets/vs-actual` - Budget vs actual

### Categories
- `GET /api/categories/` - List categories
- `POST /api/categories/` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Goals
- `GET /api/goals/` - List savings goals
- `POST /api/goals/` - Create goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal
- `POST /api/goals/allocate` - Allocate funds to goal

### Reports
- `GET /api/reports/monthly` - Monthly report
- `GET /api/reports/range` - Report by date range
- `GET /api/reports/download/pdf` - Download report as PDF
- `GET /api/reports/download/csv` - Download report as CSV

### Dashboard
- `GET /api/dashboard/summary` - Dashboard summary
- `GET /api/dashboard/income-vs-expense` - Income vs expense
- `GET /api/dashboard/spending-by-category` - Spending by category
- `GET /api/dashboard/trends` - Financial trends

## Database
- Oracle DB required. Tables: Users, Transactions, Budgets, Categories, Goals, AuditLogs
- Sequences for primary keys are auto-initialized on server start

## Security
- JWT authentication for all protected routes
- Role-based access for admin features
- Helmet and CORS for security
- Audit logging for sensitive actions

## Error Handling
- Centralized error handler with custom error class
- Handles Oracle DB errors and validation issues

## License
MIT

## Author
Sharjeel Siddiqui
