FROM node:18 AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install && npm cache clean --force
COPY . .
RUN npm run build

FROM node:18
WORKDIR /app
COPY --from=build /app/build ./build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build"]
