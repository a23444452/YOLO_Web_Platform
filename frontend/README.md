# YOLO Web Platform - Frontend

基於 React 的 YOLO 無代碼訓練 Web 平台，讓你無需安裝 Python 環境，即可在瀏覽器中完成圖像標註、資料集管理、訓練配置和模型推論。

## 📊 開發進度總覽

### ✅ 已完成功能 (v1.3.0)

#### 1. 圖像標註模組 (90%)
- [x] 多張圖片上傳 (拖放/點擊/資料夾)
- [x] Canvas 繪製邊界框
- [x] 框選擇、移動、調整大小
- [x] 類別管理 (新增、編輯、刪除、顏色設定)
- [x] **自動讀取 classes.txt** ⭐ NEW (v1.2.0)
- [x] 快捷鍵支援 (1-9, Delete, 方向鍵)
- [x] 圖片導航 (上一張/下一張)
- [x] 縮放和平移功能
- [x] **IndexedDB 持久化存儲** ⭐ NEW (v1.1.0)
- [x] **Undo/Redo 歷史記錄** ⭐ NEW (v1.1.0)
- [x] YOLO 格式導出 (ZIP)

#### 2. 資料集管理模組 (50%)
- [x] 從已標註圖片創建資料集
- [x] 訓練/驗證集自動分割
- [x] 資料集統計預覽
- [x] 資料集列表管理
- [ ] 資料集編輯
- [ ] 資料集刪除
- [ ] 資料集匯入

#### 3. 訓練配置模組 (100%)
- [x] 完整的訓練參數設置
  - 基本配置 (YOLO 版本、模型大小、資料集)
  - 訓練參數 (Epochs、Batch Size、Image Size)
  - 數據增強 (Mosaic、Mixup、旋轉、翻轉等)
  - 進階設置 (優化器、學習率、Momentum 等)
- [x] 配置模板 UI
- [x] **後端 API 整合** ⭐ NEW (v1.3.0)

#### 4. 訓練監控模組 (100%)
- [x] 訓練進度展示
- [x] 即時訓練指標 (Loss、mAP)
- [x] 損失曲線圖表 (Recharts)
- [x] 訓練日誌顯示
- [x] 停止訓練功能
- [x] **WebSocket 即時更新** ⭐ NEW (v1.3.0)
- [x] **真實訓練整合** ⭐ NEW (v1.3.0)
- [x] **模型下載功能** ⭐ NEW (v1.3.0)

#### 5. 推論測試模組 (30%)
- [x] 圖片上傳界面
- [x] 推論參數設置
- [x] 基礎 UI 完成
- [ ] **ONNX.js 整合** (待實作)
- [ ] 推論結果展示
- [ ] 批量推論

### 🚧 待開發功能

#### Phase 1 - 後端整合 (優先級: COMPLETED ✅)
- [x] 整合後端訓練 API ✅ v1.3.0
  - [x] 啟動訓練請求
  - [x] WebSocket 連接訓練進度
  - [x] 即時指標顯示
  - [x] 模型下載
- [x] 訓練資料集上傳 (ZIP + Base64)
- [ ] 訓練任務列表 UI

#### Phase 2 - 推論功能 (優先級: HIGH)
- [ ] ONNX.js 瀏覽器端推論
- [ ] 模型檔案上傳/管理
- [ ] 推論結果視覺化
- [ ] 批量推論

#### Phase 3 - 增強功能 (優先級: MEDIUM)
- [ ] 標註數據匯入 (YOLO/COCO 格式)
- [ ] 資料集版本管理
- [ ] 訓練歷史記錄
- [ ] 模型效能比較
- [ ] 配置模板保存/載入

#### Phase 4 - 優化 (優先級: LOW)
- [ ] 大量圖片效能優化
- [ ] 多語言支援
- [ ] 主題切換
- [ ] 協作功能

---

## 🏗️ 專案架構

