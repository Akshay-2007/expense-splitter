# 💰 Expense Splitter

A full-stack web app for splitting expenses with friends — like Splitwise.
Create groups, add shared expenses, and let the app calculate the simplest way to settle up.

## Tech Stack

| Layer     | Technology                               |
|-----------|------------------------------------------|
| Frontend  | React 18, Vite, React Router, Tailwind CSS |
| Backend   | Node.js, Express.js, REST API            |
| Database  | MongoDB with Mongoose                    |
| Auth      | JWT + bcrypt                             |
| Config    | dotenv                                   |

## Features

- **Auth**: Register, login, logout, JWT-protected routes
- **Groups**: Create groups, add/remove members by email
- **Expenses**: Add/edit/delete with 4 split types (equal, exact, percentage, shares)
- **Balances**: Per-group "who owes whom" with net balance per member
- **Simplify Debts**: Minimizes settlement transactions via greedy algorithm
- **Settle Up**: Record payments between members
- **Activity Feed**: Chronological history of expenses and settlements
- **Dashboard**: Total you owe, total owed to you, recent groups
- **Bonus**: Category/date filters, CSV export, dark mode toggle

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
# Backend
cd expense-splitter/server
cp .env.example .env        # Edit MONGO_URI and JWT_SECRET
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure Environment

Edit `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/expense-splitter
JWT_SECRET=your_secure_secret_here
CLIENT_URL=http://localhost:5173
```

### 3. Run

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:5173

## API Endpoints

### Auth
| Method | Endpoint             | Description       |
|--------|---------------------|--------------------|
| POST   | `/api/auth/register` | Register new user  |
| POST   | `/api/auth/login`    | Login              |
| GET    | `/api/auth/me`       | Get current user   |

### Groups
| Method | Endpoint                              | Description        |
|--------|--------------------------------------|--------------------|
| POST   | `/api/groups`                         | Create group       |
| GET    | `/api/groups`                         | List my groups     |
| GET    | `/api/groups/:id`                     | Get group          |
| POST   | `/api/groups/:id/members`             | Add member         |
| DELETE | `/api/groups/:id/members/:userId`     | Remove member      |

### Expenses
| Method | Endpoint                              | Description        |
|--------|--------------------------------------|--------------------|
| POST   | `/api/groups/:id/expenses`            | Create expense     |
| GET    | `/api/groups/:id/expenses`            | List expenses      |
| PUT    | `/api/expenses/:id`                   | Update expense     |
| DELETE | `/api/expenses/:id`                   | Delete expense     |

### Balances & Settlements
| Method | Endpoint                              | Description          |
|--------|--------------------------------------|----------------------|
| GET    | `/api/groups/:id/balances`            | Balances + simplified debts |
| POST   | `/api/groups/:id/settlements`         | Record settlement    |
| GET    | `/api/groups/:id/settlements`         | List settlements     |

## Sample API Requests

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}'
# → Save the token from the response

# Create Group (replace TOKEN)
curl -X POST http://localhost:5000/api/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"Trip to Paris","description":"Summer 2024"}'

# Add Expense (equal split, amount in CENTS)
curl -X POST http://localhost:5000/api/groups/GROUP_ID/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "description": "Dinner",
    "amount": 6000,
    "category": "food",
    "splitType": "equal",
    "paidBy": [{"user": "YOUR_USER_ID", "amount": 6000}]
  }'

# Get Balances
curl http://localhost:5000/api/groups/GROUP_ID/balances \
  -H "Authorization: Bearer TOKEN"
```

## Money Handling

All monetary amounts are stored and transmitted as **integers in cents** to avoid
floating-point errors. The frontend converts dollars → cents on submit and
cents → dollars for display.

- `$12.50` → stored as `1250`
- Equal splits handle remainders by distributing 1 cent extra to the first N users

## Debt Simplification Algorithm

Uses a greedy approach to minimize the number of transactions:

1. Calculate each user's net balance (total paid − total share owed ± settlements)
2. Split into creditors (positive) and debtors (negative)
3. Sort both descending by absolute value
4. Match the largest debtor with the largest creditor
5. Repeat until all balances are zero

## License

MIT
