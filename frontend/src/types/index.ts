// TypeScript 類型定義

export interface BoundingBox {
  id: string;
  classId: number;
  className: string;
  x: number;        // 中心點 x (0-1 歸一化)
  y: number;        // 中心點 y (0-1 歸一化)
  width: number;    // 寬度 (0-1 歸一化)
  height: number;   // 高度 (0-1 歸一化)
  color: string;
}

export interface ImageAnnotation {
  id: string;
  filename: string;
  width: number;
  height: number;
  dataUrl: string;
  boxes: BoundingBox[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassDefinition {
  id: number;
  name: string;
  color: string;
  count: number;    // 該類別的標註數量
}

export interface Dataset {
  id: string;
  name: string;
  imageIds: string[];
  trainImageIds: string[];
  valImageIds: string[];
  trainRatio: number;
  classes: ClassDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingConfig {
  id: string;
  name: string;
  yoloVersion: 'v5' | 'v8' | 'v11';
  modelSize: 'n' | 's' | 'm' | 'l' | 'x';
  datasetId: string;
  epochs: number;
  batchSize: number;
  imageSize: number;
  device: 'auto' | 'cpu' | 'gpu';
  workers: number;
  optimizer: 'Adam' | 'SGD' | 'AdamW';
  learningRate: number;
  momentum: number;
  weightDecay: number;
  patience: number;
  cosineLR: boolean;
  rect: boolean;
  cache: boolean;
  augmentation: {
    mosaic: boolean;
    mixup: boolean;
    rotation: number;
    hsvH: number;
    hsvS: number;
    hsvV: number;
    translate: number;
    scale: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
  };
  createdAt: Date;
}

export interface Model {
  id: string;
  name: string;
  format: 'onnx' | 'pt';
  dataUrl: string;
  inputSize: number;
  classes: string[];
  createdAt: Date;
}

export interface Detection {
  classId: number;
  className: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: string;
}

export interface TrainingMetrics {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  map50: number;
  map5095: number;
  precision: number;
  recall: number;
  lr: number;
}

export interface TrainingJob {
  id: string;
  configId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  progress: number;
  currentEpoch: number;
  totalEpochs: number;
  metrics: TrainingMetrics[];
  logs: string[];
  startTime?: Date;
  endTime?: Date;
}

export interface DatasetStatistics {
  totalImages: number;
  totalBoxes: number;
  trainBoxes: number;
  valBoxes: number;
  classDistribution: {
    classId: number;
    className: string;
    color: string;
    trainCount: number;
    valCount: number;
    totalCount: number;
  }[];
  avgBoxesPerImage: number;
  imagesWithoutBoxes: number;
}

// 訓練配置模板（不包含 id、name、datasetId、createdAt）
export interface TrainingConfigTemplate {
  id: string;
  name: string;
  yoloVersion: 'v5' | 'v8' | 'v11';
  modelSize: 'n' | 's' | 'm' | 'l' | 'x';
  epochs: number;
  batchSize: number;
  imageSize: number;
  device: 'auto' | 'cpu' | 'gpu';
  workers: number;
  optimizer: 'Adam' | 'SGD' | 'AdamW';
  learningRate: number;
  momentum: number;
  weightDecay: number;
  patience: number;
  cosineLR: boolean;
  rect: boolean;
  cache: boolean;
  augmentation: {
    mosaic: boolean;
    mixup: boolean;
    rotation: number;
    hsvH: number;
    hsvS: number;
    hsvV: number;
    translate: number;
    scale: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
  };
  createdAt: Date;
}
