import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { listInferenceModels, runInference, type ModelInfo, type Detection } from '@/lib/api';

export function Inference() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [confidence, setConfidence] = useState([0.25]);
  const [iou, setIou] = useState([0.45]);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isInferring, setIsInferring] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [inferenceTime, setInferenceTime] = useState<number | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  // Load available models on mount
  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await listInferenceModels();
      setAvailableModels(response.models);

      if (response.models.length > 0) {
        setSelectedModel(response.models[0].model_id);
      }

      toast.success(`載入 ${response.total} 個可用模型`);
    } catch (error) {
      toast.error('載入模型列表失敗：' + (error as Error).message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('請選擇圖片文件');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setDetections([]);
      setResultImage(null);
      setInferenceTime(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInference = async () => {
    if (!selectedImage || !selectedModel) {
      toast.error('請選擇圖片和模型');
      return;
    }

    setIsInferring(true);
    setDetections([]);
    setResultImage(null);

    try {
      // Extract base64 data (remove data URL prefix)
      const base64Data = selectedImage.split(',')[1] || selectedImage;

      const result = await runInference(
        selectedModel,
        base64Data,
        confidence[0],
        iou[0]
      );

      setDetections(result.detections);
      setInferenceTime(result.inference_time);

      // Draw bounding boxes on the image
      if (imageFile) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Draw bounding boxes
            result.detections.forEach((det, index) => {
              // Generate color based on class_id
              const hue = (det.class_id * 137.5) % 360;
              const color = `hsl(${hue}, 70%, 50%)`;

              ctx.strokeStyle = color;
              ctx.fillStyle = color;
              ctx.lineWidth = 3;

              // Draw box
              const width = det.bbox.x2 - det.bbox.x1;
              const height = det.bbox.y2 - det.bbox.y1;
              ctx.strokeRect(det.bbox.x1, det.bbox.y1, width, height);

              // Draw label background
              const label = `${det.class_name} ${(det.confidence * 100).toFixed(1)}%`;
              ctx.font = '16px Arial';
              const textWidth = ctx.measureText(label).width;
              ctx.fillRect(det.bbox.x1, det.bbox.y1 - 25, textWidth + 10, 25);

              // Draw label text
              ctx.fillStyle = 'white';
              ctx.fillText(label, det.bbox.x1 + 5, det.bbox.y1 - 7);
            });

            setResultImage(canvas.toDataURL());
          }
        };
        img.src = selectedImage;
      }

      toast.success(`檢測到 ${result.detections.length} 個物體 (${result.inference_time.toFixed(2)}ms)`);
    } catch (error) {
      toast.error('推論失敗：' + (error as Error).message);
    } finally {
      setIsInferring(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">推論測試</h1>
        <p className="text-muted-foreground">
          上傳圖片進行目標檢測
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 左側：設置面板 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">模型選擇</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingModels ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm">載入模型中...</span>
                </div>
              ) : availableModels.length === 0 ? (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    沒有可用的訓練模型
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    請先完成模型訓練
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>選擇模型</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.model_id} value={model.model_id}>
                          {model.name} ({model.yolo_version}{model.model_size})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedModel && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
                      {availableModels.find(m => m.model_id === selectedModel)?.classes.map((cls, idx) => (
                        <div key={idx} className="text-muted-foreground">
                          • {cls}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">推論設置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>信心度閾值: {confidence[0].toFixed(2)}</Label>
                <Slider
                  value={confidence}
                  onValueChange={setConfidence}
                  min={0.01}
                  max={0.99}
                  step={0.01}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>IOU 閾值: {iou[0].toFixed(2)}</Label>
                <Slider
                  value={iou}
                  onValueChange={setIou}
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  className="mt-2"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleInference}
                disabled={!selectedImage || !selectedModel || isInferring}
              >
                {isInferring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    推論中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    執行推論
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 右側：圖片展示 */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">測試圖片</CardTitle>
              <CardDescription>
                上傳圖片查看檢測結果
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedImage ? (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById('inference-file-input')?.click()}
                >
                  <input
                    id="inference-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">上傳測試圖片</h3>
                  <p className="text-sm text-muted-foreground">
                    點擊選擇或拖放圖片文件
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img
                      src={resultImage || selectedImage}
                      alt="Test"
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => document.getElementById('inference-file-input')?.click()}
                      disabled={isInferring}
                    >
                      更換圖片
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedImage(null);
                        setImageFile(null);
                        setDetections([]);
                        setResultImage(null);
                        setInferenceTime(null);
                      }}
                      disabled={isInferring}
                    >
                      清除
                    </Button>
                  </div>

                  <Card className="bg-muted">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>檢測結果</span>
                        {inferenceTime && (
                          <span className="text-xs font-normal text-muted-foreground">
                            {inferenceTime.toFixed(2)}ms
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {detections.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          執行推論後將顯示檢測到的物體
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {detections.map((det, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 bg-background rounded text-sm"
                            >
                              <span className="font-medium">{det.class_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {(det.confidence * 100).toFixed(1)}%
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({Math.round(det.bbox.x1)}, {Math.round(det.bbox.y1)}) - ({Math.round(det.bbox.x2)}, {Math.round(det.bbox.y2)})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
