# 🚀 YOLO Backend - 後續開發進度指南

> 給開發者的快速上手指南

---

## 📋 當前狀態

### ✅ 已完成功能

- **核心訓練功能**
  - YOLO v5/v8/v11 支援
  - WebSocket 即時更新
  - 自動重連機制
  - 心跳維持連接

- **API 端點**
  - 啟動/停止訓練
  - 查詢訓練狀態
  - 下載訓練模型
  - 查詢訓練結果

- **穩定性**
  - WebSocket datetime 序列化修復
  - YOLO11 模型命名修復
  - Metrics 格式轉換

**版本**: v0.3.1 ✅ 生產可用

---

## 🎯 立即開始 (5 分鐘)

### 1. 安裝開發工具

```bash
cd YOLO-Project/backend
source venv/bin/activate
pip install -r requirements-dev.txt
```

### 2. 執行檢查

```bash
# 方式 1: 使用 Make (推薦)
make lint        # 代碼檢查
make type-check  # 類型檢查
make test        # 執行測試

# 方式 2: 直接執行
ruff check src/
mypy src/ --strict
pytest tests/
```

### 3. 開始第一個任務

從 **高優先級任務** 開始 → 參考 [`TODO.md`](./TODO.md)

---

## 📚 重要文件導覽

### 📖 規劃文件

| 文件 | 說明 | 優先級 |
|------|------|--------|
| [`ROADMAP.md`](./ROADMAP.md) | 完整開發路線圖 (短/中/長期) | ⭐⭐⭐ |
| [`TODO.md`](./TODO.md) | 具體待辦任務清單 | ⭐⭐⭐⭐⭐ |
| [`DEVELOPMENT.md`](./DEVELOPMENT.md) | 開發指南和最佳實踐 | ⭐⭐⭐⭐ |
| [`CHANGELOG.md`](./CHANGELOG.md) | 版本更新記錄 | ⭐⭐ |

### 🛠️ 技術文件

| 文件 | 說明 |
|------|------|
| `Makefile` | 常用指令快捷方式 |
| `pyproject.toml` | 專案配置和工具設定 |
| `requirements-dev.txt` | 開發依賴清單 |

---

## 🔥 推薦優先級

### 本週內 (高優先級)

**預計時間**: 5.5 小時

1. **整合 ruff linter** (30 分鐘)
   - 立即改善代碼品質
   - 自動修復簡單問題
   - 參考: [`TODO.md #2`](./TODO.md#2-整合-ruff-linter)

2. **添加類型註解** (2 小時)
   - 提升代碼可維護性
   - 幫助 IDE 自動完成
   - 參考: [`TODO.md #1`](./TODO.md#1-添加類型註解)

3. **添加基礎單元測試** (3 小時)
   - 確保代碼正確性
   - 防止回歸錯誤
   - 參考: [`TODO.md #3`](./TODO.md#3-添加基礎單元測試)

### 本月內 (中優先級)

**預計時間**: 9 小時

4. **實作配置管理** (2 小時)
   - 環境變數支援
   - 開發/生產環境區分

5. **改進錯誤處理** (3 小時)
   - 統一錯誤響應格式
   - 自定義異常類別

6. **添加結構化日誌** (2 小時)
   - 易於除錯和監控
   - JSON 格式日誌

7. **實作依賴注入** (2 小時)
   - 提升可測試性
   - 移除全域變數

---

## 💡 快速參考

### 常用指令

```bash
# 啟動開發伺服器
make run
# 或
python -m yolo_api.main

# 執行所有檢查
make all

# 格式化代碼
make format

# 清理臨時檔案
make clean

# 查看可用指令
make help
```

### 開發流程

```bash
# 1. 創建分支
git checkout -b feature/my-feature

# 2. 開發
# - 撰寫代碼
# - 添加測試
# - 執行檢查

# 3. 提交
git add .
git commit -m "feat: add my feature"

# 4. 推送
git push origin feature/my-feature
```

### 測試指令

```bash
# 快速測試
pytest

# 詳細輸出
pytest -v

# 測試覆蓋率
pytest --cov

# 特定測試
pytest tests/test_training.py::test_config_validation
```

---

## 📊 進度追蹤

### 目標設定

- [ ] 第 1 週: 完成代碼品質改進 (任務 1-3)
- [ ] 第 2-3 週: 完成架構改進 (任務 4-7)
- [ ] 第 4 週: 開始中期目標 (資料庫整合)

### 檢查點

**每完成一個任務後**:
1. 執行 `make all` 確保所有檢查通過
2. 更新 `TODO.md` 中的進度
3. 提交代碼到 Git
4. 更新 `CHANGELOG.md`

---

## 🎓 學習資源

### 推薦閱讀順序

1. **先讀**: `DEVELOPMENT.md` - 了解開發規範
2. **再讀**: `TODO.md` - 知道要做什麼
3. **參考**: `ROADMAP.md` - 了解整體方向

### 技術學習

如果您對以下內容不熟悉，建議先學習：

- **FastAPI**: [官方教學](https://fastapi.tiangolo.com/tutorial/)
- **Pytest**: [入門指南](https://docs.pytest.org/en/stable/getting-started.html)
- **Type Hints**: [Python typing](https://docs.python.org/3/library/typing.html)
- **Async Python**: [asyncio 文件](https://docs.python.org/3/library/asyncio.html)

---

## ⚡ 快速決策指南

### 我應該先做什麼？

**如果您有...**

- **30 分鐘**: → 整合 ruff linter (任務 #2)
- **2 小時**: → 添加類型註解 (任務 #1)
- **3 小時**: → 添加單元測試 (任務 #3)
- **一天**: → 完成所有高優先級任務
- **一週**: → 完成代碼品質 + 部分架構改進

### 遇到問題怎麼辦？

1. **檢查文件**: `DEVELOPMENT.md` 的常見問題章節
2. **查看範例**: 文件中有完整的代碼範例
3. **執行測試**: `pytest -v` 看看哪裡出錯
4. **查看日誌**: 檢查錯誤訊息

---

## 🎯 成功標準

### 任務完成檢查清單

每個任務完成後確認：

- [ ] `make lint` 通過 (無 linting 錯誤)
- [ ] `make type-check` 通過 (無類型錯誤)
- [ ] `make test` 通過 (所有測試成功)
- [ ] 代碼有適當的註解和文件字串
- [ ] `CHANGELOG.md` 已更新

### 程式碼品質指標

目標值：
- **測試覆蓋率**: > 80%
- **類型檢查**: 100% (strict mode)
- **Linting**: 0 errors

---

## 📞 需要幫助？

### 資源

- **API 文件**: http://localhost:8000/docs (啟動後端後訪問)
- **專案文件**: 查看 `docs/` 資料夾
- **問題回報**: 創建 GitHub Issue

### 聯絡

- **技術問題**: 查看 `DEVELOPMENT.md`
- **功能建議**: 參考 `ROADMAP.md`

---

## 🎉 開始吧！

**推薦入門路徑**:

```bash
# 1. 安裝工具
make dev

# 2. 執行檢查 (了解現狀)
make all

# 3. 查看待辦任務
cat TODO.md

# 4. 開始第一個任務
# 建議從「整合 ruff linter」開始
```

**祝開發順利！** 🚀

---

**文件版本**: v1.0
**最後更新**: 2026-01-18
**適用版本**: Backend v0.3.1+
