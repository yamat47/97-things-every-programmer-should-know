# Node のバージョンは .node-version と揃える
FROM node:24-bookworm-slim

WORKDIR /book

COPY package.json package-lock.json ./
RUN npm ci

# honkit serve（4000）とライブリロード（35729）
EXPOSE 4000 35729

CMD ["npm", "run", "serve"]
