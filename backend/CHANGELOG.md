# YOLO Backend API - 更新日誌

## [0.8.1] - 2026-01-18

### 🔒 安全性修復

- ✅ **修復 Critical #1: ZIP 炸彈保護** (`src/yolo_api/training.py`)
  - 新增檔案數量限制 (MAX_FILES = 10,000)
  - 新增解壓縮大小限制 (MAX_EXTRACTED_SIZE = 500MB)
  - 新增路徑遍歷攻擊檢查（禁止 `..` 和絕對路徑）
  - 新增檔案名稱長度驗證 (MAX_FILENAME_LENGTH = 255)
  - 改進錯誤訊息，提供明確的安全違規說明
  - 方法：`_extract_dataset()` (第 64-148 行)

- ✅ **修復 Critical #2: Base64 影像驗證** (`src/yolo_api/inference.py`)
  - 新增 Base64 解碼驗證（使用 `validate=True`）
  - 新增影像大小限制檢查 (MAX_IMAGE_SIZE = 10MB)
  - 新增影像尺寸驗證 (MIN: 32x32, MAX: 4096x4096)
  - 新增影像格式驗證（使用 PIL Image.verify()）
  - 拋出 `InvalidImageError` 而非通用異常
  - 方法：`infer()` (第 115-265 行)

- ✅ **修復 Critical #4: 結構化日誌** (`src/yolo_api/training.py`)
  - 移除 callback 中的 `print()` 語句
  - 使用 `logger.error()` 記錄 callback 失敗
  - 包含完整的上下文資訊：job_id, message_type, callback 名稱
  - 添加 `exc_info=True` 記錄堆疊追蹤
  - 方法：`_notify()` (第 45-62 行)

### 🧪 新增安全性測試

新增 `tests/test_inference.py` 中的 3 個安全性測試：
- ✅ `test_infer_invalid_base64` - 測試無效 Base64 編碼處理
- ✅ `test_infer_image_too_small` - 測試小於最小尺寸的影像
- ✅ `test_infer_invalid_image_format` - 測試無效影像格式

### 📊 測試結果

```bash
$ pytest tests/test_inference.py -v
✅ 17 passed in 0.16s
✅ inference.py 覆蓋率: 87%

$ pytest tests/ -v
✅ All tests passing
```

### 🛡️ 安全性改進細節

**資料集提取安全限制**:
```python
MAX_EXTRACTED_SIZE = 500 * 1024 * 1024  # 500MB
MAX_FILES = 10000
MAX_FILENAME_LENGTH = 255
```

**影像驗證限制**:
```python
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_IMAGE_DIMENSION = 4096  # 4K pixels
MIN_IMAGE_DIMENSION = 32  # Minimum reasonable size
```

**防護措施**:
- 🛡️ ZIP 炸彈攻擊
- 🛡️ 路徑遍歷攻擊
- 🛡️ 記憶體耗盡攻擊
- 🛡️ 無效影像格式攻擊
- 🛡️ 過大檔案上傳

---

## [0.8.0] - 2026-01-18

### 🎯 完整推論系統

- ✅ **新增推論管理器** (`src/yolo_api/inference.py`)
  - `InferenceManager` 類別 - 管理模型載入和推論
  - `load_model(model_id)` - 載入訓練完成的模型
  - `unload_model(model_id)` - 卸載模型釋放記憶體
  - `infer(model_id, image, conf, iou)` - 執行物體偵測推論
  - `list_models()` - 列出所有可用模型
  - 自動從 `data.yaml` 讀取類別名稱
  - 全域實例 `inference_manager`

- ✅ **推論 API 端點**
  - `GET /api/inference/models` - 列出所有可用模型
  - `POST /api/inference/load/{model_id}` - 載入模型到記憶體
  - `POST /api/inference/unload/{model_id}` - 卸載模型
  - `POST /api/inference/predict` - 執行推論
  - 自動載入未載入的模型（懶載入）
  - Base64 影像編碼傳輸

- ✅ **推論資料模型** (更新 `src/yolo_api/models.py`)
  - `BoundingBox` - 邊界框座標
  - `Detection` - 單個偵測結果
  - `InferenceRequest` - 推論請求
  - `InferenceResponse` - 推論響應（含推論時間）
  - `ModelInfo` - 模型元資料
  - `ListModelsResponse` - 模型列表響應

