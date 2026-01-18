# 🚀 YOLO Web Platform - 快速開始指南

本指南將幫助您在 5 分鐘內啟動 YOLO Web Platform！

---

## 📋 前置需求檢查

請確認您已安裝以下軟體：

```bash
# 檢查 Node.js 版本 (需要 >= 18.0)
node --version

# 檢查 Python 版本 (需要 >= 3.12)
python3 --version

# 檢查 pnpm (推薦)
pnpm --version
```

如果沒有安裝 pnpm：
```bash
npm install -g pnpm
```

---

## 🎯 三步驟啟動

### 步驟 1️⃣: 啟動後端 API

```bash
# 進入後端資料夾
cd YOLO-Project/backend

# 啟動虛擬環境
source venv/bin/activate

# 如果虛擬環境不存在，先創建：
# python3 -m venv venv
# source venv/bin/activate
# pip install -r requirements.txt

# 啟動後端伺服器
python -m yolo_api.main
```

✅ **成功標誌**: 看到 `Application startup complete` 和 `Uvicorn running on http://0.0.0.0:8000`

---

### 步驟 2️⃣: 啟動前端應用

**開啟新的終端視窗**：

```bash
# 進入前端資料夾
cd YOLO-Project/frontend

# 安裝依賴 (首次執行)
pnpm install

# 啟動開發伺服器
pnpm dev
```

✅ **成功標誌**: 看到 `Local: http://localhost:5173/`

---

### 步驟 3️⃣: 開啟瀏覽器

訪問 **http://localhost:5173/**

🎉 **恭喜！** 您已成功啟動 YOLO Web Platform！

---

## 🎨 快速體驗訓練流程

### 1. 準備測試資料集

專案已內建測試資料集：

```bash
YOLO-Project/datasets/test-yolo-dataset/
```

### 2. 使用內建測試資料

1. 開啟瀏覽器 http://localhost:5173/
2. 點擊「資料集」頁面
3. 點擊「上傳資料夾」
4. 選擇 `YOLO-Project/datasets/test-yolo-dataset/images/`
5. 系統會自動讀取 `classes.txt`

### 3. 開始訓練

1. 點擊「訓練」頁面
2. 選擇訓練配置：
   - YOLO 版本: **v11**
   - 模型大小: **n** (最快)
   - Epochs: **3** (快速測試)
   - Batch Size: **16**
   - Image Size: **640**
3. 點擊「開始訓練」

### 4. 監控訓練

1. 切換到「監控」頁面
2. 觀察即時訓練進度
3. 查看訓練指標更新
4. 等待訓練完成（約 1-2 分鐘）

### 5. 下載模型

訓練完成後：
1. 點擊「下載模型」按鈕
2. 模型檔案會自動下載到您的下載資料夾

---

## 🔧 常見問題排解

### Q1: 後端啟動失敗 - `ModuleNotFoundError`

**解決方案**:
```bash
cd YOLO-Project/backend
source venv/bin/activate
pip install -r requirements.txt
```

### Q2: 前端啟動失敗 - 依賴問題

**解決方案**:
```bash
cd YOLO-Project/frontend
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Q3: WebSocket 連接失敗

**檢查清單**:
1. 確認後端運行在 port 8000
2. 確認前端運行在 port 5173
3. 檢查瀏覽器 Console 是否有錯誤
4. 重啟後端和前端

### Q4: 訓練速度很慢

**建議**:
- 使用較小的模型 (n 或 s)
- 減少 epochs 數量
- 減少 batch size
- 如果有 GPU，確保 PyTorch 支援 CUDA

### Q5: Port 已被占用

**後端 (8000)**:
```bash
# macOS/Linux
lsof -ti:8000 | xargs kill -9

# 或修改 backend/src/yolo_api/main.py
# uvicorn.run(..., port=8001)
```

**前端 (5173)**:
```bash
# 修改 frontend/vite.config.ts
# server: { port: 5174 }
```

---

## 📚 下一步

### 學習資源

1. **完整文件**: 閱讀 [`README.md`](./README.md)
2. **專案結構**: 查看 [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md)
3. **更新日誌**: 
   - [前端 CHANGELOG](./frontend/CHANGELOG.md)
   - [後端 CHANGELOG](./backend/CHANGELOG.md)

### 進階功能

- 📝 **自訂資料標註**: 使用內建標註工具
- 🎛️ **調整訓練參數**: 優化模型效能
- 📊 **分析訓練結果**: 查看詳細指標
- 🔄 **多次訓練**: 比較不同配置

---

## 🎯 推薦開發流程

### 1. 開發前端

```bash
cd frontend
pnpm dev
# 前端熱重載，修改即時生效
```

### 2. 開發後端

```bash
cd backend
source venv/bin/activate
python -m yolo_api.main
# 修改代碼後需要手動重啟
```

### 3. 測試 API

```bash
# 健康檢查
curl http://localhost:8000/health

# 查看 API 文件
open http://localhost:8000/docs
```

---

## 💡 實用指令

### 前端

```bash
cd frontend

pnpm dev              # 啟動開發伺服器
pnpm build            # 構建生產版本
pnpm preview          # 預覽生產版本
pnpm lint             # 程式碼檢查
```

### 後端

```bash
cd backend
source venv/bin/activate

python -m yolo_api.main           # 啟動伺服器
python tests/test_end_to_end.py   # 執行測試
```

---

## 📞 需要幫助？

- 📖 閱讀完整文件: [`README.md`](./README.md)
- 🐛 回報問題: 創建 GitHub Issue
- 💬 討論: 加入社群

---

**祝您使用愉快！🎉**

*Built with ❤️ using YOLO, React, and FastAPI*
