# YOLO Backend API - 開發路線圖

## 📅 當前版本: v0.3.1

**狀態**: ✅ 核心功能完成，系統穩定運行

---

## 🎯 短期目標 (v0.4.0) - 1-2 週

### 1. 代碼品質改進

#### 1.1 類型安全強化
- [ ] 啟用 `mypy` strict 模式
- [ ] 為所有函數添加完整的類型註解
- [ ] 修復現有的類型檢查警告

**範例**:
```python
from typing import AsyncIterator
from collections.abc import Sequence

async def stream_training_logs(
    job_id: str
) -> AsyncIterator[str]:
    """Stream training logs as they are generated."""
    ...
```

#### 1.2 代碼格式化
- [ ] 整合 `ruff` linter
- [ ] 設定統一的代碼風格
- [ ] 移除未使用的 imports

**配置** (`pyproject.toml`):
```toml
[tool.ruff]
line-length = 88
select = ["E", "F", "I", "N", "W", "UP"]
ignore = ["E501"]

[tool.mypy]
strict = true
warn_return_any = true
```

---

### 2. 架構改進

#### 2.1 依賴注入模式
**目前問題**: 全域 `training_manager` 實例

**改進方案**:
```python
from typing import Annotated
from fastapi import Depends

def get_training_manager() -> TrainingManager:
    return training_manager

@app.post("/api/training/start")
async def start_training(
    request: StartTrainingRequest,
    manager: Annotated[TrainingManager, Depends(get_training_manager)]
) -> StartTrainingResponse:
    ...
```

#### 2.2 配置管理
- [ ] 創建 `config.py` 統一管理配置
- [ ] 支援環境變數配置
- [ ] 區分開發/生產環境

**範例** (`config.py`):
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    training_dir: Path = Path("/tmp/yolo_training")
    max_concurrent_trainings: int = 3

    class Config:
        env_prefix = "YOLO_"
        env_file = ".env"

settings = Settings()
```

---

### 3. 錯誤處理增強

#### 3.1 自定義異常類
```python
class YOLOAPIException(Exception):
    """Base exception for YOLO API."""
    pass

class TrainingNotFoundError(YOLOAPIException):
    """Training job not found."""
    pass

class ModelNotReadyError(YOLOAPIException):
    """Model not ready for download."""
    pass
```

#### 3.2 全域錯誤處理器
```python
@app.exception_handler(TrainingNotFoundError)
async def training_not_found_handler(
    request: Request,
    exc: TrainingNotFoundError
) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"detail": str(exc)}
    )
```

---

### 4. 測試覆蓋率

#### 4.1 單元測試
- [ ] `training.py` 核心邏輯測試
- [ ] `models.py` Pydantic 模型驗證測試
- [ ] WebSocket 訊息處理測試

**範例**:
```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture
def mock_yolo_model():
    with patch('yolo_api.training.YOLO') as mock:
        mock_instance = AsyncMock()
        mock.return_value = mock_instance
        yield mock_instance

@pytest.mark.asyncio
async def test_training_start(mock_yolo_model):
    manager = TrainingManager()
    job_id = manager.start_training(config, dataset_b64)
    assert job_id is not None
```

#### 4.2 整合測試
- [ ] API 端點完整流程測試
- [ ] WebSocket 連接測試
- [ ] 檔案上傳/下載測試

---

## 🚀 中期目標 (v0.5.0) - 1 個月

### 1. 效能優化

#### 1.1 資料庫整合
**目前問題**: 訓練資料存在記憶體中

**改進方案**: 使用 SQLite/PostgreSQL
```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

class TrainingJob(Base):
    __tablename__ = "training_jobs"

    id = Column(String, primary_key=True)
    status = Column(String)
    config_json = Column(JSON)
    started_at = Column(DateTime)
    completed_at = Column(DateTime, nullable=True)
```

#### 1.2 任務佇列
- [ ] 整合 Celery 或 RQ
- [ ] 支援多個訓練任務排隊
- [ ] 限制同時運行的訓練數量

```python
from celery import Celery

celery_app = Celery('yolo_api', broker='redis://localhost:6379')

@celery_app.task
def run_training(job_id: str, config: dict, dataset_b64: str):
    """Background training task."""
    ...
```

---

### 2. 功能擴充

#### 2.1 模型推理 API
```python
@app.post("/api/inference/detect")
async def detect_objects(
    file: UploadFile,
    model_id: str
) -> DetectionResult:
    """Run object detection on uploaded image."""
    ...