- ✅ **推論異常處理** (更新 `src/yolo_api/exceptions.py`)
  - `ModelNotFoundError` - 模型不存在
  - `InferenceError` - 推論失敗
  - `InvalidImageError` - 無效影像
  - 整合到全域異常處理器

### 🧪 推論單元測試

新增 `tests/test_inference.py` - 14 個測試：
- ✅ InferenceManager 初始化測試
- ✅ 模型載入測試（成功/失敗）
- ✅ 模型卸載測試
- ✅ 推論測試（成功/模型未載入）
- ✅ 列出模型測試（空/有模型）
- ✅ API 端點測試（列出/載入/卸載/推論）
- ✅ 驗證錯誤測試

### 📊 更新結果

```bash
$ pytest tests/ -v
✅ 91 passed in 0.25s (新增 14 個推論測試)

$ pytest --cov
✅ Total coverage: 77% (從 74% 提升)
   - inference.py: 87%
   - exceptions.py: 94%
   - models.py: 100%
   - dependencies.py: 91%

$ make lint && make type-check
✅ All checks passed!
```

### 🏗️ 架構改進

**新增模組**:
- `src/yolo_api/inference.py` - 推論管理核心

**更新模組**:
- `src/yolo_api/models.py` - 新增 6 個推論相關模型
- `src/yolo_api/exceptions.py` - 新增 3 個推論異常
- `src/yolo_api/main.py` - 新增 3 個推論 API 端點

### ✨ 主要功能

1. **模型管理**
   - 動態載入/卸載模型
   - 快取已載入模型
   - 自動讀取模型元資料

2. **推論引擎**
   - 使用 Ultralytics YOLO 模型
   - 支援自訂信心度和 IOU 閾值
   - 回傳推論時間統計
   - Base64 影像編碼

3. **REST API**
   - RESTful 推論介面
   - 完整的錯誤處理
   - 結構化日誌記錄
   - OpenAPI 文件

### 🎯 推論流程

```
1. 訓練完成後，模型存放在 training/{job_id}/weights/best.pt
2. 前端調用 GET /api/inference/models 列出可用模型
3. 前端調用 POST /api/inference/predict 執行推論
4. 後端自動載入模型（如未載入）
5. 執行推論並回傳偵測結果
6. 結果包含：類別ID、類別名稱、信心度、邊界框座標
```

### 📝 API 使用範例

```bash
# 列出所有可用模型
curl http://localhost:8000/api/inference/models

# 執行推論
curl -X POST http://localhost:8000/api/inference/predict \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "abc-123-def",
    "image": "base64_encoded_image_data",
    "confidence": 0.25,
    "iou": 0.45
  }'
```

---

## [0.7.0] - 2026-01-18

### 💉 依賴注入系統

- ✅ **創建依賴注入模組** (`src/yolo_api/dependencies.py`)
  - `get_training_manager()` - TrainingManager 依賴
  - `get_logger()` - Logger 依賴
  - `TrainingManagerDep` - 類型別名
  - `LoggerDep` - Logger 類型別名

- ✅ **更新所有 API 端點**
  - 移除全域 `training_manager` 的直接使用
  - 所有端點使用依賴注入
  - WebSocket 端點手動獲取依賴
  - 改善日誌記錄（WebSocket 錯誤）

- ✅ **改善可測試性**
  - 支援依賴覆寫 (`app.dependency_overrides`)
  - 隔離測試環境
  - 可預測的測試行為
  - Mock 依賴更容易

### 🧪 依賴注入測試

新增 `tests/test_dependencies.py` - 6 個測試：
- ✅ 依賴函數測試
- ✅ 依賴覆寫測試
- ✅ 多端點共享依賴測試
- ✅ None 狀態覆寫測試
- ✅ 隔離測試示範
- ✅ 可預測行為示範

### 📊 更新結果

```bash
$ pytest tests/ -v
✅ 77 passed in 0.19s (新增 6 個依賴測試)

$ pytest --cov
✅ Total coverage: 74% (從 73% 提升)
   - dependencies.py: 92%
   - exceptions.py: 100%
   - logging_config.py: 100%
   - config.py: 100%
   - models.py: 100%

$ make lint && make type-check
✅ All checks passed!
✅ Success: no issues found in 8 source files
```

