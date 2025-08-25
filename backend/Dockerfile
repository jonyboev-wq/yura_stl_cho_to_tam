FROM node:18
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production && npm cache clean --force
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
