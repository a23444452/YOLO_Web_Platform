# YOLO Web Platform - Backend API

FastAPI 後端服務，提供 YOLO 模型訓練、管理和推論功能。

## 📊 開發進度總覽

### ✅ 已完成功能 (v0.3.0)

#### 1. 核心訓練 API
- [x] `POST /api/training/start` - 啟動訓練任務
- [x] `GET /api/training/status/{job_id}` - 查詢訓練狀態
- [x] `POST /api/training/stop/{job_id}` - 停止訓練
- [x] `DELETE /api/training/{job_id}` - 刪除訓練任務
- [x] `GET /api/training/{job_id}/download` - 下載訓練模型 ⭐ NEW
- [x] `GET /api/training/{job_id}/results` - 查詢訓練結果 ⭐ NEW
- [x] `GET /api/training/list` - 列出所有訓練任務 ⭐ NEW

#### 2. WebSocket 即時通訊
- [x] `WS /ws/training/{job_id}` - 即時訓練更新
- [x] 支援四種訊息類型：`status`, `metrics`, `log`, `error`
- [x] 自動推送 epoch 級別的訓練指標

#### 3. 訓練功能
- [x] Ultralytics YOLO 整合 (v5/v8/v11)
- [x] 支援 5 種模型規模 (n/s/m/l/x)
- [x] 資料集自動解壓縮 (ZIP + Base64)
- [x] data.yaml 自動生成
- [x] 完整的數據增強配置
- [x] **即時訓練指標更新** ⭐ NEW
- [x] **非阻塞訓練執行** (ThreadPoolExecutor) ⭐ NEW
- [x] **修復 classes.txt 讀取 bug** ⭐ NEW

#### 4. 訓練監控
- [x] 即時進度追蹤 (0-100%)
- [x] Epoch 級別指標：
  - train_loss / val_loss
  - mAP50 / mAP50-95
  - precision / recall
  - learning_rate

### 🚧 待開發功能

#### Phase 1 - 模型管理 (優先級: MEDIUM)
- [x] `GET /api/training/{job_id}/download` - 下載訓練好的模型 ✅ v0.3.0
- [x] `GET /api/training/{job_id}/results` - 獲取訓練結果圖表 ✅ v0.3.0
- [x] `GET /api/training/list` - 列出所有訓練任務 ✅ v0.3.0
- [ ] 模型持久化存儲 (資料庫)
- [ ] 訓練圖表圖片下載

#### Phase 2 - 推論 API (優先級: HIGH)
- [ ] `POST /api/inference/upload` - 上傳圖片進行推論
- [ ] `POST /api/inference/batch` - 批量推論
- [ ] `GET /api/models/list` - 列出可用模型
- [ ] ONNX 模型支援

#### Phase 3 - 增強功能 (優先級: MEDIUM)
- [ ] 訓練任務排程 (佇列系統)
- [ ] 訓練日誌完整記錄
- [ ] 模型效能比較
- [ ] 自動模型評估
- [ ] 訓練任務恢復 (中斷後繼續)

#### Phase 4 - 優化 (優先級: LOW)
- [ ] 資料庫整合 (PostgreSQL/MongoDB)
- [ ] Redis 快取
- [ ] 多 GPU 支援
- [ ] 分散式訓練
- [ ] Docker 部署配置

---

## 🏗️ 專案架構

```
yolo-backend/
├── src/
│   └── yolo_api/
│       ├── __init__.py
│       ├── main.py           # FastAPI 應用程式入口
│       ├── models.py         # Pydantic 資料模型
│       └── training.py       # 訓練管理器 ⭐ 最近更新
├── tests/                    # 測試檔案 (待建立)
├── pyproject.toml           # 專案配置
├── CHANGELOG.md             # 更新日誌
├── README.md                # 本檔案
└── test_api.py              # API 測試腳本
```

### 核心模組說明

#### 1. `main.py` - FastAPI 應用程式
- 定義所有 API 端點
- CORS 中間件配置
- WebSocket 連接管理
- 生命週期管理

#### 2. `models.py` - 資料模型
```python
# 主要模型
- TrainingConfig        # 訓練配置
- TrainingStatus        # 訓練狀態
- TrainingMetrics       # 訓練指標
- AugmentationConfig    # 數據增強配置
- StartTrainingRequest  # API 請求
- WSMessage            # WebSocket 訊息
```

#### 3. `training.py` - 訓練管理器 ⭐ 最近更新

**主要類別：`TrainingManager`**

關鍵方法：
```python
# 公開方法
start_training()        # 啟動訓練任務
get_status()           # 獲取訓練狀態
stop_training()        # 停止訓練
cleanup_job()          # 清理訓練資料
register_callback()    # 註冊 WebSocket 回調

# 內部方法 (最近新增/修改)
_setup_callbacks()          # 設置 Ultralytics 回調 ⭐ NEW
_train_sync()              # 同步訓練函數 (在執行緒中運行) ⭐ NEW
_process_pending_messages() # 處理執行緒間訊息 ⭐ NEW
_run_training()            # 非阻塞訓練包裝器 ⭐ UPDATED
_create_data_yaml()        # 生成 YOLO 配置 ⭐ FIXED
_extract_dataset()         # 解壓縮資料集
_notify()                  # 發送 WebSocket 訊息
```