### 🎯 依賴注入優勢

**測試改善:**
```python
# 覆寫依賴進行測試
mock_manager = MagicMock(spec=TrainingManager)
app.dependency_overrides[get_training_manager] = lambda: mock_manager

# 現在所有端點都使用 mock
response = await client.get("/api/training/status/test")
mock_manager.get_status.assert_called_once()
```

**更好的架構:**
- 降低耦合度
- 提升可測試性
- 更容易維護
- 支援未來擴展

---

## [0.6.0] - 2026-01-18

### 📝 結構化日誌系統

- ✅ **整合 structlog** (`src/yolo_api/logging_config.py`)
  - 支援文字格式（開發環境，彩色輸出）
  - 支援 JSON 格式（生產環境）
  - 自動時間戳記（ISO 或可讀格式）
  - 堆疊資訊和異常格式化
  - Context variables 管理

- ✅ **請求追蹤中間件** (`main.py`)
  - 自動生成唯一 Request ID (UUID)
  - Request ID 添加到響應標頭 (`X-Request-ID`)
  - Request ID 綁定到 structlog context
  - 記錄請求開始和完成
  - 追蹤請求處理時間（毫秒）
  - 記錄客戶端 IP 地址

- ✅ **日誌整合到應用**
  - 伺服器啟動/關閉事件
  - API 異常（警告級別）
  - 驗證錯誤（警告級別）
  - 未預期異常（錯誤級別，含堆疊追蹤）
  - 請求/響應（資訊級別）

### 🧪 日誌測試

新增 `tests/test_logging.py` - 11 個測試：
- ✅ 日誌配置測試（文字/JSON 格式）
- ✅ Logger 方法測試
- ✅ Request ID 標頭驗證
- ✅ 請求日誌記錄
- ✅ 錯誤日誌記錄
- ✅ API 異常整合
- ✅ 驗證錯誤整合
- ✅ 成功請求記錄
- ✅ Context variables
- ✅ Request ID 唯一性

### 📊 更新結果

```bash
$ pytest tests/ -v
✅ 71 passed in 0.17s (新增 11 個日誌測試)

$ pytest --cov
✅ Total coverage: 73% (從 71% 提升)
   - logging_config.py: 100%
   - exceptions.py: 100%
   - config.py: 100%
   - models.py: 100%

$ make lint && make type-check
✅ All checks passed!
✅ Success: no issues found in 7 source files
```

### 📝 日誌格式範例

**文字格式（開發）:**
```
2026-01-18 10:30:45 [info] server_starting host=0.0.0.0 port=8000
2026-01-18 10:30:46 [info] request_started method=GET path=/health request_id=abc-123
2026-01-18 10:30:46 [warning] api_exception exception_type=TrainingNotFoundError
```

**JSON 格式（生產）:**
```json
{"event":"server_starting","host":"0.0.0.0","port":8000,"timestamp":"2026-01-18T10:30:45Z","level":"info"}
{"event":"request_started","method":"GET","path":"/health","request_id":"abc-123","timestamp":"2026-01-18T10:30:46Z"}
```

---

## [0.5.0] - 2026-01-18

### 🛡️ 改進錯誤處理系統

- ✅ **創建自定義異常類別** (`src/yolo_api/exceptions.py`)
  - `YOLOAPIException` - 基礎異常類別
  - `TrainingNotFoundError` - 訓練任務不存在
  - `ModelNotReadyError` - 模型未準備好下載
  - `ModelFileNotFoundError` - 模型檔案不存在
  - `TrainingStopError` - 無法停止訓練
  - `DatasetValidationError` - 資料集驗證失敗
  - `DatasetExtractionError` - 資料集提取失敗
  - `TrainingConfigError` - 訓練配置無效
  - `ResourceLimitError` - 資源限制超出

- ✅ **全域異常處理器** (`main.py`)
  - `YOLOAPIException` handler - 處理自定義異常
  - `RequestValidationError` handler - 處理請求驗證錯誤
  - `ValidationError` handler - 處理 Pydantic 驗證錯誤
  - `HTTPException` handler - 處理 FastAPI HTTP 異常
  - `Exception` handler - 處理未預期的異常

- ✅ **統一錯誤響應格式**
  ```json
  {
    "error": "ExceptionClassName",
    "message": "Human-readable error message",
    "status_code": 404,
    "path": "/api/endpoint"
  }
  ```

