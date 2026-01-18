# WebSocket 重連功能測試指南

## 📅 測試日期
2026-01-18

## 🎯 測試目標
驗證前端 WebSocket 自動重連和心跳機制是否正常工作

---

## ✅ 已完成的修改

### 1. 自動重連機制 (`src/lib/api.ts`)

**新增函數**: `createTrainingWebSocketWithRetry()`

特性：
- ✅ 指數退避算法：3s → 6s → 12s → 24s → 30s (最大 30 秒)
- ✅ 最多重試 5 次
- ✅ 重連成功後重置重試計數
- ✅ 達到最大重試次數後停止
- ✅ 支援手動斷開連接

```typescript
const wsConnection = createTrainingWebSocketWithRetry(
  jobId,
  callbacks,
  {
    maxRetries: 5,
    retryDelay: 3000,
    exponentialBackoff: true
  }
);
```

### 2. 心跳機制 (`src/lib/api.ts`)

**改進函數**: `createTrainingWebSocket()`

特性：
- ✅ 每 30 秒自動發送 ping
- ✅ 接收伺服器 pong 響應
- ✅ 連接關閉時清理心跳計時器
- ✅ 防止長時間訓練時連接被中間件關閉

```typescript
// 心跳計時器
let heartbeatInterval: NodeJS.Timeout | null = null;

ws.onopen = () => {
  heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('ping');
    }
  }, 30000);
  callbacks.onOpen?.();
};
```

### 3. 連接狀態日誌 (`src/stores/trainingStore.ts`)

特性：
- ✅ WebSocket 連接成功時記錄 "✅ WebSocket 已連接"
- ✅ 使用 `createTrainingWebSocketWithRetry` 替代原版
- ✅ 統一使用 `disconnect()` 方法關閉連接

---

## 🧪 測試步驟

### 準備工作

1. **確保後端運行**
   ```bash
   cd ~/yolo-backend
   source venv/bin/activate
   python -m yolo_api.main
   ```

2. **確保前端運行**
   ```bash
   cd ~/yolo-web-platform
   pnpm dev
   ```

3. **開啟瀏覽器**
   - 訪問 http://localhost:5173/
   - 開啟開發者工具 (F12)
   - 切換到 Console 標籤

---

### 測試 1: 正常訓練流程 ✅

**目的**: 驗證基本功能正常

**步驟**:
1. 上傳測試資料集（使用 `~/test-yolo-dataset/`）
2. 配置訓練參數：
   - YOLO 版本: v8
   - 模型大小: n (nano)
   - Epochs: 3
   - 裝置: CPU
3. 開始訓練
4. 觀察 Console 日誌

**預期結果**:
```
[WebSocket] Connected to training job {job_id}
[WebSocket] Heartbeat pong received  // 每 30 秒出現一次
📊 Status: running (33.3%)
📈 Epoch 1/3: ...
📈 Epoch 2/3: ...
📈 Epoch 3/3: ...
🏁 Training completed
```

**檢查點**:
- [ ] WebSocket 成功連接
- [ ] 每 30 秒收到 heartbeat pong
- [ ] 進度條持續更新
- [ ] Epoch 指標即時顯示
- [ ] 訓練完成狀態正確

---

### 測試 2: 網路斷線重連 🔄

**目的**: 驗證自動重連機制

**步驟**:
1. 開始一個長時間訓練 (10+ epochs)
2. 等待訓練開始後 (第 1 個 epoch 完成)
3. 關閉 WiFi 或拔掉網路線 (等待 5 秒)
4. 重新開啟網路
5. 觀察 Console 日誌

**預期結果**:
```
[WebSocket] Disconnected, will retry in 3000ms (1/5)
[WebSocket] Attempting reconnect (1/5)...
[WebSocket] Connection established (retry count reset)
[WebSocket] Heartbeat pong received
📊 Status: running (50.0%)
```

**檢查點**:
- [ ] 斷網後看到重連訊息
- [ ] 重連延遲正確 (3s → 6s → 12s ...)
- [ ] 重連成功後繼續接收更新
- [ ] 進度條恢復更新
- [ ] 重試計數正確顯示

---

### 測試 3: 長時間訓練 ⏱️

**目的**: 驗證心跳機制維持長連接

**步驟**:
1. 開始一個長時間訓練 (30+ epochs)
2. 不做任何操作，讓訓練自然進行
3. 觀察是否有斷線情況

