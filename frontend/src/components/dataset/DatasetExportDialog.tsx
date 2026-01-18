import { useState, useMemo } from 'react';
import type { Dataset, ImageAnnotation } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Download, FileArchive, Loader2 } from 'lucide-react';
import {
  exportDatasetAsYOLO,
  estimateExportSize,
  downloadBlob,
  type ExportOptions,
  type ExportProgress,
} from '@/lib/exportDataset';
import { toast } from 'sonner';

interface DatasetExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: Dataset;
  images: ImageAnnotation[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DatasetExportDialog({
  open,
  onOpenChange,
  dataset,
  images,
}: DatasetExportDialogProps) {
  const [filename, setFilename] = useState(dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_'));
  const [includeImages, setIncludeImages] = useState(true);
  const [splitFolders, setSplitFolders] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  const estimatedSize = useMemo(() => {
    return estimateExportSize(dataset, images, {
      includeImages,
      splitFolders,
      filename,
    });
  }, [dataset, images, includeImages, splitFolders, filename]);

  const handleExport = async () => {
    if (!filename.trim()) {
      toast.error('請輸入檔案名稱');
      return;
    }

    setIsExporting(true);
    setProgress(null);

    try {
      const options: ExportOptions = {
        includeImages,
        splitFolders,
        filename: filename.trim(),
      };

      const blob = await exportDatasetAsYOLO(
        dataset,
        images,
        options,
        (p) => setProgress(p)
      );

      downloadBlob(blob, `${filename.trim()}.zip`);
      toast.success('資料集導出成功');
      onOpenChange(false);
    } catch (error) {
      console.error('導出失敗:', error);
      toast.error('導出失敗，請重試');
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const progressPercent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            導出資料集
          </DialogTitle>
          <DialogDescription>
            將「{dataset.name}」導出為 YOLO 格式 ZIP 檔案
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 檔案名稱 */}
          <div className="space-y-2">
            <Label htmlFor="filename">檔案名稱</Label>
            <div className="flex items-center gap-2">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="dataset"
                disabled={isExporting}
              />
              <span className="text-sm text-muted-foreground">.zip</span>
            </div>
          </div>

          {/* 選項 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeImages"
                checked={includeImages}
                onCheckedChange={(checked) => setIncludeImages(checked === true)}
                disabled={isExporting}
              />
              <Label htmlFor="includeImages" className="cursor-pointer">
                包含圖片檔案
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="splitFolders"
                checked={splitFolders}
                onCheckedChange={(checked) => setSplitFolders(checked === true)}
                disabled={isExporting}
              />
              <Label htmlFor="splitFolders" className="cursor-pointer">
                分割訓練/驗證資料夾
              </Label>
            </div>
          </div>

          {/* 預估大小 */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>訓練集圖片</span>
              <span className="font-medium">{dataset.trainImageIds.length} 張</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>驗證集圖片</span>
              <span className="font-medium">{dataset.valImageIds.length} 張</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>類別數量</span>
              <span className="font-medium">{dataset.classes.length}</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between text-sm">
              <span>預估檔案大小</span>
              <span className="font-semibold">{formatFileSize(estimatedSize)}</span>
            </div>
          </div>

          {/* 進度條 */}
          {isExporting && progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{progress.message}</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            取消
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
