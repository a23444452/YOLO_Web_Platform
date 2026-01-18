import { create } from 'zustand';
import type { ImageAnnotation, ClassDefinition, BoundingBox } from '@/types';
import { CLASS_COLORS } from '@/lib/constants';
import {
  db,
  saveImage,
  saveImages,
  loadImages,
  deleteImage as dbDeleteImage,
  saveClass,
  saveClasses,
  loadClasses,
  deleteClass as dbDeleteClass,
} from '@/lib/db';

// 歷史記錄條目
interface HistoryEntry {
  images: ImageAnnotation[];
  classes: ClassDefinition[];
  timestamp: Date;
}

interface AnnotationState {
  // 數據
  images: ImageAnnotation[];
  classes: ClassDefinition[];
  currentImageId: string | null;
  selectedBoxId: string | null;

  // 檔案系統存取
  directoryHandle: FileSystemDirectoryHandle | null;
  setDirectoryHandle: (handle: FileSystemDirectoryHandle | null) => void;

  // 歷史記錄
  history: HistoryEntry[];
  historyIndex: number;
  isUndoRedoAction: boolean; // 標記是否正在執行 undo/redo,避免重複記錄歷史

  // 初始化
  loadFromDB: () => Promise<void>;
  isLoaded: boolean;

  // 內部方法
  _recordHistory: () => void;

  // Actions
  addImages: (files: File[]) => Promise<{ added: number; duplicates: string[] } | void>;
  loadFolderWithAnnotations: (dirHandle: FileSystemDirectoryHandle) => Promise<{ images: number; annotations: number; classes: number }>;
  removeImage: (id: string) => void;
  clearAllImages: () => void;
  setCurrentImage: (id: string | null) => void;

  addClass: (name: string) => void;
  addClassesFromList: (names: string[]) => number; // 返回新增的類別數量
  removeClass: (id: number) => void;
  updateClass: (id: number, name: string) => void;

  addBox: (imageId: string, box: Omit<BoundingBox, 'id'>) => void;
  updateBox: (imageId: string, boxId: string, updates: Partial<BoundingBox>) => void;
  removeBox: (imageId: string, boxId: string) => void;
  setSelectedBox: (boxId: string | null) => void;

  getCurrentImage: () => ImageAnnotation | null;
  getSelectedBox: () => BoundingBox | null;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // 導出功能
  exportAnnotations: () => Promise<Blob>;

  // 保存到檔案系統
  saveCurrentAnnotation: () => Promise<void>;
  saveAllAnnotations: () => Promise<{ saved: number; failed: number }>;
}