- ✅ **更新 API 端點**
  - 所有端點使用自定義異常
  - 添加詳細的異常文檔（docstring）
  - 移除 try-except 包裝（由全域處理器處理）

### 🧪 異常處理測試

新增 `tests/test_exceptions.py` - 15 個測試：
- ✅ 基礎異常類別測試
- ✅ 所有自定義異常訊息格式測試
- ✅ API 端點異常處理整合測試
- ✅ 驗證錯誤處理測試

### 📊 更新結果

```bash
$ pytest tests/ -v
✅ 60 passed in 0.12s (新增 15 個異常測試)

$ pytest --cov
✅ Total coverage: 71% (從 67% 提升)
   - exceptions.py: 100%
   - config.py: 100%
   - models.py: 100%
   - main.py: 56%
   - training.py: 54%

$ make lint && make type-check
✅ All checks passed!
✅ Success: no issues found in 6 source files
```

### 🔄 向後兼容

- ✅ 錯誤響應格式改變（`detail` → `message`）
- ✅ 更詳細的錯誤訊息
- ✅ 所有現有測試已更新並通過
- ✅ HTTP 狀態碼保持一致

---

## [0.4.0] - 2026-01-18

### ⚙️ 配置管理系統

- ✅ **創建 Settings 類別** (`src/yolo_api/config.py`)
  - 使用 pydantic-settings 進行配置管理
  - 支援環境變數覆蓋（`YOLO_` 前綴）
  - 支援 .env 檔案載入
  - 不區分大小寫的環境變數
  - 自動忽略額外欄位

- ✅ **配置項目分類**
  - **API 配置**: host, port, reload, debug, title, version
  - **訓練配置**: training_dir, max_concurrent_trainings, 預設參數
  - **CORS 配置**: origins, credentials, methods, headers
  - **日誌配置**: log_level, log_format
  - **模型配置**: model_cache_dir
  - **安全配置**: max_upload_size_mb
  - **性能配置**: worker_threads

- ✅ **整合到應用**
  - 更新 `main.py` 使用配置
  - 更新 `training.py` 使用配置
  - 創建 `.env.example` 範例檔案
  - 自動創建必要目錄

- ✅ **欄位驗證**
  - Port 範圍：1000-65535
  - 並發訓練：1-10
  - Batch size：1-128
  - Image size：320-1280
  - Device 類型：cpu/cuda/mps
  - Log level 類型：DEBUG/INFO/WARNING/ERROR/CRITICAL

### 🧪 配置測試

新增 `tests/test_config.py` - 11 個測試：
- ✅ 預設值測試
- ✅ 環境變數覆蓋
- ✅ 欄位驗證
- ✅ 路徑欄位處理
- ✅ 目錄自動創建
- ✅ Literal 類型驗證
- ✅ 列表欄位處理
- ✅ 環境變數前綴
- ✅ 不區分大小寫
- ✅ 忽略額外欄位

### 📊 更新結果

```bash
$ pytest tests/ -v
✅ 45 passed in 0.11s (新增 11 個配置測試)

$ pytest --cov
✅ Total coverage: 67% (從 63% 提升)
   - config.py: 100%
   - models.py: 100%
   - training.py: 54%
   - main.py: 50%

$ make lint && make type-check
✅ All checks passed!
✅ Success: no issues found in 5 source files
```

### 🔄 向後兼容

- ✅ 所有現有測試仍然通過
- ✅ API 行為保持不變
- ✅ 預設配置與之前一致
- ✅ 可選的環境變數配置

---

## [0.3.4] - 2026-01-18

### 🧪 添加基礎單元測試

- ✅ **創建測試結構**
  - `tests/conftest.py` - pytest 配置和共用 fixtures
  - `tests/test_training.py` - 訓練管理器測試（13 個測試）
  - `tests/test_api.py` - API 端點測試（8 個測試）
  - `tests/test_models.py` - Pydantic 模型測試（13 個測試）

- ✅ **核心功能測試**
  - TrainingManager 初始化和配置
  - Dataset 提取和驗證
  - data.yaml 生成和驗證
  - Callback 註冊和通知機制
  - 訓練狀態管理（get/stop/cleanup）
  - 錯誤處理和邊界情況

