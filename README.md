<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=36&pause=1000&color=8A2BE2&center=true&vCenter=true&width=700&height=70&lines=NEXORA;Business+Manager;Analytics+%26+AI" alt="NEXORA animated title" />
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,20&height=120&section=header" />
</p>

---

# ⚠️ ПРОЕКТ ЕЩЁ В РАЗРАБОТКЕ

<p align="center">
  <img src="https://img.shields.io/badge/%D0%A1%D0%A2%D0%90%D0%A2%D0%A3%D0%A1-IN%20PROGRESS-orange?style=for-the-badge" alt="In progress">
  <img src="https://img.shields.io/badge/%D0%93%D0%9E%D0%A2%D0%9E%D0%92%D0%9D%D0%9E%D0%A1%D0%A2%D0%AC-~50%25-yellow?style=for-the-badge" alt="~50%">
</p>

> **ЭТО НЕ ГОТОВЫЙ ПРОДУКТ.**  
> NEXORA находится **на стадии активной реализации**. Кодовая база **примерно наполовину сырая**:  
> часть модулей уже работает end-to-end, часть — в процессе доработки, интеграции и биллинг ещё эволюционируют.  
> Ожидайте баги, незавершённые экраны и изменения API без обратной совместимости.  
> Репозиторий — **портфолио + рабочий прогресс**, а не production-релиз «из коробки».

---

<p align="center">
  <img src="https://avatars.githubusercontent.com/u/146373364?v=4" width="120" style="border-radius:50%">
</p>
<h2 align="center">👨‍💻 Maxsim (Axsion)</h2>
<p align="center">
  <img src="https://img.shields.io/badge/Age-17-blue?style=for-the-badge">
  <a href="https://github.com/AxsionTM">
    <img src="https://img.shields.io/badge/GitHub-AxsionTM-black?style=for-the-badge&logo=github">
  </a>
  <a href="https://t.me/AxsionTM">
    <img src="https://img.shields.io/badge/Telegram-AxsionTM-2CA5E0?style=for-the-badge&logo=telegram">
  </a>
</p>

---

## 📦 О проекте

**NEXORA** — SaaS-платформа для управления бизнесом и аналитики: заказы, товары, клиенты, расходы, команда, уведомления и AI-ассистент в одном workspace.

Цель — дать предпринимателю «пульт управления» компанией: видеть выручку и прибыль, контролировать склад, работать с клиентами и получать ответы от нейросети по живым данным бизнеса.

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript">
  <img src="https://img.shields.io/badge/Django-5-092E20?style=for-the-badge&logo=django">
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql">
  <img src="https://img.shields.io/badge/Gemini-AI-8A2BE2?style=for-the-badge&logo=google">
  <img src="https://img.shields.io/badge/License-Portfolio-red?style=for-the-badge">
</p>

---

## ✨ Что уже есть (и что ещё сырое)

### Работает или близко к рабочему
- 📊 **Дашборд и аналитика** — выручка, заказы, расходы, чистая прибыль, серии графиков
- 📦 **Товары** — склад, активность, остатки
- 🧾 **Заказы** — создание, статусы, оплата, учёт остатков
- 👥 **Клиенты** и **расходы**
- 👨‍👩‍👧 **Команда** — роли (владелец / админ / менеджер / сотрудник)
- 🔔 **Уведомления** в приложении + каналы (Telegram / Email / Webhook / Slack)
- 🤖 **AI-ассистент** (Google Gemini) с контекстом KPI workspace
- 💼 **Кошелёк и тарифы** (Free / Pro / Business) с лимитами
- ⚙️ **Настройки** — профиль, тема, workspace, интеграции
- 🛠 **Django Admin** — выдача баланса и подписок, кастомная тема

### Ещё в процессе / нестабильно
- Полноценный эквайринг и production-биллинг
- Глубокие интеграции (Google Sheets OAuth, Google Analytics dashboard)
- Полировка UX, edge-cases, нагрузка, тесты
- Документация API и CI/CD «как в бою»

> **ЕЩЁ РАЗ: ПРОЕКТ НА СТАДИИ РЕАЛИЗАЦИИ, ОКОЛО ПОЛОВИНЫ ФУНКЦИОНАЛА СЫРОЕ.**  
> Не используйте как единственную систему учёта в реальном бизнесе без доработки.

---

## 🏗 Архитектура

```
nexora/
├── frontend/                 # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── pages/            # Дашборд, заказы, AI, настройки…
│       ├── components/       # UI, layout, landing
│       ├── services/         # API-клиент
│       └── stores/           # Zustand (auth, workspace, theme)
├── backend/
│   ├── apps/
│   │   ├── users/            # JWT, кошелёк, тарифы, admin
│   │   ├── business/         # заказы, аналитика, AI, интеграции
│   │   └── core/
│   └── config/               # settings, urls
├── docker-compose.yml
├── .env.example
└── README.md
```

**Frontend:** React, TypeScript, Vite, Tailwind, TanStack Query, Zustand, Recharts, Framer Motion  
**Backend:** Django, DRF, SimpleJWT, PostgreSQL (SQLite для локального старта), Gemini API

---

## 🚀 Быстрый старт (локально)

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env         # заполните ключи
python manage.py migrate
python manage.py seed_demo         # демо-пользователь и данные
python manage.py runserver
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Откройте `http://localhost:5173`.

### 3. Демо-вход (после `seed_demo`)

Данные сида смотрите в команде `seed_demo` / выводе консоли.  
Админка: `http://localhost:8000/admin/`

### 4. Переменные окружения (фрагмент)

```env
SECRET_KEY=change-me
DEBUG=True
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
TELEGRAM_BOT_TOKEN=
EMAIL_HOST=
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
```

Полный список — в `.env.example`. **Секреты в репозиторий не коммитятся.**

---

## 🎯 Для кого этот репозиторий

- Показать **стек и архитектуру** SaaS (auth, workspace isolation, analytics, AI context)
- Зафиксировать **прогресс разработки** NEXORA
- **Не** как готовый SaaS для продакшена «скачал и заработал»

Связь / вопросы: [Telegram @AxsionTM](https://t.me/AxsionTM) · [GitHub @AxsionTM](https://github.com/AxsionTM)

---

## 📄 Лицензия

Код публикуется в **ознакомительных и портфолио-целях**.  
Копирование, модификация и коммерческое использование без согласия автора **запрещены**.  
Все права защищены.

---

<p align="center">
  <b>NEXORA — IN DEVELOPMENT · NOT PRODUCTION-READY</b>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,20&height=100&section=footer" />
</p>
