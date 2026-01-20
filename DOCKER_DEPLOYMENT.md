# 🐳 Docker 部署指南 (Windows 產線環境)

本文件說明如何在 Windows PC 上使用 Docker 部署 YOLO 標註與訓練系統到產線環境。

## 📋 目錄

- [系統需求](#系統需求)
- [安裝 Docker Desktop](#安裝-docker-desktop)
- [GPU 支援設定](#gpu-支援設定可選)
- [部署步驟](#部署步驟)
- [管理與維護](#管理與維護)
- [常見問題](#常見問題)

## 系統需求

### 最低需求
- **作業系統**: Windows 10 64-bit (Build 19041+) 或 Windows 11
- **記憶體**: 8GB RAM (建議 16GB)
- **硬碟空間**: 20GB 可用空間
- **處理器**: 支援虛擬化的 64 位元處理器

### GPU 支援(可選,但強烈建議)
- **顯示卡**: NVIDIA GPU (支援 CUDA 11.0+)
- **驅動程式**: NVIDIA Driver 470.xx 或更新版本
- **CUDA 版本**: 11.0 或更新版本

## 安裝 Docker Desktop

### 1. 下載 Docker Desktop

前往 [Docker Desktop 官方網站](https://www.docker.com/products/docker-desktop/) 下載 Windows 版本。

### 2. 安裝 Docker Desktop

1. 執行下載的安裝程式
2. 確保勾選以下選項:
   - **Use WSL 2 instead of Hyper-V** (建議)
   - **Add shortcut to desktop**

3. 完成安裝後,重新啟動電腦

### 3. 啟動 Docker Desktop

1. 從開始選單或桌面啟動 Docker Desktop
2. 等待 Docker Engine 完全啟動(系統匣圖示會顯示綠色)
3. 開啟 PowerShell 或命令提示字元,驗證安裝:

```powershell
docker --version
docker-compose --version
```

應該會看到類似以下的輸出:
```
Docker version 24.0.x, build xxxxxxx
Docker Compose version v2.x.x
```

## GPU 支援設定(可選)

如果您的 Windows PC 有 NVIDIA GPU,可以啟用 GPU 加速以大幅提升訓練和推論速度。

### 1. 安裝 NVIDIA 驅動程式

1. 前往 [NVIDIA 驅動程式下載頁面](https://www.nvidia.com/Download/index.aspx)
2. 選擇您的顯示卡型號並下載最新驅動程式
3. 安裝驅動程式並重新啟動

### 2. 安裝 NVIDIA Container Toolkit

1. 開啟 PowerShell (以系統管理員身分執行)

2. 安裝 NVIDIA Container Toolkit:

```powershell
# 新增 NVIDIA package repository
Invoke-WebRequest -Uri https://nvidia.github.io/nvidia-docker/gpgkey -OutFile "$env:TEMP\gpgkey"

# 下載並執行安裝腳本
Invoke-WebRequest -Uri https://nvidia.github.io/nvidia-docker/nvidia-docker.repo -OutFile "$env:TEMP\nvidia-docker.repo"
```

3. 在 Docker Desktop 設定中啟用 GPU:
   - 開啟 Docker Desktop
   - 點選 Settings (設定)
   - 選擇 Resources → WSL Integration
   - 確保啟用 WSL 2 整合
   - 點選 Apply & Restart

### 3. 驗證 GPU 支援

```powershell
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

如果成功,應該會看到您的 GPU 資訊。

## 部署步驟

### 1. 準備專案檔案

1. 將整個專案複製到 Windows PC 的目標位置,例如:
   ```
   C:\YOLO-Project
   ```

2. 開啟 PowerShell 並切換到專案目錄:
   ```powershell
   cd C:\YOLO-Project
   ```

### 2. 配置 GPU 支援(如果有 GPU)

編輯 `docker-compose.yml`,取消 GPU 相關設定的註解:

```yaml
services:
  backend:
    # ... 其他設定 ...
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### 3. 建構 Docker 映像檔

```powershell
# 建構所有服務
docker-compose build

# 或分別建構
docker-compose build backend
docker-compose build frontend
```

建構過程可能需要 5-15 分鐘,取決於網路速度和電腦效能。

### 4. 啟動服務

```powershell
# 啟動所有服務(在背景執行)
docker-compose up -d

# 查看啟動日誌
docker-compose logs -f
```

### 5. 驗證部署

1. 等待約 1-2 分鐘,讓服務完全啟動

2. 檢查服務狀態:
   ```powershell
   docker-compose ps
   ```

   應該會看到兩個服務都是 `Up` 狀態:
   ```
   NAME              IMAGE              STATUS
   yolo-backend      yolo-backend       Up (healthy)
   yolo-frontend     yolo-frontend      Up (healthy)
   ```

3. 測試後端 API:
   ```powershell
   curl http://localhost:8000/health
   ```

4. 測試前端:
   - 開啟瀏覽器,訪問 `http://localhost`
   - 應該能看到 YOLO 標註系統的介面

### 6. 下載預訓練權重(可選)

如果需要使用 YOLOv8 預訓練模型:

```powershell
# 進入 backend 容器
docker-compose exec backend bash

# 下載預訓練權重
cd /app/weights
curl -L -o yolov8n.pt https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt
curl -L -o yolov8s.pt https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8s.pt
curl -L -o yolov8m.pt https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8m.pt

# 退出容器
exit
```

## 管理與維護

### 查看日誌

```powershell
# 查看所有服務日誌
docker-compose logs

# 查看特定服務日誌
docker-compose logs backend
docker-compose logs frontend

# 即時追蹤日誌
docker-compose logs -f backend
```

### 停止服務

```powershell
# 停止所有服務(保留資料)
docker-compose stop

# 停止並移除容器(保留資料)
docker-compose down

# 停止並移除容器和資料卷(危險!)
docker-compose down -v
```

### 重新啟動服務

```powershell
# 重新啟動所有服務
docker-compose restart

# 重新啟動特定服務
docker-compose restart backend
```

### 更新應用程式

當有程式碼更新時:

```powershell
# 1. 停止服務
docker-compose down

# 2. 拉取最新程式碼
git pull

# 3. 重新建構映像檔
docker-compose build

# 4. 啟動服務
docker-compose up -d
```

### 備份資料

重要資料儲存在以下目錄,建議定期備份:

```powershell
# 備份訓練數據和模型
robocopy .\data C:\Backup\YOLO\data /E /MIR
robocopy .\weights C:\Backup\YOLO\weights /E /MIR
robocopy .\logs C:\Backup\YOLO\logs /E /MIR
```

### 清理未使用的資源

```powershell
# 清理未使用的映像檔
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理所有未使用的資源(映像檔、容器、網路、快取)
docker system prune -a
```

## 常見問題

### Q1: Docker Desktop 啟動失敗

**A**: 檢查以下項目:
1. 確認 Windows 版本符合需求 (Build 19041+)
2. 啟用 WSL 2:
   ```powershell
   wsl --set-default-version 2
   ```
3. 在 BIOS 中啟用虛擬化技術 (Intel VT-x 或 AMD-V)
4. 重新啟動電腦

### Q2: 建構映像檔時網路錯誤

**A**:
1. 檢查網路連線
2. 設定 Docker 代理伺服器 (如果在公司網路內):
   - Docker Desktop → Settings → Resources → Proxies
3. 重試建構:
   ```powershell
   docker-compose build --no-cache
   ```

### Q3: GPU 無法辨識

**A**:
1. 確認 NVIDIA 驅動程式已正確安裝:
   ```powershell
   nvidia-smi
   ```
2. 確認 Docker Desktop 的 WSL 2 GPU 支援已啟用
3. 重新啟動 Docker Desktop
4. 檢查 docker-compose.yml 的 GPU 設定

### Q4: 前端無法連線到後端 API

**A**:
1. 檢查後端服務狀態:
   ```powershell
   docker-compose logs backend
   ```
2. 確認防火牆沒有封鎖 8000 port
3. 確認 nginx.conf 的 proxy_pass 設定正確

### Q5: 容器啟動後立即停止

**A**:
1. 查看容器日誌找出錯誤原因:
   ```powershell
   docker-compose logs backend
   docker-compose logs frontend
   ```
2. 檢查 port 是否被佔用:
   ```powershell
   netstat -ano | findstr "8000"
   netstat -ano | findstr "80"
   ```
3. 如果 port 被佔用,修改 docker-compose.yml 的 port 對應

### Q6: 訓練過程中容器記憶體不足

**A**:
1. 增加 Docker Desktop 的記憶體限制:
   - Settings → Resources → Advanced
   - 調整 Memory 滑桿到至少 8GB
2. 在訓練時減少 batch size
3. 使用較小的模型 (例如 yolov8n 而非 yolov8m)

### Q7: 如何在其他電腦存取部署的系統?

**A**:
1. 記下 Windows PC 的 IP 位址:
   ```powershell
   ipconfig
   ```
   尋找 "IPv4 位址" (例如: 192.168.1.100)

2. 確認 Windows 防火牆允許 port 80 和 8000 的連入連線:
   - 控制台 → 系統及安全性 → Windows Defender 防火牆 → 進階設定
   - 輸入規則 → 新增規則
   - Port → TCP → 特定本機 port: 80,8000
   - 允許連線

3. 在其他電腦的瀏覽器輸入:
   ```
   http://192.168.1.100
   ```

## 效能調校建議

### CPU 模式 (無 GPU)
- 建議使用 yolov8n 或 yolov8s 模型
- 訓練時設定較小的 batch size (4-8)
- 預期訓練時間會較長

### GPU 模式 (有 NVIDIA GPU)
- 可使用較大的模型 (yolov8m, yolov8l)
- 可設定較大的 batch size (16-32,取決於 GPU 記憶體)
- 訓練速度會顯著提升 (10-50 倍)

### 生產環境最佳化
- 使用 SSD 硬碟儲存訓練數據
- 確保有足夠的硬碟空間 (建議 50GB+)
- 定期清理舊的訓練日誌和模型檢查點
- 設定自動重啟策略 (已在 docker-compose.yml 中設定)

## 聯絡與支援

如遇到問題,請:
1. 查看日誌檔案: `docker-compose logs`
2. 檢查 GitHub Issues
3. 聯絡系統管理員

---

📝 **版本**: 1.0.0
📅 **更新日期**: 2026-01-20
✍️ **維護者**: YOLO Project Team
