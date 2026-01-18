import { Link } from 'react-router-dom';
import { Menu, BookOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-xl">🚀</span>
          </div>
          <div>
            <h1 className="text-lg font-bold">YOLO Web Platform</h1>
            <p className="text-xs text-muted-foreground">無代碼訓練平台</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/docs">
            <BookOpen className="mr-2 h-4 w-4" />
            文檔
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" />
            設置
          </Link>
        </Button>
      </div>
    </header>
  );
}
