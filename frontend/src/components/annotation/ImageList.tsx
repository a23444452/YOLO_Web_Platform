import { useAnnotationStore } from '@/stores/annotationStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

export function ImageList() {
  const { images, currentImageId, setCurrentImage, removeImage, clearAllImages } = useAnnotationStore();

  const currentIndex = images.findIndex((img) => img.id === currentImageId);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentImage(images[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentImage(images[currentIndex + 1].id);
    }
  };

  const handleClearAll = () => {
    if (images.length === 0) return;

    if (confirm(`確定要刪除全部 ${images.length} 張圖片嗎？此操作無法復原。`)) {
      clearAllImages();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">圖片列表</h3>
          <span className="text-xs text-muted-foreground">
            {images.length} 張
          </span>
        </div>
        <div className="flex gap-1 mb-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handlePrevious}
            disabled={currentIndex <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleNext}
            disabled={currentIndex >= images.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleClearAll}
          disabled={images.length === 0}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          清空全部
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {images.map((image) => {
            const isActive = image.id === currentImageId;
            const hasAnnotations = image.boxes.length > 0;

            return (
              <div
                key={image.id}
                className={cn(
                  'group relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all',
                  isActive
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent hover:border-muted-foreground/20'
                )}
                onClick={() => setCurrentImage(image.id)}
              >
                <div className="aspect-video bg-muted relative">
                  <img
                    src={image.dataUrl}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                  />
                  {hasAnnotations && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                      {image.boxes.length}
                    </div>
                  )}
                </div>
                <div className="p-2 bg-background flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{image.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {image.width} × {image.height}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`確定要刪除「${image.filename}」嗎？`)) {
                        removeImage(image.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
