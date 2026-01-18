import { useCallback, useState, useRef } from 'react';
import { useAnnotationStore } from '@/stores/annotationStore';
import { ImageUploadZone } from '@/components/annotation/ImageUploadZone';
import { ImageList } from '@/components/annotation/ImageList';
import { ClassManager } from '@/components/annotation/ClassManager';
import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas';
import { Button } from '@/components/ui/button';
import { Download, Save, Loader2, Upload, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

export function Annotation() {
  const { images, getCurrentImage, exportAnnotations } = useAnnotationStore();
  const currentImage = getCurrentImage();
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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

  const handleSave = useCallback(() => {
    toast.success('標註已自動保存');
  }, []);

  if (images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <ImageUploadZone onFilesSelected={handleFilesSelected} />
          <div className="mt-8 p-6 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">快捷鍵</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>1-9: 切換類別</div>
              <div>Delete: 刪除選中框</div>
              <div>← →: 切換圖片</div>
              <div>Ctrl+Z: 撤銷</div>
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
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
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
                導出
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-border flex flex-col overflow-hidden">
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
    </div>
  );
}
