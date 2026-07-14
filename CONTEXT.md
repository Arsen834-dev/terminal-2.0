# Терминал Синдиката 2.0

Интерактивная энциклопедия по вселенной Space Station 14 в стиле терминала.

## Технологии
- Фронтенд: Vanilla JS + Three.js (3D-сцена)
- Бэкенд: Supabase (база, realtime, auth)
- ИИ: W-C26 через Gemini API / OpenRouter

## Структура проекта
- index.html — точка входа
- css/ — стили (main.css, login.css, apps.css, animations.css)
- js/ — скрипты (main.js, scene.js, camera.js, wc26.js, auth.js, chat.js, dm.js, shop.js, agents.js, clans.js, guides.js, announcements.js, achievements.js, admin.js, settings.js, config.js)
- assets/ — 3D-модели, звуки, текстуры
- sw.js — Service Worker

## Что делаем сейчас
Шаг 1 — Заставка с 3D-черепом + переход к экрану входа.
- HTML/CSS/JS для заставки
- Three.js для 3D-черепа (модель skull.glb)
- Анимация съедания (челюсть открывается, череп расширяется)
- Переход к экрану входа