// 創建深拷貝以避免引用問題
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  images: [],
  classes: [
    { id: 0, name: 'person', color: CLASS_COLORS[0], count: 0 },
  ],
  currentImageId: null,
  selectedBoxId: null,

  // 檔案系統存取
  directoryHandle: null,
  setDirectoryHandle: (handle) => set({ directoryHandle: handle }),

  // 歷史記錄初始狀態
  history: [],
  historyIndex: -1,
  isUndoRedoAction: false,
  isLoaded: false,

  // 從 IndexedDB 載入數據
  loadFromDB: async () => {
    try {
      const [images, classes] = await Promise.all([
        loadImages(),
        loadClasses(),
      ]);

      // 如果 DB 中有數據,載入它
      if (images.length > 0 || classes.length > 0) {
        set({
          images,
          classes: classes.length > 0 ? classes : get().classes,
          isLoaded: true,
        });

        // 初始化歷史記錄
        const state = get();
        set({
          history: [{
            images: deepClone(state.images),
            classes: deepClone(state.classes),
            timestamp: new Date(),
          }],
          historyIndex: 0,
        });
      } else {
        // DB 為空,保存初始狀態
        await saveClasses(get().classes);
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
      set({ isLoaded: true });
    }
  },

  // 記錄歷史的輔助函數
  _recordHistory: () => {
    const state = get();

    // 如果正在執行 undo/redo,不記錄歷史
    if (state.isUndoRedoAction) return;

    // 移除當前位置之後的所有歷史
    const newHistory = state.history.slice(0, state.historyIndex + 1);

    // 添加新的歷史記錄
    newHistory.push({
      images: deepClone(state.images),
      classes: deepClone(state.classes),
      timestamp: new Date(),
    });

    // 限制歷史記錄數量(最多保留 50 個)
    const maxHistory = 50;
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  addImages: async (files: File[]) => {
    const state = get();
    const existingFilenames = new Set(state.images.map((img) => img.filename));

    // 過濾掉重複的檔案
    const uniqueFiles: File[] = [];
    const duplicateFiles: string[] = [];

    for (const file of files) {
      if (existingFilenames.has(file.name)) {
        duplicateFiles.push(file.name);
      } else {
        uniqueFiles.push(file);
        existingFilenames.add(file.name); // 避免同批次重複
      }
    }

    if (uniqueFiles.length === 0) {
      return { added: 0, duplicates: duplicateFiles };
    }

    const newImages: ImageAnnotation[] = await Promise.all(
      uniqueFiles.map(async (file) => {
        const dataUrl = await readFileAsDataURL(file);
        const { width, height } = await getImageDimensions(dataUrl);

        return {
          id: crypto.randomUUID(),
          filename: file.name,
          width,
          height,
          dataUrl,
          boxes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      })
    );

    set((state) => ({
      images: [...state.images, ...newImages],
      currentImageId: state.currentImageId || newImages[0]?.id || null,
    }));

    // 保存到 IndexedDB
    await saveImages(newImages);

    // 記錄歷史
    get()._recordHistory();

    return { added: newImages.length, duplicates: duplicateFiles };
  },

  removeImage: (id: string) => {
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
      currentImageId: state.currentImageId === id ? null : state.currentImageId,
    }));

    // 從 IndexedDB 刪除
    dbDeleteImage(id);

    // 記錄歷史
    get()._recordHistory();
  },

  clearAllImages: () => {
    set({
      images: [],
      currentImageId: null,
      selectedBoxId: null,
    });

    // 從 IndexedDB 清空所有圖片
    db.images.clear();

    // 記錄歷史
    get()._recordHistory();
  },

  setCurrentImage: (id: string | null) => {
    set({ currentImageId: id, selectedBoxId: null });
    // 不記錄歷史(僅 UI 狀態變更)
  },

  addClass: (name: string) => {
    let newClass: ClassDefinition;

    set((state) => {
      const newId = Math.max(...state.classes.map(c => c.id), -1) + 1;
      const color = CLASS_COLORS[newId % CLASS_COLORS.length];

      newClass = { id: newId, name, color, count: 0 };

      return {
        classes: [...state.classes, newClass],
      };
    });

    // 保存到 IndexedDB
    saveClass(newClass!);

    // 記錄歷史
    get()._recordHistory();
  },

  addClassesFromList: (names: string[]) => {
    const newClasses: ClassDefinition[] = [];

    set((state) => {
      // 獲取現有類別名稱(小寫比較,避免大小寫重複)
      const existingNames = new Set(
        state.classes.map(c => c.name.toLowerCase())
      );

      // 過濾掉已存在的類別名稱
      const uniqueNames = names.filter(name => {
        const trimmedName = name.trim();
        return trimmedName && !existingNames.has(trimmedName.toLowerCase());
      });

      // 生成新類別
      let currentMaxId = Math.max(...state.classes.map(c => c.id), -1);

      uniqueNames.forEach(name => {
        currentMaxId += 1;
        const color = CLASS_COLORS[currentMaxId % CLASS_COLORS.length];
        newClasses.push({
          id: currentMaxId,
          name: name.trim(),
          color,
          count: 0,
        });
      });

      return {
        classes: [...state.classes, ...newClasses],
      };
    });

    // 批量保存到 IndexedDB
    if (newClasses.length > 0) {
      saveClasses(newClasses);
      // 記錄歷史
      get()._recordHistory();
    }

    return newClasses.length;
  },

  removeClass: (id: number) => {
    set((state) => {
      const updatedImages = state.images.map((img) => ({
        ...img,
        boxes: img.boxes.filter((box) => box.classId !== id),
        updatedAt: new Date(),
      }));

      return {
        classes: state.classes.filter((c) => c.id !== id),
        images: updatedImages,
      };
    });

    // 從 IndexedDB 刪除
    dbDeleteClass(id);

    // 更新受影響的圖片
    const state = get();
    const affectedImages = state.images.filter((img) =>
      img.boxes.some((box) => box.classId === id)
    );
    saveImages(affectedImages);

    // 記錄歷史
    get()._recordHistory();
  },

  updateClass: (id: number, name: string) => {
    set((state) => {
      const updatedImages = state.images.map((img) => ({
        ...img,
        boxes: img.boxes.map((box) =>
          box.classId === id ? { ...box, className: name } : box
        ),
      }));

      return {
        classes: state.classes.map((c) =>
          c.id === id ? { ...c, name } : c
        ),
        images: updatedImages,
      };
    });

    // 保存到 IndexedDB
    const state = get();
    const updatedClass = state.classes.find(c => c.id === id);
    if (updatedClass) {
      saveClass(updatedClass);
    }

    // 更新受影響的圖片
    const affectedImages = state.images.filter((img) =>
      img.boxes.some((box) => box.classId === id)
    );
    saveImages(affectedImages);

    // 記錄歷史
    get()._recordHistory();
  },

  addBox: (imageId: string, box: Omit<BoundingBox, 'id'>) => {
    const newBox: BoundingBox = {
      ...box,
      id: crypto.randomUUID(),
    };

    set((state) => ({
      images: state.images.map((img) =>
        img.id === imageId
          ? { ...img, boxes: [...img.boxes, newBox], updatedAt: new Date() }
          : img
      ),
      classes: state.classes.map((c) =>
        c.id === box.classId ? { ...c, count: c.count + 1 } : c
      ),
    }));

    // 保存到 IndexedDB
    const state = get();
    const updatedImage = state.images.find((img) => img.id === imageId);
    if (updatedImage) {
      saveImage(updatedImage);
    }

    const updatedClass = state.classes.find(c => c.id === box.classId);
    if (updatedClass) {
      saveClass(updatedClass);
    }

    // 記錄歷史
    get()._recordHistory();
  },

  updateBox: (imageId: string, boxId: string, updates: Partial<BoundingBox>) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === imageId
          ? {
              ...img,
              boxes: img.boxes.map((box) =>
                box.id === boxId ? { ...box, ...updates } : box
              ),
              updatedAt: new Date(),
            }
          : img
      ),
    }));

    // 保存到 IndexedDB
    const state = get();
    const updatedImage = state.images.find((img) => img.id === imageId);
    if (updatedImage) {
      saveImage(updatedImage);
    }

    // 記錄歷史
    get()._recordHistory();
  },

  removeBox: (imageId: string, boxId: string) => {
    set((state) => {
      const image = state.images.find((img) => img.id === imageId);
      const box = image?.boxes.find((b) => b.id === boxId);

      return {
        images: state.images.map((img) =>
          img.id === imageId
            ? {
                ...img,
                boxes: img.boxes.filter((b) => b.id !== boxId),
                updatedAt: new Date(),
              }
            : img
        ),
        classes: box
          ? state.classes.map((c) =>
              c.id === box.classId ? { ...c, count: Math.max(0, c.count - 1) } : c
            )
          : state.classes,
        selectedBoxId: state.selectedBoxId === boxId ? null : state.selectedBoxId,
      };
    });

    // 保存到 IndexedDB
    const state = get();
    const updatedImage = state.images.find((img) => img.id === imageId);
    if (updatedImage) {
      saveImage(updatedImage);
    }

    // 記錄歷史
    get()._recordHistory();
  },

  setSelectedBox: (boxId: string | null) => {
    set({ selectedBoxId: boxId });
    // 不記錄歷史(僅 UI 狀態變更)
  },

  getCurrentImage: () => {
    const state = get();
    return state.images.find((img) => img.id === state.currentImageId) || null;
  },

  getSelectedBox: () => {
    const state = get();
    const currentImage = state.getCurrentImage();
    if (!currentImage || !state.selectedBoxId) return null;
    return currentImage.boxes.find((box) => box.id === state.selectedBoxId) || null;
  },

  // Undo 功能
  undo: () => {
    const state = get();

    if (!state.canUndo()) return;

    const prevIndex = state.historyIndex - 1;
    const prevEntry = state.history[prevIndex];

    set({
      images: deepClone(prevEntry.images),
      classes: deepClone(prevEntry.classes),
      historyIndex: prevIndex,
      isUndoRedoAction: true,
    });

    // 保存到 IndexedDB
    saveImages(prevEntry.images);
    saveClasses(prevEntry.classes);

    // 重置標記
    setTimeout(() => set({ isUndoRedoAction: false }), 0);
  },

  // Redo 功能
  redo: () => {
    const state = get();

    if (!state.canRedo()) return;

    const nextIndex = state.historyIndex + 1;
    const nextEntry = state.history[nextIndex];

    set({
      images: deepClone(nextEntry.images),
      classes: deepClone(nextEntry.classes),
      historyIndex: nextIndex,
      isUndoRedoAction: true,
    });

    // 保存到 IndexedDB
    saveImages(nextEntry.images);
    saveClasses(nextEntry.classes);

    // 重置標記
    setTimeout(() => set({ isUndoRedoAction: false }), 0);
  },

  // 檢查是否可以 Undo
  canUndo: () => {
    const state = get();
    return state.historyIndex > 0;
  },

  // 檢查是否可以 Redo
  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  loadFolderWithAnnotations: async (dirHandle: FileSystemDirectoryHandle) => {
    try {
      const imageFiles: File[] = [];
      const labelFiles = new Map<string, string>(); // filename -> label content
      let classesContent = '';

      // 讀取資料夾中的所有檔案
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();

          // 圖片檔案
          if (file.type.startsWith('image/')) {
            imageFiles.push(file);
          }
          // classes.txt
          else if (file.name.toLowerCase() === 'classes.txt') {
            classesContent = await file.text();
          }
          // YOLO 標註檔案
          else if (file.name.endsWith('.txt')) {
            const baseName = file.name.replace(/\.txt$/, '');
            labelFiles.set(baseName, await file.text());
          }
        }
      }

      // 載入 classes
      let loadedClasses = 0;
      if (classesContent) {
        const classNames = classesContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);

        // 清除現有類別（包含預設的 person），重新從 classes.txt 建立
        // 這樣可以確保 class id 和 classes.txt 的行號一致
        set({ classes: [] });

        // 根據 classes.txt 的順序建立類別，id 從 0 開始
        const newClasses: ClassDefinition[] = classNames.map((name, index) => ({
          id: index,
          name: name.trim(),
          color: CLASS_COLORS[index % CLASS_COLORS.length],
          count: 0,
        }));

        set({ classes: newClasses });
        await saveClasses(newClasses);
        loadedClasses = newClasses.length;
      }

      // 載入圖片和標註
      const state = get();
      const newImages: ImageAnnotation[] = [];

      for (const file of imageFiles) {
        const dataUrl = await readFileAsDataURL(file);
        const { width, height } = await getImageDimensions(dataUrl);

        // 解析 YOLO 標註
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const labelContent = labelFiles.get(baseName);
        const boxes: BoundingBox[] = [];

        if (labelContent) {
          const lines = labelContent.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              const classId = parseInt(parts[0]);
              const x = parseFloat(parts[1]);
              const y = parseFloat(parts[2]);
              const w = parseFloat(parts[3]);
              const h = parseFloat(parts[4]);

              // 確認類別存在
              const classObj = state.classes.find(c => c.id === classId);
              if (classObj) {
                boxes.push({
                  id: crypto.randomUUID(),
                  classId,
                  className: classObj.name,
                  color: classObj.color,
                  x,
                  y,
                  width: w,
                  height: h,
                });
              }
            }
          }
        }

        newImages.push({
          id: crypto.randomUUID(),
          filename: file.name,
          width,
          height,
          dataUrl,
          boxes,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // 更新 store
      set({
        images: newImages,
        currentImageId: newImages[0]?.id || null,
        directoryHandle: dirHandle,
      });

      // 保存到 IndexedDB
      await saveImages(newImages);

      // 記錄歷史
      get()._recordHistory();

      const totalAnnotations = newImages.reduce((sum, img) => sum + img.boxes.length, 0);
      return {
        images: newImages.length,
        annotations: totalAnnotations,
        classes: loadedClasses,
      };
    } catch (error) {
      console.error('Failed to load folder:', error);
      throw error;
    }
  },

  saveCurrentAnnotation: async () => {
    const state = get();
    const currentImage = state.getCurrentImage();

    if (!currentImage) {
      throw new Error('沒有選擇圖片');
    }

    if (!state.directoryHandle) {
      throw new Error('沒有檔案系統存取權限，請使用「選擇資料夾」功能');
    }

    // 生成 YOLO 格式標註
    const yoloLines = currentImage.boxes.map(box => {
      return `${box.classId} ${box.x.toFixed(6)} ${box.y.toFixed(6)} ${box.width.toFixed(6)} ${box.height.toFixed(6)}`;
    }).join('\n');

    const labelFilename = currentImage.filename.replace(/\.[^/.]+$/, '.txt');

    // 寫入檔案
    const fileHandle = await state.directoryHandle.getFileHandle(labelFilename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(yoloLines);
    await writable.close();
  },

  saveAllAnnotations: async () => {
    const state = get();

    if (!state.directoryHandle) {
      throw new Error('沒有檔案系統存取權限，請使用「選擇資料夾」功能');
    }

    let saved = 0;
    let failed = 0;

    // 保存 classes.txt
    try {
      const classesText = state.classes
        .sort((a, b) => a.id - b.id)
        .map(c => c.name)
        .join('\n');

      const classesHandle = await state.directoryHandle.getFileHandle('classes.txt', { create: true });
      const writable = await classesHandle.createWritable();
      await writable.write(classesText);
      await writable.close();
    } catch (error) {
      console.error('Failed to save classes.txt:', error);
    }

    // 保存每張圖片的標註
    for (const image of state.images) {
      try {
        if (image.boxes.length > 0) {
          const yoloLines = image.boxes.map(box => {
            return `${box.classId} ${box.x.toFixed(6)} ${box.y.toFixed(6)} ${box.width.toFixed(6)} ${box.height.toFixed(6)}`;
          }).join('\n');

          const labelFilename = image.filename.replace(/\.[^/.]+$/, '.txt');
          const fileHandle = await state.directoryHandle.getFileHandle(labelFilename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(yoloLines);
          await writable.close();
          saved++;
        }
      } catch (error) {
        console.error(`Failed to save ${image.filename}:`, error);
        failed++;
      }
    }

    return { saved, failed };
  },

  exportAnnotations: async () => {
    try {
      const state = get();

      // 動態載入 JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // 1. 生成 classes.txt
      const classesText = state.classes
        .sort((a, b) => a.id - b.id)
        .map(c => c.name)
        .join('\n');
      zip.file('classes.txt', classesText);

      // 2. 為每張圖片生成 YOLO 格式標註
      const imagesFolder = zip.folder('images');
      const labelsFolder = zip.folder('labels');

      for (const image of state.images) {
        // 保存圖片
        if (imagesFolder) {
          // 從 dataUrl 提取圖片數據
          const base64Data = image.dataUrl.split(',')[1];
          if (!base64Data) {
            throw new Error(`無法提取圖片數據: ${image.filename}`);
          }
          imagesFolder.file(image.filename, base64Data, { base64: true });
        }

        // 生成 YOLO 標註檔案
        if (labelsFolder && image.boxes.length > 0) {
          const yoloLines = image.boxes.map(box => {
            // YOLO 格式: <class_id> <x_center> <y_center> <width> <height>
            // 座標已經是歸一化的 (0-1)
            return `${box.classId} ${box.x.toFixed(6)} ${box.y.toFixed(6)} ${box.width.toFixed(6)} ${box.height.toFixed(6)}`;
          }).join('\n');

          const labelFilename = image.filename.replace(/\.[^/.]+$/, '.txt');
          labelsFolder.file(labelFilename, yoloLines);
        }
      }

      // 3. 生成 data.yaml
      const dataYaml = `# YOLO Dataset Configuration
# Generated by YOLO Web Platform

path: ./  # dataset root dir
train: images  # train images
val: images    # val images (using same for demo)

# Classes
nc: ${state.classes.length}  # number of classes
names: ${JSON.stringify(state.classes.sort((a, b) => a.id - b.id).map(c => c.name))}  # class names
`;
      zip.file('data.yaml', dataYaml);

      // 4. 生成 README.md
      const readme = `# YOLO Dataset Export

Generated: ${new Date().toISOString()}

## Dataset Statistics
- Total Images: ${state.images.length}
- Total Annotations: ${state.images.reduce((sum, img) => sum + img.boxes.length, 0)}
- Classes: ${state.classes.length}

## Class Distribution
${state.classes.map(c => `- ${c.name}: ${c.count} annotations`).join('\n')}

## Directory Structure
\`\`\`
dataset/
├── images/           # Images
├── labels/           # YOLO format annotations (.txt)
├── classes.txt       # Class names (one per line)
├── data.yaml         # YOLO configuration file
└── README.md         # This file
\`\`\`

## YOLO Format
Each .txt file contains annotations in the format:
\`\`\`
<class_id> <x_center> <y_center> <width> <height>
\`\`\`
All coordinates are normalized to [0, 1].

## Usage with YOLO
\`\`\`bash
# Train with Ultralytics YOLO
yolo train data=data.yaml model=yolov8n.pt epochs=100
\`\`\`

Generated with YOLO Web Platform
`;
      zip.file('README.md', readme);

      // 5. 生成 ZIP
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      return blob;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  },
}));

// 輔助函數
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = dataUrl;
  });
}
