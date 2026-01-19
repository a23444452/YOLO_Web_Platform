import { useCallback, useState, useRef, useEffect } from 'react';
import { useAnnotationStore } from '@/stores/annotationStore';
import { ImageUploadZone } from '@/components/annotation/ImageUploadZone';
import { ImageList } from '@/components/annotation/ImageList';
import { ClassManager } from '@/components/annotation/ClassManager';
import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas';
import { Button } from '@/components/ui/button';
import { Download, Save, Loader2, Upload, FolderOpen, FolderSync, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { listInferenceModels, runInference, loadModel, type ModelInfo } from '@/lib/api';

export function Annotation() {
  const {
    images,
    getCurrentImage,
    exportAnnotations,
    loadFolderWithAnnotations,
    saveCurrentAnnotation,
    saveAllAnnotations,
    directoryHandle,
  } = useAnnotationStore();
  const currentImage = getCurrentImage();
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // 自動標註相關狀態
  const [isAutoLabelOpen, setIsAutoLabelOpen] = useState(false);
  const [isAutoLabeling, setIsAutoLabeling] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [confidence, setConfidence] = useState([0.7]);
  const [iou, setIou] = useState([0.8]);

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: 保存當前
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (directoryHandle && currentImage && !isSaving) {
          handleSave();
        }
      }
      // Ctrl+Shift+S: 保存全部
      else if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (directoryHandle && !isSaving) {
          handleSaveAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [directoryHandle, currentImage, isSaving]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    // 分離圖片文件和 classes.txt
    const imageFiles = files.filter((file) =>
      file.type.startsWith('image/')
    );
    const classesFile = files.find((file) =>
      file.name.toLowerCase() === 'classes.txt'
    );

    if (imageFiles.length === 0) {
      toast.error('請選擇有效的圖片文件');
      return;
    }

    try {
      // 如果有 classes.txt,先處理它
      if (classesFile) {
        const text = await classesFile.text();
        const classNames = text
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);

        const addedCount = useAnnotationStore.getState().addClassesFromList(classNames);
        if (addedCount > 0) {
          toast.success(`已從 classes.txt 添加 ${addedCount} 個新類別`);
        }
      }

      // 然後處理圖片（會自動過濾重複檔案）
      const result = await useAnnotationStore.getState().addImages(imageFiles);

      if (result) {
        if (result.added > 0) {
          toast.success(`成功上傳 ${result.added} 張圖片`);
        }
        if (result.duplicates.length > 0) {
          toast.warning(
            `已跳過 ${result.duplicates.length} 張重複圖片`,
            {
              description: result.duplicates.length <= 3
                ? result.duplicates.join(', ')
                : `${result.duplicates.slice(0, 3).join(', ')} 等...`,
            }
          );
        }
        if (result.added === 0 && result.duplicates.length > 0) {
          toast.info('所有圖片皆已存在');
        }
      }
    } catch (error) {
      toast.error('上傳失敗');
      console.error(error);
    }
  }, []);

  const handleExport = useCallback(async () => {
    // 檢查是否有圖片
    if (images.length === 0) {
      toast.error('沒有圖片可導出');
      return;
    }

    // 檢查是否有標註
    const annotatedImages = images.filter(img => img.boxes.length > 0);
    if (annotatedImages.length === 0) {
      toast.error('沒有標註可導出');
      return;
    }

    setIsExporting(true);

    try {
      const blob = await exportAnnotations();

      // 創建下載連結
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yolo-dataset-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`成功導出 ${annotatedImages.length} 張已標註圖片`);
    } catch (error) {
      let errorMessage = '導出失敗,請稍後重試';
      if (error instanceof Error) {
        errorMessage = `導出失敗: ${error.message}`;
      }
      toast.error(errorMessage);
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [images, exportAnnotations]);

  const handleOpenFolder = useCallback(async () => {
    try {
      // 檢查瀏覽器是否支援 File System Access API
      if (!('showDirectoryPicker' in window)) {
        toast.error('您的瀏覽器不支援此功能，請使用 Chrome 或 Edge');
        return;
      }

      // 請求使用者選擇資料夾
      const dirHandle = await (window as Window & typeof globalThis & { showDirectoryPicker: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
        mode: 'readwrite',
      });

      toast.info('正在載入資料夾...');

      // 載入資料夾中的圖片和標註
      const result = await loadFolderWithAnnotations(dirHandle);

      toast.success(
        `成功載入 ${result.images} 張圖片，${result.annotations} 個標註`,
        {
          description: result.classes > 0 ? `新增 ${result.classes} 個類別` : undefined,
        }
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 使用者取消選擇
        return;
      }
      toast.error('載入資料夾失敗');
      console.error(error);
    }
  }, [loadFolderWithAnnotations]);

  const handleSave = useCallback(async () => {
    if (!directoryHandle) {
      toast.error('請先使用「開啟資料夾」功能');
      return;
    }

    setIsSaving(true);

    try {
      await saveCurrentAnnotation();
      toast.success('已保存當前標註');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存失敗';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [directoryHandle, saveCurrentAnnotation]);

  const handleSaveAll = useCallback(async () => {
    if (!directoryHandle) {
      toast.error('請先使用「開啟資料夾」功能');
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveAllAnnotations();
      if (result.failed > 0) {
        toast.warning(`已保存 ${result.saved} 個檔案，${result.failed} 個失敗`);
      } else {
        toast.success(`已保存 ${result.saved} 個標註檔案`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存失敗';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [directoryHandle, saveAllAnnotations]);

  // 載入可用模型列表
  const handleOpenAutoLabel = useCallback(async () => {
    try {
      const response = await listInferenceModels();
      setAvailableModels(response.models);
      if (response.models.length === 0) {
        toast.error('沒有可用的訓練模型，請先訓練模型');
        return;
      }
      // 預設選擇第一個模型
      if (response.models.length > 0 && !selectedModelId) {
        setSelectedModelId(response.models[0].model_id);
      }
      setIsAutoLabelOpen(true);
    } catch (error) {
      toast.error('載入模型列表失敗');
      console.error(error);
    }
  }, [selectedModelId]);

  // 執行自動標註
  const handleAutoLabel = useCallback(async () => {
    if (!selectedModelId) {
      toast.error('請選擇模型');
      return;
    }

    if (images.length === 0) {
      toast.error('沒有圖片可標註');
      return;
    }

    const { classes, addBox } = useAnnotationStore.getState();

    setIsAutoLabeling(true);
    setIsAutoLabelOpen(false);

    try {
      // 載入模型
      console.log(`開始自動標註，模型 ID: ${selectedModelId}`);
      toast.loading('正在載入模型...', { id: 'auto-label' });
      await loadModel(selectedModelId);
      console.log('✅ 模型載入成功');

      // 找到選定的模型資訊
      const selectedModel = availableModels.find(m => m.model_id === selectedModelId);
      if (!selectedModel) {
        throw new Error('找不到選定的模型');
      }
      console.log('選定的模型:', selectedModel.name, '類別:', selectedModel.classes);

      // 批次處理所有圖片
      let successCount = 0;
      let failCount = 0;
      let totalBoxes = 0;

      toast.loading(`正在標註 ${images.length} 張圖片...`, { id: 'auto-label' });

      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        try {
          // 提取純 base64 數據（移除 data URL 前綴）
          const base64Data = image.dataUrl.split(',')[1] || image.dataUrl;
          console.log(`處理圖片 ${i + 1}/${images.length}: ${image.filename}, 寬=${image.width}, 高=${image.height}`);

          // 執行推論
          const result = await runInference(
            selectedModelId,
            base64Data,
            confidence[0],
            iou[0]
          );

          console.log(`圖片 ${image.filename} 推論結果:`, result.detections.length, '個偵測', result.detections);
          console.log('當前可用的類別:', classes.map(c => ({ id: c.id, name: c.name })));

          // 轉換推論結果為標註框
          for (const detection of result.detections) {
            // 找到對應的類別
            const classObj = classes.find(c => c.name === detection.class_name);

            if (!classObj) {
              // 如果類別不存在，跳過此偵測
              console.error(`❌ 類別 "${detection.class_name}" 不存在於當前類別列表中，跳過此偵測`);
              console.log('可用類別名稱:', classes.map(c => c.name).join(', '));
              continue;
            }

            // 從 API 的 bbox 格式 (x1, y1, x2, y2 像素座標) 轉換為 YOLO 格式 (中心點 x, y, 寬, 高, 歸一化 0-1)
            // 使用圖片的實際寬高進行歸一化
            const x1 = detection.bbox.x1 / image.width;
            const y1 = detection.bbox.y1 / image.height;
            const x2 = detection.bbox.x2 / image.width;
            const y2 = detection.bbox.y2 / image.height;

            const centerX = (x1 + x2) / 2;
            const centerY = (y1 + y2) / 2;
            const width = x2 - x1;
            const height = y2 - y1;

            // 添加標註框
            console.log(`準備添加標註框: 圖片ID=${image.id}, 類別=${classObj.name} (ID=${classObj.id}), 座標=(${centerX.toFixed(4)}, ${centerY.toFixed(4)}), 尺寸=(${width.toFixed(4)}, ${height.toFixed(4)})`);

            addBox(image.id, {
              classId: classObj.id,  // 使用實際的類別 ID
              className: classObj.name,
              x: centerX,
              y: centerY,
              width,
              height,
              color: classObj.color,
            });

            totalBoxes++;
            console.log(`✅ 已成功添加標註框: 類別=${classObj.name} (ID=${classObj.id}), 信心度=${detection.confidence.toFixed(2)}`);
          }

          successCount++;

          // 更新進度
          if ((i + 1) % 5 === 0 || i === images.length - 1) {
            toast.loading(
              `已標註 ${i + 1}/${images.length} 張圖片，偵測到 ${totalBoxes} 個物體`,
              { id: 'auto-label' }
            );
          }
        } catch (error) {
          console.error(`❌ 處理圖片 ${image.filename} 失敗:`, error);
          if (error instanceof Error) {
            console.error('錯誤訊息:', error.message);
            console.error('錯誤堆疊:', error.stack);
          }
          failCount++;
        }
      }

      toast.success(
        `自動標註完成！成功: ${successCount}，失敗: ${failCount}，共偵測到 ${totalBoxes} 個物體`,
        { id: 'auto-label' }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '自動標註失敗';
      toast.error(errorMessage, { id: 'auto-label' });
      console.error('Auto label error:', error);
    } finally {
      setIsAutoLabeling(false);
    }
  }, [selectedModelId, images, confidence, iou, availableModels]);

  if (images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-6">
          <ImageUploadZone onFilesSelected={handleFilesSelected} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">或</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-24"
            onClick={handleOpenFolder}
          >
            <FolderOpen className="mr-2 h-6 w-6" />
            開啟資料夾（含現有標註）
          </Button>

          <div className="p-6 bg-muted rounded-lg">
            <h3 className="font-semibold mb-4">功能說明</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>
                <strong>開啟資料夾：</strong>自動讀取資料夾中的圖片、YOLO 標註檔（.txt）和類別檔（classes.txt）
              </div>
              <div>
                <strong>保存：</strong>標註完成後自動保存到原資料夾，無需手動導出
              </div>
            </div>

            <h3 className="font-semibold mb-2 mt-4">快捷鍵</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>1-9: 切換類別</div>
              <div>Delete: 刪除選中框</div>
              <div>← →: 切換圖片</div>
              <div>Ctrl+Z: 撤銷</div>
              <div>Ctrl+S: 保存當前</div>
              <div>Ctrl+Shift+S: 保存全部</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">圖像標註</h2>
          <span className="text-sm text-muted-foreground">
            已標註 {images.filter(img => img.boxes.length > 0).length} / {images.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!directoryHandle && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                上傳圖片
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                選擇資料夾
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAutoLabel}
            disabled={isAutoLabeling || images.length === 0}
          >
            {isAutoLabeling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                標註中...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                自動標註
              </>
            )}
          </Button>
          {directoryHandle && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !currentImage}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存當前 (Ctrl+S)
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <FolderSync className="mr-2 h-4 w-4" />
                    保存全部 (Ctrl+Shift+S)
                  </>
                )}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                導出中...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                導出 ZIP
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-96 border-r border-border flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <ImageList />
          </div>
          <div className="border-t border-border">
            <ClassManager />
          </div>
        </aside>

        <main className="flex-1 bg-muted/20">
          {currentImage ? (
            <AnnotationCanvas image={currentImage} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              請選擇一張圖片開始標註
            </div>
          )}
        </main>
      </div>

      {/* 隱藏的檔案輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in TypeScript types
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* 自動標註對話框 */}
      <Dialog open={isAutoLabelOpen} onOpenChange={setIsAutoLabelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>自動標註</DialogTitle>
            <DialogDescription>
              使用訓練好的模型自動標註所有圖片。自動產生的標註可在介面上進行微調與修正。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="model">選擇模型</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="請選擇模型" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.model_id} value={model.model_id}>
                      {model.name} ({model.yolo_version}{model.model_size})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                共 {availableModels.length} 個可用模型
              </p>
            </div>

            <div>
              <Label>信心度閾值 (Confidence): {confidence[0].toFixed(2)}</Label>
              <Slider
                value={confidence}
                onValueChange={setConfidence}
                min={0.1}
                max={0.95}
                step={0.05}
              />
              <p className="text-xs text-muted-foreground mt-1">
                低於此信心度的偵測結果將被過濾
              </p>
            </div>

            <div>
              <Label>IOU 閾值: {iou[0].toFixed(2)}</Label>
              <Slider
                value={iou}
                onValueChange={setIou}
                min={0.1}
                max={0.95}
                step={0.05}
              />
              <p className="text-xs text-muted-foreground mt-1">
                用於非極大值抑制 (NMS)，移除重疊的偵測框
              </p>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-sm">
                <strong>將處理：</strong>{images.length} 張圖片
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                注意：自動標註會在現有標註基礎上添加新的偵測結果
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAutoLabelOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleAutoLabel} disabled={!selectedModelId}>
              <Wand2 className="mr-2 h-4 w-4" />
              開始自動標註
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
