# YOLO Web 平台技術設計文件

**版本：** 1.0
**日期：** 2026-01-16
**作者：** Claude Code + Vince Wang

---

## 目錄

1. [專案概述](#1-專案概述)
2. [系統架構](#2-系統架構)
3. [功能模組設計](#3-功能模組設計)
4. [技術選型](#4-技術選型)
5. [數據流程](#5-數據流程)
6. [UI/UX 設計規範](#6-uiux-設計規範)
7. [實施階段計劃](#7-實施階段計劃)
8. [風險評估與解決方案](#8-風險評估與解決方案)

---

## 1. 專案概述

### 1.1 專案目標

開發一個 **基於 Web 的 YOLO 無代碼訓練平台**，讓使用者無需安裝 Python 環境，即可在瀏覽器中完成：
- 圖像標註
- 資料集管理
- 模型訓練配置
- 模型推論測試

### 1.2 核心價值

- ✅ **零安裝門檻**：瀏覽器即開即用
- ✅ **直覺式操作**：拖放、點擊完成所有操作
- ✅ **完整工作流**：從標註到推論的一站式體驗
- ✅ **跨平台支援**：Windows、macOS、Linux 通用
- ✅ **即時反饋**：視覺化展示所有操作結果

### 1.3 目標使用者

- 🎓 機器學習初學者
- 🔬 研究人員（需要快速驗證想法）
- 🏭 工業應用人員（無程式背景）
- 👨‍🏫 教育工作者（教學演示）

---

## 2. 系統架構

### 2.1 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                      使用者瀏覽器                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React 18 前端應用                          │  │
│  │                                                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│  │
│  │  │圖像標註  │  │資料集    │  │訓練配置  │  │推論測試││  │
│  │  │模組      │  │管理模組  │  │模組      │  │模組    ││  │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘│  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         狀態管理層 (Zustand)                     │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         本地存儲層 (IndexedDB)                   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (階段二：可選)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      後端 API 服務層                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              FastAPI 後端服務                           │  │
│  │                                                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│  │
│  │  │模型訓練  │  │資料處理  │  │推論服務  │  │任務管理││  │
│  │  │引擎      │  │引擎      │  │引擎      │  │系統    ││  │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘│  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │      Ultralytics YOLO (v5/v8/v11)              │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              數據存儲層                                  │  │
│  │  • 檔案系統 (訓練數據、模型檔案)                         │  │
│  │  • Redis (任務隊列)                                     │  │
│  │  • PostgreSQL (用戶數據、訓練記錄)                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 架構決策

#### 階段一：純前端方案（推薦優先實施）

**優勢：**
- ⚡ 部署簡單：靜態網頁託管即可
- 💰 成本低：無需後端伺服器
- 🚀 快速啟動：立即可用
- 🔒 隱私保護：數據不離開瀏覽器

**實現功能：**
- ✅ 完整的圖像標註功能
- ✅ 資料集管理與預覽
- ✅ 訓練配置界面
- ✅ 使用 ONNX.js 進行瀏覽器端推論
- ⚠️ 訓練功能為模擬展示（生成假數據）

**數據存儲：**
- IndexedDB：存儲圖像、標註、配置
- LocalStorage：存儲用戶偏好設定

#### 階段二：混合方案（可選擴展）

**新增功能：**
- ✅ 真實的模型訓練
- ✅ GPU 加速推論
- ✅ 多用戶協作
- ✅ 訓練任務管理
- ✅ 雲端模型存儲

---

## 3. 功能模組設計

### 3.1 圖像標註模組 (Image Labeling)

#### 功能需求

**FR-LAB-001: 圖片上傳**
- 支援拖放上傳
- 支援多檔案選擇
- 支援格式：JPG, PNG, WEBP
- 最大單檔 10MB
- 顯示上傳進度

**FR-LAB-002: 標註工具**
- 矩形框繪製（點擊 + 拖曳）
- 框體選擇與編輯
- 框體大小調整（8 個控制點）
- 框體移動
- 框體刪除（Delete 鍵）
- 框體複製（Ctrl+C / Cmd+C）

**FR-LAB-003: 類別管理**
- 新增類別（彈出對話框）
- 刪除類別（含確認提示）
- 編輯類別名稱
- 類別顏色指定（16 色調色板）
- 快捷鍵切換類別（1-9 數字鍵）

**FR-LAB-004: 導航與預覽**
- 圖片列表側邊欄
- 上一張 / 下一張切換（鍵盤箭頭）
- 縮略圖預覽
- 標註進度顯示（已標註 / 總數）

**FR-LAB-005: 數據導出**
- YOLO 格式標註檔（.txt）
- 批量下載為 .zip
- 包含 classes.txt

#### UI 組件設計

```tsx
<AnnotationWorkspace>
  <Sidebar>
    <ImageList images={images} />
    <ClassManager classes={classes} />
  </Sidebar>

  <MainCanvas>
    <CanvasToolbar>
      <ZoomControls />
      <UndoRedoButtons />
      <DeleteButton />
    </CanvasToolbar>

    <ImageCanvas
      image={currentImage}
      annotations={annotations}
      onDrawBox={handleDrawBox}
      onSelectBox={handleSelectBox}
      onMoveBox={handleMoveBox}
      onResizeBox={handleResizeBox}
    />

    <StatusBar>
      <ImageInfo />
      <AnnotationCount />
      <KeyboardShortcuts />
    </StatusBar>
  </MainCanvas>

  <PropertiesPanel>
    <SelectedBoxInfo />
    <ClassSelector />
  </PropertiesPanel>
</AnnotationWorkspace>
```

#### 數據結構

```typescript
interface BoundingBox {
  id: string;
  classId: number;
  className: string;
  x: number;        // 中心點 x (0-1 歸一化)
  y: number;        // 中心點 y (0-1 歸一化)
  width: number;    // 寬度 (0-1 歸一化)
  height: number;   // 高度 (0-1 歸一化)
  color: string;
}

interface ImageAnnotation {
  id: string;
  filename: string;
  width: number;
  height: number;
  dataUrl: string;
  boxes: BoundingBox[];
  createdAt: Date;
  updatedAt: Date;
}

interface ClassDefinition {
  id: number;
  name: string;
  color: string;
  count: number;    // 該類別的標註數量
}
```

---

### 3.2 資料集管理模組 (Dataset Manager)

#### 功能需求

**FR-DS-001: 資料集創建**
- 輸入資料集名稱
- 設定訓練 / 驗證分割比例（預設 80/20）
- 自動隨機打亂分配
- 生成資料集摘要

**FR-DS-002: 資料集預覽**
- 顯示統計資訊：
  - 總圖片數
  - 訓練集 / 驗證集數量
  - 各類別分布（長條圖）
  - 邊界框數量統計
- 樣本圖片預覽（網格展示）

**FR-DS-003: 資料集管理**
- 列出所有資料集
- 刪除資料集
- 複製資料集
- 重新分割比例

**FR-DS-004: 資料集導出**
- YOLO 標準格式
- 包含目錄結構：
  ```
  dataset_name/
  ├── images/
  │   ├── train/
  │   └── val/
  ├── labels/
  │   ├── train/
  │   └── val/
  ├── data.yaml
  └── classes.txt
  ```
- 打包為 .zip 下載

#### UI 組件設計

```tsx
<DatasetManager>
  <DatasetList>
    {datasets.map(ds => (
      <DatasetCard
        name={ds.name}
        imageCount={ds.imageCount}
        trainRatio={ds.trainRatio}
        createdAt={ds.createdAt}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExport={handleExport}
      />
    ))}
  </DatasetList>

  <CreateDatasetDialog>
    <Input label="資料集名稱" />
    <Slider label="訓練集比例" min={50} max={95} />
    <ImageSelector source="annotation" />
    <Button onClick={handleCreate}>創建資料集</Button>
  </CreateDatasetDialog>

  <DatasetStatistics>
    <StatCard label="總圖片數" value={totalImages} />
    <StatCard label="訓練集" value={trainCount} />
    <StatCard label="驗證集" value={valCount} />
    <ClassDistributionChart data={classStats} />
  </DatasetStatistics>
</DatasetManager>
```

---

### 3.3 訓練配置模組 (Training Configuration)

#### 功能需求

**FR-TRAIN-001: 基本配置**
- 專案名稱輸入
- YOLO 版本選擇（v5 / v8 / v11）
- 預訓練權重選擇（n / s / m / l / x）
- 資料集選擇（下拉選單）

**FR-TRAIN-002: 訓練參數**
- Epochs（範圍：10-500，預設 100）
- Batch Size（2 / 4 / 8 / 16 / 32，預設 16）
- Image Size（320 / 416 / 640 / 1280，預設 640）
- Device（CPU / GPU，自動偵測）
- Workers（1-8，預設 4）

**FR-TRAIN-003: 進階設置**
- Optimizer（Adam / SGD / AdamW）
- Learning Rate（0.0001 - 0.1，預設 0.01）
- Momentum（0.8 - 0.99，預設 0.937）
- Weight Decay（0 - 0.001，預設 0.0005）
- Early Stopping Patience（5-50，預設 50）

**FR-TRAIN-004: 數據增強**
- HSV 調整（色調、飽和度、亮度）
- 旋轉角度（0-45 度）
- 平移比例（0-0.5）
- 縮放比例（0-1）
- 翻轉（水平、垂直）
- Mosaic 增強（啟用 / 停用）
- Mixup 增強（啟用 / 停用）

**FR-TRAIN-005: 配置管理**
- 保存配置為模板
- 載入配置模板
- 配置驗證（顯示錯誤提示）
- 生成 data.yaml 預覽

**FR-TRAIN-006: 訓練提交（階段一：模擬）**
- 顯示訓練配置摘要
- 模擬訓練進度（進度條 + 假日誌）
- 生成模擬訓練結果（假曲線圖）
- 提示："這是模擬訓練，實際訓練需要後端支援"

#### UI 組件設計

```tsx
<TrainingConfig>
  <TabNavigation>
    <Tab>基本配置</Tab>
    <Tab>訓練參數</Tab>
    <Tab>數據增強</Tab>
    <Tab>進階設置</Tab>
  </TabNavigation>

  <TabPanel value="basic">
    <Input label="專案名稱" />
    <Select label="YOLO 版本" options={['v5', 'v8', 'v11']} />
    <Select label="模型大小" options={['n', 's', 'm', 'l', 'x']} />
    <Select label="資料集" options={datasets} />
  </TabPanel>

  <TabPanel value="params">
    <Slider label="Epochs" min={10} max={500} />
    <Select label="Batch Size" options={[2, 4, 8, 16, 32]} />
    <Select label="Image Size" options={[320, 416, 640, 1280]} />
  </TabPanel>

  <TabPanel value="augmentation">
    <Checkbox label="Mosaic" />
    <Checkbox label="Mixup" />
    <Slider label="旋轉角度" min={0} max={45} />
    <Slider label="HSV 色調" min={0} max={0.1} step={0.01} />
  </TabPanel>

  <ConfigActions>
    <Button variant="outline" onClick={handleSaveTemplate}>
      保存模板
    </Button>
    <Button variant="default" onClick={handleStartTraining}>
      開始訓練
    </Button>
  </ConfigActions>
</TrainingConfig>
```

---

### 3.4 推論測試模組 (Inference Testing)

#### 功能需求

**FR-INF-001: 模型管理**
- 上傳 .onnx 模型檔案
- 模型列表展示
- 模型資訊顯示（輸入尺寸、類別數）
- 刪除模型

**FR-INF-002: 單張推論**
- 上傳測試圖片
- 選擇模型
- 調整信心度閾值（0.01-0.99）
- 調整 IOU 閾值（0.1-0.9）
- 執行推論

**FR-INF-003: 批量推論**
- 上傳多張圖片
- 批量處理（顯示進度）
- 結果匯總統計

**FR-INF-004: 結果展示**
- Canvas 繪製偵測框
- 顯示類別標籤 + 信心度
- 結果列表（表格形式）
- 偵測框座標資訊
- 下載標註結果

**FR-INF-005: ONNX.js 整合**
- 在瀏覽器端載入 ONNX 模型
- WebGL 後端加速
- 圖片預處理（resize、normalize）
- 後處理（NMS 非極大值抑制）

#### UI 組件設計

```tsx
<InferenceWorkspace>
  <ModelSelector>
    <Select label="選擇模型" options={models} />
    <Button onClick={handleUploadModel}>上傳 ONNX 模型</Button>
  </ModelSelector>

  <InferenceSettings>
    <Slider label="信心度閾值" min={0.01} max={0.99} step={0.01} />
    <Slider label="IOU 閾值" min={0.1} max={0.9} step={0.05} />
  </InferenceSettings>

  <ImageUploadZone>
    <p>拖放圖片或點擊上傳</p>
    <input type="file" accept="image/*" multiple />
  </ImageUploadZone>

  <ResultDisplay>
    <Canvas image={testImage} detections={detections} />

    <ResultTable>
      {detections.map(det => (
        <ResultRow
          className={det.class}
          confidence={det.confidence}
          bbox={det.bbox}
        />
      ))}
    </ResultTable>
  </ResultDisplay>

  <Actions>
    <Button onClick={handleRunInference}>執行推論</Button>
    <Button onClick={handleDownloadResults}>下載結果</Button>
  </Actions>
</InferenceWorkspace>
```

#### ONNX.js 整合流程

```typescript
// 1. 載入模型
const session = await ort.InferenceSession.create(modelPath, {
  executionProviders: ['webgl', 'wasm']
});

// 2. 圖片預處理
function preprocessImage(imageData: ImageData, inputSize: number) {
  // Resize to model input size
  const resized = resizeImage(imageData, inputSize, inputSize);

  // Normalize to [0, 1]
  const normalized = new Float32Array(3 * inputSize * inputSize);
  for (let i = 0; i < resized.data.length; i += 4) {
    const idx = i / 4;
    normalized[idx] = resized.data[i] / 255.0;                    // R
    normalized[idx + inputSize * inputSize] = resized.data[i + 1] / 255.0;     // G
    normalized[idx + inputSize * inputSize * 2] = resized.data[i + 2] / 255.0; // B
  }

  return new ort.Tensor('float32', normalized, [1, 3, inputSize, inputSize]);
}

// 3. 執行推論
const feeds = { images: inputTensor };
const results = await session.run(feeds);
const output = results.output0.data;

// 4. 後處理 (NMS)
const detections = postprocess(output, confThreshold, iouThreshold);
```

---

### 3.5 訓練監控模組 (Training Monitor)

#### 功能需求（階段一：模擬展示）

**FR-MON-001: 訓練進度**
- 當前 Epoch / 總 Epochs
- 進度條（百分比）
- 預估剩餘時間
- 已用時間

**FR-MON-002: 即時指標**
- 訓練損失（Loss）
- 驗證損失（Val Loss）
- mAP50
- mAP50-95
- 精確率（Precision）
- 召回率（Recall）

**FR-MON-003: 可視化圖表**
- 損失曲線（訓練 vs 驗證）
- mAP 曲線
- 學習率曲線
- 圖表支援縮放、平移

**FR-MON-004: 訓練日誌**
- 滾動日誌視窗
- 自動捲動到最新
- 日誌級別過濾（INFO / WARNING / ERROR）
- 導出日誌

**FR-MON-005: 訓練控制**
- 暫停訓練（階段二）
- 繼續訓練（階段二）
- 停止訓練
- 保存檢查點（階段二）

#### UI 組件設計

```tsx
<TrainingMonitor>
  <TrainingHeader>
    <ProjectName>{projectName}</ProjectName>
    <StatusBadge status={status} />
    <TimeInfo elapsed={elapsed} remaining={remaining} />
  </TrainingHeader>

  <ProgressSection>
    <ProgressBar value={progress} max={100} />
    <EpochInfo>Epoch {currentEpoch} / {totalEpochs}</EpochInfo>
  </ProgressSection>

  <MetricsGrid>
    <MetricCard label="Train Loss" value={trainLoss} />
    <MetricCard label="Val Loss" value={valLoss} />
    <MetricCard label="mAP50" value={map50} />
    <MetricCard label="mAP50-95" value={map5095} />
  </MetricsGrid>

  <ChartsSection>
    <LineChart
      title="Loss Curves"
      data={lossData}
      series={['Train Loss', 'Val Loss']}
    />
    <LineChart
      title="mAP Curves"
      data={mapData}
      series={['mAP50', 'mAP50-95']}
    />
  </ChartsSection>

  <LogViewer>
    <LogHeader>
      <h3>Training Logs</h3>
      <Button onClick={handleExportLogs}>導出</Button>
    </LogHeader>
    <LogContent>
      {logs.map(log => (
        <LogLine level={log.level} timestamp={log.time}>
          {log.message}
        </LogLine>
      ))}
    </LogContent>
  </LogViewer>

  <ControlButtons>
    <Button variant="destructive" onClick={handleStop}>
      停止訓練
    </Button>
  </ControlButtons>
</TrainingMonitor>
```

#### 模擬訓練數據生成

```typescript
// 生成逼真的模擬訓練數據
function generateMockTrainingData(epoch: number, totalEpochs: number) {
  const progress = epoch / totalEpochs;

  // 損失函數：指數衰減 + 隨機波動
  const trainLoss = 5.0 * Math.exp(-3 * progress) + Math.random() * 0.5;
  const valLoss = trainLoss * (1.1 + Math.random() * 0.2);

  // mAP：對數增長 + 隨機波動
  const map50 = Math.min(0.95, 0.3 + 0.65 * Math.log(1 + 9 * progress) + Math.random() * 0.05);
  const map5095 = map50 * (0.7 + Math.random() * 0.1);

  // 學習率：Cosine Annealing
  const lr = 0.01 * (1 + Math.cos(Math.PI * progress)) / 2;

  return {
    epoch,
    trainLoss,
    valLoss,
    map50,
    map5095,
    precision: map50 * 0.9,
    recall: map50 * 0.85,
    lr
  };
}
```

---

## 4. 技術選型

### 4.1 前端技術棧

| 技術 | 版本 | 用途 | 理由 |
|------|------|------|------|
| **React** | 18.x | UI 框架 | 組件化開發、生態系統完善 |
| **TypeScript** | 5.x | 類型系統 | 類型安全、開發體驗佳 |
| **Vite** | 5.x | 建構工具 | 快速開發、模組化 |
| **Tailwind CSS** | 3.4.x | 樣式框架 | 快速開發、一致性設計 |
| **shadcn/ui** | Latest | UI 組件庫 | 高質量組件、可客製化 |
| **Zustand** | 4.x | 狀態管理 | 輕量、簡單、高效 |
| **React Router** | 6.x | 路由管理 | SPA 導航 |
| **Chart.js** | 4.x | 圖表庫 | 訓練曲線可視化 |
| **ONNX.js** | 1.x | 推論引擎 | 瀏覽器端模型推論 |
| **Dexie.js** | 3.x | IndexedDB | 大量圖像數據存儲 |
| **JSZip** | 3.x | 壓縮工具 | 資料集導出 |
| **React Dropzone** | 14.x | 檔案上傳 | 拖放功能 |

### 4.2 Canvas 圖形處理

**選擇方案：原生 Canvas API + Fabric.js**

**理由：**
- ✅ 原生 Canvas 性能最佳
- ✅ Fabric.js 提供物件操作（選擇、移動、縮放）
- ✅ 支援複雜交互（多邊形、貝茲曲線）
- ✅ 易於導出圖像

**替代方案評估：**
- ❌ Konva.js：功能豐富但體積較大
- ❌ Paper.js：向量圖形為主，不適合像素操作
- ✅ Fabric.js：物件管理強大，社群活躍

### 4.3 ONNX 模型整合

**技術選擇：ONNX Runtime Web (onnxruntime-web)**

**執行後端：**
1. **WebGL**（優先）：GPU 加速，性能最佳
2. **WASM**（備用）：CPU 執行，兼容性好
3. **WebGPU**（未來）：實驗性，Chrome 113+

**模型轉換流程：**
```bash
# PyTorch (.pt) → ONNX (.onnx)
yolo export model=yolov8n.pt format=onnx simplify=True opset=12

# 驗證模型
python -m onnxruntime.tools.check_onnx_model model.onnx
```

### 4.4 數據存儲方案

| 存儲類型 | 技術 | 容量 | 用途 |
|---------|------|------|------|
| **結構化數據** | IndexedDB (Dexie.js) | 依瀏覽器 (通常 > 50MB) | 圖像、標註、配置 |
| **鍵值存儲** | LocalStorage | 5-10 MB | 用戶偏好、快取 |
| **臨時存儲** | SessionStorage | 5-10 MB | 頁面狀態 |

**IndexedDB 數據表設計：**

```typescript
// Dexie.js Schema
class YOLODatabase extends Dexie {
  images!: Dexie.Table<ImageAnnotation, string>;
  datasets!: Dexie.Table<Dataset, string>;
  models!: Dexie.Table<Model, string>;
  configs!: Dexie.Table<TrainingConfig, string>;

  constructor() {
    super('YOLOWebPlatform');

    this.version(1).stores({
      images: 'id, filename, createdAt',
      datasets: 'id, name, createdAt',
      models: 'id, name, createdAt',
      configs: 'id, name, createdAt'
    });
  }
}
```

---

## 5. 數據流程

### 5.1 標註工作流

```
使用者操作                     系統處理                    數據存儲
    │                           │                           │
    ├─ 上傳圖片 ───────────────→ 讀取檔案 ──────────────────→ IndexedDB
    │                           ├─ 生成縮略圖                │
    │                           └─ 提取元數據                │
    │                                                        │
    ├─ 繪製邊界框 ─────────────→ 計算座標 ─────────────────→ 更新 annotations
    │                           ├─ 歸一化 (0-1)             │
    │                           └─ 生成 ID                  │
    │                                                        │
    ├─ 調整框體 ───────────────→ 重新計算座標 ─────────────→ 更新記錄
    │                                                        │
    ├─ 設定類別 ───────────────→ 關聯 classId ─────────────→ 更新記錄
    │                                                        │
    └─ 導出標註 ───────────────→ 生成 YOLO txt ────────────→ 下載 .zip
                                 ├─ 轉換格式
                                 ├─ 打包檔案
                                 └─ 生成 classes.txt
```

### 5.2 資料集創建流程

```
使用者操作                     系統處理                    數據存儲
    │                           │                           │
    ├─ 選擇圖片源 ─────────────→ 載入標註數據 ───────────────→ 讀取 IndexedDB
    │                                                        │
    ├─ 設定分割比例 ───────────→ 隨機打亂 ─────────────────→ 生成分配表
    │  (Train/Val)              ├─ 按比例分配                │
    │                           └─ 確保類別平衡              │
    │                                                        │
    ├─ 創建資料集 ─────────────→ 生成資料集物件 ───────────→ 存儲到 IndexedDB
    │                           ├─ 計算統計資訊              │
    │                           └─ 生成 data.yaml           │
    │                                                        │
    └─ 導出資料集 ─────────────→ 組織目錄結構 ─────────────→ 下載 .zip
                                 ├─ images/train/
                                 ├─ images/val/
                                 ├─ labels/train/
                                 ├─ labels/val/
                                 ├─ data.yaml
                                 └─ classes.txt
```

### 5.3 推論流程（ONNX.js）

```
使用者操作                     系統處理                    ONNX Runtime
    │                           │                           │
    ├─ 上傳圖片 ───────────────→ 讀取圖像數據 ───────────────→ 無
    │                                                        │
    ├─ 選擇模型 ───────────────→ 載入 ONNX 模型 ───────────→ 創建 Session
    │                           └─ 檢測執行後端              (WebGL/WASM)
    │                                                        │
    ├─ 調整閾值 ───────────────→ 更新參數 ─────────────────→ 無
    │                                                        │
    ├─ 執行推論 ───────────────→ 預處理 ────────────────────→ 推論
    │                           ├─ Resize (640x640)         ├─ 前向傳播
    │                           ├─ Normalize [0,1]          └─ 返回輸出張量
    │                           └─ HWC → CHW                │
    │                                                        │
    │                           ← 後處理 ←───────────────────┘
    │                           ├─ 解析輸出張量
    │                           ├─ 過濾低信心度
    │                           ├─ NMS (非極大值抑制)
    │                           └─ 座標反歸一化
    │                                                        │
    └─ 顯示結果 ←──────────────┘ 繪製到 Canvas ─────────────→ 無
                                 └─ 生成結果列表
```

---

## 6. UI/UX 設計規範

### 6.1 設計原則

#### 避免 "AI Slop" 風格

❌ **不使用：**
- 紫色漸層背景
- 過度圓角 (border-radius > 12px)
- 全局置中佈局
- Inter / Roboto 字體
- 發光特效 (glow effects)
- 過度動畫

✅ **使用：**
- 清晰的功能分區
- 實用主義設計
- 左對齊為主
- 系統字體或 Geist / JetBrains Mono
- 微妙的陰影和過渡
- 有目的的動畫

### 6.2 色彩系統

**主題：專業工具風格**

```css
/* 主色調 */
--primary: #2563eb;        /* 藍色 - 主要操作 */
--secondary: #64748b;      /* 灰藍 - 次要元素 */
--accent: #10b981;         /* 綠色 - 成功狀態 */
--destructive: #ef4444;    /* 紅色 - 危險操作 */

/* 中性色 */
--background: #ffffff;
--foreground: #0f172a;
--muted: #f1f5f9;
--border: #e2e8f0;

/* 語義色 */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

**類別顏色調色板（標註用）：**
```typescript
const CLASS_COLORS = [
  '#ef4444', // 紅
  '#f59e0b', // 橙
  '#eab308', // 黃
  '#84cc16', // 萊姆
  '#22c55e', // 綠
  '#14b8a6', // 青
  '#06b6d4', // 淺藍
  '#3b82f6', // 藍
  '#6366f1', // 靛
  '#8b5cf6', // 紫
  '#a855f7', // 紫羅蘭
  '#ec4899', // 粉
  '#f43f5e', // 玫瑰
  '#64748b', // 灰
  '#78716c', // 石
  '#a3a3a3', // 中性
];
```

### 6.3 佈局結構

```
┌─────────────────────────────────────────────────────────────┐
│  Header (60px)                                               │
│  Logo | 導航 | 用戶                                          │
└─────────────────────────────────────────────────────────────┘
┌─────────────┬───────────────────────────────────────────────┐
│             │                                                │
│  Sidebar    │         Main Content Area                      │
│  (240px)    │                                                │
│             │                                                │
│  • 標註     │                                                │
│  • 資料集   │                                                │
│  • 訓練     │                                                │
│  • 推論     │                                                │
│  • 監控     │                                                │
│             │                                                │
│             │                                                │
│             │                                                │
└─────────────┴───────────────────────────────────────────────┘
```

### 6.4 組件設計規範

#### 按鈕層級

```tsx
// 主要操作
<Button variant="default">開始訓練</Button>

// 次要操作
<Button variant="outline">保存</Button>

// 危險操作
<Button variant="destructive">刪除</Button>

// 文字按鈕
<Button variant="ghost">取消</Button>
```

#### 表單控制

```tsx
// 輸入框
<Input label="專案名稱" placeholder="輸入名稱..." />

// 下拉選單
<Select label="YOLO 版本" options={['v5', 'v8', 'v11']} />

// 滑桿
<Slider label="信心度" min={0} max={1} step={0.01} />

// 開關
<Switch label="啟用 Mosaic 增強" />
```

#### 反饋組件

```tsx
// Toast 通知
toast.success("模型上傳成功！");
toast.error("訓練配置錯誤");
toast.info("正在處理中...");

// Progress
<Progress value={65} max={100} />

// Badge
<Badge variant="success">已完成</Badge>
<Badge variant="warning">進行中</Badge>
<Badge variant="destructive">失敗</Badge>
```

### 6.5 響應式設計

| 斷點 | 寬度 | 佈局調整 |
|------|------|---------|
| **Desktop** | ≥ 1280px | 完整側邊欄 + 內容區 |
| **Tablet** | 768px - 1279px | 可折疊側邊欄 |
| **Mobile** | < 768px | 底部導航欄 + 全屏內容 |

---

## 7. 實施階段計劃

### 階段一：核心功能開發（Week 1-2）

#### Sprint 1.1：專案架構搭建（2 天）
- ✅ 初始化 React + TypeScript + Vite 專案
- ✅ 配置 Tailwind CSS + shadcn/ui
- ✅ 設置 Zustand 狀態管理
- ✅ 配置 React Router
- ✅ 建立基礎 Layout (Header, Sidebar, Main)
- ✅ 設置 IndexedDB (Dexie.js)

#### Sprint 1.2：圖像標註模組（3 天）
- ✅ 圖片上傳與預覽
- ✅ Canvas 繪製邊界框
- ✅ 框體選擇、移動、縮放
- ✅ 類別管理界面
- ✅ 鍵盤快捷鍵
- ✅ 標註數據存儲

#### Sprint 1.3：資料集管理模組（2 天）
- ✅ 資料集創建界面
- ✅ 訓練/驗證分割
- ✅ 資料集統計與預覽
- ✅ YOLO 格式導出
- ✅ .zip 打包下載

#### Sprint 1.4：訓練配置模組（2 天）
- ✅ 基本配置界面
- ✅ 訓練參數設置
- ✅ 數據增強選項
- ✅ 配置模板管理
- ✅ 模擬訓練邏輯

#### Sprint 1.5：推論測試模組（3 天）
- ✅ ONNX.js 整合
- ✅ 模型上傳與管理
- ✅ 圖片預處理
- ✅ 推論執行
- ✅ 結果可視化
- ✅ NMS 後處理

---

### 階段二：優化與完善（Week 3）

#### Sprint 2.1：訓練監控模組（2 天）
- ✅ 模擬訓練進度展示
- ✅ 損失曲線圖表
- ✅ 訓練日誌顯示
- ✅ 訓練控制功能

#### Sprint 2.2：UI/UX 優化（2 天）
- ✅ 響應式佈局調整
- ✅ 動畫與過渡效果
- ✅ 錯誤處理與驗證
- ✅ 載入狀態優化
- ✅ Toast 通知系統

#### Sprint 2.3：性能優化（2 天）
- ✅ 圖像懶加載
- ✅ Canvas 渲染優化
- ✅ IndexedDB 查詢優化
- ✅ 大型資料集處理
- ✅ Memory leak 檢查

#### Sprint 2.4：測試與文檔（1 天）
- ✅ 功能測試
- ✅ 瀏覽器兼容性測試
- ✅ 用戶手冊編寫
- ✅ 開發者文檔

---

### 階段三：後端整合（選做，Week 4+）

#### Sprint 3.1：後端 API 開發
- FastAPI 後端搭建
- 模型訓練 API
- 檔案上傳 API
- 任務管理系統
- WebSocket 即時通信

#### Sprint 3.2：前後端整合
- API 串接
- 認證與授權
- 真實訓練流程
- 雲端存儲整合

---

## 8. 風險評估與解決方案

### 8.1 技術風險

| 風險 | 嚴重性 | 解決方案 |
|------|--------|----------|
| **瀏覽器存儲限制** | 🟡 中 | • 提示用戶清理舊數據<br>• 壓縮圖像存儲<br>• 提供雲端同步選項 |
| **ONNX.js 兼容性** | 🟡 中 | • 預先測試模型<br>• 提供模型轉換指南<br>• 備用 WASM 後端 |
| **大型資料集性能** | 🟠 高 | • 虛擬滾動<br>• 分頁加載<br>• 後台處理 |
| **Canvas 記憶體洩漏** | 🟡 中 | • 及時清理 Canvas<br>• 限制同時渲染數量 |

### 8.2 使用者體驗風險

| 風險 | 解決方案 |
|------|----------|
| **學習曲線** | • 提供互動式教程<br>• 工具提示與引導 |
| **誤操作** | • 操作確認對話框<br>• Undo/Redo 功能 |
| **進度丟失** | • 自動保存<br>• 本地備份 |

### 8.3 安全風險

| 風險 | 解決方案 |
|------|----------|
| **惡意檔案上傳** | • 檔案類型驗證<br>• 大小限制 |
| **XSS 攻擊** | • 輸入清理<br>• React 自動轉義 |
| **資料洩漏** | • 純前端無後端傳輸<br>• 提示用戶數據隱私 |

---

## 9. 附錄

### 9.1 鍵盤快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `1-9` | 切換類別 |
| `Delete` | 刪除選中框體 |
| `Ctrl/Cmd + C` | 複製框體 |
| `Ctrl/Cmd + V` | 粘貼框體 |
| `Ctrl/Cmd + Z` | 撤銷 |
| `Ctrl/Cmd + Y` | 重做 |
| `←` | 上一張圖片 |
| `→` | 下一張圖片 |
| `Space` | 快速標記完成 |

### 9.2 瀏覽器兼容性

| 瀏覽器 | 最低版本 | 備註 |
|--------|---------|------|
| Chrome | 90+ | 推薦，WebGL 支援最佳 |
| Edge | 90+ | 與 Chrome 相同核心 |
| Firefox | 88+ | WebGL 支援良好 |
| Safari | 14+ | 需測試 ONNX.js 兼容性 |

### 9.3 數據格式規範

**YOLO 標註格式：**
```
<class_id> <x_center> <y_center> <width> <height>
```

**data.yaml 格式：**
```yaml
train: ./images/train
val: ./images/val

nc: 10  # 類別數量
names: ['class1', 'class2', ...]
```

---

## 結論

本技術設計文件提供了完整的 YOLO Web 平台開發藍圖，涵蓋：
- ✅ 詳細的功能需求
- ✅ 技術選型與理由
- ✅ UI/UX 設計規範
- ✅ 實施階段計劃
- ✅ 風險評估與解決方案

**推薦實施路徑：**
1. 先完成**階段一**（純前端），快速驗證產品價值
2. 收集使用者反饋，優化 UI/UX
3. 如有需求，再進行**階段三**（後端整合）

**預估工作量：**
- 階段一：10-12 天
- 階段二：5-6 天
- 階段三：15-20 天（選做）

---

**下一步行動：**
1. 審查並確認設計文件
2. 初始化專案架構
3. 開始 Sprint 1.1 開發

**文件版本控制：**
- v1.0 (2026-01-16)：初版完成