- ✅ **API 端點測試**
  - 健康檢查端點
  - 訓練任務列表
  - 狀態查詢（成功和失敗情況）
  - 停止和刪除訓練任務
  - 模型下載和結果查詢

- ✅ **模型驗證測試**
  - TrainingConfig 驗證（有效和無效輸入）
  - TrainingMetrics 創建
  - TrainingStatus JSON 序列化
  - WebSocket 訊息格式
  - AugmentationConfig 預設值

- ✅ **安裝測試依賴**
  - `pytest 9.0.2` - 測試框架
  - `pytest-asyncio 1.3.0` - 異步測試支援
  - `pytest-cov 7.0.0` - 測試覆蓋率
  - `pytest-mock 3.15.1` - Mock 支援

### 📊 測試結果

```bash
$ pytest tests/ -v
================================
34 passed in 0.10s
================================

$ pytest --cov
Name                       Stmts   Miss  Cover
----------------------------------------------
src/yolo_api/__init__.py       1      0   100%
src/yolo_api/main.py         101     50    50%
src/yolo_api/models.py        71      0   100%
src/yolo_api/training.py     144     66    54%
----------------------------------------------
TOTAL                        317    116    63%
```

**測試統計**:
- ✅ 34 個測試全部通過
- ✅ 測試覆蓋率: 63%
- ✅ models.py: 100% 覆蓋率
- ✅ 執行時間: < 1 秒

**測試類別**:
- TrainingManager: 13 個測試
- API 端點: 8 個測試
- Pydantic 模型: 13 個測試

---

## [0.3.3] - 2026-01-18

### 🏷️ 類型註解完善

- ✅ **為所有函數添加完整類型註解**
  - `training.py` - 所有方法和 callback 函數
  - `main.py` - 所有 API 端點和 WebSocket 處理函數
  - `models.py` - 完善泛型類型參數

- ✅ **改進類型安全**
  - 添加 `Callable` 完整簽名：`Callable[[dict[str, Any]], Awaitable[None]]`
  - 添加 `AsyncIterator` 類型註解給 lifespan
  - 所有 `dict` 都指定了鍵值類型
  - Callback 函數參數類型明確標註為 `Any`（來自 ultralytics）

- ✅ **安裝開發依賴**
  - `mypy 1.19.1` - 靜態類型檢查器
  - `types-PyYAML` - PyYAML 類型存根

### 📊 類型檢查結果

```bash
$ make type-check
✅ Success: no issues found in 4 source files

$ make lint
✅ All checks passed!
```

**新增類型註解**:
- `training.py`: 13 個函數/方法
- `main.py`: 10 個 API 端點
- `models.py`: 1 個模型類別

**總計**: 100% 函數都有完整類型註解 ✅

---

## [0.3.2] - 2026-01-18

### 🎨 代碼品質改進

- ✅ **整合 ruff linter**
  - 修復 4 個代碼品質問題
  - 移除未使用的導入（`Path`, `default_callbacks`）
  - 更新導入方式（`Callable` 從 `collections.abc` 導入）
  - 移除未使用的 `results` 變數賦值
  - 統一代碼格式化（88 字符行長）

- ✅ **更新 pyproject.toml 配置**
  - 修正 ruff 配置為新格式（`[tool.ruff.lint]`）
  - 符合 ruff 最新版本要求

- ✅ **更新 Makefile**
  - 修正 `lint` 和 `format` 指令（移除不存在的 tests/ 路徑）
  - 所有 make 指令正常運行

### 📊 代碼檢查結果

```bash
$ make lint
✅ All checks passed!
```

**修復的問題**:
1. `src/yolo_api/main.py:4` - 移除未使用的 `Path` 導入
2. `src/yolo_api/training.py:11` - `Callable` 改從 `collections.abc` 導入
3. `src/yolo_api/training.py:15` - 移除未使用的 `default_callbacks` 導入
4. `src/yolo_api/training.py:202` - 移除未使用的 `results` 變數

---

## [0.3.1] - 2026-01-18

### 🐛 重要修復

- ✅ **修復 WebSocket datetime 序列化問題**
  - WebSocket 發送狀態時 datetime 物件無法序列化
  - 修復：使用 `model_dump(mode='json')` 正確序列化
  - 影響：WebSocket 連接立即斷開的根本原因
  - 位置：`main.py:206, 222`