```

#### 2.2 訓練中斷與恢復
- [ ] 支援暫停訓練
- [ ] 支援從 checkpoint 恢復訓練
- [ ] 訓練歷史記錄

#### 2.3 多使用者支援
- [ ] 使用者認證 (JWT)
- [ ] 訓練任務權限控制
- [ ] 資源配額管理

---

### 3. 監控與日誌

#### 3.1 結構化日誌
```python
import structlog

logger = structlog.get_logger()

@app.post("/api/training/start")
async def start_training(request: StartTrainingRequest):
    logger.info(
        "training_started",
        job_id=job_id,
        yolo_version=request.yolo_version,
        epochs=request.epochs
    )
```

#### 3.2 指標收集
- [ ] Prometheus metrics
- [ ] 訓練時間統計
- [ ] API 請求延遲監控

```python
from prometheus_client import Counter, Histogram

training_counter = Counter(
    'yolo_trainings_total',
    'Total number of trainings'
)

training_duration = Histogram(
    'yolo_training_duration_seconds',
    'Training duration'
)
```

---

## 🎨 長期目標 (v1.0.0) - 3 個月

### 1. 微服務架構

#### 1.1 服務拆分
```
yolo-api-gateway/       # API 閘道
yolo-training-service/  # 訓練服務
yolo-inference-service/ # 推理服務
yolo-storage-service/   # 檔案存儲服務
```

#### 1.2 訊息佇列
- RabbitMQ 或 Kafka
- 事件驅動架構
- 服務間異步通訊

---

### 2. 雲端部署

#### 2.1 容器化
```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY . .

RUN pip install --no-cache-dir -r requirements.txt

CMD ["uvicorn", "yolo_api.main:app", "--host", "0.0.0.0"]
```

#### 2.2 Kubernetes 部署
- Deployment 配置
- Service 配置
- HPA 自動擴展

---

### 3. 進階功能

#### 3.1 分散式訓練
- 多 GPU 訓練支援
- 分散式資料並行
- 模型並行

#### 3.2 AutoML
- 超參數自動調優
- 神經架構搜尋 (NAS)
- 訓練策略推薦

#### 3.3 模型版本控制
- 模型註冊表
- A/B 測試支援
- 模型回滾機制

---

## 📊 優先級矩陣

| 功能 | 優先級 | 難度 | 影響 |
|------|--------|------|------|
| 類型安全強化 | 🔴 High | 🟢 Low | 代碼品質 |
| 依賴注入 | 🔴 High | 🟡 Medium | 可測試性 |
| 單元測試 | 🔴 High | 🟡 Medium | 穩定性 |
| 錯誤處理 | 🟡 Medium | 🟢 Low | 使用者體驗 |
| 資料庫整合 | 🟡 Medium | 🟡 Medium | 擴展性 |
| 任務佇列 | 🟡 Medium | 🔴 High | 並發性 |
| 模型推理 API | 🟢 Low | 🟡 Medium | 功能完整性 |
| 微服務架構 | 🟢 Low | 🔴 High | 可擴展性 |

---

## 🛠️ 技術債務

### 目前已知問題

1. **全域狀態管理**
   - `training_manager` 為全域實例
   - 難以測試和替換

2. **錯誤處理不一致**
   - 部分使用 HTTPException
   - 部分直接返回錯誤字典

3. **缺少日誌**
   - 僅使用 print() 輸出
   - 無法追蹤生產環境問題

4. **配置硬編碼**
   - Port、路徑等寫死在代碼中
   - 無法靈活配置

---

## 📝 開發規範

### Git Commit 規範

```
feat: 添加模型推理 API
fix: 修復 WebSocket 重連問題
docs: 更新 API 文件
test: 添加訓練管理器單元測試
refactor: 重構錯誤處理邏輯
perf: 優化資料集載入速度
```

### Code Review 檢查清單

- [ ] 類型註解完整
- [ ] 有對應的測試
- [ ] 錯誤處理適當
- [ ] 文件字串完整
- [ ] 無安全漏洞
- [ ] 效能可接受

---

## 🎯 里程碑

### v0.4.0 - 代碼品質
**預計完成**: 2 週內
- ✅ 類型安全
- ✅ 單元測試
- ✅ 錯誤處理

### v0.5.0 - 擴展性
**預計完成**: 1 個月內
- ✅ 資料庫整合
- ✅ 任務佇列
- ✅ 模型推理

### v1.0.0 - 生產就緒
**預計完成**: 3 個月內
- ✅ 微服務架構
- ✅ 雲端部署
- ✅ 完整監控

---

## 📞 參與開發

歡迎貢獻！請參考：
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [開發環境設置](./README.md#開發)
- [API 文件](http://localhost:8000/docs)

---

**最後更新**: 2026-01-18
**維護者**: YOLO Platform Team
