import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrainingConfig, TrainingJob, TrainingMetrics, TrainingConfigTemplate } from '@/types';
import { DEFAULT_TRAINING_CONFIG } from '@/lib/constants';
import { useDatasetStore } from './datasetStore';
import { useAnnotationStore } from './annotationStore';
import { exportDatasetAsYOLO } from '@/lib/exportDataset';
import {
  startTraining as apiStartTraining,
  stopTraining as apiStopTraining,
  createTrainingWebSocketWithRetry,
  convertToBackendConfig,
  blobToBase64,
  type TrainingStatus as BackendTrainingStatus,
  type WebSocketConnection,
} from '@/lib/api';

interface TrainingState {
  configs: TrainingConfig[];
  jobs: TrainingJob[];
  currentJobId: string | null;
  websockets: Map<string, WebSocketConnection>;
  templates: TrainingConfigTemplate[];

  // Config Actions
  createConfig: (config: Partial<TrainingConfig>) => string;
  updateConfig: (id: string, updates: Partial<TrainingConfig>) => void;
  removeConfig: (id: string) => void;
  getConfigById: (id: string) => TrainingConfig | null;

  // Template Actions
  saveTemplate: (name: string, config: Partial<TrainingConfig>) => string;
  loadTemplate: (templateId: string) => Partial<TrainingConfig> | null;
  removeTemplate: (templateId: string) => void;
  getTemplates: () => TrainingConfigTemplate[];

  // Training Actions
  startTraining: (configId: string) => Promise<void>;
  stopTraining: (jobId: string) => Promise<void>;
  updateJobProgress: (jobId: string, progress: number, metrics: TrainingMetrics) => void;
  addJobLog: (jobId: string, log: string) => void;
  completeJob: (jobId: string) => void;
  failJob: (jobId: string, error: string) => void;