- ✅ **修復 YOLO11 模型命名問題**
  - 錯誤：生成 `yolov11m.pt` (檔案不存在)
  - 正確：應生成 `yolo11m.pt` (無 v 前綴)
  - 修復：移除版本號中的 'v' 前綴
  - 位置：`training.py:191-192`

### 📦 預下載模型

- ✅ YOLO11 系列模型已預下載
  - `yolo11n.pt` (5.4 MB)
  - `yolo11s.pt` (18.4 MB)
  - `yolo11m.pt` (38.8 MB)
  - `yolo11l.pt` (49.0 MB)

### 🎯 修復效果

**修復前** ❌:
- WebSocket 每 3 秒斷開重連
- 訓練因找不到模型檔案而失敗
- 前端無法接收訓練更新

**修復後** ✅:
- WebSocket 穩定連接直到訓練完成
- YOLO11 訓練正常執行
- 前端即時接收所有訓練指標

---

## [0.3.0] - 2026-01-18

### ✨ 新功能
- **模型下載 API** ⭐ NEW
  - `GET /api/training/{job_id}/download` - 下載訓練好的 best.pt 模型
  - 自動檢查訓練狀態，僅允許下載已完成的模型
  - 檔名格式：`yolo_{job_id}_best.pt`

- **訓練結果查詢 API** ⭐ NEW
  - `GET /api/training/{job_id}/results` - 獲取訓練結果摘要
  - 返回所有 epoch 的指標數據
  - 檢查結果圖表和混淆矩陣是否存在
  - 列出可用的模型檔案 (best.pt, last.pt)

- **訓練任務列表 API** ⭐ NEW
  - `GET /api/training/list` - 列出所有訓練任務
  - 顯示每個任務的狀態、進度、時間等資訊
  - 方便前端顯示訓練歷史

### 📡 新增 API 端點
```
GET  /api/training/{job_id}/download  - 下載模型
GET  /api/training/{job_id}/results   - 查詢訓練結果
GET  /api/training/list               - 列出所有任務
```

---

## [0.2.0] - 2026-01-18

### 🐛 Bug 修復
- **修復 dataset_id bug** (training.py:69)
  - 修正 `_create_data_yaml` 方法中讀取類別的邏輯
  - 現在正確從 classes.txt 檔案讀取類別名稱
  - 如果找不到 classes.txt 會拋出明確的錯誤訊息

### ✨ 新功能
- **即時訓練指標更新**
  - 整合 Ultralytics 回調系統
  - 每個 epoch 結束時自動推送指標更新
  - 支援的指標：train_loss, val_loss, mAP50, mAP50-95, precision, recall, learning_rate
  - 透過 WebSocket 即時推送給前端

- **非阻塞訓練執行**
  - 使用 ThreadPoolExecutor 在獨立執行緒中運行訓練
  - 避免阻塞 FastAPI event loop
  - 支援最多 2 個並發訓練任務
  - 訊息佇列機制確保執行緒間通訊安全

### 🔧 技術改進
- 添加 `_setup_callbacks` 方法設置訓練回調
- 添加 `_train_sync` 同步訓練函數
- 添加 `_process_pending_messages` 處理執行緒間訊息
- 改進錯誤處理和異常捕獲

### 📡 WebSocket 訊息類型
- `status` - 訓練狀態變更
- `metrics` - Epoch 指標更新
- `log` - 日誌訊息
- `error` - 錯誤訊息

---

## [0.1.0] - 2026-01-17

### ✨ 初始版本
- FastAPI 應用程式架構
- CORS 中間件配置
- 基本訓練 API 端點
  - `POST /api/training/start` - 啟動訓練
  - `GET /api/training/status/{job_id}` - 查詢狀態
  - `POST /api/training/stop/{job_id}` - 停止訓練
  - `DELETE /api/training/{job_id}` - 刪除任務
- WebSocket 即時通訊
  - `WS /ws/training/{job_id}` - 訓練更新
- Pydantic 模型定義
- Ultralytics YOLO 整合
- 資料集處理（ZIP 解壓縮、data.yaml 生成）

### 📦 技術棧
- FastAPI 0.109.0+
- Uvicorn (ASGI server)
- Pydantic 2.5.0+
- Ultralytics 8.1.0+
- Python 3.10+