```
yolo-web-platform/
├── src/
│   ├── components/          # React 組件
│   │   ├── annotation/      # 標註模組組件
│   │   │   ├── AnnotationCanvas.tsx  # 主要 Canvas 元件
│   │   │   ├── ImageUpload.tsx       # 圖片上傳
│   │   │   ├── ClassManager.tsx      # 類別管理
│   │   │   └── Toolbar.tsx           # 工具列
│   │   ├── dataset/         # 資料集模組
│   │   ├── training/        # 訓練模組
│   │   ├── inference/       # 推論模組
│   │   ├── layout/          # 佈局組件
│   │   └── ui/              # shadcn/ui 基礎組件
│   ├── pages/               # 頁面組件
│   │   ├── Home.tsx         # 首頁
│   │   ├── Annotation.tsx   # 圖像標註頁
│   │   ├── Dataset.tsx      # 資料集管理頁
│   │   ├── Training.tsx     # 訓練配置頁
│   │   ├── Monitor.tsx      # 訓練監控頁
│   │   └── Inference.tsx    # 推論測試頁
│   ├── stores/              # Zustand 狀態管理
│   │   ├── annotationStore.ts  # 標註狀態 ⭐ 最近更新
│   │   ├── datasetStore.ts     # 資料集狀態
│   │   └── trainingStore.ts    # 訓練狀態
│   ├── lib/
│   │   ├── db.ts            # IndexedDB 封裝 (Dexie.js)
│   │   └── export.ts        # YOLO 格式導出
│   ├── types/               # TypeScript 類型定義
│   ├── App.tsx              # 主應用組件
│   └── main.tsx             # 入口文件
├── public/                  # 靜態資源
├── CHANGELOG.md             # 更新日誌
├── README.md                # 本檔案
└── package.json
```

### 核心模組說明

#### 1. `annotationStore.ts` - 標註狀態管理 ⭐ 最近更新

**主要狀態**:
```typescript
- images: UploadedImage[]          // 已上傳圖片
- currentImageIndex: number        // 當前圖片索引
- annotations: Annotation[]        // 標註數據
- classes: ClassDefinition[]       // 類別定義
- selectedAnnotationId: string     // 選中的標註
- history / historyIndex           // Undo/Redo 歷史
```

**主要方法**:
```typescript
- addImages()              // 添加圖片
- addAnnotation()          // 添加標註
- updateAnnotation()       // 更新標註
- deleteAnnotation()       // 刪除標註
- addClass()               // 添加類別
- addClassesFromList()     // 批量添加類別 ⭐ NEW
- undo() / redo()          // 撤銷/重做 ⭐ NEW
- exportYOLO()             // 導出 YOLO 格式
```

**最新改進 (v1.2.0 - 2026-01-17)**:
1. ✅ 自動讀取上傳資料夾中的 classes.txt
2. ✅ 批量添加類別並自動去重
3. ✅ IndexedDB 自動同步 (v1.1.0)
4. ✅ 完整的 Undo/Redo 系統 (v1.1.0)

#### 2. `db.ts` - IndexedDB 封裝

使用 Dexie.js 提供持久化存儲：
```typescript
class YOLODatabase extends Dexie {
  images: Table<StoredImage>
  annotations: Table<StoredAnnotation>
  classes: Table<StoredClass>
}
```

自動同步機制確保數據不會因重新整理而遺失。

#### 3. `export.ts` - YOLO 格式導出

生成標準 YOLO 格式的 ZIP 檔案：
```
dataset.zip
├── classes.txt
├── images/
│   ├── train/
│   └── val/
└── labels/
    ├── train/
    └── val/
```

---

## 🚀 快速開始

### 環境要求
- Node.js 18+
- pnpm (推薦) / npm / yarn

### 安裝

```bash
cd yolo-web-platform

# 安裝依賴
pnpm install

# 開發模式
pnpm dev

# 建置生產版本
pnpm build

# 預覽生產版本
pnpm preview
```

在瀏覽器中打開：http://localhost:5173

---

## 📝 使用指南

### 1. 圖像標註工作流程

1. **上傳圖片**
   - 拖放圖片到上傳區域
   - 或點擊「選擇檔案」上傳
   - 支援資料夾上傳 (會自動讀取 classes.txt)

2. **管理類別**
   - 點擊「新增類別」
   - 輸入類別名稱
   - 選擇顏色 (可選)
   - 如果上傳資料夾包含 classes.txt，系統會自動添加

3. **繪製標註**
   - 選擇類別
   - 在圖片上拖動滑鼠繪製邊界框
   - 使用快捷鍵 1-9 快速切換類別

4. **編輯標註**
   - 點擊框進行選擇
   - 拖動框進行移動
   - 拖動角落進行縮放
   - 按 Delete 刪除

5. **導出數據**
   - 點擊「匯出 YOLO」
   - 下載 ZIP 檔案
   - 包含圖片和標註

