# 導出功能除錯指南

## 問題描述
導出時出現「導出失敗,請稍後重試」的錯誤訊息。

## 除錯步驟

### 1. 開啟瀏覽器開發者工具
- **Chrome/Edge**: 按 `F12` 或 `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox**: 按 `F12` 或 `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
- **Safari**: 先啟用開發選單 (偏好設定 → 進階 → 顯示開發選單),然後按 `Cmd+Option+I`

### 2. 切換到 Console 標籤
在開發者工具中找到「Console」或「控制台」標籤。

### 3. 重現問題
1. 上傳圖片
2. 繪製標註框
3. 點擊「導出」按鈕

### 4. 查看控制台輸出
現在導出功能會輸出詳細的日誌,例如:

```
[UI] 開始導出流程
[UI] 準備導出 1 張已標註圖片
[UI] 呼叫 exportAnnotations...
[Export] 開始導出,圖片數量: 1
[Export] 載入 JSZip...
[Export] JSZip 載入成功
[Export] 生成 classes.txt...
[Export] 生成圖片和標註...
[Export] 處理圖片: test.jpg
[Export] 圖片已添加: test.jpg
[Export] 標註已添加: test.txt, 1 個框體
[Export] 生成 data.yaml...
[Export] 生成 README.md...
[Export] 生成 ZIP 檔案...
[Export] ZIP 生成成功,大小: 123456 bytes
[UI] 成功獲得 Blob: 123456 bytes
[UI] 創建下載連結...
[UI] 下載完成
[UI] 導出流程結束
```

### 5. 找出錯誤位置
如果出現錯誤,會看到類似這樣的訊息:

```
[Export] 導出失敗: Error: 無法提取圖片數據: test.jpg
```

或

```
[UI] 導出錯誤: TypeError: Cannot read property 'split' of undefined
```

## 常見問題及解決方案

### 問題 1: 無法載入 JSZip
**錯誤訊息**: `Cannot find module 'jszip'`

**解決方案**:
```bash
cd /Users/vincewang/yolo-web-platform
npm install
npm run build
```

### 問題 2: 無法提取圖片數據
**錯誤訊息**: `無法提取圖片數據: xxx.jpg`

**可能原因**:
- 圖片的 dataUrl 格式不正確
- 圖片未正確載入

**解決方案**:
1. 重新上傳圖片
2. 確保圖片格式為 JPG, PNG 或 WEBP
3. 檢查圖片大小不超過 10MB

### 問題 3: ZIP 生成失敗
**錯誤訊息**: `Failed to generate ZIP`

**可能原因**:
- 圖片過大導致記憶體不足
- 瀏覽器版本過舊

**解決方案**:
1. 減少一次導出的圖片數量
2. 使用較小尺寸的圖片
3. 更新瀏覽器到最新版本
4. 嘗試使用 Chrome 瀏覽器

### 問題 4: 下載被阻擋
**錯誤訊息**: 無錯誤訊息,但沒有下載

**可能原因**:
- 瀏覽器阻擋了下載
- 彈出視窗被阻擋

**解決方案**:
1. 檢查瀏覽器的下載設定
2. 允許網站下載多個檔案
3. 檢查瀏覽器右上角是否有下載被阻擋的提示

## 回報問題

如果問題仍然存在,請提供以下資訊:

1. **瀏覽器資訊**:
   - 瀏覽器名稱和版本
   - 作業系統

2. **控制台完整輸出**:
   - 複製所有 `[UI]` 和 `[Export]` 開頭的日誌
   - 複製所有錯誤訊息(紅色文字)

3. **操作步驟**:
   - 上傳了幾張圖片
   - 圖片格式和大小
   - 繪製了幾個標註框
   - 使用了哪些類別

4. **截圖**:
   - 控制台截圖
   - 錯誤訊息截圖

## 臨時解決方案

如果導出功能暫時無法使用,可以考慮:

1. **手動保存標註數據**:
   - 開啟瀏覽器控制台
   - 執行以下命令查看標註數據:
   ```javascript
   console.log(JSON.stringify(
     window.__ANNOTATION_STORE__?.getState?.() || {},
     null,
     2
   ));
   ```

2. **減少圖片數量**:
   - 一次只導出 1-2 張圖片
   - 分批導出

3. **嘗試不同的瀏覽器**:
   - Chrome (推薦)
   - Firefox
   - Edge

## 測試最小案例

嘗試以下最小測試案例:

1. 只上傳 **1 張小圖片** (< 1MB)
2. 只繪製 **1 個標註框**
3. 使用預設類別 "person"
4. 點擊導出

如果最小案例能成功,問題可能與:
- 圖片數量過多
- 圖片檔案過大
- 記憶體不足

有關。

---

**更新日期**: 2026-01-17
**版本**: 1.0.0 (已添加詳細日誌)
