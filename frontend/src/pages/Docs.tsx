import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  Zap,
  Keyboard,
  HelpCircle,
  Image,
  Database,
  Settings,
  Activity,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Docs() {
  return (
    <div className="container max-w-5xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">文檔與說明</h1>
        <p className="text-muted-foreground">
          了解如何使用 YOLO Web Platform 訓練和部署目標檢測模型
        </p>
      </div>

      <Tabs defaultValue="getting-started" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="getting-started">快速入門</TabsTrigger>
          <TabsTrigger value="shortcuts">快捷鍵</TabsTrigger>
          <TabsTrigger value="faq">常見問題</TabsTrigger>
        </TabsList>

        {/* Getting Started */}
        <TabsContent value="getting-started" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                5 分鐘快速開始
              </CardTitle>
              <CardDescription>
                跟隨這個簡單的工作流程，快速訓練你的第一個 YOLO 模型
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      圖像標註
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      上傳圖片並標註物體位置
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>點擊「上傳圖片」選擇要標註的圖片（支援 JPG、PNG）</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>使用「類別管理」新增物體類別（如：人、車、狗）</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>選擇類別後，在圖片上拖曳繪製標註框</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>使用快捷鍵 1-9 快速切換類別，提升標註效率</span>
                      </li>
                    </ul>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        💡 提示：建議每個類別至少標註 50-100 張圖片以獲得良好的訓練效果
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      建立資料集
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      將標註好的圖片組織成訓練資料集
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>前往「資料集管理」頁面，點擊「建立資料集」</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>選擇要加入的圖片（已標註的圖片會顯示標註數量）</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>設定訓練/驗證分割比例（建議 80/20 或 70/30）</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>檢查資料集統計資訊，確保類別分布合理</span>
                      </li>
                    </ul>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        💡 提示：訓練集用於學習，驗證集用於評估模型性能，兩者不應重疊
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      配置訓練參數
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      設定模型架構和訓練超參數
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>前往「訓練配置」頁面</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span><strong>基本配置</strong>：選擇 YOLO 版本（v8 推薦）和模型大小</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span><strong>訓練參數</strong>：設定 epochs（建議 100-300）、batch size、image size</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span><strong>數據增強</strong>：啟用 Mosaic、翻轉等增強技術提升模型泛化能力</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>可使用「保存模板」功能保存常用配置</span>
                      </li>
                    </ul>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="p-2 bg-muted rounded">
                        <p className="text-xs font-medium">快速訓練</p>
                        <p className="text-xs text-muted-foreground">v8n, 100 epochs</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="text-xs font-medium">高精度訓練</p>
                        <p className="text-xs text-muted-foreground">v8m, 300 epochs</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      監控訓練過程
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      即時觀察訓練進度和性能指標
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>點擊「開始訓練」後會自動跳轉到「訓練監控」頁面</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>查看即時訓練進度、當前 epoch、損失曲線</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>監控 mAP、Precision、Recall 等性能指標</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>訓練完成後可下載模型檔案（best.pt, best.onnx）和訓練圖表</span>
                      </li>
                    </ul>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        💡 提示：如果損失不再下降或驗證指標開始上升，可提前停止訓練避免過擬合
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Step 5 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      推論測試
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      使用訓練好的模型進行目標檢測
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>前往「推論測試」頁面</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>選擇模型（自動顯示最新訓練的模型）</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>上傳測試圖片，調整信心度和 IOU 閾值</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>查看檢測結果，包含邊界框、類別、置信度</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>也可上傳本地模型（.pt 或 .onnx）進行測試</span>
                      </li>
                    </ul>
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-xs text-green-700 dark:text-green-300">
                        🎉 恭喜！你已經完成了完整的 YOLO 訓練流程
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                最佳實踐建議
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">📊 資料準備</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• 每個類別至少 100 張標註圖片</li>
                    <li>• 確保圖片品質良好，光線充足</li>
                    <li>• 包含不同角度、距離、背景的樣本</li>
                    <li>• 標註框要緊貼物體邊緣</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">⚙️ 模型選擇</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <Badge variant="secondary">YOLOv8n</Badge> - 速度最快，適合即時應用</li>
                    <li>• <Badge variant="secondary">YOLOv8m</Badge> - 速度與精度平衡，推薦</li>
                    <li>• <Badge variant="secondary">YOLOv8x</Badge> - 精度最高，適合離線處理</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">🎯 訓練技巧</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• 從較小的模型開始測試（如 v8n）</li>
                    <li>• 啟用數據增強提升模型泛化能力</li>
                    <li>• 監控驗證指標避免過擬合</li>
                    <li>• 使用「保存模板」功能記錄最佳配置</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keyboard Shortcuts */}
        <TabsContent value="shortcuts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                快捷鍵列表
              </CardTitle>
              <CardDescription>
                使用快捷鍵提升工作效率
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-lg">圖像標註</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">切換類別</span>
                      <div className="flex gap-2">
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">1</kbd>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">2</kbd>
                        <span className="text-muted-foreground">...</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">9</kbd>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">刪除選中的框</span>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Delete</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">上一張圖片</span>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">←</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">下一張圖片</span>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">→</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">保存標註</span>
                      <div className="flex gap-1">
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">S</kbd>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">保存所有標註</span>
                      <div className="flex gap-1">
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Shift</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">S</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-lg">全局快捷鍵</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">搜尋</span>
                      <div className="flex gap-1">
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl</kbd>
                        <span>+</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">K</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                常見問題
              </CardTitle>
              <CardDescription>
                快速找到常見問題的解答
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Q: 需要多少張圖片才能訓練模型？</h4>
                  <p className="text-sm text-muted-foreground">
                    A: 建議每個類別至少 50-100 張標註圖片。圖片越多，模型性能通常越好。對於複雜場景，可能需要數百甚至上千張圖片。
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Q: 訓練需要多長時間？</h4>
                  <p className="text-sm text-muted-foreground">
                    A: 取決於圖片數量、模型大小和 epochs 設定。通常 100 張圖片訓練 100 epochs 在 CPU 上需要 30-60 分鐘。使用 GPU 可大幅縮短訓練時間。
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Q: 如何提升模型準確度？</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    A: 可以嘗試以下方法：
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• 增加訓練圖片數量和多樣性</li>
                    <li>• 確保標註品質（框要緊貼物體）</li>
                    <li>• 使用更大的模型（如從 n 升級到 m）</li>
                    <li>• 增加訓練 epochs</li>
                    <li>• 啟用數據增強</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Q: 訓練失敗或中斷怎麼辦？</h4>
                  <p className="text-sm text-muted-foreground">
                    A: 檢查訓練日誌中的錯誤訊息。常見問題包括：資料集格式錯誤、圖片損壞、記憶體不足。確保資料集包含 train/val 分割和 classes.txt 檔案。
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Q: 資料會保存在哪裡？</h4>
                  <p className="text-sm text-muted-foreground">
                    A: 標註和資料集保存在瀏覽器的 IndexedDB 中，訓練模板保存在 localStorage。這些資料只存在於你的瀏覽器中，不會上傳到伺服器。建議定期使用「設置」頁面的「匯出備份資料」功能備份。
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Q: 可以在手機上使用嗎？</h4>
                  <p className="text-sm text-muted-foreground">
                    A: 可以瀏覽和查看，但標註和訓練功能建議在電腦上使用以獲得更好的體驗。
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Q: 訓練的模型可以導出使用嗎？</h4>
                  <p className="text-sm text-muted-foreground">
                    A: 可以！訓練完成後可以下載 .pt（PyTorch）和 .onnx 格式的模型檔案，可在其他環境中使用。也可以在「推論測試」頁面上傳這些模型進行測試。
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
