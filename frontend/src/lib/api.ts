/**
 * YOLO Backend API Client
 */

import type { TrainingConfig, TrainingMetrics } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface BackendTrainingConfig {
  name: string;
  yolo_version: 'v5' | 'v8' | 'v11';
  model_size: 'n' | 's' | 'm' | 'l' | 'x';
  dataset_id: string;
  epochs: number;
  batch_size: number;
  image_size: number;
  device: 'cpu' | 'cuda' | 'mps';
  workers: number;
  optimizer: 'Adam' | 'SGD' | 'AdamW';
  learning_rate: number;
  momentum: number;
  weight_decay: number;
  patience: number;
  augmentation: {
    mosaic: boolean;
    mixup: boolean;
    rotation: number;
    hsv_h: number;
    hsv_s: number;
    hsv_v: number;
    translate: number;
    scale: number;
    flip_horizontal: boolean;
    flip_vertical: boolean;
  };
}

export interface StartTrainingRequest {
  config: BackendTrainingConfig;
  dataset_zip: string; // base64 encoded ZIP file
}

export interface StartTrainingResponse {
  job_id: string;
  message: string;
}

export interface TrainingStatus {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  progress: number;
  current_epoch: number;
  total_epochs: number;
  started_at: string;
  completed_at?: string;
  error?: string;
  metrics?: TrainingMetrics;
}

export interface WSMessage {
  type: 'status' | 'log' | 'metrics' | 'error';
  job_id: string;
  data: any;
}

/**
 * Convert frontend TrainingConfig to backend format
 */
export function convertToBackendConfig(
  config: TrainingConfig
): BackendTrainingConfig {
  return {
    name: config.name,
    yolo_version: config.yoloVersion,
    model_size: config.modelSize,
    dataset_id: config.datasetId,
    epochs: config.epochs,
    batch_size: config.batchSize,
    image_size: config.imageSize,
    device: config.device,
    workers: config.workers,
    optimizer: config.optimizer,
    learning_rate: config.learningRate,
    momentum: config.momentum,
    weight_decay: config.weightDecay,
    patience: config.patience,
    augmentation: {
      mosaic: config.augmentation.mosaic,
      mixup: config.augmentation.mixup,
      rotation: config.augmentation.rotation,
      hsv_h: config.augmentation.hsvH,
      hsv_s: config.augmentation.hsvS,
      hsv_v: config.augmentation.hsvV,
      translate: config.augmentation.translate,
      scale: config.augmentation.scale,
      flip_horizontal: config.augmentation.flipHorizontal,
      flip_vertical: config.augmentation.flipVertical,
    },
  };
}

/**
 * Start a training job
 */
