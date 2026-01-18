# YOLO Project 專案結構

本文件說明 YOLO Web Platform 的完整專案結構和檔案組織。

---

## 📁 總覽

```
YOLO-Project/
├── frontend/           前端應用 (React + TypeScript)
├── backend/            後端 API (FastAPI + Python)
├── docs/               文件和報告
├── tests/              測試檔案
├── datasets/           測試資料集
├── README.md           專案說明文件
└── .gitignore          Git 忽略規則
```

---

## 🎨 前端結構 (frontend/)

```
frontend/
├── src/                        原始碼
│   ├── components/             UI 組件
│   │   ├── ui/                 基礎 UI 組件 (shadcn/ui)
│   │   ├── AnnotationCanvas.tsx    標註畫布組件
│   │   ├── CategoryManager.tsx     類別管理組件
│   │   └── ...
│   │
│   ├── pages/                  頁面組件
│   │   ├── Dataset.tsx         資料集頁面
│   │   ├── Annotate.tsx        標註頁面
│   │   ├── Training.tsx        訓練配置頁面
│   │   └── Monitor.tsx         訓練監控頁面
│   │
│   ├── stores/                 Zustand 狀態管理
│   │   ├── datasetStore.ts     資料集狀態
│   │   ├── annotationStore.ts  標註狀態
│   │   └── trainingStore.ts    訓練狀態
│   │
│   ├── lib/                    工具函數和庫
│   │   ├── api.ts              後端 API 客戶端
│   │   ├── db.ts               IndexedDB 封裝 (Dexie)
│   │   ├── exportDataset.ts    資料集導出邏輯
│   │   ├── constants.ts        常量定義
│   │   └── utils.ts            通用工具函數
│   │
│   ├── types/                  TypeScript 型別定義
│   │   └── index.ts            全域型別
│   │
│   ├── App.tsx                 主應用組件
│   └── main.tsx                應用入口
│
├── public/                     靜態資源
├── dist/                       構建輸出 (自動生成)
├── node_modules/               依賴套件 (自動生成)
│
├── CHANGELOG.md                前端更新日誌
├── README.md                   前端說明文件
├── package.json                專案配置
├── pnpm-lock.yaml              依賴鎖定檔
├── tsconfig.json               TypeScript 配置
├── vite.config.ts              Vite 配置
├── tailwind.config.js          Tailwind CSS 配置
├── postcss.config.js           PostCSS 配置
├── eslint.config.js            ESLint 配置
└── components.json             shadcn/ui 配置
```

### 關鍵檔案說明

| 檔案 | 說明 |
|------|------|
| `src/lib/api.ts` | 後端 API 整合、WebSocket 連接、重連機制 |
| `src/lib/db.ts` | IndexedDB 持久化存儲 |
| `src/lib/exportDataset.ts` | YOLO 格式導出邏輯 |
| `src/stores/trainingStore.ts` | 訓練流程管理、WebSocket 狀態 |
| `src/pages/Monitor.tsx` | 訓練監控、即時圖表、模型下載 |

---

## ⚙️ 後端結構 (backend/)

```
backend/
├── src/
│   └── yolo_api/              API 模組
│       ├── main.py            FastAPI 主程式、API 路由
│       ├── training.py        訓練管理器、YOLO 整合
│       └── models.py          Pydantic 資料模型
│
├── venv/                      Python 虛擬環境 (自動生成)
├── *.pt                       YOLO 預訓練模型
│
├── CHANGELOG.md               後端更新日誌
├── README.md                  後端說明文件
├── pyproject.toml             Python 專案配置
├── requirements.txt           Python 依賴清單
└── test_api.py                API 測試腳本
```

### 關鍵檔案說明

| 檔案 | 說明 |
|------|------|
| `src/yolo_api/main.py` | API 端點、WebSocket 處理、路由定義 |
| `src/yolo_api/training.py` | 訓練流程、Ultralytics 整合、回調機制 |
| `src/yolo_api/models.py` | API 請求/響應模型、訓練配置模型 |
| `yolo11*.pt` | YOLO11 預訓練模型 (n/s/m/l) |

---

## 📚 文件結構 (docs/)

```
docs/
├── YOLO_Web_Platform_Design.md      系統設計文件
├── WebSocket問題診斷報告.md         WebSocket 除錯過程
├── WebSocket重連測試指南.md         測試指南和檢查清單
├── 端到端測試報告.md                 E2E 測試結果
└── 整合完成總結.md                   整合工作總結
```

---

## 🧪 測試結構 (tests/)

