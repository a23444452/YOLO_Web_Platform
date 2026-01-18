import { useEffect, useRef, useState, useCallback } from 'react';
import { useAnnotationStore } from '@/stores/annotationStore';
import type { ImageAnnotation, BoundingBox } from '@/types';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Trash2, Undo2, Redo2 } from 'lucide-react';

interface AnnotationCanvasProps {
  image: ImageAnnotation;
}

interface Point {
  x: number;
  y: number;
}

type InteractionMode = 'idle' | 'drawing' | 'moving' | 'resizing';
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

export function AnnotationCanvas({ image }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<InteractionMode>('idle');
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  const {
    classes,
    addBox,
    removeBox,
    updateBox,
    selectedBoxId,
    setSelectedBox,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAnnotationStore();

  const [selectedClassId, setSelectedClassId] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  // 載入圖片
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      calculateScale();
      draw();
    };
    img.src = image.dataUrl;
  }, [image.dataUrl]);

  // 計算縮放和偏移
  const calculateScale = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const imgWidth = imageRef.current.width;
    const imgHeight = imageRef.current.height;

    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const newScale = Math.min(scaleX, scaleY, 1) * zoom;

    setScale(newScale);
    setOffset({
      x: (containerWidth - imgWidth * newScale) / 2,
      y: (containerHeight - imgHeight * newScale) / 2,
    });
  }, [zoom]);

  // 調整 Canvas 大小
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const updateSize = () => {
      const canvas = canvasRef.current!;
      const container = containerRef.current!;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      calculateScale();
      draw();
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [calculateScale]);

  // 轉換屏幕座標到歸一化座標
  const screenToNormalized = useCallback((screenX: number, screenY: number): Point => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const imgWidth = imageRef.current.width;
    const imgHeight = imageRef.current.height;
    return {
      x: (screenX - offset.x) / (imgWidth * scale),
      y: (screenY - offset.y) / (imgHeight * scale),
    };
  }, [scale, offset]);

  // 轉換歸一化座標到屏幕座標
  const normalizedToScreen = useCallback((normX: number, normY: number): Point => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const imgWidth = imageRef.current.width;
    const imgHeight = imageRef.current.height;
    return {
      x: normX * imgWidth * scale + offset.x,
      y: normY * imgHeight * scale + offset.y,
    };
  }, [scale, offset]);

  // 檢測點是否在框內（增加容差讓邊緣更容易點擊）
  const isPointInBox = useCallback((point: Point, box: BoundingBox): boolean => {
    // 增加邊緣檢測容差（歸一化單位）
    const tolerance = 0.01; // 約1%的容差
    const x1 = box.x - box.width / 2 - tolerance;
    const y1 = box.y - box.height / 2 - tolerance;
    const x2 = box.x + box.width / 2 + tolerance;
    const y2 = box.y + box.height / 2 + tolerance;
    return point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2;
  }, []);

  // 獲取控制點位置
  const getHandlePositions = useCallback((box: BoundingBox): Record<Exclude<ResizeHandle, null>, Point> => {
    const x1 = box.x - box.width / 2;
    const y1 = box.y - box.height / 2;
    const x2 = box.x + box.width / 2;
    const y2 = box.y + box.height / 2;
    const cx = box.x;
    const cy = box.y;

    return {
      nw: { x: x1, y: y1 },
      n: { x: cx, y: y1 },
      ne: { x: x2, y: y1 },
      e: { x: x2, y: cy },
      se: { x: x2, y: y2 },
      s: { x: cx, y: y2 },
      sw: { x: x1, y: y2 },
      w: { x: x1, y: cy },
    };
  }, []);

  // 檢測點擊的控制點
  const getClickedHandle = useCallback((screenPoint: Point, box: BoundingBox): ResizeHandle => {
    // 增加控制點的檢測區域（像素），讓它更容易點擊
    const handleSizePixels = 12; // 屏幕像素大小
    const handleSize = handleSizePixels / (imageRef.current ? imageRef.current.width * scale : 1);
    const handles = getHandlePositions(box);

    const normPoint = screenToNormalized(screenPoint.x, screenPoint.y);

    // 優先檢測控制點（更大的容差）
    for (const [handleName, handlePos] of Object.entries(handles)) {
      const dx = Math.abs(normPoint.x - handlePos.x);
      const dy = Math.abs(normPoint.y - handlePos.y);
      // 使用較大的檢測範圍
      if (dx < handleSize * 2 && dy < handleSize * 2) {
        return handleName as ResizeHandle;
      }
    }
    return null;
  }, [scale, getHandlePositions, screenToNormalized]);

  // 繪製
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!canvas || !ctx || !img) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製圖片
    ctx.drawImage(
      img,
      offset.x,
      offset.y,
      img.width * scale,
      img.height * scale
    );

    // 繪製已有標註框
    image.boxes.forEach((box) => {
      drawBox(ctx, box);
    });

    // 繪製正在繪製的框
    if (currentBox && mode === 'drawing') {
      drawBox(ctx, currentBox);
    }
  }, [image.boxes, currentBox, mode, scale, offset]);

  // 繪製單個框
  const drawBox = useCallback(
    (ctx: CanvasRenderingContext2D, box: BoundingBox) => {
      if (!imageRef.current) return;

      const imgWidth = imageRef.current.width;
      const imgHeight = imageRef.current.height;

      const x = (box.x - box.width / 2) * imgWidth * scale + offset.x;
      const y = (box.y - box.height / 2) * imgHeight * scale + offset.y;
      const width = box.width * imgWidth * scale;
      const height = box.height * imgHeight * scale;

      const isSelected = box.id === selectedBoxId;

      // 繪製框
      ctx.strokeStyle = box.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(x, y, width, height);

      // 繪製標籤背景
      const label = box.className;
      ctx.font = '14px sans-serif';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = box.color;
      ctx.fillRect(x, y - 22, textWidth + 8, 22);

      // 繪製標籤文字
      ctx.fillStyle = 'white';
      ctx.fillText(label, x + 4, y - 6);

      // 如果選中，繪製 8 個控制點
      if (isSelected) {
        const handleSize = 10; // 增加控制點大小讓它們更明顯
        ctx.fillStyle = '#ffffff'; // 白色填充
        ctx.strokeStyle = box.color; // 使用框體顏色作為邊框
        ctx.lineWidth = 2;

        const handles = getHandlePositions(box);
        Object.values(handles).forEach((handle) => {
          const screenPos = normalizedToScreen(handle.x, handle.y);
          // 繪製白色方塊
          ctx.fillRect(
            screenPos.x - handleSize / 2,
            screenPos.y - handleSize / 2,
            handleSize,
            handleSize
          );
          // 繪製彩色邊框
          ctx.strokeRect(
            screenPos.x - handleSize / 2,
            screenPos.y - handleSize / 2,
            handleSize,
            handleSize
          );
        });
      }
    },
    [scale, offset, selectedBoxId, getHandlePositions, normalizedToScreen]
  );

  // 重新繪製
  useEffect(() => {
    draw();
  }, [draw]);

  // 滑鼠事件處理
  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getCanvasPoint(e);
      const normPoint = screenToNormalized(point.x, point.y);

      // 優先級1：檢查是否點擊了選中框的控制點
      if (selectedBoxId) {
        const selectedBox = image.boxes.find(b => b.id === selectedBoxId);
        if (selectedBox) {
          const handle = getClickedHandle(point, selectedBox);
          if (handle) {
            setMode('resizing');
            setResizeHandle(handle);
            setStartPoint(normPoint);
            return;
          }
        }
      }

      // 優先級2：檢查是否點擊了任何框體（包括選中的和未選中的）
      // 從後往前遍歷（最後繪製的在最上面）
      let clickedBox: BoundingBox | null = null;
      for (let i = image.boxes.length - 1; i >= 0; i--) {
        const box = image.boxes[i];
        if (isPointInBox(normPoint, box)) {
          clickedBox = box;
          break;
        }
      }

      if (clickedBox) {
        // 點擊了框體
        if (selectedBoxId !== clickedBox.id) {
          // 選中新的框體
          setSelectedBox(clickedBox.id);
        }
        // 開始移動模式
        setMode('moving');
        setStartPoint(normPoint);
        setDragOffset({
          x: normPoint.x - clickedBox.x,
          y: normPoint.y - clickedBox.y,
        });
        return;
      }

      // 優先級3：點擊了空白處，開始繪製新框並取消選擇
      setMode('drawing');
      setStartPoint(normPoint);
      setSelectedBox(null);
    },
    [getCanvasPoint, screenToNormalized, selectedBoxId, image.boxes, getClickedHandle, isPointInBox, setSelectedBox]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getCanvasPoint(e);
      const normPoint = screenToNormalized(point.x, point.y);

      if (mode === 'drawing' && startPoint) {
        // 繪製新框
        const x1 = Math.min(startPoint.x, normPoint.x);
        const y1 = Math.min(startPoint.y, normPoint.y);
        const x2 = Math.max(startPoint.x, normPoint.x);
        const y2 = Math.max(startPoint.y, normPoint.y);

        const width = x2 - x1;
        const height = y2 - y1;
        const centerX = x1 + width / 2;
        const centerY = y1 + height / 2;

        const selectedClass = classes.find((c) => c.id === selectedClassId);
        if (!selectedClass) return;

        setCurrentBox({
          id: 'temp',
          classId: selectedClass.id,
          className: selectedClass.name,
          x: centerX,
          y: centerY,
          width,
          height,
          color: selectedClass.color,
        });
        draw();
      } else if (mode === 'moving' && selectedBoxId && startPoint) {
        // 移動框
        const selectedBox = image.boxes.find(b => b.id === selectedBoxId);
        if (!selectedBox) return;

        const newX = Math.max(0, Math.min(1, normPoint.x - dragOffset.x));
        const newY = Math.max(0, Math.min(1, normPoint.y - dragOffset.y));

        // 確保框不超出邊界
        const halfWidth = selectedBox.width / 2;
        const halfHeight = selectedBox.height / 2;
        const clampedX = Math.max(halfWidth, Math.min(1 - halfWidth, newX));
        const clampedY = Math.max(halfHeight, Math.min(1 - halfHeight, newY));

        updateBox(image.id, selectedBoxId, {
          ...selectedBox,
          x: clampedX,
          y: clampedY,
        });
        draw();
      } else if (mode === 'resizing' && selectedBoxId && startPoint && resizeHandle) {
        // 調整大小
        const selectedBox = image.boxes.find(b => b.id === selectedBoxId);
        if (!selectedBox) return;

        const x1 = selectedBox.x - selectedBox.width / 2;
        const y1 = selectedBox.y - selectedBox.height / 2;
        const x2 = selectedBox.x + selectedBox.width / 2;
        const y2 = selectedBox.y + selectedBox.height / 2;

        let newX1 = x1, newY1 = y1, newX2 = x2, newY2 = y2;

        // 根據控制點調整
        switch (resizeHandle) {
          case 'nw':
            newX1 = Math.min(normPoint.x, x2 - 0.01);
            newY1 = Math.min(normPoint.y, y2 - 0.01);
            break;
          case 'n':
            newY1 = Math.min(normPoint.y, y2 - 0.01);
            break;
          case 'ne':
            newX2 = Math.max(normPoint.x, x1 + 0.01);
            newY1 = Math.min(normPoint.y, y2 - 0.01);
            break;
          case 'e':
            newX2 = Math.max(normPoint.x, x1 + 0.01);
            break;
          case 'se':
            newX2 = Math.max(normPoint.x, x1 + 0.01);
            newY2 = Math.max(normPoint.y, y1 + 0.01);
            break;
          case 's':
            newY2 = Math.max(normPoint.y, y1 + 0.01);
            break;
          case 'sw':
            newX1 = Math.min(normPoint.x, x2 - 0.01);
            newY2 = Math.max(normPoint.y, y1 + 0.01);
            break;
          case 'w':
            newX1 = Math.min(normPoint.x, x2 - 0.01);
            break;
        }

        // 限制在邊界內
        newX1 = Math.max(0, newX1);
        newY1 = Math.max(0, newY1);
        newX2 = Math.min(1, newX2);
        newY2 = Math.min(1, newY2);

        const newWidth = newX2 - newX1;
        const newHeight = newY2 - newY1;
        const newCenterX = newX1 + newWidth / 2;
        const newCenterY = newY1 + newHeight / 2;

        updateBox(image.id, selectedBoxId, {
          ...selectedBox,
          x: newCenterX,
          y: newCenterY,
          width: newWidth,
          height: newHeight,
        });
        draw();
      } else {
        // 更新游標樣式
        updateCursor(point);
      }
    },
    [mode, startPoint, getCanvasPoint, screenToNormalized, selectedBoxId, image, classes, selectedClassId, dragOffset, resizeHandle, updateBox, draw]
  );

  const handleMouseUp = useCallback(() => {
    if (mode === 'drawing' && currentBox) {
      // 過濾太小的框
      if (currentBox.width < 0.01 || currentBox.height < 0.01) {
        setCurrentBox(null);
        setMode('idle');
        return;
      }

      // 添加標註
      addBox(image.id, {
        classId: currentBox.classId,
        className: currentBox.className,
        x: currentBox.x,
        y: currentBox.y,
        width: currentBox.width,
        height: currentBox.height,
        color: currentBox.color,
      });

      setCurrentBox(null);
    }

    setMode('idle');
    setStartPoint(null);
    setResizeHandle(null);
  }, [mode, currentBox, addBox, image.id]);

  // 更新游標樣式
  const updateCursor = useCallback((screenPoint: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (selectedBoxId) {
      const selectedBox = image.boxes.find(b => b.id === selectedBoxId);
      if (selectedBox) {
        const handle = getClickedHandle(screenPoint, selectedBox);
        if (handle) {
          const cursorMap: Record<string, string> = {
            'nw': 'nw-resize',
            'n': 'n-resize',
            'ne': 'ne-resize',
            'e': 'e-resize',
            'se': 'se-resize',
            's': 's-resize',
            'sw': 'sw-resize',
            'w': 'w-resize',
          };
          canvas.style.cursor = cursorMap[handle] || 'pointer';
          return;
        }

        const normPoint = screenToNormalized(screenPoint.x, screenPoint.y);
        if (isPointInBox(normPoint, selectedBox)) {
          canvas.style.cursor = 'move';
          return;
        }
      }
    }

    canvas.style.cursor = 'crosshair';
  }, [selectedBoxId, image.boxes, getClickedHandle, screenToNormalized, isPointInBox]);

  // 鍵盤事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
        return;
      }

      // Redo: Ctrl+Shift+Z (Windows/Linux) or Cmd+Shift+Z (Mac) or Ctrl+Y
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
        return;
      }

      if (e.key === 'Delete' && selectedBoxId) {
        removeBox(image.id, selectedBoxId);
        setSelectedBox(null);
      } else if (e.key === 'Escape') {
        // Escape 鍵取消選擇
        setSelectedBox(null);
        setMode('idle');
      } else if (e.key >= '1' && e.key <= '9') {
        // 按照 class.id 排序後選擇類別，確保快捷鍵對應正確
        const sortedClasses = [...classes].sort((a, b) => a.id - b.id);
        const classIndex = parseInt(e.key) - 1;
        if (classIndex < sortedClasses.length) {
          setSelectedClassId(sortedClasses[classIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBoxId, classes, removeBox, image.id, setSelectedBox, undo, redo, canUndo, canRedo]);

  // 縮放功能
  const handleZoomIn = () => {
    setZoom((z) => Math.min(z * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleDeleteSelected = () => {
    if (selectedBoxId) {
      removeBox(image.id, selectedBoxId);
    }
  };

  // 更新縮放時重新計算
  useEffect(() => {
    calculateScale();
  }, [zoom, calculateScale]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* 工具列 */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {/* Undo/Redo 按鈕 */}
        <Button
          variant="secondary"
          size="icon"
          onClick={undo}
          disabled={!canUndo()}
          title="撤銷 (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={redo}
          disabled={!canRedo()}
          title="重做 (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        {/* 分隔線 */}
        <div className="h-px bg-border my-1" />

        {/* 縮放按鈕 */}
        <Button variant="secondary" size="icon" onClick={handleZoomIn} title="放大">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleZoomOut} title="縮小">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleResetZoom} title="重置縮放">
          <Maximize2 className="h-4 w-4" />
        </Button>

        {/* 刪除按鈕 */}
        {selectedBoxId && (
          <Button variant="destructive" size="icon" onClick={handleDeleteSelected} title="刪除 (Delete)">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 狀態提示 */}
      {selectedBoxId && (
        <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 px-3">
          <div className="text-xs text-muted-foreground">
            已選中框體
            <span className="ml-2 text-foreground font-medium">
              {image.boxes.find(b => b.id === selectedBoxId)?.className || ''}
            </span>
            <span className="ml-2 text-muted-foreground">
              (Esc 取消 / Delete 刪除 / Ctrl+Z 撤銷)
            </span>
          </div>
        </div>
      )}

      {/* 類別選擇器 */}
      <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3">
        <div className="text-xs text-muted-foreground mb-2">選擇類別 (1-9 快捷鍵)</div>
        <div className="flex gap-2 flex-wrap">
          {classes.map((classItem, index) => (
            <Button
              key={classItem.id}
              variant={selectedClassId === classItem.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedClassId(classItem.id)}
              className="gap-2"
            >
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: classItem.color }}
              />
              {index < 9 && <span className="text-xs opacity-60">{index + 1}</span>}
              {classItem.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
