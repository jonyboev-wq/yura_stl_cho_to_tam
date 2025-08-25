# DWG → STL Web Service

Минимальное монорепо:

- **Backend:** Node.js + Express
- **Frontend:** React
- **API:**
  - POST `/api/convert` — загружает `.dwg`, запускает конвертацию через Autodesk APS и возвращает ссылку на STL
  - GET `/api/download/:urn/:derivativeUrn` — скачивание готового STL
  - GET `/api/status` — проверка сервиса

## Запуск локально

### Backend
```bash
cd backend
npm install
npm start
```
Откроется на `http://localhost:3001`.

Переменные окружения:

```
APS_CLIENT_ID=<ваш client id>
APS_CLIENT_SECRET=<ваш secret>
APS_BUCKET=<bucket в OSS>

# опционально для фронтенда
REACT_APP_API_URL=<url бэкенда>
```

### Frontend
```bash
cd frontend
npm install
npm start
```
Откроется на `http://localhost:3000`.

### Docker
```bash
docker build -t dwg-backend .
docker run -p 3001:3001 dwg-backend
```

### Особенности
- Лимит файла: 100 МБ
- Проверяется расширение `.dwg`
- Веб‑форма показывает прогресс загрузки
- Поддерживаются STL `binary` и `ascii`

### Примеры `curl`

```bash
# загрузка DWG и получение binary STL
curl -F file=@model.dwg -F format=binary http://localhost:3001/api/convert

# загрузка и получение ascii STL
curl -F file=@model.dwg -F format=ascii http://localhost:3001/api/convert

# скачивание результата после получения ссылки
curl -o result.stl "http://localhost:3001/api/download/<urn>/<derivativeUrn>"
```

## Деплой

### Frontend (Vercel / Render)
1. Укажите переменную окружения `REACT_APP_API_URL` со ссылкой на бэкенд.
2. Запуск сборки: `npm install && npm run build`.
3. Для Render используйте Dockerfile из папки `frontend` или статический хостинг; для Vercel достаточно обычного проекта React.

### Backend (Render / Fly)
1. Настройте переменные `APS_CLIENT_ID`, `APS_CLIENT_SECRET`, `APS_BUCKET`.
2. При использовании Render можно указать Procfile (`web: node backend/server.js`) или Dockerfile из `backend`.
3. Для Fly: `flyctl launch` и деплой через Dockerfile.
4. Перед обработкой файла рекомендуется вызвать ClamAV (см. функцию `scanForViruses` в `backend/server.js`).
