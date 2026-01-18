import { useCallback } from 'react';
import { Upload, FolderOpen, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
}

export function ImageUploadZone({ onFilesSelected, className }: ImageUploadZoneProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(files);
    },
    [onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleFolderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      className={cn(
        'border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        id="file-input"
        type="file"
        multiple
        accept="image/*,.txt"
        className="hidden"
        onChange={handleFileInput}
      />

      <input
        id="folder-input"
        type="file"
        // @ts-ignore - webkitdirectory is not in TypeScript types but supported by modern browsers
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleFolderInput}
      />

      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">上傳圖片</h3>
          <p className="text-sm text-muted-foreground mb-4">
            拖放圖片文件到這裡,或選擇上傳方式
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById('file-input')?.click();
            }}
          >
            <ImageIcon className="mr-2 h-5 w-5" />
            選擇圖片
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById('folder-input')?.click();
            }}
          >
            <FolderOpen className="mr-2 h-5 w-5" />
            選擇資料夾
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          支援 JPG, PNG, WEBP 格式 | 可同時上傳 classes.txt 自動匯入類別
        </p>
      </div>
    </div>
  );
}
