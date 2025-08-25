# DWG → STL Web Service

Минимальное монорепо:

- **Backend:** Node.js + Express
- **Frontend:** React
- **API:**
  - POST `/api/convert` — принимает `.dwg`
  - GET `/api/status` — проверка сервиса

## Запуск локально

### Backend
```bash
cd backend
npm install
npm start
```
Откроется на `http://localhost:3001`.

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
