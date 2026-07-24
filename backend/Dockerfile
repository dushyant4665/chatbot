FROM node:18-alpine

WORKDIR /usr/src/app

# Package files copy karo
COPY package*.json ./

# Sirf production dependencies install karo
RUN npm ci --only=production

# Baki code copy karo
COPY . .

# Prisma client generate karo
RUN npx prisma generate

# Port expose karo
EXPOSE 5000

# Server start karo
CMD ["node", "src/server.js"]