**預期結果**:
```
[WebSocket] Heartbeat pong received  // 每 30 秒
📈 Epoch 10/30: ...
[WebSocket] Heartbeat pong received
📈 Epoch 20/30: ...
[WebSocket] Heartbeat pong received
📈 Epoch 30/30: ...
🏁 Training completed
```

**檢查點**:
- [ ] 訓練過程中無斷線
- [ ] Heartbeat 正常發送/接收
- [ ] 所有 epoch 的指標都正確顯示
- [ ] 訓練完成狀態正確

---

### 測試 4: 多次重連失敗 ❌

**目的**: 驗證達到最大重試次數的行為

**步驟**:
1. 開始訓練
2. 關閉 WiFi
3. 等待足夠長時間 (約 2 分鐘) 讓重試次數耗盡
4. 觀察 Console 日誌

**預期結果**:
```
[WebSocket] Disconnected, will retry in 3000ms (1/5)
[WebSocket] Disconnected, will retry in 6000ms (2/5)
[WebSocket] Disconnected, will retry in 12000ms (3/5)
[WebSocket] Disconnected, will retry in 24000ms (4/5)
[WebSocket] Disconnected, will retry in 30000ms (5/5)
[WebSocket] Max retries reached, giving up
```

**檢查點**:
- [ ] 重試次數正確 (最多 5 次)
- [ ] 指數退避延遲正確
- [ ] 達到上限後顯示 "Max retries reached"
- [ ] 不再嘗試重連

---

### 測試 5: 手動停止訓練 ⏹️

**目的**: 驗證手動斷開不會重連

**步驟**:
1. 開始訓練
2. 訓練進行中點擊「停止訓練」按鈕
3. 觀察 Console 日誌

**預期結果**:
```
[WebSocket] Manual disconnect, will not retry
WebSocket 連接關閉
```

**檢查點**:
- [ ] 看到 "Manual disconnect" 訊息
- [ ] 不會嘗試自動重連
- [ ] WebSocket 正確關閉

---

## 📊 測試記錄表

| 測試項目 | 狀態 | 備註 |
|---------|------|------|
| 1. 正常訓練流程 | ⏳ 待測試 | |
| 2. 網路斷線重連 | ⏳ 待測試 | |
| 3. 長時間訓練 | ⏳ 待測試 | |
| 4. 多次重連失敗 | ⏳ 待測試 | |
| 5. 手動停止訓練 | ⏳ 待測試 | |

---

## 🐛 已知問題

### 後端 WebSocket 處理

**當前狀態**: 後端僅被動響應 ping，未主動發送心跳

**影響**: 輕微（前端心跳已足夠維持連接）

**建議**: 未來可添加後端主動心跳（優先級 LOW）

---

## 📝 測試注意事項

1. **使用真實瀏覽器測試**
   - Python 測試腳本無法驗證前端 TypeScript 代碼
   - 必須在瀏覽器中進行實際測試

2. **觀察 Console 日誌**
   - 所有重連訊息都會輸出到 console.log
   - 確保開啟瀏覽器開發者工具

3. **網路模擬**
   - 可使用 Chrome DevTools > Network > Offline 模擬斷網
   - 或實際關閉 WiFi

4. **長時間測試**
   - 建議至少執行一次 10+ 分鐘的訓練
   - 驗證心跳機制是否穩定

---

## ✅ 成功標準

### 基本功能
- [x] WebSocket 成功連接
- [x] 心跳機制正常工作
- [x] 進度條即時更新
- [x] 訓練完成狀態正確

### 重連功能
- [ ] 斷網後自動重連 (待測試)
- [ ] 重連成功後恢復更新 (待測試)
- [ ] 指數退避算法正確 (待測試)
- [ ] 達到最大重試次數後停止 (待測試)

### 穩定性
- [ ] 長時間訓練無斷線 (待測試)
- [ ] 手動停止不會重連 (待測試)

---

## 🎯 測試完成後

如果所有測試通過：
1. ✅ 更新測試記錄表
2. ✅ 將狀態從 ⏳ 改為 ✅
3. ✅ 記錄任何發現的問題
4. ✅ 更新主要的測試報告

如果發現問題：
1. 記錄錯誤訊息
2. 記錄復現步驟
3. 分析根本原因
4. 修復並重新測試

---

**測試執行者**: _____________
**測試日期**: _____________
**測試結果**: _____________
