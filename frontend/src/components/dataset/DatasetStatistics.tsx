import { useMemo } from 'react';
import type { DatasetStatistics as DatasetStatisticsType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Image, Tag, TrendingUp, AlertCircle } from 'lucide-react';

interface DatasetStatisticsProps {
  statistics: DatasetStatisticsType;
}

export function DatasetStatistics({ statistics }: DatasetStatisticsProps) {
  const pieData = useMemo(() => [
    { name: '訓練集', value: statistics.trainBoxes, color: '#3b82f6' },
    { name: '驗證集', value: statistics.valBoxes, color: '#22c55e' },
  ], [statistics.trainBoxes, statistics.valBoxes]);

  const barData = useMemo(() =>
    statistics.classDistribution.map((cls) => ({
      name: cls.className,
      訓練集: cls.trainCount,
      驗證集: cls.valCount,
      color: cls.color,
    })),
  [statistics.classDistribution]);

  return (
    <div className="space-y-6">
      {/* 數字統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">總圖片數</span>
            </div>
            <div className="text-2xl font-bold mt-1">{statistics.totalImages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">總標註數</span>
            </div>
            <div className="text-2xl font-bold mt-1">{statistics.totalBoxes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">平均標註/圖</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {statistics.avgBoxesPerImage.toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">無標註圖片</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {statistics.imagesWithoutBoxes}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 圖表區域 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 類別分布長條圖 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">類別分布</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="訓練集" fill="#3b82f6" />
                  <Bar dataKey="驗證集" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                暫無類別資料
              </div>
            )}
          </CardContent>
        </Card>

        {/* 訓練/驗證比例圓餅圖 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">訓練/驗證分布</CardTitle>
          </CardHeader>
          <CardContent>
            {statistics.totalBoxes > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                暫無標註資料
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 類別詳細表格 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">類別詳細資訊</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>類別</TableHead>
                <TableHead className="text-center">訓練集</TableHead>
                <TableHead className="text-center">驗證集</TableHead>
                <TableHead className="text-center">總計</TableHead>
                <TableHead className="text-right">佔比</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statistics.classDistribution.map((cls) => (
                <TableRow key={cls.classId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cls.color }}
                      />
                      <span>{cls.className}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{cls.trainCount}</TableCell>
                  <TableCell className="text-center">{cls.valCount}</TableCell>
                  <TableCell className="text-center font-semibold">
                    {cls.totalCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {statistics.totalBoxes > 0
                      ? `${((cls.totalCount / statistics.totalBoxes) * 100).toFixed(1)}%`
                      : '0%'}
                  </TableCell>
                </TableRow>
              ))}
              {statistics.classDistribution.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    暫無類別資料
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
