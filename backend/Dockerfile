FROM python:3.12-slim

# 安裝系統依賴（OpenCV 需要）
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1-mesa-glx \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 設定工作目錄
WORKDIR /app

# 複製依賴檔案
COPY pyproject.toml ./

# 安裝 Python 依賴
RUN pip install --no-cache-dir -e .

# 複製原始碼
COPY src/ ./src/

# 創建必要目錄
RUN mkdir -p /app/data/training /app/data/models /app/weights /app/logs

# 暴露端口
EXPOSE 8000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 啟動命令
CMD ["python", "-m", "uvicorn", "yolo_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
