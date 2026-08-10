# NEXORA

**Business Management & Analytics SaaS Platform**

Современная workspace-платформа для учёта продаж, заказов, клиентов, расходов и роста бизнеса в одном месте.

> A modern business management and analytics platform that helps companies track revenue, expenses, customers, orders, team performance and business growth from one workspace.

## Возможности

- Дашборд и аналитика (выручка, заказы, расходы, чистая прибыль)
- Товары, клиенты, заказы
- Учёт расходов и расчёт прибыли
- Команда и роли (Владелец / Админ / Менеджер / Сотрудник)
- Уведомления
- Интеграции (sandbox) и тестовые платежи
- AI-ассистент на Google Gemini (с безопасным business context)
- Демо-данные одной командой
- Тёмная / светлая тема

## Стек

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zustand, React Hook Form, Zod, Recharts, Framer Motion, Lucide

**Backend:** Python, Django, Django REST Framework, PostgreSQL (SQLite для локального старта), SimpleJWT, django-environ, django-cors-headers

## Быстрый старт

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173

### Docker

```bash
docker-compose up --build
```

## Демо-аккаунт (после seed_demo)

| Поле    | Значение                 |
|---------|--------------------------|
| Email   | ignatevm601@gmail.com    |
| Пароль  | PT4_zwuS_gv3Ly2          |

Команда `seed_demo` создаёт workspace **NEXORA Demo Store**, товары, клиентов, заказы, расходы, уведомления и sandbox-интеграции.

## Переменные окружения

См. `.env.example`. Важно:

```env
DJANGO_SECRET_KEY=...
GEMINI_API_KEY=...          # Google Gemini для AI-ассистента
GEMINI_MODEL=gemini-2.5-flash
VITE_API_BASE_URL=http://localhost:8000/api
```

Секреты **никогда** не коммитятся (`.env` в `.gitignore`).

## API (основные группы)

```
/api/auth/
/api/workspaces/
/api/products/
/api/customers/
/api/orders/
/api/expenses/
/api/analytics/
/api/team/
/api/notifications/
/api/integrations/
/api/payments/
/api/ai/
```

## Структура

```
nexora/
├── frontend/          React + TypeScript SPA
├── backend/           Django REST API
│   └── apps/
│       ├── core/
│       ├── users/
│       └── business/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Demo Mode

Кнопка «Смотреть демо» / команда `seed_demo` — реалистичные данные без реальных платежей и карт.

## Лицензия

Portfolio / MIT (уточните при публикации).
