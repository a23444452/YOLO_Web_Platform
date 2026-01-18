import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '@/stores/trainingStore';
import { useDatasetStore } from '@/stores/datasetStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { YOLO_VERSIONS, MODEL_SIZES, BATCH_SIZES, IMAGE_SIZES, OPTIMIZERS } from '@/lib/constants';
import { Play, Settings2, Save, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function Training() {
  const navigate = useNavigate();
  const { datasets } = useDatasetStore();
  const { createConfig, startTraining, saveTemplate, loadTemplate, removeTemplate, getTemplates } = useTrainingStore();

  const [projectName, setProjectName] = useState('');
  const [yoloVersion, setYoloVersion] = useState<'v5' | 'v8' | 'v11'>('v8');
  const [modelSize, setModelSize] = useState<'n' | 's' | 'm' | 'l' | 'x'>('m');
  const [datasetId, setDatasetId] = useState('');
  const [epochs, setEpochs] = useState([100]);
  const [batchSize, setBatchSize] = useState(16);
  const [imageSize, setImageSize] = useState(640);
  const [optimizer, setOptimizer] = useState<'Adam' | 'SGD' | 'AdamW'>('Adam');
  const [learningRate, setLearningRate] = useState([0.01]);
  const [momentum, setMomentum] = useState([0.937]);
  const [weightDecay, setWeightDecay] = useState([0.0005]);
  const [patience, setPatience] = useState([50]);

  // 數據增強
  const [mosaic, setMosaic] = useState(true);
  const [mixup, setMixup] = useState(false);
  const [rotation, setRotation] = useState([0]);
  const [hsvH] = useState([0.015]);
  const [hsvS] = useState([0.7]);
  const [hsvV] = useState([0.4]);
  const [translate, setTranslate] = useState([0.1]);
  const [scale, setScale] = useState([0.5]);
  const [flipH, setFlipH] = useState(true);
  const [flipV, setFlipV] = useState(false);

  // Template dialog states
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isLoadTemplateOpen, setIsLoadTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const templates = getTemplates();

  const getCurrentConfig = () => ({
    yoloVersion,
    modelSize,
    epochs: epochs[0],
    batchSize,
    imageSize,
    device: 'cpu' as const,
    workers: 4,
    optimizer,
    learningRate: learningRate[0],
    momentum: momentum[0],
    weightDecay: weightDecay[0],
    patience: patience[0],
    augmentation: {
      mosaic,
      mixup,
      rotation: rotation[0],
      hsvH: hsvH[0],
      hsvS: hsvS[0],
      hsvV: hsvV[0],
      translate: translate[0],
      scale: scale[0],
      flipHorizontal: flipH,
      flipVertical: flipV,
    },
  });

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('請輸入模板名稱');
      return;
    }

    const config = getCurrentConfig();
    saveTemplate(templateName.trim(), config);
    toast.success(`模板「${templateName}」已保存！`);
    setTemplateName('');
    setIsSaveTemplateOpen(false);
  };

  const handleLoadTemplate = (templateId: string) => {
    const config = loadTemplate(templateId);
    if (!config) {
      toast.error('載入模板失敗');
      return;
    }

    // Apply template to form
    setYoloVersion(config.yoloVersion || 'v8');
    setModelSize(config.modelSize || 'm');
    setEpochs([config.epochs || 100]);
    setBatchSize(config.batchSize || 16);
    setImageSize(config.imageSize || 640);
    setOptimizer(config.optimizer || 'Adam');
    setLearningRate([config.learningRate || 0.01]);
    setMomentum([config.momentum || 0.937]);
    setWeightDecay([config.weightDecay || 0.0005]);
    setPatience([config.patience || 50]);

    if (config.augmentation) {
      setMosaic(config.augmentation.mosaic);
      setMixup(config.augmentation.mixup);
      setRotation([config.augmentation.rotation]);
      setTranslate([config.augmentation.translate]);
      setScale([config.augmentation.scale]);
      setFlipH(config.augmentation.flipHorizontal);
      setFlipV(config.augmentation.flipVertical);
    }

    setIsLoadTemplateOpen(false);
    const template = templates.find(t => t.id === templateId);
    toast.success(`已載入模板「${template?.name}」`);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    removeTemplate(templateId);
    toast.success(`模板「${template?.name}」已刪除`);
  };

  const handleStartTraining = async () => {
    if (!projectName.trim()) {
      toast.error('請輸入專案名稱');
      return;
    }

    if (!datasetId) {
      toast.error('請選擇資料集');
      return;
    }

    try {
      const configId = createConfig({
        name: projectName,
        yoloVersion,
        modelSize,
        datasetId,
        epochs: epochs[0],
        batchSize,
        imageSize,
        device: 'cpu',
        workers: 4,
        optimizer,
        learningRate: learningRate[0],
        momentum: momentum[0],
        weightDecay: weightDecay[0],
        patience: patience[0],
        augmentation: {
          mosaic,
          mixup,
          rotation: rotation[0],
          hsvH: hsvH[0],
          hsvS: hsvS[0],
          hsvV: hsvV[0],
          translate: translate[0],
          scale: scale[0],
          flipHorizontal: flipH,
          flipVertical: flipV,
        },
      });

      toast.loading('正在準備訓練...', { id: 'training-start' });
      await startTraining(configId);
      toast.success('訓練已開始！', { id: 'training-start' });
      navigate('/monitor');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '啟動訓練失敗';
      toast.error(`啟動訓練失敗: ${errorMessage}`, { id: 'training-start' });
      console.error('Failed to start training:', error);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">訓練配置</h1>
        <p className="text-muted-foreground">
          配置 YOLO 模型訓練參數
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            訓練參數設置
          </CardTitle>
          <CardDescription>
            設置模型訓練的各項參數
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">基本配置</TabsTrigger>
              <TabsTrigger value="params">訓練參數</TabsTrigger>
              <TabsTrigger value="augmentation">數據增強</TabsTrigger>
              <TabsTrigger value="advanced">進階設置</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="project">專案名稱</Label>
                <Input
                  id="project"
                  placeholder="my_yolo_project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yolo-version">YOLO 版本</Label>
                  <Select value={yoloVersion} onValueChange={(v: any) => setYoloVersion(v)}>
                    <SelectTrigger id="yolo-version">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YOLO_VERSIONS.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="model-size">模型大小</Label>
                  <Select value={modelSize} onValueChange={(v: any) => setModelSize(v)}>
                    <SelectTrigger id="model-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="dataset">資料集</Label>
                <Select value={datasetId} onValueChange={setDatasetId}>
                  <SelectTrigger id="dataset">
                    <SelectValue placeholder="選擇資料集" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name} ({ds.imageIds.length} 張圖片)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="params" className="space-y-4">
              <div>
                <Label>Epochs: {epochs[0]}</Label>
                <Slider
                  value={epochs}
                  onValueChange={setEpochs}
                  min={10}
                  max={500}
                  step={10}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <Select value={batchSize.toString()} onValueChange={(v) => setBatchSize(Number(v))}>
                    <SelectTrigger id="batch-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BATCH_SIZES.map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="image-size">Image Size</Label>
                  <Select value={imageSize.toString()} onValueChange={(v) => setImageSize(Number(v))}>
                    <SelectTrigger id="image-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_SIZES.map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}px
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="augmentation" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="mosaic">Mosaic 增強</Label>
                <Switch id="mosaic" checked={mosaic} onCheckedChange={setMosaic} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="mixup">Mixup 增強</Label>
                <Switch id="mixup" checked={mixup} onCheckedChange={setMixup} />
              </div>

              <div>
                <Label>旋轉角度: {rotation[0]}°</Label>
                <Slider value={rotation} onValueChange={setRotation} min={0} max={45} step={1} />
              </div>

              <div>
                <Label>平移比例: {translate[0].toFixed(2)}</Label>
                <Slider value={translate} onValueChange={setTranslate} min={0} max={0.5} step={0.05} />
              </div>

              <div>
                <Label>縮放比例: {scale[0].toFixed(2)}</Label>
                <Slider value={scale} onValueChange={setScale} min={0} max={1} step={0.1} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="flip-h">水平翻轉</Label>
                <Switch id="flip-h" checked={flipH} onCheckedChange={setFlipH} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="flip-v">垂直翻轉</Label>
                <Switch id="flip-v" checked={flipV} onCheckedChange={setFlipV} />
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div>
                <Label htmlFor="optimizer">優化器</Label>
                <Select value={optimizer} onValueChange={(v: any) => setOptimizer(v)}>
                  <SelectTrigger id="optimizer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPTIMIZERS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Learning Rate: {learningRate[0].toFixed(4)}</Label>
                <Slider
                  value={learningRate}
                  onValueChange={setLearningRate}
                  min={0.0001}
                  max={0.1}
                  step={0.0001}
                />
              </div>

              <div>
                <Label>Momentum: {momentum[0].toFixed(3)}</Label>
                <Slider
                  value={momentum}
                  onValueChange={setMomentum}
                  min={0.8}
                  max={0.99}
                  step={0.001}
                />
              </div>

              <div>
                <Label>Weight Decay: {weightDecay[0].toFixed(4)}</Label>
                <Slider
                  value={weightDecay}
                  onValueChange={setWeightDecay}
                  min={0}
                  max={0.001}
                  step={0.0001}
                />
              </div>

              <div>
                <Label>Early Stopping Patience: {patience[0]}</Label>
                <Slider
                  value={patience}
                  onValueChange={setPatience}
                  min={5}
                  max={100}
                  step={5}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-6 border-t border-border flex justify-between gap-2">
            <div className="flex gap-2">
              <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Save className="mr-2 h-4 w-4" />
                    保存模板
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>保存訓練配置模板</DialogTitle>
                    <DialogDescription>
                      保存當前配置為模板，方便下次快速套用
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>模板名稱</Label>
                      <Input
                        placeholder="例如：高精度配置、快速訓練配置"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveTemplate();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSaveTemplateOpen(false);
                        setTemplateName('');
                      }}
                    >
                      取消
                    </Button>
                    <Button onClick={handleSaveTemplate}>保存</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isLoadTemplateOpen} onOpenChange={setIsLoadTemplateOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    載入模板
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>載入訓練配置模板</DialogTitle>
                    <DialogDescription>
                      從已保存的模板快速套用配置
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    {templates.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <p className="text-sm">沒有已保存的模板</p>
                        <p className="text-xs mt-1">點擊「保存模板」來創建第一個模板</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <h4 className="font-medium">{template.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {template.yoloVersion}{template.modelSize} • {template.epochs} epochs • {template.optimizer}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(template.createdAt).toLocaleDateString('zh-TW')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleLoadTemplate(template.id)}
                              >
                                載入
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTemplate(template.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsLoadTemplateOpen(false)}
                    >
                      關閉
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Button size="lg" onClick={handleStartTraining}>
              <Play className="mr-2 h-5 w-5" />
              開始訓練
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
