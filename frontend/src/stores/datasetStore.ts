import { create } from 'zustand';
import type { Dataset, ClassDefinition, DatasetStatistics, ImageAnnotation } from '@/types';
import { saveDataset, loadDatasets, deleteDataset as deleteDatasetFromDB } from '@/lib/db';

interface DatasetState {
  datasets: Dataset[];
  isLoaded: boolean;

  // Actions
  loadFromDB: () => Promise<void>;
  createDataset: (name: string, imageIds: string[], trainRatio: number, classes: ClassDefinition[]) => Promise<Dataset>;
  removeDataset: (id: string) => Promise<void>;
  updateDataset: (id: string, updates: Partial<Dataset>) => Promise<void>;
  getDatasetById: (id: string) => Dataset | null;
  duplicateDataset: (id: string, newName: string) => Promise<Dataset | null>;
  resplitDataset: (id: string, trainRatio: number) => Promise<void>;
  calculateStatistics: (dataset: Dataset, images: ImageAnnotation[]) => DatasetStatistics;
}

/**
 * Fisher-Yates 洗牌算法 - 正確的隨機洗牌
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const useDatasetStore = create<DatasetState>((set, get) => ({
  datasets: [],
  isLoaded: false,

  loadFromDB: async () => {
    try {
      const datasets = await loadDatasets();
      set({ datasets, isLoaded: true });
    } catch (error) {
      console.error('載入資料集失敗:', error);
      set({ isLoaded: true });
    }
  },

  createDataset: async (name: string, imageIds: string[], trainRatio: number, classes: ClassDefinition[]) => {
    const shuffled = shuffleArray(imageIds);
    const trainCount = Math.floor(shuffled.length * trainRatio);

    const newDataset: Dataset = {
      id: crypto.randomUUID(),
      name,
      imageIds,
      trainImageIds: shuffled.slice(0, trainCount),
      valImageIds: shuffled.slice(trainCount),
      trainRatio,
      classes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 保存到 IndexedDB
    await saveDataset(newDataset);

    set((state) => ({
      datasets: [...state.datasets, newDataset],
    }));

    return newDataset;
  },

  removeDataset: async (id: string) => {
    // 從 IndexedDB 刪除
    await deleteDatasetFromDB(id);

    set((state) => ({
      datasets: state.datasets.filter((ds) => ds.id !== id),
    }));
  },

  updateDataset: async (id: string, updates: Partial<Dataset>) => {
    const dataset = get().datasets.find((ds) => ds.id === id);
    if (!dataset) return;

    const updatedDataset: Dataset = {
      ...dataset,
      ...updates,
      updatedAt: new Date(),
    };

    // 保存到 IndexedDB
    await saveDataset(updatedDataset);

    set((state) => ({
      datasets: state.datasets.map((ds) =>
        ds.id === id ? updatedDataset : ds
      ),
    }));
  },

  getDatasetById: (id: string) => {
    return get().datasets.find((ds) => ds.id === id) || null;
  },

  duplicateDataset: async (id: string, newName: string) => {
    const original = get().datasets.find((ds) => ds.id === id);
    if (!original) return null;

    const duplicated: Dataset = {
      ...original,
      id: crypto.randomUUID(),
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 保存到 IndexedDB
    await saveDataset(duplicated);

    set((state) => ({
      datasets: [...state.datasets, duplicated],
    }));

    return duplicated;
  },

  resplitDataset: async (id: string, trainRatio: number) => {
    const dataset = get().datasets.find((ds) => ds.id === id);
    if (!dataset) return;

    const shuffled = shuffleArray(dataset.imageIds);
    const trainCount = Math.floor(shuffled.length * trainRatio);

    const updates: Partial<Dataset> = {
      trainImageIds: shuffled.slice(0, trainCount),
      valImageIds: shuffled.slice(trainCount),
      trainRatio,
    };

    await get().updateDataset(id, updates);
  },

  calculateStatistics: (dataset: Dataset, images: ImageAnnotation[]): DatasetStatistics => {
    // 建立 imageId 到 image 的映射
    const imageMap = new Map(images.map((img) => [img.id, img]));

    // 計算訓練集和驗證集的圖片
    const trainImages = dataset.trainImageIds
      .map((id) => imageMap.get(id))
      .filter((img): img is ImageAnnotation => img !== undefined);

    const valImages = dataset.valImageIds
      .map((id) => imageMap.get(id))
      .filter((img): img is ImageAnnotation => img !== undefined);

    // 計算總標註數
    const trainBoxes = trainImages.reduce((sum, img) => sum + img.boxes.length, 0);
    const valBoxes = valImages.reduce((sum, img) => sum + img.boxes.length, 0);
    const totalBoxes = trainBoxes + valBoxes;

    // 計算每個類別的分布
    const classCountMap = new Map<number, { trainCount: number; valCount: number }>();

    // 初始化類別計數
    dataset.classes.forEach((cls) => {
      classCountMap.set(cls.id, { trainCount: 0, valCount: 0 });
    });

    // 統計訓練集
    trainImages.forEach((img) => {
      img.boxes.forEach((box) => {
        const counts = classCountMap.get(box.classId);
        if (counts) {
          counts.trainCount++;
        }
      });
    });

    // 統計驗證集
    valImages.forEach((img) => {
      img.boxes.forEach((box) => {
        const counts = classCountMap.get(box.classId);
        if (counts) {
          counts.valCount++;
        }
      });
    });

    // 建立類別分布數據
    const classDistribution = dataset.classes.map((cls) => {
      const counts = classCountMap.get(cls.id) || { trainCount: 0, valCount: 0 };
      return {
        classId: cls.id,
        className: cls.name,
        color: cls.color,
        trainCount: counts.trainCount,
        valCount: counts.valCount,
        totalCount: counts.trainCount + counts.valCount,
      };
    });

    // 計算沒有標註的圖片數量
    const allImages = [...trainImages, ...valImages];
    const imagesWithoutBoxes = allImages.filter((img) => img.boxes.length === 0).length;

    return {
      totalImages: dataset.imageIds.length,
      totalBoxes,
      trainBoxes,
      valBoxes,
      classDistribution,
      avgBoxesPerImage: allImages.length > 0 ? totalBoxes / allImages.length : 0,
      imagesWithoutBoxes,
    };
  },
}));
