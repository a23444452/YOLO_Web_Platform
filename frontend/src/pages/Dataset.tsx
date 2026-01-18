import { useState, useEffect, useMemo } from 'react';
import { useDatasetStore } from '@/stores/datasetStore';
import { useAnnotationStore } from '@/stores/annotationStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Trash2,
  Download,
  Database as DatabaseIcon,
  Copy,
  BarChart3,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DatasetStatistics } from '@/components/dataset/DatasetStatistics';
import { DatasetExportDialog } from '@/components/dataset/DatasetExportDialog';
import type { Dataset as DatasetType } from '@/types';

export function Dataset() {
  const {
    datasets,
    isLoaded,
    loadFromDB,
    createDataset,
    removeDataset,
    duplicateDataset,
    resplitDataset,
    calculateStatistics,
  } = useDatasetStore();
  const { images, classes } = useAnnotationStore();

  // 創建對話框
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [trainRatio, setTrainRatio] = useState([80]);
  const [isCreating, setIsCreating] = useState(false);

  // 詳情側邊欄
  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    dataset: DatasetType | null;
  }>({ open: false, dataset: null });

  // 重新分割對話框
  const [resplitDialog, setResplitDialog] = useState<{
    open: boolean;
    datasetId: string | null;
  }>({ open: false, datasetId: null });
  const [newTrainRatio, setNewTrainRatio] = useState([80]);

  // 複製對話框
  const [duplicateDialog, setDuplicateDialog] = useState<{
    open: boolean;
    dataset: DatasetType | null;
  }>({ open: false, dataset: null });
  const [duplicateName, setDuplicateName] = useState('');

  // 刪除確認
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    dataset: DatasetType | null;
  }>({ open: false, dataset: null });

  // 導出對話框
  const [exportDialog, setExportDialog] = useState<{
    open: boolean;
    dataset: DatasetType | null;
  }>({ open: false, dataset: null });

  // 載入資料
  useEffect(() => {
    if (!isLoaded) {
      loadFromDB();
    }
  }, [isLoaded, loadFromDB]);

  const annotatedImages = useMemo(
    () => images.filter((img) => img.boxes.length > 0),
    [images]
  );

  // 計算當前詳情資料集的統計
  const detailStatistics = useMemo(() => {
    if (!detailSheet.dataset) return null;
    return calculateStatistics(detailSheet.dataset, images);
  }, [detailSheet.dataset, images, calculateStatistics]);

  const handleCreateDataset = async () => {
    if (!newDatasetName.trim()) {
      toast.error('請輸入資料集名稱');
      return;
    }

    if (annotatedImages.length === 0) {
      toast.error('沒有已標註的圖片');
      return;
    }

    setIsCreating(true);
    try {
      await createDataset(
        newDatasetName.trim(),
        annotatedImages.map((img) => img.id),
        trainRatio[0] / 100,
        classes
      );

      toast.success(`資料集「${newDatasetName}」創建成功`);
      setNewDatasetName('');
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('創建資料集失敗:', error);
      toast.error('創建資料集失敗');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDataset = async () => {
    if (!deleteDialog.dataset) return;

    try {
      await removeDataset(deleteDialog.dataset.id);
      toast.success('資料集已刪除');
      setDeleteDialog({ open: false, dataset: null });

      // 如果正在查看這個資料集，關閉詳情
      if (detailSheet.dataset?.id === deleteDialog.dataset.id) {
        setDetailSheet({ open: false, dataset: null });
      }
    } catch (error) {
      console.error('刪除資料集失敗:', error);
      toast.error('刪除資料集失敗');
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateDialog.dataset || !duplicateName.trim()) {
      toast.error('請輸入資料集名稱');
      return;
    }

    try {
      await duplicateDataset(duplicateDialog.dataset.id, duplicateName.trim());
      toast.success(`資料集「${duplicateName}」複製成功`);
      setDuplicateDialog({ open: false, dataset: null });
      setDuplicateName('');
    } catch (error) {
      console.error('複製資料集失敗:', error);
      toast.error('複製資料集失敗');
    }
  };

  const handleResplit = async () => {
    if (!resplitDialog.datasetId) return;

    try {
      await resplitDataset(resplitDialog.datasetId, newTrainRatio[0] / 100);
      toast.success('資料集已重新分割');
      setResplitDialog({ open: false, datasetId: null });

      // 更新詳情中的資料集
      if (detailSheet.dataset?.id === resplitDialog.datasetId) {
        const updated = datasets.find((ds) => ds.id === resplitDialog.datasetId);
        if (updated) {
          setDetailSheet({ open: true, dataset: updated });
        }
      }
    } catch (error) {
      console.error('重新分割失敗:', error);
      toast.error('重新分割失敗');
    }
  };

  const openDetailSheet = (dataset: DatasetType) => {
    setDetailSheet({ open: true, dataset });
  };

  const openDuplicateDialog = (dataset: DatasetType) => {
    setDuplicateName(`${dataset.name}_copy`);
    setDuplicateDialog({ open: true, dataset });
  };

  const openResplitDialog = (dataset: DatasetType) => {
    setNewTrainRatio([Math.round(dataset.trainRatio * 100)]);
    setResplitDialog({ open: true, datasetId: dataset.id });
  };

  if (!isLoaded) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">資料集管理</h1>
          <p className="text-muted-foreground">
            創建和管理 YOLO 格式資料集
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="mr-2 h-5 w-5" />
              創建資料集
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>創建新資料集</DialogTitle>
              <DialogDescription>
                從已標註的圖片創建 YOLO 訓練資料集
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">資料集名稱</Label>
                <Input
                  id="name"
                  placeholder="my_dataset"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                />
              </div>

              <div>
                <Label>訓練集比例: {trainRatio[0]}%</Label>
                <Slider
                  value={trainRatio}
                  onValueChange={setTrainRatio}
                  min={50}
                  max={95}
                  step={5}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>驗證集: {100 - trainRatio[0]}%</span>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>已標註圖片</span>
                  <span className="font-semibold">{annotatedImages.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>類別數量</span>
                  <span className="font-semibold">{classes.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>預計訓練集</span>
                  <span className="font-semibold">
                    {Math.floor(annotatedImages.length * trainRatio[0] / 100)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>預計驗證集</span>
                  <span className="font-semibold">
                    {Math.ceil(annotatedImages.length * (100 - trainRatio[0]) / 100)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateDataset} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    創建中...
                  </>
                ) : (
                  '創建'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {datasets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DatabaseIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">尚無資料集</h3>
            <p className="text-sm text-muted-foreground mb-4">
              開始創建您的第一個訓練資料集
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              創建資料集
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {datasets.map((dataset) => (
            <Card key={dataset.id}>
              <CardHeader>
                <CardTitle>{dataset.name}</CardTitle>
                <CardDescription>
                  創建於 {new Date(dataset.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">總圖片數</div>
                      <div className="text-2xl font-bold">{dataset.imageIds.length}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">類別數</div>
                      <div className="text-2xl font-bold">{dataset.classes.length}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">訓練集</div>
                      <div className="text-xl font-bold">{dataset.trainImageIds.length}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">驗證集</div>
                      <div className="text-xl font-bold">{dataset.valImageIds.length}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetailSheet(dataset)}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      詳情
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExportDialog({ open: true, dataset })}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      導出
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDuplicateDialog(dataset)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteDialog({ open: true, dataset })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 詳情側邊欄 */}
      <Sheet
        open={detailSheet.open}
        onOpenChange={(open) => setDetailSheet({ open, dataset: open ? detailSheet.dataset : null })}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle>{detailSheet.dataset?.name}</SheetTitle>
            <SheetDescription>
              資料集統計和管理
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 mt-4">
            <div className="space-y-6 pr-4">
              {detailStatistics && (
                <DatasetStatistics statistics={detailStatistics} />
              )}

              <Separator />

              {/* 操作區域 */}
              <div className="space-y-4">
                <h3 className="font-semibold">資料集操作</h3>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => detailSheet.dataset && openResplitDialog(detailSheet.dataset)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新分割
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => detailSheet.dataset && setExportDialog({ open: true, dataset: detailSheet.dataset })}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    導出
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => detailSheet.dataset && openDuplicateDialog(detailSheet.dataset)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    複製
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => detailSheet.dataset && setDeleteDialog({ open: true, dataset: detailSheet.dataset })}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    刪除
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* 重新分割對話框 */}
      <Dialog
        open={resplitDialog.open}
        onOpenChange={(open) => setResplitDialog({ open, datasetId: open ? resplitDialog.datasetId : null })}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>重新分割資料集</DialogTitle>
            <DialogDescription>
              重新隨機分配訓練集和驗證集
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label>訓練集比例: {newTrainRatio[0]}%</Label>
            <Slider
              value={newTrainRatio}
              onValueChange={setNewTrainRatio}
              min={50}
              max={95}
              step={5}
              className="mt-2"
            />
            <div className="text-xs text-muted-foreground mt-1">
              驗證集: {100 - newTrainRatio[0]}%
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResplitDialog({ open: false, datasetId: null })}>
              取消
            </Button>
            <Button onClick={handleResplit}>
              確認分割
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 複製對話框 */}
      <Dialog
        open={duplicateDialog.open}
        onOpenChange={(open) => setDuplicateDialog({ open, dataset: open ? duplicateDialog.dataset : null })}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>複製資料集</DialogTitle>
            <DialogDescription>
              創建「{duplicateDialog.dataset?.name}」的副本
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="duplicate-name">新資料集名稱</Label>
            <Input
              id="duplicate-name"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="dataset_copy"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialog({ open: false, dataset: null })}>
              取消
            </Button>
            <Button onClick={handleDuplicate}>
              複製
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, dataset: open ? deleteDialog.dataset : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定刪除資料集？</AlertDialogTitle>
            <AlertDialogDescription>
              您即將刪除資料集「{deleteDialog.dataset?.name}」。此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteDataset}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 導出對話框 */}
      {exportDialog.dataset && (
        <DatasetExportDialog
          open={exportDialog.open}
          onOpenChange={(open) => setExportDialog({ open, dataset: open ? exportDialog.dataset : null })}
          dataset={exportDialog.dataset}
          images={images}
        />
      )}
    </div>
  );
}
