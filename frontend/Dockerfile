# 多階段建構
FROM node:20-alpine AS builder

# 安裝 pnpm
RUN npm install -g pnpm

# 設定工作目錄
WORKDIR /app

# 複製依賴檔案
COPY package.json pnpm-lock.yaml ./

# 安裝依賴
RUN pnpm install --frozen-lockfile

# 複製原始碼
COPY . .

# 建構專案
RUN pnpm run build

# 生產環境
FROM nginx:alpine

# 複製 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 從建構階段複製建構產物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]
