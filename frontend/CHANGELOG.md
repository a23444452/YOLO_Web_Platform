# 更新日誌

## [1.6.2] - 2026-01-19

### 🐛 緊急修復

- ✅ **修復自動標註功能無法添加標註框的問題**
  - 問題：使用 `findIndex` 獲取陣列索引而非實際類別 ID
  - 影響：自動標註功能完全無法運作，無法添加任何標註框
  - 修復：改用 `find` 獲取類別物件，使用 `classObj.id` 作為類別 ID
  - 現在自動標註可以正確添加檢測結果到圖片上

### 🔍 除錯改進

- ✅ **新增除錯日誌**
  - 顯示每張圖片的推論偵測數量
  - 顯示每個添加的標註框詳細信息（類別名稱、ID、信心度）
  - 幫助用戶追蹤自動標註過程

### 🔧 技術細節

**根本原因**:
```typescript
// 錯誤的實作 (v1.6.0-1.6.1)
let classId = classes.findIndex(c => c.name === detection.class_name);
// 返回陣列索引 (0, 1, 2, ...)，而不是實際的 class.id

// 正確的實作 (v1.6.2)
const classObj = classes.find(c => c.name === detection.class_name);
const classId = classObj.id;  // 使用實際的類別 ID
```

**為什麼推論頁面正常**:
- 推論頁面不需要添加標註框到 store
- 只需要在 Canvas 上繪製，不涉及類別 ID 驗證

**為什麼自動標註失敗**:
- `addBox` 函數會驗證 `classId` 是否存在於 `classes` 陣列中
- 使用 `c.id === box.classId` 進行比對
- 傳入錯誤的索引導致找不到對應類別，標註框無法添加

**修改檔案** (`src/pages/Annotation.tsx`):
- 第 321-351 行：修正類別 ID 獲取邏輯
- 第 320 行：新增推論結果日誌
- 第 353 行：新增標註框添加日誌

---

## [1.6.1] - 2026-01-19

### 🐛 修復

- ✅ **修復類別標註數量計算**
  - 修復 `loadFolderWithAnnotations` 載入資料夾時類別計數未更新的問題
  - 修復 `removeBox` 刪除標註框時類別計數未保存至 IndexedDB 的問題
  - 現在類別計數會正確反映所有圖片的標註數量
  - 確保類別管理面板顯示正確的標註數量

### 🎨 UI 優化

- ✅ **增加標註頁面圖片列表寬度**
  - 從 320px (w-80) 增加至 384px (w-96)
  - 改善圖片預覽體驗
  - 讓圖片縮圖更清晰易辨識

### 🔧 技術改進

**修改檔案** (`src/stores/annotationStore.ts`):
- `loadFolderWithAnnotations` - 新增類別計數計算邏輯
- `removeBox` - 新增保存更新後類別計數至 IndexedDB 的邏輯

**修改檔案** (`src/pages/Annotation.tsx`):
- 調整圖片列表容器寬度

---

## [1.4.0] - 2026-01-18

### ✨ 推論功能完整實作

- ✅ **後端推論 API 整合**
  - 連接 FastAPI 推論端點
  - 自動載入可用模型列表
  - Base64 影像編碼傳輸
  - 即時推論結果顯示

- ✅ **完整推論介面**
  - 模型選擇下拉選單
  - 顯示模型可偵測的類別清單
  - 信心度和 IOU 閾值調整
  - 影像上傳和預覽
  - 即時推論狀態顯示

- ✅ **視覺化偵測結果**
  - 在影像上繪製邊界框
  - 自動產生類別顏色
  - 顯示類別名稱和信心度
  - 偵測結果清單（類別、信心度、座標）
  - 推論時間統計

### 🔧 技術改進

**新增 API 函數** (`src/lib/api.ts`):
- `listInferenceModels()` - 列出所有可用模型
- `loadModel(modelId)` - 載入模型到記憶體
- `unloadModel(modelId)` - 卸載模型
- `runInference(modelId, image, conf, iou)` - 執行推論

**更新 UI** (`src/pages/Inference.tsx`):
- 模型選擇 Select 組件
- 推論狀態載入動畫
- Canvas 繪製邊界框
- 偵測結果列表顯示
- 推論時間顯示

**新增 TypeScript 型別**:
- `BoundingBox` - 邊界框座標
- `Detection` - 偵測結果
- `InferenceResponse` - 推論響應
- `ModelInfo` - 模型資訊
- `ListModelsResponse` - 模型列表

### 🎯 推論流程