  getCurrentJob: () => TrainingJob | null;
}

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set, get) => ({
      configs: [],
      jobs: [],
      currentJobId: null,
      websockets: new Map(),
      templates: [],

  createConfig: (config: Partial<TrainingConfig>) => {
    const newConfig: TrainingConfig = {
      id: crypto.randomUUID(),
      name: config.name || 'Untitled Config',
      yoloVersion: config.yoloVersion || 'v8',
      modelSize: config.modelSize || 'm',
      datasetId: config.datasetId || '',
      ...DEFAULT_TRAINING_CONFIG,
      ...config,
      createdAt: new Date(),
    };

    set((state) => ({
      configs: [...state.configs, newConfig],
    }));

    return newConfig.id;
  },

  updateConfig: (id: string, updates: Partial<TrainingConfig>) => {
    set((state) => ({
      configs: state.configs.map((cfg) =>
        cfg.id === id ? { ...cfg, ...updates } : cfg
      ),
    }));
  },

  removeConfig: (id: string) => {
    set((state) => ({
      configs: state.configs.filter((cfg) => cfg.id !== id),
    }));
  },

  getConfigById: (id: string) => {
    return get().configs.find((cfg) => cfg.id === id) || null;
  },

  startTraining: async (configId: string) => {
    const config = get().getConfigById(configId);
    if (!config) {
      throw new Error('Training config not found');
    }

    // Get dataset and images
    const datasetStore = useDatasetStore.getState();
    const annotationStore = useAnnotationStore.getState();

    const dataset = datasetStore.datasets.find((ds) => ds.id === config.datasetId);
    if (!dataset) {
      throw new Error('Dataset not found');
    }

    const images = annotationStore.images;
    if (images.length === 0) {
      throw new Error('No images found in annotation store');
    }

    // Create temporary job
    const tempJobId = crypto.randomUUID();
    const newJob: TrainingJob = {
      id: tempJobId,
      configId,
      status: 'pending',
      progress: 0,
      currentEpoch: 0,
      totalEpochs: config.epochs,
      metrics: [],
      logs: [`[${new Date().toLocaleTimeString()}] Preparing dataset...`],
      startTime: new Date(),
    };

    set((state) => ({
      jobs: [...state.jobs, newJob],
      currentJobId: tempJobId,
    }));

    try {
      // Export dataset as YOLO format ZIP
      get().addJobLog(tempJobId, `[${new Date().toLocaleTimeString()}] Exporting dataset...`);

      const zipBlob = await exportDatasetAsYOLO(
        dataset,
        images,
        {
          includeImages: true,
          splitFolders: true,
          filename: `${dataset.name}.zip`,
        }
      );

      // Convert to base64
      get().addJobLog(tempJobId, `[${new Date().toLocaleTimeString()}] Converting to base64...`);
      const datasetZipB64 = await blobToBase64(zipBlob);

      // Start training via backend API
      get().addJobLog(tempJobId, `[${new Date().toLocaleTimeString()}] Starting training on backend...`);

      const backendConfig = convertToBackendConfig(config);
      const response = await apiStartTraining({
        config: backendConfig,
        dataset_zip: datasetZipB64,
      });

      // Update job with backend job_id
      const backendJobId = response.job_id;

      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === tempJobId
            ? { ...job, id: backendJobId, status: 'running' }
            : job
        ),
        currentJobId: backendJobId,
      }));

      get().addJobLog(backendJobId, `[${new Date().toLocaleTimeString()}] ${response.message}`);

      // Setup WebSocket for real-time updates with auto-retry
      const wsConnection = createTrainingWebSocketWithRetry(
        backendJobId,
        {
          onOpen: () => {
            get().addJobLog(backendJobId, `[${new Date().toLocaleTimeString()}] ✅ WebSocket 已連接`);
          },
          onStatus: (status: BackendTrainingStatus) => {
            set((state) => ({
              jobs: state.jobs.map((job) =>
                job.id === backendJobId
                  ? {
                      ...job,
                      status: status.status,
                      progress: status.progress,
                      currentEpoch: status.current_epoch,
                      totalEpochs: status.total_epochs,
                    }
                  : job
              ),
            }));

            if (status.status === 'completed') {
              get().completeJob(backendJobId);
            } else if (status.status === 'failed') {
              get().failJob(backendJobId, status.error || 'Training failed');
            }
          },
          onLog: (log: string) => {
            get().addJobLog(backendJobId, `[${new Date().toLocaleTimeString()}] ${log}`);
          },
          onMetrics: (metrics: TrainingMetrics) => {
            get().updateJobProgress(backendJobId, (metrics.epoch / config.epochs) * 100, metrics);
          },
          onError: (error: string) => {
            get().addJobLog(backendJobId, `[${new Date().toLocaleTimeString()}] ⚠️ ${error}`);
          },
          onClose: () => {
            get().addJobLog(backendJobId, `[${new Date().toLocaleTimeString()}] WebSocket 連接關閉`);
            get().websockets.delete(backendJobId);
          },
        },
        {
          maxRetries: 5,
          retryDelay: 3000,
          exponentialBackoff: true,
        }
      );

      get().websockets.set(backendJobId, wsConnection);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      get().failJob(tempJobId, errorMessage);
      get().addJobLog(tempJobId, `[${new Date().toLocaleTimeString()}] ERROR: ${errorMessage}`);
      throw error;
    }
  },

  stopTraining: async (jobId: string) => {
    try {
      await apiStopTraining(jobId);

      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === jobId ? { ...job, status: 'stopped' as const, endTime: new Date() } : job
        ),
      }));

      // Close WebSocket if exists
      const wsConnection = get().websockets.get(jobId);
      if (wsConnection) {
        wsConnection.disconnect();
        get().websockets.delete(jobId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop training';
      get().addJobLog(jobId, `[${new Date().toLocaleTimeString()}] ERROR: ${errorMessage}`);
      throw error;
    }
  },

  updateJobProgress: (jobId: string, progress: number, metrics: TrainingMetrics) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              progress,
              currentEpoch: metrics.epoch,
              metrics: [...job.metrics, metrics],
            }
          : job
      ),
    }));
  },

  addJobLog: (jobId: string, log: string) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === jobId ? { ...job, logs: [...job.logs, log] } : job
      ),
    }));
  },

  completeJob: (jobId: string) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === jobId ? { ...job, status: 'completed' as const, endTime: new Date() } : job
      ),
    }));

    // Close WebSocket
    const wsConnection = get().websockets.get(jobId);
    if (wsConnection) {
      wsConnection.disconnect();
      get().websockets.delete(jobId);
    }
  },

  failJob: (jobId: string, error: string) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === jobId ? { ...job, status: 'failed' as const, endTime: new Date(), error } : job
      ),
    }));

    // Close WebSocket
    const wsConnection = get().websockets.get(jobId);
    if (wsConnection) {
      wsConnection.disconnect();
      get().websockets.delete(jobId);
    }
  },

  getCurrentJob: () => {
    const state = get();
    return state.jobs.find((job) => job.id === state.currentJobId) || null;
  },

  // Template management
  saveTemplate: (name: string, config: Partial<TrainingConfig>) => {
    const template: TrainingConfigTemplate = {
      id: crypto.randomUUID(),
      name,
      yoloVersion: config.yoloVersion || 'v8',
      modelSize: config.modelSize || 'm',
      epochs: config.epochs || DEFAULT_TRAINING_CONFIG.epochs,
      batchSize: config.batchSize || DEFAULT_TRAINING_CONFIG.batchSize,
      imageSize: config.imageSize || DEFAULT_TRAINING_CONFIG.imageSize,
      device: config.device || DEFAULT_TRAINING_CONFIG.device,
      workers: config.workers || DEFAULT_TRAINING_CONFIG.workers,
      optimizer: config.optimizer || DEFAULT_TRAINING_CONFIG.optimizer,
      learningRate: config.learningRate || DEFAULT_TRAINING_CONFIG.learningRate,
      momentum: config.momentum || DEFAULT_TRAINING_CONFIG.momentum,
      weightDecay: config.weightDecay || DEFAULT_TRAINING_CONFIG.weightDecay,
      patience: config.patience || DEFAULT_TRAINING_CONFIG.patience,
      augmentation: config.augmentation || DEFAULT_TRAINING_CONFIG.augmentation,
      createdAt: new Date(),
    };

    set((state) => ({
      templates: [...state.templates, template],
    }));

    return template.id;
  },

  loadTemplate: (templateId: string) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return null;

    // Return template data without id, name, and createdAt
    const { id, name, createdAt, ...configData } = template;
    return configData;
  },

  removeTemplate: (templateId: string) => {
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== templateId),
    }));
  },

  getTemplates: () => {
    return get().templates;
  },
    }),
    {
      name: 'training-store',
      partialize: (state) => ({
        templates: state.templates,
        // Don't persist configs, jobs, websockets
      }),
    }
  )
);
