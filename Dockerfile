FROM mcr.microsoft.com/playwright:v1.50.0-noble

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY main.ts ./

RUN npm run build

ENV NODE_ENV=production

CMD ["npm", "start"]