1. 頁面載入時自動獲取可用模型
2. 使用者選擇模型（顯示可偵測類別）
3. 上傳測試影像
4. 調整信心度和 IOU 閾值
5. 執行推論（自動載入模型）
6. 在影像上繪製偵測結果
7. 顯示偵測物體清單

### 🌟 使用體驗

**修復前** ❌:
- 推論頁面僅有 UI 框架
- 顯示「推論功能開發中」提示
- 無法執行實際推論

**修復後** ✅:
- 完整的端到端推論功能
- 即時視覺化偵測結果
- 支援多模型切換
- 顯示推論效能指標

---

## [1.3.1] - 2026-01-18

### 🔧 WebSocket 穩定性改進

- ✅ **自動重連機制**
  - WebSocket 斷線後自動重新連接
  - 指數退避算法 (3s → 6s → 12s → 24s → 30s)
  - 最多重試 5 次
  - 重連成功後繼續接收訓練更新
  - 避免網路不穩定導致訓練監控中斷

- ✅ **心跳機制 (Heartbeat)**
  - 客戶端每 30 秒自動發送 ping
  - 伺服器響應 pong 確認連接活躍
  - 防止長時間訓練時連接被中間件關閉
  - 保持 WebSocket 長連接穩定性

- ✅ **連接狀態日誌**
  - WebSocket 連接成功時記錄到訓練日誌
  - 斷線重連過程透明化
  - 便於除錯和監控連接狀態

### ✨ 新增功能

- ✅ **一鍵下載訓練模型**
  - 訓練完成後顯示「下載模型」按鈕
  - 自動下載 best.pt 模型檔案
  - 檔名格式：`yolo_{job_id}_best.pt`
  - 下載過程提供即時通知

### 🐛 修復問題

- 修復訓練過程中 WebSocket 提前斷開的問題 (datetime 序列化)
- 修復斷線後進度條停止更新的問題
- 修復無法得知訓練完成狀態的問題
- 修復 YOLO11 模型命名問題 (`yolov11` → `yolo11`)
- 修復 WebSocket metrics 格式不匹配問題 (snake_case → camelCase)

### 📁 技術改進

**新增函數** (`src/lib/api.ts`):
- `createTrainingWebSocketWithRetry()` - 帶重連的 WebSocket 創建函數
- `WebSocketConnection` 介面 - 統一 WebSocket 連接管理

**改進函數** (`src/lib/api.ts`):
- `createTrainingWebSocket()` - 加入心跳機制

**更新** (`src/stores/trainingStore.ts`):
- 使用 `createTrainingWebSocketWithRetry` 替代原版
- 統一使用 `disconnect()` 方法關閉連接
- `websockets` Map 類型更新為 `WebSocketConnection`

**新增 UI** (`src/pages/Monitor.tsx`):
- 添加 `handleDownloadModel` 下載處理函數
- 訓練完成時顯示「下載模型」按鈕
- 導入 `Download` 圖示和 `downloadModel` API 函數

### 🎯 影響

**修復前** ❌:
- WebSocket 隨機斷開
- 進度條停止更新
- 無法得知訓練是否完成
- 需要手動刷新頁面

**修復後** ✅:
- WebSocket 自動重連 (最多 5 次)
- 進度條持續更新
- 訓練完成即時通知
- 心跳維持長連接穩定

---

## [1.3.0] - 2026-01-18

### ✨ 新增功能
- ✅ **後端 API 完整整合** ⭐ 重大更新
  - 連接 FastAPI 後端進行真實訓練
  - 自動將資料集導出為 YOLO 格式 ZIP 並上傳
  - Base64 編碼傳輸資料集
  - 啟動訓練並獲取 job_id

- ✅ **WebSocket 即時訓練監控**
  - 即時接收訓練狀態更新
  - 即時顯示 epoch 級別的訓練指標
  - 即時訓練日誌顯示
  - 自動處理連接錯誤和重連

- ✅ **訓練進度即時更新**
  - 顯示當前 epoch / 總 epoch
  - 進度百分比 (0-100%)
  - 訓練指標：train_loss, val_loss, mAP50, mAP50-95, precision, recall
  - 損失和 mAP 曲線即時繪製

- ✅ **模型下載功能**
  - 訓練完成後下載 best.pt 模型檔案
  - 自動檔名格式：yolo_{job_id}_best.pt
  - 支援訓練結果查詢 API
  - 支援訓練任務列表 API

