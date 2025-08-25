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