```
tests/
└── test_end_to_end.py        端到端測試腳本
```

**測試內容**:
- 資料集上傳
- 訓練啟動
- WebSocket 連接
- 訓練狀態查詢
- 模型下載

---

## 📦 資料集結構 (datasets/)

```
datasets/
└── test-yolo-dataset/        測試用 YOLO 資料集
    ├── images/               圖片檔案
    ├── labels/               標註檔案 (.txt)
    └── classes.txt           類別清單
```

---

## 🔧 配置檔案

### 前端配置

| 檔案 | 用途 |
|------|------|
| `vite.config.ts` | Vite 構建工具配置 |
| `tsconfig.json` | TypeScript 編譯器配置 |
| `tailwind.config.js` | Tailwind CSS 樣式配置 |
| `eslint.config.js` | 程式碼檢查規則 |
| `components.json` | shadcn/ui 組件配置 |

### 後端配置

| 檔案 | 用途 |
|------|------|
| `pyproject.toml` | Python 專案元數據 |
| `requirements.txt` | Python 依賴清單 |

---

## 🚀 啟動順序

### 1. 啟動後端

```bash
cd YOLO-Project/backend
source venv/bin/activate      # Windows: venv\Scripts\activate
python -m yolo_api.main
```

→ 後端運行在 **http://localhost:8000**

### 2. 啟動前端

```bash
cd YOLO-Project/frontend
pnpm dev
```

→ 前端運行在 **http://localhost:5173**

---

## 📊 資料流向

```
使用者上傳圖片
    ↓
[IndexedDB] 本地存儲
    ↓
使用者標註資料
    ↓
[導出 YOLO ZIP]
    ↓
[Base64 編碼]
    ↓
[POST /api/training/start] → 後端
    ↓
[解壓 + 訓練]
    ↓
[WebSocket] ← 即時推送指標
    ↓
[前端更新 UI]
    ↓
[訓練完成] → 儲存 best.pt
    ↓
[GET /api/training/{id}/download]
    ↓
下載模型到本地
```

---

## 🔗 API 端點

### REST API

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/health` | 健康檢查 |
| POST | `/api/training/start` | 啟動訓練 |
| GET | `/api/training/status/:id` | 查詢訓練狀態 |
| POST | `/api/training/stop/:id` | 停止訓練 |
| GET | `/api/training/:id/download` | 下載模型 |
| GET | `/api/training/:id/results` | 查詢訓練結果 |
| GET | `/api/training/list` | 列出所有任務 |

### WebSocket

| 端點 | 說明 |
|------|------|
| `ws://localhost:8000/ws/training/:id` | 訓練即時更新 |

---

## 📝 版本管理

### 前端版本: v1.3.1

- WebSocket 穩定性改進
- 一鍵下載模型功能
- Metrics 格式自動轉換

### 後端版本: v0.3.1

- WebSocket datetime 序列化修復
- YOLO11 模型命名修復
- 預下載常用模型

詳見各自的 `CHANGELOG.md`

---

## 🎯 重要路徑

### 前端開發路徑

```
src/
├── lib/api.ts              # 修改 API 整合
├── stores/trainingStore.ts # 修改訓練邏輯
├── pages/Monitor.tsx       # 修改監控 UI
└── components/            # 修改 UI 組件
```

### 後端開發路徑

```
src/yolo_api/
├── main.py         # 修改 API 路由
├── training.py     # 修改訓練邏輯
└── models.py       # 修改資料模型
```

---

## 📌 注意事項

### 環境變數

**前端** (`.env`):
```env
VITE_API_URL=http://localhost:8000
```

**後端**: 無需額外環境變數

### 埠號衝突

- 前端預設: 5173
- 後端預設: 8000

如需修改：
- 前端: `vite.config.ts` → `server.port`
- 後端: `main.py` → `uvicorn.run(port=...)`

### 資料庫

- IndexedDB 資料庫名稱: `yolo-annotations-db`
- 表: `images`, `annotations`, `categories`

---

## 🔍 除錯指南

### 前端除錯

1. 開啟瀏覽器開發者工具 (F12)
2. 檢查 Console 日誌
3. 檢查 Network 標籤 (WebSocket 連接)
4. 檢查 Application → IndexedDB

### 後端除錯

1. 檢查終端輸出日誌
2. 查看 `/tmp/yolo-backend.log`
3. 檢查訓練輸出資料夾
4. 使用 `curl` 測試 API 端點

---

**最後更新**: 2026-01-18
**專案版本**: Frontend v1.3.1 | Backend v0.3.1
