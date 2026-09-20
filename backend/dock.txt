FROM node:18-slim

RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libglib2.0-0 libnspr4 \
    libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 \
    libxcb1 libxcomposite1 libxcursor1 libxdamage1 libext6 libfx1 \
    libxi6 libxrandr2 libxrender1 libxss1 libxtst1 lsb-release wget xdg-utils

WORKDIR /app

COPY package*.json ./
RUN npm install

RUN npx playwright install chromium
RUN npx playwright install-deps chromium

COPY . .

EXPOSE 3001
CMD ["node", "index.js"]