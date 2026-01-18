import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Image,
  Database,
  Settings,
  Sparkles,
  Activity,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    title: '圖像標註',
    description: '使用直觀的 Canvas 工具繪製邊界框，支援多類別標註和快捷鍵操作',
    icon: Image,
    href: '/annotation',
    color: 'text-blue-600',
  },
  {
    title: '資料集管理',
    description: '創建和管理 YOLO 格式資料集，自動分割訓練/驗證集',
    icon: Database,
    href: '/dataset',
    color: 'text-green-600',
  },
  {
    title: '訓練配置',
    description: '完整的訓練參數設置界面，支援數據增強和進階配置',
    icon: Settings,
    href: '/training',
    color: 'text-orange-600',
  },
  {
    title: '訓練監控',
    description: '即時查看訓練進度、損失曲線和性能指標',
    icon: Activity,
    href: '/monitor',
    color: 'text-red-600',
  },
  {
    title: '推論測試',
    description: '上傳圖片進行目標檢測，即時查看推論結果',
    icon: Sparkles,
    href: '/inference',
    color: 'text-purple-600',
  },
];

export function Home() {
  return (
    <div className="container max-w-6xl mx-auto py-12 px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">YOLO Web 平台</h1>
        <p className="text-xl text-muted-foreground mb-6">
          無需安裝，瀏覽器即可完成 YOLO 模型的標註、訓練和推論
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link to="/annotation">
              開始標註
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/docs">
              查看文檔
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.href} to={feature.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4 ${feature.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <span>
                      前往使用
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 p-6 bg-muted rounded-lg">
        <h2 className="text-xl font-bold mb-2">快速開始</h2>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
          <li>上傳圖片並使用標註工具繪製邊界框</li>
          <li>創建資料集並設定訓練/驗證分割比例</li>
          <li>配置訓練參數並開始訓練</li>
          <li>監控訓練進度、查看損失曲線和指標</li>
          <li>使用推論模組測試模型效果</li>
        </ol>
      </div>
    </div>
  );
}
