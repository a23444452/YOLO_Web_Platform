import Dexie, { type Table } from 'dexie';
import type { ImageAnnotation, ClassDefinition, Dataset } from '@/types';

// IndexedDB 序列化類型 (Date 轉為 ISO string)
interface DatasetRecord {
  id: string;
  name: string;
  imageIds: string[];
  trainImageIds: string[];
  valImageIds: string[];
  trainRatio: number;
  classes: ClassDefinition[];
  createdAt: string;
  updatedAt: string;
}

// IndexedDB 數據庫類別
export class AnnotationDatabase extends Dexie {
  images!: Table<ImageAnnotation, string>;
  classes!: Table<ClassDefinition, number>;
  datasets!: Table<DatasetRecord, string>;

  constructor() {
    super('YOLOAnnotationDB');

    // 定義數據庫版本和 schema
    this.version(1).stores({
      // images 表: 主鍵 id, 索引 filename, createdAt, updatedAt
      images: 'id, filename, createdAt, updatedAt',
      // classes 表: 主鍵 id, 索引 name
      classes: 'id, name',
    });

    // v2: 新增 datasets 表
    this.version(2).stores({
      images: 'id, filename, createdAt, updatedAt',
      classes: 'id, name',
      datasets: 'id, name, createdAt',
    });
  }
}

// 創建數據庫實例
export const db = new AnnotationDatabase();

// 數據庫操作輔助函數

/**
 * 保存圖片標註到 IndexedDB
 */
export async function saveImage(image: ImageAnnotation): Promise<void> {
  await db.images.put(image);
}

/**
 * 批量保存圖片標註
 */
export async function saveImages(images: ImageAnnotation[]): Promise<void> {
  await db.images.bulkPut(images);
}

/**
 * 從 IndexedDB 載入所有圖片
 */
export async function loadImages(): Promise<ImageAnnotation[]> {
  return await db.images.toArray();
}

/**
 * 從 IndexedDB 刪除圖片
 */
export async function deleteImage(id: string): Promise<void> {
  await db.images.delete(id);
}

/**
 * 保存類別到 IndexedDB
 */
export async function saveClass(classDefinition: ClassDefinition): Promise<void> {
  await db.classes.put(classDefinition);
}

/**
 * 批量保存類別
 */
export async function saveClasses(classes: ClassDefinition[]): Promise<void> {
  await db.classes.bulkPut(classes);
}

/**
 * 從 IndexedDB 載入所有類別
 */
export async function loadClasses(): Promise<ClassDefinition[]> {
  return await db.classes.toArray();
}

/**
 * 從 IndexedDB 刪除類別
 */
export async function deleteClass(id: number): Promise<void> {
  await db.classes.delete(id);
}

/**
 * 清空所有數據
 */
export async function clearAllData(): Promise<void> {
  await db.images.clear();
  await db.classes.clear();
}

/**
 * 獲取數據庫統計資訊
 */
export async function getDatabaseStats() {
  const imageCount = await db.images.count();
  const classCount = await db.classes.count();

  // 估算數據庫大小
  const images = await db.images.toArray();
  const estimatedSize = images.reduce((sum, img) => {
    return sum + (img.dataUrl?.length || 0);
  }, 0);

  return {
    imageCount,
    classCount,
    estimatedSizeBytes: estimatedSize,
    estimatedSizeMB: (estimatedSize / 1024 / 1024).toFixed(2),
  };
}

// ============== Dataset 相關操作 ==============

/**
 * 保存資料集到 IndexedDB
 */
export async function saveDataset(dataset: Dataset): Promise<void> {
  const record: DatasetRecord = {
    ...dataset,
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
  };
  await db.datasets.put(record);
}

/**
 * 批量保存資料集
 */
export async function saveDatasets(datasets: Dataset[]): Promise<void> {
  const records: DatasetRecord[] = datasets.map((dataset) => ({
    ...dataset,
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
  }));
  await db.datasets.bulkPut(records);
}

/**
 * 從 IndexedDB 載入所有資料集
 */
export async function loadDatasets(): Promise<Dataset[]> {
  const records = await db.datasets.toArray();
  return records.map((record) => ({
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  }));
}

/**
 * 從 IndexedDB 刪除資料集
 */
export async function deleteDataset(id: string): Promise<void> {
  await db.datasets.delete(id);
}

/**
 * 清空所有資料集
 */
export async function clearDatasets(): Promise<void> {
  await db.datasets.clear();
}
