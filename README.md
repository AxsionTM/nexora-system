<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=32&pause=1000&color=8B7BFF&center=true&vCenter=true&width=600&height=60&lines=AI+CHAT+BOT;GEMINI+POWERED;TELEGRAM+MINI+APP" alt="AI Chat Bot animated title" />
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:8B7BFF,100:37E0C9&height=120&section=header" />
</p>

---

<p align="center">
  <img src="https://wsrv.nl/?url=avatars.githubusercontent.com/u/146373364%3Fv%3D4&w=200&h=200&fit=cover&mask=circle" width="120">
</p>

<h2 align="center">Maxsim (Axsion)</h2>

<p align="center">
  Telegram Bot Developer · Python · AI
</p>

<p align="center">
  <a href="https://github.com/AxsionTM">
    <img src="https://img.shields.io/badge/GitHub-Axsion-black?style=for-the-badge&logo=github">
  </a>
</p>

---

## О проекте

**AI Chat Bot** — Telegram-бот на Python с интеграцией Google Gemini.

Общаться с нейросетью можно непосредственно в Telegram или через встроенный **Telegram Mini App** — веб-интерфейс с несколькими диалогами, боковой панелью и отдельным дизайном.

Проект создан как учебный и портфолио-кейс для изучения разработки Telegram-ботов, интеграции внешних AI API и создания Telegram Mini Apps.

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/aiogram-3.15-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white">
  <img src="https://img.shields.io/badge/Google_Gemini-AI-8B7BFF?style=for-the-badge&logo=google&logoColor=white">
  <img src="https://img.shields.io/badge/FastAPI-Mini%20App-009688?style=for-the-badge&logo=fastapi&logoColor=white">
  <img src="https://img.shields.io/badge/SQLite-Storage-37E0C9?style=for-the-badge&logo=sqlite&logoColor=white">
</p>

---

## Скриншоты

<p align="center">
  <img src="docs/screenshots/hero-screen.png" width="49%" alt="Приветственный экран Mini App" />
  <img src="docs/screenshots/chat-screen.png" width="49%" alt="Диалог с нейросетью в Mini App" />
</p>

<p align="center">
  <sub>Слева — стартовый экран с подсказками, справа — диалог с генерацией кода на Python</sub>
</p>

---

## Функционал

- Чат с нейросетью непосредственно в Telegram
- Google Gemini в качестве AI-бэкенда
- История диалогов для каждого пользователя
- `/reset` для очистки истории диалога
- Telegram Mini App с поддержкой нескольких чатов
- Боковая панель со списком диалогов
- Создание и удаление чатов
- Тёмная тема с градиентным акцентом и анимациями
- Индикатор генерации ответа
- Автоматическая адаптация под светлую и тёмную тему Telegram
- Проверка подлинности запросов Mini App через `initData` и HMAC-подпись
- Хранение истории Mini App в SQLite отдельно для каждого пользователя
- Общая функция `generate_reply` для Telegram-бота и Mini App

---

## Архитектура проекта

```text
telegram-ai-bot/
├── bot/
│   ├── main.py                  # точка входа бота
│   ├── config.py                # настройки из .env
│   ├── handlers/
│   │   └── common.py            # /start, /help, /reset и обработка текста
│   └── services/
│       └── ai.py                # интеграция с Gemini
├── server/
│   ├── main.py                  # FastAPI-бэкенд Mini App
│   ├── db.py                    # SQLite-хранилище
│   └── auth.py                  # проверка Telegram initData
├── webapp/
│   ├── index.html               # разметка Mini App
│   ├── style.css                # стили и анимации
│   └── app.js                   # логика интерфейса и API
├── data/                        # SQLite-база
├── docs/
│   └── screenshots/             # скриншоты README
├── .env.example                 # шаблон переменных окружения
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Быстрый старт

### 1. Создание Telegram-бота

Откройте [@BotFather](https://t.me/BotFather) в Telegram и выполните:

```text
/newbot
```

Задайте имя и username бота и получите токен.

### 2. Установка

```bash
git clone https://github.com/ТВОЙ_GITHUB/telegram-ai-bot.git
cd telegram-ai-bot

python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Linux / macOS:

```bash
source venv/bin/activate
```

Установите зависимости:

```bash
pip install -r requirements.txt
```

### 3. Настройка `.env`

Создайте файл на основе `.env.example`:

```bash
cp .env.example .env
```

Заполните необходимые параметры:

```env
BOT_TOKEN=токен_от_botfather

AI_PROVIDER=gemini
AI_API_KEY=ключ_от_google_ai_studio
AI_MODEL=gemini-3.5-flash-lite
```

API-ключ Gemini можно получить через [Google AI Studio](https://aistudio.google.com/apikey).

Если нейросеть пока не подключена, можно использовать:

```env
AI_PROVIDER=none
```

В этом режиме бот будет отвечать эхом.

### 4. Запуск бота

```bash
python -m bot.main
```

---

## Telegram Mini App

Mini App запускается отдельным процессом:

```bash
uvicorn server.main:app --reload --port 8000
```

Для работы внутри Telegram необходим публичный HTTPS-адрес.

Для локальной разработки можно использовать [ngrok](https://ngrok.com/download):

```bash
ngrok http 8000
```

Полученный адрес укажите в `.env`:

```env
WEBAPP_URL=https://xxxx.ngrok-free.app
```

После этого перезапустите бота.

Под `/start` появится кнопка для открытия Mini App.

> Бесплатный адрес ngrok меняется после перезапуска. Для постоянного адреса требуется полноценный деплой.

---

## Нейросеть

В качестве AI-бэкенда используется **Google Gemini** через официальный SDK `google-genai`.

Основная логика работы с моделью находится в:

```text
bot/services/ai.py
```

Функция `generate_reply` используется одновременно Telegram-ботом и Mini App, что позволяет избежать дублирования AI-логики.

Для выбора другой модели необходимо изменить значение `AI_MODEL` в `.env`.

---

## Возможные AI-провайдеры

Архитектура позволяет заменить текущий AI-бэкенд на другой сервис.

| Сервис | Особенности |
|--------|-------------|
| **Google Gemini** | Основной AI-провайдер проекта |
| **Groq** | Быстрый inference |
| **OpenRouter** | Доступ к нескольким моделям через единый API |
| **Hugging Face Inference API** | Доступ к открытым моделям |

---

## Планы по развитию

- [ ] Деплой бота и Mini App с постоянным HTTPS-адресом
- [ ] Стриминг ответа нейросети
- [ ] Выбор модели или личности бота через интерфейс
- [ ] Rate limit для пользователей
- [ ] Логирование диалогов для анализа

---

## Лицензия

Учебный проект. Код открыт для ознакомления и переиспользования.

<p align="center">
  Made by <a href="https://github.com/AxsionTM">Axsion</a>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:37E0C9,100:8B7BFF&height=100&section=footer" />
</p>
