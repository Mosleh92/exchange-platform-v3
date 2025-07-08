const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ایجاد ساختار پوشهها
const directories = [
  "src/config",
  "src/models",
  "src/services",
  "src/controllers",
  "src/routes",
  "src/middleware",
  "src/utils",
  "src/tests",
  "scripts",
];

directories.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// نصب وابستگیها
console.log("Installing dependencies...");
execSync("npm install", { stdio: "inherit" });

// ایجاد فایلهای پیکربندی
const envExample = `
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/exchange
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secure-jwt-secret
SESSION_SECRET=your-secure-session-secret
`;

fs.writeFileSync(".env.example", envExample);
console.log("Created .env.example");

if (!fs.existsSync(".env")) {
  fs.copyFileSync(".env.example", ".env");
  console.log("Created .env from example");
}

// ایجاد docker-compose.yml
const dockerCompose = `
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/exchange
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:6
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
`;

fs.writeFileSync("docker-compose.yml", dockerCompose);
console.log("Created docker-compose.yml");

// ایجاد Dockerfile
const dockerfile = `
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
`;

fs.writeFileSync("Dockerfile", dockerfile);
console.log("Created Dockerfile");

console.log("Setup completed successfully!");
