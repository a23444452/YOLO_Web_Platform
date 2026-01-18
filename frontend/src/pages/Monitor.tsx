import { useEffect, useState } from 'react';
import { useTrainingStore } from '@/stores/trainingStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, StopCircle, Clock, TrendingUp, Download, FolderDown, FileArchive, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { downloadModel, downloadTrainingPackage, exportTrainingToFolder } from '@/lib/api';

export function Monitor() {
  const { currentJobId, stopTraining, getCurrentJob, getConfigById } = useTrainingStore();
  const currentJob = getCurrentJob();
  const [isExporting, setIsExporting] = useState(false);

  // Get project name from config
  const config = currentJob?.configId ? getConfigById(currentJob.configId) : null;
  const projectName = config?.name || 'yolo_training';

  useEffect(() => {
    if (currentJob && currentJob.status === 'completed') {
      toast.success('訓練已完成！');
    }
  }, [currentJob?.status]);

  const handleStopTraining = async () => {
    if (currentJobId && confirm('確定要停止訓練嗎？')) {
      try {
        toast.loading('正在停止訓練...', { id: 'training-stop' });
        await stopTraining(currentJobId);
        toast.info('訓練已停止', { id: 'training-stop' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '停止訓練失敗';
        toast.error(`停止訓練失敗: ${errorMessage}`, { id: 'training-stop' });
        console.error('Failed to stop training:', error);
      }
    }
  };

  const handleDownloadModel = async () => {
    if (!currentJobId) return;

    try {
      toast.loading('正在下載模型...', { id: 'model-download' });
      await downloadModel(currentJobId);
      toast.success('模型下載成功！', { id: 'model-download' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下載模型失敗';
      toast.error(`下載失敗: ${errorMessage}`, { id: 'model-download' });
      console.error('Failed to download model:', error);
    }
  };

  const handleDownloadPackage = async () => {
    if (!currentJobId) return;

    try {
      toast.loading('正在打包訓練資料...', { id: 'package-download' });
      await downloadTrainingPackage(currentJobId, projectName);
      toast.success('訓練資料下載成功！', { id: 'package-download' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下載失敗';
      toast.error(`下載失敗: ${errorMessage}`, { id: 'package-download' });
      console.error('Failed to download package:', error);
    }
  };

  const handleExportToFolder = async () => {
    if (!currentJobId) return;

    setIsExporting(true);

    try {
      toast.loading('正在導出到本地資料夾...', { id: 'folder-export' });
      const result = await exportTrainingToFolder(currentJobId, projectName);
      toast.success(
        `成功導出 ${result.filesWritten} 個檔案到本地資料夾！`,
        { id: 'folder-export' }
      );
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('已取消導出', { id: 'folder-export' });
      } else {
        const errorMessage = error instanceof Error ? error.message : '導出失敗';
        toast.error(`導出失敗: ${errorMessage}`, { id: 'folder-export' });
        console.error('Failed to export to folder:', error);
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (!currentJob) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Activity className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">沒有正在進行的訓練</h3>
            <p className="text-sm text-muted-foreground mb-4">
              前往訓練配置頁面開始訓練
            </p>
            <Button onClick={() => window.location.href = '/training'}>
              前往訓練配置
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColor = {
    pending: 'secondary',
    running: 'default',
    completed: 'success',
    failed: 'destructive',
    stopped: 'secondary',
  } as const;

  const statusText = {
    pending: '等待中',
    running: '訓練中',
    completed: '已完成',
    failed: '失敗',
    stopped: '已停止',
  };

  const latestMetrics = currentJob.metrics[currentJob.metrics.length - 1];

  return (
    <div className="container max-w-7xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">訓練監控</h1>
          <div className="flex items-center gap-2">
            <Badge variant={statusColor[currentJob.status] as any}>
              {statusText[currentJob.status]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Epoch {currentJob.currentEpoch} / {currentJob.totalEpochs}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {currentJob.status === 'running' && (
            <Button variant="destructive" onClick={handleStopTraining}>
              <StopCircle className="mr-2 h-4 w-4" />
              停止訓練
            </Button>
          )}

          {currentJob.status === 'completed' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isExporting}>
                  <Download className="mr-2 h-4 w-4" />
                  下載訓練結果
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={handleDownloadModel}>
                  <Download className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">下載模型檔案</span>
                    <span className="text-xs text-muted-foreground">僅下載 best.pt (最小)</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPackage}>
                  <FileArchive className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">下載完整訓練包 (ZIP)</span>
                    <span className="text-xs text-muted-foreground">模型 + 圖表 + 配置</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportToFolder}>
                  <FolderDown className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">導出到本地資料夾</span>
                    <span className="text-xs text-muted-foreground">直接寫入您的專案目錄</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* 進度條 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">訓練進度</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={currentJob.progress} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>{currentJob.progress.toFixed(1)}%</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {currentJob.startTime &&
                    Math.floor((Date.now() - new Date(currentJob.startTime).getTime()) / 1000)}s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 當前指標 */}
        {latestMetrics && (
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Train Loss</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestMetrics.trainLoss.toFixed(4)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Val Loss</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestMetrics.valLoss.toFixed(4)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>mAP50</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {latestMetrics.map50.toFixed(4)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>mAP50-95</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {latestMetrics.map5095.toFixed(4)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 圖表 */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Loss 曲線
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={currentJob.metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="epoch" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="trainLoss"
                    stroke="#3b82f6"
                    name="Train Loss"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="valLoss"
                    stroke="#ef4444"
                    name="Val Loss"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                mAP 曲線
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={currentJob.metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="epoch" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="map50"
                    stroke="#10b981"
                    name="mAP50"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="map5095"
                    stroke="#14b8a6"
                    name="mAP50-95"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 訓練日誌 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">訓練日誌</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 w-full rounded border bg-muted/20 p-4">
              <div className="space-y-1 font-mono text-xs">
                {currentJob.logs.map((log, index) => (
                  <div key={index} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
