import { useState } from 'react';
import { useAnnotationStore } from '@/stores/annotationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';

export function ClassManager() {
  const { classes, addClass, removeClass, updateClass } = useAnnotationStore();
  const [newClassName, setNewClassName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddClass = () => {
    if (newClassName.trim()) {
      addClass(newClassName.trim());
      setNewClassName('');
      setDialogOpen(false);
    }
  };

  const handleUpdateClass = (id: number) => {
    if (editingName.trim()) {
      updateClass(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">類別管理</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              新增
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增類別</DialogTitle>
              <DialogDescription>
                輸入新類別的名稱
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="類別名稱"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddClass();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddClass}>新增</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-1">
          {classes.map((classItem, index) => (
            <div
              key={classItem.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group"
            >
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: classItem.color }}
              />

              {editingId === classItem.id ? (
                <Input
                  className="h-7 flex-1"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateClass(classItem.id);
                    } else if (e.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {classItem.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {classItem.count} 個標註
                    </span>
                  </div>
                </>
              )}

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {editingId === classItem.id ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleUpdateClass(classItem.id)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingId(classItem.id);
                      setEditingName(classItem.name);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => {
                    if (confirm(`確定要刪除類別「${classItem.name}」嗎？`)) {
                      removeClass(classItem.id);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