export async function startTraining(
  request: StartTrainingRequest
): Promise<StartTrainingResponse> {
  const response = await fetch(`${API_BASE_URL}/api/training/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get training job status
 */
export async function getTrainingStatus(jobId: string): Promise<TrainingStatus> {
  const response = await fetch(`${API_BASE_URL}/api/training/status/${jobId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Stop a training job
 */
export async function stopTraining(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/training/stop/${jobId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
}

/**
 * Delete a training job
 */
export async function deleteTraining(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/training/${jobId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
}

export interface WebSocketCallbacks {
  onStatus?: (status: TrainingStatus) => void;
  onLog?: (log: string) => void;
  onMetrics?: (metrics: TrainingMetrics) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  onOpen?: () => void;
}

export interface WebSocketConnection {
  ws: WebSocket;
  disconnect: () => void;
}

/**
 * Create WebSocket connection for real-time training updates
 */
export function createTrainingWebSocket(
  jobId: string,
  callbacks: WebSocketCallbacks
): WebSocket {
  const wsUrl = API_BASE_URL.replace(/^http/, 'ws');
  const ws = new WebSocket(`${wsUrl}/ws/training/${jobId}`);

  // 心跳計時器
  let heartbeatInterval: NodeJS.Timeout | null = null;

  ws.onopen = () => {
    console.log(`[WebSocket] Connected to training job ${jobId}`);

    // 啟動心跳機制 (每 30 秒)
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 30000);

    callbacks.onOpen?.();
  };

  ws.onmessage = (event) => {
    // 處理 pong 響應
    if (event.data === 'pong') {
      console.log('[WebSocket] Heartbeat pong received');
      return;
    }

    try {
      const message: WSMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'status':
          callbacks.onStatus?.(message.data);
          break;
        case 'log':
          callbacks.onLog?.(message.data);
          break;
        case 'metrics':
          // Convert snake_case to camelCase
          const metricsData = message.data.metrics || message.data;
          const convertedMetrics: TrainingMetrics = {
            epoch: metricsData.epoch,
            trainLoss: metricsData.train_loss,
            valLoss: metricsData.val_loss,
            map50: metricsData.map50,
            map5095: metricsData.map50_95,
            precision: metricsData.precision,
            recall: metricsData.recall,
            lr: metricsData.learning_rate,
          };
          callbacks.onMetrics?.(convertedMetrics);
          break;
        case 'error':
          callbacks.onError?.(message.data.error);
          break;
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('[WebSocket] Error:', error);
    callbacks.onError?.('WebSocket connection error');
  };

  ws.onclose = () => {
    console.log('[WebSocket] Connection closed');

    // 清理心跳計時器
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    callbacks.onClose?.();
  };

  return ws;
}

/**
 * Create WebSocket connection with automatic retry
 */
export function createTrainingWebSocketWithRetry(
  jobId: string,
  callbacks: WebSocketCallbacks,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    exponentialBackoff?: boolean;
  } = {}
): WebSocketConnection {
  const {
    maxRetries = 5,
    retryDelay = 3000,
    exponentialBackoff = true
  } = options;

  let retryCount = 0;
  let currentWs: WebSocket | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isManualClose = false;

  function connect(): WebSocket {
    const ws = createTrainingWebSocket(jobId, {
      ...callbacks,
      onOpen: () => {
        // 重連成功，重置計數
        retryCount = 0;
        console.log(`[WebSocket] Connection established (retry count reset)`);
        callbacks.onOpen?.();
      },
      onClose: () => {
        // 如果是手動關閉，不重連
        if (isManualClose) {
          console.log('[WebSocket] Manual disconnect, will not retry');
          callbacks.onClose?.();
          return;
        }

        // 檢查是否應該重連
        if (retryCount < maxRetries) {
          const delay = exponentialBackoff
            ? Math.min(retryDelay * Math.pow(2, retryCount), 30000) // 最大 30 秒
            : retryDelay;

          retryCount++;
          console.log(
            `[WebSocket] Disconnected, will retry in ${delay}ms (${retryCount}/${maxRetries})`
          );

          reconnectTimeout = setTimeout(() => {
            console.log(`[WebSocket] Attempting reconnect (${retryCount}/${maxRetries})...`);
            currentWs = connect();
          }, delay);
        } else {
          console.error('[WebSocket] Max retries reached, giving up');
          callbacks.onClose?.();
        }
      },
      onError: callbacks.onError,
      onStatus: callbacks.onStatus,
      onLog: callbacks.onLog,
      onMetrics: callbacks.onMetrics,
    });

    currentWs = ws;
    return ws;
  }

  const ws = connect();

  return {
    ws,
    disconnect: () => {
      isManualClose = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (currentWs) {
        currentWs.close();
      }
    }
  };
}

/**
 * Convert Blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/zip;base64,")
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download trained model
 */
export async function downloadModel(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/training/${jobId}/download`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // Download file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yolo_${jobId}_best.pt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Download complete training package (models + charts + configs)
 */
export async function downloadTrainingPackage(jobId: string, projectName?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/training/${jobId}/download-all`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // Download ZIP file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = projectName ? `${projectName}_training.zip` : `yolo_training_${jobId}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Export training package to local folder using File System Access API
 */
export async function exportTrainingToFolder(jobId: string, projectName: string): Promise<{ filesWritten: number }> {
  // Check browser support
  if (!('showDirectoryPicker' in window)) {
    throw new Error('您的瀏覽器不支援此功能，請使用 Chrome 或 Edge，或選擇下載 ZIP');
  }

  // Request directory access
  const dirHandle = await (window as any).showDirectoryPicker({
    mode: 'readwrite',
  });

  // Download training package
  const response = await fetch(`${API_BASE_URL}/api/training/${jobId}/download-all`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const blob = await response.blob();

  // Extract ZIP and write files
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(blob);

  let filesWritten = 0;

  // Create project folder
  const projectFolderName = projectName || `yolo_training_${jobId}`;
  const projectFolder = await dirHandle.getDirectoryHandle(projectFolderName, { create: true });

  // Extract all files
  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;

    // Create subdirectories if needed
    const pathParts = relativePath.split('/');
    let currentFolder = projectFolder;

    for (let i = 0; i < pathParts.length - 1; i++) {
      currentFolder = await currentFolder.getDirectoryHandle(pathParts[i], { create: true });
    }

    // Write file
    const fileName = pathParts[pathParts.length - 1];
    const fileHandle = await currentFolder.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    const content = await zipEntry.async('uint8array');
    await writable.write(content);
    await writable.close();

    filesWritten++;
  }

  return { filesWritten };
}

/**
 * Get training results
 */
export async function getTrainingResults(jobId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/training/${jobId}/results`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * List all training jobs
 */
export async function listTrainingJobs(): Promise<{ jobs: any[]; total: number }> {
  const response = await fetch(`${API_BASE_URL}/api/training/list`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}

// ============================================================================
// Inference API
// ============================================================================

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface InferenceResponse {
  detections: Detection[];
  inference_time: number;
  image_size: [number, number];
}

export interface ModelInfo {
  model_id: string;
  name: string;
  yolo_version: 'v5' | 'v8' | 'v11';
  model_size: 'n' | 's' | 'm' | 'l' | 'x';
  classes: string[];
  created_at: string;
  metrics?: any;
}

export interface ListModelsResponse {
  models: ModelInfo[];
  total: number;
}

/**
 * List all available trained models for inference
 */
export async function listInferenceModels(): Promise<ListModelsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/inference/models`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Load a trained model into memory
 */
export async function loadModel(modelId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/inference/load/${modelId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Unload a model from memory
 */
export async function unloadModel(modelId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/inference/unload/${modelId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Run inference on an image
 */
export async function runInference(
  modelId: string,
  imageBase64: string,
  confidence: number = 0.25,
  iou: number = 0.45
): Promise<InferenceResponse> {
  const response = await fetch(`${API_BASE_URL}/api/inference/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: modelId,
      image: imageBase64,
      confidence,
      iou,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
