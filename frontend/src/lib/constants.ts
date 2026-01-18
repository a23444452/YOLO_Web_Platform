// 常量定義

export const CLASS_COLORS = [
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

export const YOLO_VERSIONS = [
  { value: 'v5', label: 'YOLOv5' },
  { value: 'v8', label: 'YOLOv8' },
  { value: 'v11', label: 'YOLOv11' },
] as const;

export const MODEL_SIZES = [
  { value: 'n', label: 'Nano (最快)' },
  { value: 's', label: 'Small' },
  { value: 'm', label: 'Medium' },
  { value: 'l', label: 'Large' },
  { value: 'x', label: 'XLarge (最準確)' },
] as const;

export const BATCH_SIZES = [2, 4, 8, 16, 32] as const;

export const IMAGE_SIZES = [320, 416, 640, 1280] as const;

export const OPTIMIZERS = [
  { value: 'Adam', label: 'Adam' },
  { value: 'SGD', label: 'SGD' },
  { value: 'AdamW', label: 'AdamW' },
] as const;

export const DEFAULT_TRAINING_CONFIG = {
  epochs: 100,
  batchSize: 16,
  imageSize: 640,
  device: 'cpu' as const,
  workers: 4,
  optimizer: 'Adam' as const,
  learningRate: 0.01,
  momentum: 0.937,
  weightDecay: 0.0005,
  patience: 50,
  augmentation: {
    mosaic: true,
    mixup: false,
    rotation: 0,
    hsvH: 0.015,
    hsvS: 0.7,
    hsvV: 0.4,
    translate: 0.1,
    scale: 0.5,
    flipHorizontal: true,
    flipVertical: false,
  },
};

export const KEYBOARD_SHORTCUTS = {
  DELETE: 'Delete',
  COPY: 'c',
  PASTE: 'v',
  UNDO: 'z',
  REDO: 'y',
  PREV_IMAGE: 'ArrowLeft',
  NEXT_IMAGE: 'ArrowRight',
  SAVE: 's',
  CLASS_1: '1',
  CLASS_2: '2',
  CLASS_3: '3',
  CLASS_4: '4',
  CLASS_5: '5',
  CLASS_6: '6',
  CLASS_7: '7',
  CLASS_8: '8',
  CLASS_9: '9',
};
