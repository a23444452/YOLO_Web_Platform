# YOLO Web Platform 部署指南

本文檔提供多種部署方案，從開發環境到生產環境的完整指南。

---

## 📋 目錄

1. [部署方案比較](#部署方案比較)
2. [方案 1：本地/內網部署](#方案-1本地內網部署)
3. [方案 2：Docker 容器化部署](#方案-2docker-容器化部署)
4. [方案 3：雲端部署（推薦）](#方案-3雲端部署推薦)
5. [方案 4：混合部署](#方案-4混合部署)
6. [硬體需求](#硬體需求)
7. [安全性考量](#安全性考量)
8. [監控與維護](#監控與維護)
9. [常見問題](#常見問題)

---

## 部署方案比較

| 方案 | 適用場景 | 優點 | 缺點 | 成本 |
|------|---------|------|------|------|
| **本地/內網** | 個人使用、實驗室環境 | 簡單快速、無需雲端費用 | 無法外網訪問、手動維護 | 💰 免費 |
| **Docker** | 團隊協作、開發測試 | 環境一致、易於遷移 | 需要學習 Docker | 💰 免費 |
| **雲端 VM** | 小型企業、多人使用 | 穩定可靠、易擴展 | 需要維護伺服器 | 💰💰 中等 |
| **無伺服器** | 輕量使用、低頻訪問 | 按需付費、自動擴展 | 冷啟動延遲、功能受限 | 💰 低 |
| **混合部署** | GPU 訓練 + Web 服務 | 靈活配置、成本優化 | 架構複雜 | 💰💰 中等 |

---

## 方案 1：本地/內網部署

### 適用場景
- 個人開發測試
- 實驗室內部使用
- 資料安全要求高（不希望上傳雲端）

### 部署步驟

#### 1.1 使用現有腳本（最簡單）

```bash
# 確保依賴已安裝
cd /Users/vincewang/YOLO-Project

# 後端設置
cd backend
python -m venv venv
source venv/bin/activate
pip install -e .

# 前端設置
cd ../frontend
pnpm install

# 啟動服務
cd ..
./start.sh

# 訪問
# 前端: http://localhost:5173
# 後端 API: http://localhost:8000
# API 文檔: http://localhost:8000/docs
```

#### 1.2 設定開機自動啟動（macOS）

創建 LaunchAgent：

```bash
# 創建 plist 檔案
cat > ~/Library/LaunchAgents/com.yolo.platform.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.yolo.platform</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/vincewang/YOLO-Project/start.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/Users/vincewang/YOLO-Project/logs/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/vincewang/YOLO-Project/logs/launchd-error.log</string>
    <key>WorkingDirectory</key>
    <string>/Users/vincewang/YOLO-Project</string>
</dict>
</plist>
EOF

# 載入服務
launchctl load ~/Library/LaunchAgents/com.yolo.platform.plist

# 立即啟動
launchctl start com.yolo.platform

# 停止服務
launchctl stop com.yolo.platform

# 移除服務
launchctl unload ~/Library/LaunchAgents/com.yolo.platform.plist
```

#### 1.3 內網訪問配置

如果需要讓同網路的其他裝置訪問：

**後端配置** (`backend/src/yolo_api/main.py`):
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "yolo_api.main:app",
        host="0.0.0.0",  # 允許外部訪問
        port=8000,
        reload=True
    )
```

**前端配置** (`frontend/vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    host: '0.0.0.0',  // 允許外部訪問
    port: 5173,
  },
  // 更新 API 地址為實際 IP
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://192.168.1.100:8000')
  }
})
```

獲取本機 IP：
```bash
# macOS
ipconfig getifaddr en0

# 訪問（從其他裝置）
# 前端: http://192.168.1.100:5173
# 後端: http://192.168.1.100:8000
```

---

## 方案 2：Docker 容器化部署

### 適用場景
- 團隊開發協作
- 多環境部署（開發、測試、生產）
- 需要環境一致性

### 2.1 創建 Dockerfile

**後端 Dockerfile** (`backend/Dockerfile`):

```dockerfile
FROM python:3.12-slim

# 安裝系統依賴（OpenCV 需要）
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# 設定工作目錄
WORKDIR /app

# 複製依賴檔案
COPY pyproject.toml ./

# 安裝 Python 依賴
RUN pip install --no-cache-dir -e .

# 複製原始碼
COPY src/ ./src/

# 創建必要目錄
RUN mkdir -p /app/data/training /app/data/models /app/weights

# 暴露端口
EXPOSE 8000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# 啟動命令
CMD ["uvicorn", "yolo_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**前端 Dockerfile** (`frontend/Dockerfile`):

```dockerfile
# 階段 1: 建置
FROM node:20-alpine AS builder

WORKDIR /app

# 複製依賴檔案
COPY package.json pnpm-lock.yaml ./

# 安裝 pnpm 和依賴
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 複製原始碼
COPY . .

# 建置生產版本
RUN pnpm build

# 階段 2: 生產環境
FROM nginx:alpine

# 複製建置結果
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Nginx 配置** (`frontend/nginx.conf`):

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip 壓縮
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # SPA 路由支援
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支援
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket 端點
    location /ws {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2.2 Docker Compose

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: yolo-backend
    ports:
      - "8000:8000"
    volumes:
      # 持久化資料
      - ./data/training:/app/data/training
      - ./data/models:/app/data/models
      - ./weights:/app/weights
      - ./logs:/app/logs
    environment:
      - PYTHONUNBUFFERED=1
      - MAX_CONCURRENT_TRAININGS=2
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: yolo-frontend
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

volumes:
  training_data:
  models_data:

networks:
  default:
    name: yolo-network
```

### 2.3 部署命令

```bash
# 建置並啟動
docker-compose up -d --build

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down

# 停止並刪除資料
docker-compose down -v

# 重新建置特定服務
docker-compose up -d --build backend
```

### 2.4 GPU 支援（如有 NVIDIA GPU）

**docker-compose.gpu.yml**:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.gpu
    container_name: yolo-backend
    runtime: nvidia  # 需要 nvidia-docker
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - PYTHONUNBUFFERED=1
    ports:
      - "8000:8000"
    volumes:
      - ./data/training:/app/data/training
      - ./data/models:/app/data/models
      - ./weights:/app/weights
    restart: unless-stopped

  frontend:
    # ... 同上
```

啟動 GPU 版本：
```bash
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build
```

---

## 方案 3：雲端部署（推薦）

### 3.1 AWS 部署方案

#### 架構圖
```
Internet
    ↓
CloudFront (CDN)
    ↓
Application Load Balancer
    ↓
    ├─→ EC2 Instance (Frontend)
    └─→ EC2 Instance (Backend + GPU)
         ↓
    S3 Bucket (模型儲存)
```

#### 詳細步驟

**A. 準備工作**

1. 註冊 AWS 帳號
2. 設定 AWS CLI
3. 創建 IAM 用戶（權限：EC2, S3, CloudFront）

**B. 後端部署（EC2 with GPU）**

```bash
# 1. 啟動 EC2 實例
# 類型: g4dn.xlarge (GPU instance)
# AMI: Deep Learning AMI (Ubuntu)
# 安全組: 開放 8000 端口

# 2. SSH 連接
ssh -i your-key.pem ubuntu@your-ec2-ip

# 3. 部署後端
sudo apt-get update
sudo apt-get install -y python3.12 python3.12-venv git

# 克隆專案
git clone https://github.com/a23444452/YOLO_Web_Platform.git
cd YOLO_Web_Platform/backend

# 設定虛擬環境
python3.12 -m venv venv
source venv/bin/activate
pip install -e .

# 使用 systemd 管理服務
sudo tee /etc/systemd/system/yolo-backend.service > /dev/null <<'EOF'
[Unit]
Description=YOLO Backend API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/YOLO_Web_Platform/backend
Environment="PATH=/home/ubuntu/YOLO_Web_Platform/backend/venv/bin"
ExecStart=/home/ubuntu/YOLO_Web_Platform/backend/venv/bin/uvicorn yolo_api.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 啟動服務
sudo systemctl daemon-reload
sudo systemctl enable yolo-backend
sudo systemctl start yolo-backend
sudo systemctl status yolo-backend
```

**C. 前端部署（S3 + CloudFront）**

```bash
# 1. 本地建置
cd frontend
pnpm install
pnpm build

# 2. 創建 S3 Bucket
aws s3 mb s3://yolo-web-platform-frontend

# 3. 設定 S3 靜態網站託管
aws s3 website s3://yolo-web-platform-frontend \
  --index-document index.html \
  --error-document index.html

# 4. 上傳建置檔案
aws s3 sync dist/ s3://yolo-web-platform-frontend --delete

# 5. 設定 Bucket Policy（公開讀取）
aws s3api put-bucket-policy --bucket yolo-web-platform-frontend --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::yolo-web-platform-frontend/*"
  }]
}'

# 6. 創建 CloudFront Distribution
aws cloudfront create-distribution \
  --origin-domain-name yolo-web-platform-frontend.s3-website-ap-northeast-1.amazonaws.com \
  --default-root-object index.html

# 獲取 CloudFront URL（通常是 d123456.cloudfront.net）
```

**D. 設定 HTTPS（Let's Encrypt）**

```bash
# 在 EC2 上安裝 Nginx + Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Nginx 配置
sudo tee /etc/nginx/sites-available/yolo-api > /dev/null <<'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/yolo-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 申請 SSL 證書
sudo certbot --nginx -d api.yourdomain.com
```

**E. 成本估算（每月）**

| 服務 | 配置 | 價格（美金） |
|------|------|-------------|
| EC2 (g4dn.xlarge) | 1 個實例 | ~$400 |
| S3 儲存 | 10GB | ~$0.23 |
| CloudFront 流量 | 100GB | ~$8.50 |
| **總計** | | **~$408.73/月** |

**節省成本建議**:
- 使用 EC2 Spot Instance（節省 70%）
- 非訓練時停止 GPU 實例
- 使用 Reserved Instance（1年期，節省 40%）

### 3.2 Google Cloud Platform (GCP) 部署

類似 AWS，使用：
- **Compute Engine**（EC2 替代）
- **Cloud Storage**（S3 替代）
- **Cloud CDN**（CloudFront 替代）

成本通常比 AWS 便宜 10-20%。

### 3.3 Azure 部署

- **Virtual Machines**（EC2 替代）
- **Blob Storage**（S3 替代）
- **Azure CDN**（CloudFront 替代）

適合已有 Microsoft 生態系統的企業。

---

## 方案 4：混合部署

### 適用場景
- 訓練任務需要 GPU，但 Web 服務不需要
- 優化成本，GPU 按需使用

### 架構

```
雲端 (Vercel/Netlify)
   ├─ 前端靜態網站（免費）
   └─ Serverless API（輕量推論）

本地/自建伺服器
   └─ 後端 GPU 服務（重度訓練）
```

### 4.1 前端部署至 Vercel（免費）

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入
vercel login

# 部署
cd frontend
vercel

# 設定環境變數（在 Vercel Dashboard）
VITE_API_URL=https://your-backend-api.com
```

**vercel.json** 配置：

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 4.2 後端使用 Ngrok 暴露本地服務

```bash
# 安裝 Ngrok
brew install ngrok  # macOS
# 或從 https://ngrok.com/ 下載

# 註冊並獲取 token
ngrok authtoken YOUR_TOKEN

# 暴露本地服務
ngrok http 8000

# 獲得公開 URL: https://xxxx-xxxx-xxxx.ngrok-free.app
# 更新前端環境變數 VITE_API_URL
```

**優點**:
- 前端免費託管
- 後端保留本地 GPU
- 按需啟動訓練服務

**缺點**:
- Ngrok 免費版有連線限制
- 需要本地機器持續運行

---

## 硬體需求

### 最低需求（開發/測試）
- **CPU**: 4 核心
- **記憶體**: 8GB RAM
- **儲存**: 50GB SSD
- **GPU**: 非必需（CPU 訓練極慢）

### 推薦配置（生產環境）
- **CPU**: 8 核心以上
- **記憶體**: 16GB RAM 以上
- **儲存**: 100GB SSD（可擴展）
- **GPU**: NVIDIA GPU 4GB VRAM 以上
  - 推薦: RTX 3060 (12GB), RTX 4060 Ti (16GB)
  - 雲端: AWS g4dn.xlarge (T4 16GB)

### GPU 選擇指南

| 用途 | 推薦 GPU | VRAM | 價格範圍 |
|------|---------|------|---------|
| 輕量推論 | GTX 1660 | 6GB | ~$200 |
| 中型訓練 | RTX 3060 | 12GB | ~$300 |
| 大型訓練 | RTX 4070 Ti | 12GB | ~$700 |
| 專業訓練 | RTX 4090 | 24GB | ~$1600 |
| 雲端 | AWS g4dn.xlarge | 16GB | $0.526/hr |

---

## 安全性考量

### 1. API 安全

**實作 API Key 驗證**:

```python
# backend/src/yolo_api/auth.py
from fastapi import Security, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials.credentials != os.getenv("API_KEY"):
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return credentials.credentials

# 在 main.py 使用
@app.post("/api/training/start", dependencies=[Depends(verify_api_key)])
async def start_training(...):
    ...
```

### 2. CORS 配置

```python
# 生產環境限制來源
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # 不要用 *
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

### 3. Rate Limiting

```bash
# 安裝
pip install slowapi

# 實作
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/training/start")
@limiter.limit("5/minute")
async def start_training(...):
    ...
```

### 4. 檔案上傳安全

```python
# 已實作的安全檢查
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_FILES = 10000
MAX_FILENAME_LENGTH = 255

# 建議額外加入
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/bmp'}
```

### 5. 環境變數管理

```bash
# 使用 .env 檔案（不要提交到 Git）
cat > backend/.env <<'EOF'
API_KEY=your-secret-api-key
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
MAX_CONCURRENT_TRAININGS=2
EOF

# 載入環境變數
pip install python-dotenv

# 在 main.py
from dotenv import load_dotenv
load_dotenv()
```

---

## 監控與維護

### 1. 日誌管理

**使用 Logrotate** (Linux):

```bash
sudo tee /etc/logrotate.d/yolo-platform > /dev/null <<'EOF'
/Users/vincewang/YOLO-Project/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
EOF
```

### 2. 效能監控

**安裝 Prometheus + Grafana**:

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

**後端加入 Metrics**:

```bash
pip install prometheus-fastapi-instrumentator

# 在 main.py
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
```

### 3. 自動備份

```bash
# 備份腳本
cat > backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/backup/yolo-platform"
DATE=$(date +%Y%m%d_%H%M%S)

# 備份訓練資料
tar -czf "$BACKUP_DIR/training_$DATE.tar.gz" data/training/

# 備份模型
tar -czf "$BACKUP_DIR/models_$DATE.tar.gz" data/models/

# 保留最近 7 天的備份
find "$BACKUP_DIR" -type f -mtime +7 -delete
EOF

chmod +x backup.sh

# 設定 crontab（每天凌晨 2 點備份）
crontab -e
0 2 * * * /path/to/backup.sh
```

### 4. 健康檢查端點

```python
# backend/src/yolo_api/main.py
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "0.8.2",
        "gpu_available": torch.cuda.is_available() if torch else False,
    }
```

---

## 常見問題

### Q1: 如何選擇部署方案？

**決策樹**:
```
是否需要外網訪問？
├─ 否 → 本地部署（方案 1）
└─ 是
    └─ 預算如何？
        ├─ 低預算 → 混合部署（方案 4）
        ├─ 中預算 → Docker 本地 + Ngrok
        └─ 高預算 → 雲端部署（方案 3）
```

### Q2: 訓練很慢怎麼辦？

1. **使用 GPU**:
   - 本地: 安裝 NVIDIA GPU
   - 雲端: 使用 GPU 實例（g4dn.xlarge）

2. **優化訓練參數**:
   - 減少 epochs
   - 增加 batch size（如果記憶體允許）
   - 使用較小的模型（yolov8n）

3. **使用預訓練模型**:
   - 從 COCO 預訓練權重微調

### Q3: 如何處理大量圖片？

1. **批次上傳**:
   - 使用「開啟資料夾」功能
   - 避免一次上傳超過 1000 張

2. **圖片壓縮**:
   ```bash
   # 批次壓縮圖片到 1280x1280
   mogrify -resize 1280x1280\> -quality 85 *.jpg
   ```

3. **使用 S3 儲存**:
   - 訓練資料上傳到 S3
   - 後端從 S3 讀取

### Q4: 多人協作怎麼部署？

推薦方案: **Docker + 內網部署**

```bash
# 一台伺服器運行 Docker Compose
docker-compose up -d

# 團隊成員訪問
http://server-ip:80
```

### Q5: 如何升級版本？

```bash
# 1. 備份資料
./backup.sh

# 2. 拉取最新代碼
git pull origin main

# 3. 更新依賴
cd backend && pip install -e . --upgrade
cd ../frontend && pnpm install

# 4. 重新建置
pnpm build  # 前端
docker-compose up -d --build  # Docker

# 5. 重啟服務
./restart.sh
```

---

## 推薦部署流程

### 對於個人/小團隊（3-5 人）

**階段 1: 開發測試** (1-2 週)
- 本地部署（方案 1）
- 驗證功能完整性

**階段 2: 內部試用** (2-4 週)
- Docker 部署（方案 2）
- 內網訪問配置
- 收集使用回饋

**階段 3: 正式使用** (長期)
- 選擇: 繼續 Docker 或升級雲端
- 設定備份和監控
- 定期維護更新

### 對於企業/多團隊（10+ 人）

**直接採用: 雲端部署（方案 3）**
- 使用 AWS/GCP/Azure
- 設定 Auto Scaling
- 實作 CI/CD pipeline
- 完整監控和告警

---

## 下一步

建議您：

1. **先試用本地部署**（使用現有 `start.sh`）
2. **評估使用場景**（個人/團隊/企業）
3. **選擇合適方案**（參考決策樹）
4. **逐步遷移**（開發 → 測試 → 生產）

如需具體方案的詳細實作，請告知您的使用場景和需求！

---

**文件版本**: v1.0
**最後更新**: 2026-01-19
**維護者**: Claude Code

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)
