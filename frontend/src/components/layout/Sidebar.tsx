import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Image,
  Database,
  Settings2,
  Sparkles,
  Activity,
  BookOpen,
  Settings,
} from 'lucide-react';

const navItems = [
  {
    title: '圖像標註',
    href: '/annotation',
    icon: Image,
  },
  {
    title: '資料集管理',
    href: '/dataset',
    icon: Database,
  },
  {
    title: '訓練配置',
    href: '/training',
    icon: Settings2,
  },
  {
    title: '訓練監控',
    href: '/monitor',
    icon: Activity,
  },
  {
    title: '推論測試',
    href: '/inference',
    icon: Sparkles,
  },
];

const secondaryNavItems = [
  {
    title: '文檔說明',
    href: '/docs',
    icon: BookOpen,
  },
  {
    title: '設置',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'w-60 border-r border-border bg-muted/10 flex flex-col',
        className
      )}
    >
      <nav className="flex-1 p-4 flex flex-col">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto pt-4 space-y-1">
          <div className="text-xs text-muted-foreground px-3 py-2">其他</div>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>版本: 1.0.0</p>
          <p>YOLO Web Platform</p>
        </div>
      </div>
    </aside>
  );
}
