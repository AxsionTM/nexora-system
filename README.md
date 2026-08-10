# NEXORA

Business Management & Analytics SaaS Platform

A workspace-based platform for tracking sales, orders, customers, expenses
and business performance from one dashboard.

## Status

Landing page and design system complete. Project is being built incrementally,
commit by commit. Authentication and core business features come next.

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, TanStack
Query, Zustand, React Hook Form, Zod, Recharts, Framer Motion

**Backend:** Python, Django, Django REST Framework, PostgreSQL, SimpleJWT

## Project Structure

```
nexora/
├── frontend/     React + TypeScript SPA
├── backend/      Django REST API
├── docker-compose.yml
└── .env.example
```

## Running Locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### With Docker

```bash
docker-compose up --build
```

## Environment Variables

See `.env.example` at the project root.

---

More sections (Features, Architecture, API, Demo Mode, Screenshots) will be
added as the project grows.

## Demo data / Seed

После миграций создайте тестового пользователя и данные:

```bash
cd backend
python manage.py migrate
python manage.py seed_demo
```

**Логин:**
- Email: `ignatevm601@gmail.com`
- Пароль: `PT4_zwuS_gv3Ly2`

Команда создаст workspace «NEXORA Demo Store», товары, клиентов и заказы за ~90 дней.