### 2. 創建資料集

1. 完成標註後，前往「資料集管理」
2. 點擊「創建資料集」
3. 輸入資料集名稱
4. 調整訓練/驗證集比例 (預設 80/20)
5. 點擊「創建」

### 3. 訓練模型

1. 前往「訓練配置」
2. 輸入專案名稱
3. 選擇 YOLO 版本 (v5/v8/v11)
4. 選擇模型大小 (n/s/m/l/x)
5. 選擇資料集
6. 調整參數
7. 點擊「開始訓練」

### 4. 監控訓練

- 查看即時進度條
- 觀察 Loss 和 mAP 曲線
- 查看訓練日誌
- 必要時停止訓練

---

## ⌨️ 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `1-9` | 切換類別 |
| `Delete` | 刪除選中的框 |
| `← →` | 上一張/下一張圖片 |
| `Ctrl+Z` / `Cmd+Z` | 撤銷 |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | 重做 |
| `Ctrl+Y` | 重做 (Windows) |
| `Escape` | 取消選擇 |

---

## 🔧 技術棧

- **前端框架**: React 18 + TypeScript
- **建置工具**: Vite 7.3.1
- **樣式**: Tailwind CSS
- **UI 組件**: shadcn/ui
- **狀態管理**: Zustand
- **路由**: React Router v7
- **圖表**: Recharts
- **資料庫**: Dexie.js (IndexedDB)
- **檔案處理**: JSZip

---

## 🎨 設計規範

本專案遵循專業工具風格設計：

- **主色調**: 藍色 (#2563eb)
- **成功色**: 綠色 (#10b981)
- **錯誤色**: 紅色 (#ef4444)
- **警告色**: 黃色 (#f59e0b)
- **中性色**: 灰色系

**設計原則**:
- 避免過度圓角和漸層背景
- 左對齊為主，清晰的功能分區
- 實用主義設計，強調功能性
- 響應式設計，支援各種螢幕尺寸

---

## 🌐 瀏覽器兼容性

- Chrome 90+ (推薦)
- Edge 90+
- Firefox 88+
- Safari 14+

**注意**: 需要支援以下 API:
- Canvas API
- IndexedDB
- File API
- WebSocket (用於訓練監控)

---

## 📅 開發時間軸

- **2026-01-17 v1.0.0**: 初始版本，基本標註功能
- **2026-01-17 v1.0.1**: 移除除錯 console.log
- **2026-01-17 v1.1.0**: IndexedDB 持久化 + Undo/Redo
- **2026-01-17 v1.2.0**: 自動讀取 classes.txt
- **2026-01-18 v1.3.0**: 後端 API 整合 (訓練、WebSocket、模型下載)

---

## 🎯 下次開發重點

### 建議優先順序：

1. **後端 API 整合** (2-3 小時)
   - 修改 trainingStore 連接後端 API
   - 實作 WebSocket 連接
   - 顯示真實訓練進度和指標
   - 參考後端 README 的 API 文件

2. **推論功能** (2-3 小時)
   - 整合 ONNX.js
   - 上傳/管理模型檔案
   - 實作推論邏輯
   - 視覺化結果

3. **資料集管理增強** (1 小時)
   - 資料集編輯
   - 資料集刪除
   - 資料集版本控制

---

## 📞 開發備註

### 重要提醒
- ✅ 所有數據存在 IndexedDB，重新整理不會遺失
- ✅ 支援大量圖片 (已測試 100+ 張)
- ⚠️ 單張圖片建議不超過 10MB
- ⚠️ 瀏覽器 IndexedDB 有容量限制 (通常 50MB+)

### 效能優化建議
- 大量圖片時使用虛擬滾動
- 圖片壓縮後再存入 IndexedDB
- Canvas 渲染優化 (已實作)

### API 整合注意事項
後端 API 位於：`http://localhost:8000`

主要端點：
- `POST /api/training/start` - 啟動訓練
- `GET /api/training/status/{job_id}` - 查詢狀態
- `WS /ws/training/{job_id}` - 即時更新

詳見後端 README.md

---

## 🔗 相關專案

- **後端 API**: `../yolo-backend`
- **設計文件**: `YOLO_Web_Platform_Design.md`

---

**最後更新**: 2026-01-18
**當前版本**: v1.3.0
**維護者**: Vince Wang
