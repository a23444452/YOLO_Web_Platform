import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Palette, Database, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAnnotationStore } from '@/stores/annotationStore';
import { useDatasetStore } from '@/stores/datasetStore';
import { useTrainingStore } from '@/stores/trainingStore';

export function Settings() {
  // Theme settings
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Annotation settings
  const [defaultBoxColor, setDefaultBoxColor] = useState('#3b82f6');
  const [boxLineWidth, setBoxLineWidth] = useState([3]);
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState([30]);

  // Storage info
  const { images } = useAnnotationStore();
  const { datasets } = useDatasetStore();
  const { templates } = useTrainingStore();

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    // 應用主題到 document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success(`已切換到${newTheme === 'dark' ? '暗色' : '亮色'}主題`);
  };

  const handleClearCache = async () => {
    if (!confirm('確定要清除所有快取資料嗎？這將刪除所有標註、資料集和訓練模板。')) {
      return;
    }

    try {
      // Clear images and annotations
      const { clearAllImages } = useAnnotationStore.getState();
      clearAllImages();

      // Clear localStorage (templates and other data)
      localStorage.clear();

      toast.success('快取已清除');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('清除快取失敗：' + (error as Error).message);
    }
  };

  const handleExportData = () => {
    const data = {
      images: images.map(img => ({
        ...img,
        dataUrl: img.dataUrl.substring(0, 100) + '...' // Truncate for readability
      })),
      datasets,
      templates,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yolo-platform-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('資料匯出成功');
  };

  // Calculate storage usage
  const calculateStorageSize = () => {
    const imageSize = images.reduce((total, img) => {
      return total + (img.dataUrl?.length || 0);
    }, 0);

    const sizeMB = (imageSize / 1024 / 1024).toFixed(2);
    return sizeMB;
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">設置</h1>
        <p className="text-muted-foreground">
          自定義應用程式偏好設置和管理資料
        </p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appearance">外觀</TabsTrigger>
          <TabsTrigger value="annotation">標註</TabsTrigger>
          <TabsTrigger value="data">資料管理</TabsTrigger>
        </TabsList>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                外觀設置
              </CardTitle>
              <CardDescription>
                自定義應用程式的外觀和主題
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>主題模式</Label>
                <Select value={theme} onValueChange={(v: 'light' | 'dark') => handleThemeChange(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">亮色模式</SelectItem>
                    <SelectItem value="dark">暗色模式</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  選擇應用程式的顯示主題
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Annotation Settings */}
        <TabsContent value="annotation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                標註設置
              </CardTitle>
              <CardDescription>
                自定義標註工具的行為和外觀
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="box-color">預設框線顏色</Label>
                <div className="flex gap-4 items-center">
                  <input
                    id="box-color"
                    type="color"
                    value={defaultBoxColor}
                    onChange={(e) => setDefaultBoxColor(e.target.value)}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">
                    {defaultBoxColor}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>框線粗細: {boxLineWidth[0]}px</Label>
                <Slider
                  value={boxLineWidth}
                  onValueChange={setBoxLineWidth}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>自動保存</Label>
                  <p className="text-sm text-muted-foreground">
                    自動保存標註到資料庫
                  </p>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>

              {autoSave && (
                <div className="space-y-2">
                  <Label>自動保存間隔: {autoSaveInterval[0]} 秒</Label>
                  <Slider
                    value={autoSaveInterval}
                    onValueChange={setAutoSaveInterval}
                    min={10}
                    max={120}
                    step={10}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                資料管理
              </CardTitle>
              <CardDescription>
                管理應用程式的儲存資料和快取
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-3">儲存空間使用</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">圖片數量</span>
                      <span className="font-medium">{images.length} 張</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">資料集數量</span>
                      <span className="font-medium">{datasets.length} 個</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">訓練模板</span>
                      <span className="font-medium">{templates.length} 個</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">預估使用空間</span>
                      <span className="font-medium">{calculateStorageSize()} MB</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleExportData}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    匯出備份資料
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    將所有資料匯出為 JSON 檔案備份
                  </p>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleClearCache}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    清除所有快取
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    這將刪除所有標註、資料集和訓練模板，無法復原
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
