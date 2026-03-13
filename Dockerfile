# ============= 构建阶段 =============
FROM node:22-alpine AS builder

WORKDIR /app

# 安装编译依赖，用于原生编译 better-sqlite3 等 C++ 扩展
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    sqlite-dev

# 为了使用 npm ci 或 npm install 安装
COPY package.json package-lock.json* ./

# 优化针对 QEMU 模拟环境的安装逻辑
# 1. 设置超时以防网络抖动导致 QEMU 进程挂起
# 2. 禁用 audit 和 fund 减少不必要的进程分发
# 3. 强制原生模块（better-sqlite3）从源码编译以规避预编译二进制指令不兼容问题
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set audit false && \
    npm config set fund false && \
    npm install --build-from-source better-sqlite3 && \
    npm install

COPY . .
RUN npm run build

# 关键：在构建产物中重新编译/安装 better-sqlite3，确保编译产物完整适配当前的 Alpine 环境
RUN cd /app/.output/server && npm install better-sqlite3

# 移除编译依赖
RUN apk del .build-deps

# ============= 最小运行时 =============
FROM node:22-alpine AS runtime

# 安装运行时必需的库：SQLite 共享库以及视频处理必备的 ffmpeg
RUN apk add --no-cache curl libc6-compat sqlite-libs ffmpeg && \
    addgroup -g 1001 -S nodejs && adduser -S nuxt -u 1001 && \
    mkdir -p /media /app/db /app/temp && \
    chown -R nuxt:nodejs /media /app/db /app/temp

WORKDIR /app

# 🔥 只复制运行时必需的文件，Nuxt build 本身包含了其他的纯 JS 服务端依赖
COPY --from=builder --chown=nuxt:nodejs /app/.output /app/.output
COPY --chown=nuxt:nodejs package.json ./

USER nuxt
EXPOSE 3000

ENV NODE_ENV=production
ENV VIDEO_DIR=/media
ENV DB_PATH=/app/db/subx.db

CMD ["node", ".output/server/index.mjs"]
