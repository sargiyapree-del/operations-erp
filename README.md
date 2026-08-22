# Operations ERP

A full-stack Operations ERP application designed to manage customer orders, products, warehouses, and operational workflows through a role-based interface.

The application consists of a React frontend and a Node.js/Express backend with PostgreSQL database integration and JWT-based authentication.

---

## 🚀 Live Deployment

### Frontend
http://44.223.21.143:5173/

### Backend API
http://44.223.21.143:3000/

The application is deployed on an AWS EC2 instance.

---
🔐 Authentication & Roles

The application uses JWT-based authentication and role-based access control.

The following roles are supported:

Role	Description
ADMIN	Full system access
OPERATIONS_MANAGER	Manage operational modules
WAREHOUSE_OPERATOR	Warehouse-related operations
SALES_USER	Customer and sales operations
Demo Credentials
Admin
Email: admin@erp.com
Password: Admin@123
Operations Manager
Email: manager@erp.com
Password: Manager@123
Warehouse Operator
Email: warehouse@erp.com
Password: Warehouse@123
Sales User
Email: sales@erp.com
Password: Sales@123

These credentials are provided for case-study/demo purposes.

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Lucide React
- HTML5
- CSS3

### Backend
- Node.js
- Express.js
- TypeScript
- JWT Authentication
- Role-Based Access Control (RBAC)

### Database
- PostgreSQL
- Prisma ORM

### Deployment
- AWS EC2
- Amazon Linux 2
- PM2
- Git / GitHub

---

## 📁 Project Structure

```text
operations-erp/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── ...
│   ├── prisma/
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── .env
│   ├── package.json
│   └── vite.config.ts
│
└── README.md

---

## ⚙️ Project Setup

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- PostgreSQL
- Git

Clone the repository:

```bash
git clone https://github.com/sargiyapree-del/operations-erp.git
cd operations-erp

The project contains two applications:
frontend/
backend/

🗄️ Database Setup

The backend uses PostgreSQL with Prisma ORM.

1. Create PostgreSQL Database

Create a PostgreSQL database for the application.

Example:

CREATE DATABASE operations_erp;
2. Configure Database Connection

Set the PostgreSQL connection string in the backend .env file:

DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:5432/operations_erp"

Replace:

USERNAME with your PostgreSQL username
PASSWORD with your PostgreSQL password
HOST with your database host
5432 with your PostgreSQL port if different
3. Generate Prisma Client

From the backend directory:

npx prisma generate
4. Apply Database Migrations
npx prisma migrate deploy

For local development, migrations can be applied using:

npx prisma migrate dev
🔐 Environment Variables
Backend

Create:

backend/.env

Example:

DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="your_jwt_secret"
PORT=3000
Frontend

Create:

frontend/.env

For local development:

VITE_API_BASE_URL=http://localhost:3000

For the deployed application:

VITE_API_BASE_URL=http://44.223.21.143:3000
Environment Variable Description
Variable	Application	Description
DATABASE_URL	Backend	PostgreSQL database connection
JWT_SECRET	Backend	Secret used for JWT authentication
PORT	Backend	Port on which the backend runs
VITE_API_BASE_URL	Frontend	Backend API base URL

Do not commit .env files or production secrets to GitHub.

▶️ How to Run
Backend

Open a terminal:

cd backend

Install dependencies:

npm install

Generate Prisma Client:

npx prisma generate

Run database migrations:

npx prisma migrate deploy

Start the backend:

npm run dev

Backend will run on:

http://localhost:3000
Frontend

Open another terminal:

cd frontend

Install dependencies:

npm install

Start the frontend:

npm run dev

Frontend will run on:

http://localhost:5173
🧪 How to Test
1. Login Testing

Open the frontend application:

http://localhost:5173

or the deployed application:

http://44.223.21.143:5173/

Login using any of the provided demo accounts.

Verify that:

Valid credentials allow login.
Invalid credentials are rejected.
JWT authentication is maintained.
Users can access only the modules permitted for their role.
2. Role-Based Access Testing

Test the application using each role:

ADMIN
OPERATIONS_MANAGER
WAREHOUSE_OPERATOR
SALES_USER

Verify that each role receives the appropriate permissions and access.

3. Customer Order Testing

Navigate to:

Customer Orders

Test:

Viewing customer orders
Creating a new order
Confirming an order
Fulfilling an order
Refreshing order data
Verifying order status changes

The expected order workflow is:

DRAFT → CONFIRMED → FULFILLED
4. API Testing

The backend API can be tested using:

Postman
Thunder Client
Browser Developer Tools

Deployed backend:

http://44.223.21.143:3000/

Protected API requests require a JWT token:

Authorization: Bearer <JWT_TOKEN>
5. Database Testing

Verify that:

Database connection is successful.
Prisma migrations are applied.
Application data is persisted in PostgreSQL.
Creating or updating records through the application is reflected in the database.
☁️ Deployment

The application is deployed on an AWS EC2 instance running Amazon Linux 2.

Deployed Frontend
http://44.223.21.143:5173/
Deployed Backend
http://44.223.21.143:3000/

PM2 is used to manage the running application processes.

Check PM2 processes:

pm2 status

View logs:

pm2 logs

Restart backend:

pm2 restart erp-backend

Restart frontend:

pm2 restart erp-frontend
🔄 Updating the Deployment

After making changes and pushing them to GitHub:

git pull origin main
Backend
cd backend
npm install
npm run build
pm2 restart erp-backend
Frontend
cd frontend
npm install
npm run build
pm2 restart erp-frontend

If environment variables are changed, restart the corresponding PM2 process so the updated configuration is loaded.

👨‍💻 Author

Preet Sargiya

B.Tech Computer Science & Engineering
```