### 🔧 技術改進
- 新增 `src/lib/api.ts` - 完整的後端 API 客戶端
- 更新 `trainingStore.ts` - 整合真實訓練流程
- 實作 WebSocket 訊息處理和回調系統
- Blob 轉 Base64 工具函數
- 前後端配置格式轉換

### 📡 API 整合清單
```typescript
✅ POST /api/training/start        - 啟動訓練
✅ GET  /api/training/status/:id   - 查詢狀態
✅ POST /api/training/stop/:id     - 停止訓練
✅ GET  /api/training/:id/download - 下載模型
✅ GET  /api/training/:id/results  - 查詢結果
✅ GET  /api/training/list         - 列出任務
✅ WS   /ws/training/:id           - WebSocket 即時更新
```

### 🎯 訓練流程
1. 使用者配置訓練參數
2. 前端導出資料集為 YOLO ZIP
3. 轉換為 Base64 並上傳到後端
4. 後端啟動真實訓練 (Ultralytics YOLO)
5. WebSocket 推送即時訓練指標
6. 前端即時顯示進度和圖表
7. 訓練完成後下載模型

### ⚡ 效能優化
- 使用 WebSocket 而非輪詢，減少伺服器負載
- ZIP 壓縮減少上傳大小
- Base64 編碼支援二進制數據傳輸

---

## [1.2.0] - 2026-01-17

### 新增功能
- ✅ **自動讀取 classes.txt**
  - 上傳資料夾時自動偵測 classes.txt 檔案
  - 自動解析並添加類別名稱到系統
  - 過濾重複類別名稱(不區分大小寫)
  - 顯示成功添加的類別數量提示
  - 大幅提升標註工作流程效率

### 技術改進
- 在 annotationStore 添加 `addClassesFromList` 批量添加方法
- 智能去重機制避免類別名稱衝突
- 自動記錄歷史支援 Undo/Redo

---

## [1.1.0] - 2026-01-17

### 新增功能
- ✅ **IndexedDB 持久化存儲**
  - 使用 Dexie.js 封裝 IndexedDB 操作
  - 自動保存所有標註數據到本地數據庫
  - 應用啟動時自動載入歷史數據
  - 支援數百 MB 的圖片存儲
  - 解決重新整理後數據丟失問題

- ✅ **Undo/Redo 歷史記錄系統**
  - 完整的歷史記錄棧(最多 50 個)
  - Undo 撤銷到上一個狀態
  - Redo 重做到下一個狀態
  - 智能歷史記錄(僅記錄數據變更)
  - 深拷貝避免引用問題

- ✅ **快捷鍵支援**
  - Ctrl+Z / Cmd+Z: 撤銷
  - Ctrl+Shift+Z / Cmd+Shift+Z: 重做
  - Ctrl+Y: 重做(Windows)

- ✅ **UI 改進**
  - 添加 Undo/Redo 按鈕到工具列
  - 按鈕狀態智能啟用/禁用
  - Tooltip 提示快捷鍵
  - 工具列按鈕分組和分隔線

### 技術改進
- 使用 Dexie.js v4.2.1
- 實作深拷貝機制
- 批量操作優化
- 選擇性同步減少 I/O

### 已知限制
- 數據僅存在本地瀏覽器
- 無跨設備同步
- 歷史記錄最多 50 個

---

## [1.0.1] - 2026-01-17

### 清理
- 移除所有除錯用的 console.log 語句
- 保留必要的錯誤處理 console.error
- 簡化程式碼,提升執行效率

### 已驗證功能
- ✅ 多張圖片上傳
- ✅ 資料夾上傳 (webkitdirectory)
- ✅ Canvas 標註編輯
- ✅ YOLO 格式導出 (經過實際測試驗證)
- ✅ ZIP 檔案生成 (最大測試: 12 張圖片, 6.7 MB)

---

## [1.0.0] - 2026-01-17

### 新增功能
- 圖片上傳功能 (多選、資料夾、拖放)
- Canvas 標註編輯 (繪製、選擇、移動、調整大小)
- 類別管理 (新增、編輯、刪除)
- YOLO 格式數據導出
- 快捷鍵支援 (1-9, Escape, Delete, 方向鍵)
- 縮放和平移功能

### 技術棧
- React 18
- TypeScript
- Vite 7.3.1
- Zustand (狀態管理)
- Canvas API
- JSZip (ZIP 生成)
- shadcn/ui + Tailwind CSS

### 已知限制
- 資料僅存在瀏覽器記憶體中 (重新整理會清空)
- 建議單張圖片不超過 10MB
- 大量圖片可能消耗較多記憶體