**最新改進 (v0.2.0 - 2026-01-18)**：
1. ✅ 修復 `_create_data_yaml` 中的 bug (正確讀取 classes.txt)
2. ✅ 使用 `ThreadPoolExecutor` 避免阻塞 event loop
3. ✅ 整合 Ultralytics 回調系統，實現即時指標更新
4. ✅ 執行緒安全的訊息佇列機制

---

## 🚀 快速開始

### 環境要求
- Python 3.10+
- CUDA (可選，用於 GPU 訓練)

### 安裝

```bash
cd yolo-backend

# 建立虛擬環境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安裝依賴
pip install -e .

# 開發依賴 (可選)
pip install -e ".[dev]"
```

### 啟動服務

```bash
# 方法 1: 直接運行
python -m yolo_api.main

# 方法 2: 使用 uvicorn
uvicorn yolo_api.main:app --reload --host 0.0.0.0 --port 8000
```

服務啟動後訪問：
- API 文件：http://localhost:8000/docs
- Health Check：http://localhost:8000/health

### 測試 API

```bash
python test_api.py
```

---

## 📡 API 使用範例

### 1. 啟動訓練

```bash
curl -X POST http://localhost:8000/api/training/start \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "name": "my-training",
      "yolo_version": "v8",
      "model_size": "n",
      "dataset_id": "dataset-001",
      "epochs": 10,
      "batch_size": 16,
      "image_size": 640,
      "device": "cpu",
      "augmentation": {
        "mosaic": true,
        "flip_horizontal": true
      }
    },
    "dataset_zip": "<base64_encoded_zip>"
  }'
```

### 2. 查詢訓練狀態

```bash
curl http://localhost:8000/api/training/status/{job_id}
```

### 3. WebSocket 連接 (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/training/{job_id}');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'metrics') {
    console.log('Epoch:', message.data.epoch);
    console.log('Progress:', message.data.progress);
    console.log('Metrics:', message.data.metrics);
  }
};
```

---

## 📊 訓練指標說明

每個 epoch 結束時會推送以下指標：

| 指標 | 說明 | 範圍 |
|-----|------|-----|
| `train_loss` | 訓練損失 | 越低越好 |
| `val_loss` | 驗證損失 | 越低越好 |
| `mAP50` | mAP @ IoU=0.5 | 0-1，越高越好 |
| `mAP50-95` | mAP @ IoU=0.5:0.95 | 0-1，越高越好 |
| `precision` | 精確率 | 0-1，越高越好 |
| `recall` | 召回率 | 0-1，越高越好 |
| `learning_rate` | 當前學習率 | - |

---

## 🔧 技術棧

- **Web 框架**: FastAPI 0.109.0+
- **ASGI 伺服器**: Uvicorn
- **資料驗證**: Pydantic 2.5.0+
- **YOLO 引擎**: Ultralytics 8.1.0+
- **並發處理**: ThreadPoolExecutor
- **即時通訊**: WebSocket

---

## 📝 資料集格式要求

訓練用的 ZIP 檔案應包含以下結構：

```
dataset.zip
├── classes.txt          # 必須：類別名稱 (每行一個)
├── images/
│   ├── train/          # 訓練圖片
│   │   ├── img1.jpg
│   │   └── img2.jpg
│   └── val/            # 驗證圖片
│       ├── img3.jpg
│       └── img4.jpg
└── labels/
    ├── train/          # 訓練標註 (YOLO 格式)
    │   ├── img1.txt
    │   └── img2.txt
    └── val/            # 驗證標註
        ├── img3.txt
        └── img4.txt
```

**classes.txt 範例：**
```
person
car
dog
cat
```

**YOLO 標註格式 (.txt)：**
```
<class_id> <x_center> <y_center> <width> <height>
0 0.5 0.5 0.3 0.4
1 0.3 0.7 0.2 0.2
```
座標為相對值 (0-1)

---

## 🐛 已知問題

目前無重大問題。

---

## 📅 開發時間軸

- **2026-01-17**: v0.1.0 - 初始版本，基本 API 架構
- **2026-01-18**: v0.2.0 - 修復 bug，加入即時指標更新和非阻塞訓練
- **2026-01-18**: v0.3.0 - 添加模型下載、訓練結果查詢、任務列表 API

---

## 🎯 下次開發重點

### 建議優先順序：

1. **模型下載 API** (30 分鐘)
   - 實作 `GET /api/training/{job_id}/download`
   - 返回訓練好的 .pt 檔案

2. **推論 API** (1-2 小時)
   - 實作 `POST /api/inference/upload`
   - 支援單張圖片推論
   - 返回檢測結果 (bounding boxes, 類別, 信心度)

3. **前後端整合** (1 小時)
   - 修改前端連接後端 API
   - 實作訓練進度即時顯示
   - 整合訓練指標圖表

---

## 📞 開發備註

### 重要提醒
- ✅ 訓練在獨立執行緒運行，不會阻塞 API
- ✅ 支援最多 2 個並發訓練任務
- ⚠️ 訓練資料目前存在 `/tmp/yolo_training`，重啟會遺失
- ⚠️ 建議後續加入資料庫持久化

### 測試建議
- 先用小資料集 (10 張圖片，5 epochs) 測試訓練流程
- 確認 WebSocket 訊息正常推送
- 驗證訓練完成後模型檔案存在

### 效能考量
- CPU 訓練速度慢，建議使用 GPU (device="cuda")
- 大模型 (l/x) 需要更多記憶體
- batch_size 根據 GPU 記憶體調整

---

**最後更新**: 2026-01-18
**當前版本**: v0.3.0
**維護者**: Vince Wang
