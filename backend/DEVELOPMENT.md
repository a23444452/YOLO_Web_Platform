# YOLO Backend - 開發指南

> 後端 Python 開發最佳實踐和工作流程

---

## 📚 目錄

- [開發環境設置](#開發環境設置)
- [代碼規範](#代碼規範)
- [測試指南](#測試指南)
- [調試技巧](#調試技巧)
- [常見問題](#常見問題)

---

## 🛠️ 開發環境設置

### 1. 安裝依賴

```bash
# 進入後端資料夾
cd YOLO-Project/backend

# 確保虛擬環境啟動
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# 安裝開發依賴
pip install -r requirements-dev.txt

# 或使用 Make
make dev
```

### 2. 驗證安裝

```bash
# 檢查 Python 版本
python --version  # 應該是 3.12+

# 檢查工具
ruff --version
mypy --version
pytest --version
```

---

## 📝 代碼規範

### 類型註解

**必須**: 所有函數都需要類型註解

```python
from typing import TypeVar
from collections.abc import Sequence, Callable

# ✅ 好的範例
def process_items(items: Sequence[str]) -> list[str]:
    """Process a sequence of items."""
    return [item.upper() for item in items]

async def fetch_data(url: str) -> dict[str, Any]:
    """Fetch data from URL."""
    ...

# ❌ 不好的範例
def process_items(items):  # 缺少類型註解
    return [item.upper() for item in items]
```

### 文件字串

使用 Google 風格的 docstring：

```python
def train_model(
    config: TrainingConfig,
    dataset_path: Path
) -> TrainingResult:
    """Train YOLO model with given configuration.

    Args:
        config: Training configuration including epochs, batch size, etc.
        dataset_path: Path to YOLO format dataset directory.

    Returns:
        Training result containing metrics and model path.

    Raises:
        ValueError: If dataset_path doesn't exist.
        RuntimeError: If training fails.

    Example:
        >>> config = TrainingConfig(epochs=10)
        >>> result = train_model(config, Path("./dataset"))
        >>> print(result.map50)
        0.85
    """
    ...
```

### 命名規範

```python
# 變數和函數: snake_case
training_manager = TrainingManager()
def get_training_status(job_id: str) -> TrainingStatus:
    ...

# 類別: PascalCase
class TrainingManager:
    ...

# 常量: UPPER_SNAKE_CASE
MAX_CONCURRENT_TRAININGS = 3
DEFAULT_BATCH_SIZE = 16

# 私有成員: _leading_underscore
class Trainer:
    def __init__(self):
        self._internal_state = {}

    def _helper_method(self):
        ...
```

---

## 🧪 測試指南

### 測試結構

```
tests/
├── __init__.py
├── conftest.py           # pytest fixtures
├── test_training.py      # 訓練邏輯測試
├── test_api.py           # API 端點測試
└── test_models.py        # Pydantic 模型測試
```

### 撰寫測試

#### 單元測試範例

```python
# tests/test_training.py
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

from yolo_api.training import TrainingManager
from yolo_api.models import TrainingConfig

@pytest.fixture
def training_manager():
    """Create training manager instance."""
    return TrainingManager()

@pytest.fixture
def sample_config():
    """Create sample training config."""
    return TrainingConfig(
        name="test_training",
        yolo_version="v8",
        model_size="n",
        epochs=3,
        batch_size=16,
        image_size=640,
        device="cpu"
    )

def test_config_validation(sample_config):
    """Test training config validation."""
    assert sample_config.epochs > 0
    assert sample_config.batch_size > 0
    assert sample_config.yolo_version in ["v5", "v8", "v11"]

@patch('yolo_api.training.YOLO')
def test_training_start(mock_yolo, training_manager, sample_config):
    """Test training can be started."""
    mock_model = Mock()
    mock_yolo.return_value = mock_model

    job_id = training_manager.start_training(
        config=sample_config,
        dataset_zip_b64="fake_base64_data"
    )

    assert job_id is not None
    assert len(job_id) > 0
```

#### 異步測試範例

```python
# tests/test_api.py
import pytest
from httpx import AsyncClient
from yolo_api.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    """Test health check endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@pytest.mark.asyncio
async def test_start_training():
    """Test training start endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/training/start",
            json={
                "name": "test",
                "yolo_version": "v8",
                "model_size": "n",
                "epochs": 3,
                "dataset_zip_b64": "fake_data"
            }
        )

    assert response.status_code == 200
    assert "job_id" in response.json()
```

#### Fixtures 共用

```python
# tests/conftest.py
import pytest
from pathlib import Path
import tempfile

@pytest.fixture
def tmp_training_dir():
    """Create temporary training directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)

@pytest.fixture
async def async_client():
    """Create async HTTP client for testing."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
```

### 執行測試

```bash
# 執行所有測試
pytest

# 執行特定檔案
pytest tests/test_training.py

# 執行特定測試
pytest tests/test_training.py::test_config_validation

# 顯示詳細輸出
pytest -v

# 顯示 print 輸出
pytest -s

# 測試覆蓋率
pytest --cov=src/yolo_api --cov-report=html

# 使用 Make
make test
```

---

## 🔍 代碼檢查

### Ruff (Linter + Formatter)

```bash
# 檢查代碼問題
ruff check src/

# 自動修復
ruff check --fix src/

# 格式化代碼
ruff format src/

# 或使用 Make
make lint
make format
```

### Mypy (類型檢查)

```bash
# 檢查類型錯誤
mypy src/ --strict

# 檢查特定檔案
mypy src/yolo_api/training.py

# 或使用 Make
make type-check
```

### 一次執行所有檢查

```bash
make all
# 等同於: format + lint + type-check + test
```

---

## 🐛 調試技巧

### 使用 ipdb

```python
# 在需要調試的地方加入
import ipdb; ipdb.set_trace()

# 或使用 breakpoint() (Python 3.7+)
breakpoint()
```

### 日誌調試

```python
import logging

# 設定日誌級別
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# 使用日誌
logger.debug("Debug information")
logger.info("Training started")
logger.warning("Memory usage high")
logger.error("Training failed", exc_info=True)
```

### FastAPI 調試模式

```python
# main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "yolo_api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,      # 啟用自動重載
        log_level="debug" # 顯示詳細日誌
    )
```

---

## 🚀 開發工作流程

### 1. 功能開發

```bash
# 1. 創建功能分支
git checkout -b feature/add-model-inference

# 2. 開發並測試
# - 撰寫代碼
# - 添加測試
# - 執行 make all

# 3. 提交
git add .
git commit -m "feat: add model inference API"

# 4. 推送
git push origin feature/add-model-inference
```

### 2. Bug 修復

```bash
# 1. 創建修復分支
git checkout -b fix/websocket-reconnect

# 2. 重現 bug
# - 撰寫失敗的測試

# 3. 修復並驗證
# - 修復代碼
# - 確保測試通過

# 4. 提交
git commit -m "fix: resolve websocket reconnect issue"
```

### 3. 重構

```bash
# 1. 確保有測試覆蓋
pytest --cov

# 2. 重構代碼
# - 保持測試通過
# - 逐步重構

# 3. 驗證
make all

# 4. 提交
git commit -m "refactor: improve error handling"
```

---

## 📊 性能優化

### 異步最佳實踐

```python
# ✅ 好的範例: 並發執行
async def fetch_all_results(job_ids: list[str]) -> list[dict]:
    tasks = [fetch_result(job_id) for job_id in job_ids]
    return await asyncio.gather(*tasks)

# ❌ 不好的範例: 順序執行
async def fetch_all_results(job_ids: list[str]) -> list[dict]:
    results = []
    for job_id in job_ids:
        result = await fetch_result(job_id)  # 等待每個請求
        results.append(result)
    return results
```

### 資源管理

```python
# ✅ 使用 context manager
async with aiofiles.open('file.txt', 'r') as f:
    content = await f.read()

# ✅ 使用 try-finally
connection = await create_connection()
try:
    await connection.execute(query)
finally:
    await connection.close()
```

---

## ❓ 常見問題

### Q1: 如何處理長時間運行的任務？

**A**: 使用 ThreadPoolExecutor 或 Celery

```python
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=3)

@app.post("/api/training/start")
async def start_training(request: StartTrainingRequest):
    # 在背景執行緒運行訓練
    future = executor.submit(run_training, config, dataset)
    return {"job_id": job_id}
```

### Q2: 如何測試 WebSocket？

**A**: 使用 FastAPI 的 TestClient

```python
from fastapi.testclient import TestClient

def test_websocket():
    client = TestClient(app)
    with client.websocket_connect("/ws/training/123") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "status"
```

### Q3: 如何處理大檔案上傳？

**A**: 使用串流上傳

```python
@app.post("/upload")
async def upload_large_file(file: UploadFile):
    async with aiofiles.open(f"uploads/{file.filename}", "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            await f.write(chunk)
```

---

## 📚 推薦資源

### 文件

- [FastAPI 官方文件](https://fastapi.tiangolo.com/)
- [Pydantic 文件](https://docs.pydantic.dev/)
- [Pytest 文件](https://docs.pytest.org/)
- [Python typing 模組](https://docs.python.org/3/library/typing.html)

### 書籍

- *Fluent Python* by Luciano Ramalho
- *Effective Python* by Brett Slatkin
- *Python Testing with pytest* by Brian Okken

### 工具

- [mypy playground](https://mypy-play.net/)
- [ruff playground](https://play.ruff.rs/)

---

**最後更新**: 2026-01-18
**維護者**: Backend Team
