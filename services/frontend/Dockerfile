FROM node:20-alpine

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package.json ./
RUN npm install

# Copy application sources
COPY . .

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "dev"]
