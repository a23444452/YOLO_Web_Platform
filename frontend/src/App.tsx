import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Home } from '@/pages/Home';
import { Annotation } from '@/pages/Annotation';
import { Dataset } from '@/pages/Dataset';
import { Training } from '@/pages/Training';
import { Inference } from '@/pages/Inference';
import { Monitor } from '@/pages/Monitor';
import { Settings } from '@/pages/Settings';
import { Docs } from '@/pages/Docs';
import { Toaster } from '@/components/ui/sonner';
import { useAnnotationStore } from '@/stores/annotationStore';

function App() {
  const loadFromDB = useAnnotationStore((state) => state.loadFromDB);

  // 應用啟動時從 IndexedDB 載入數據
  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="annotation" element={<Annotation />} />
          <Route path="dataset" element={<Dataset />} />
          <Route path="training" element={<Training />} />
          <Route path="inference" element={<Inference />} />
          <Route path="monitor" element={<Monitor />} />
          <Route path="settings" element={<Settings />} />
          <Route path="docs" element={<Docs />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
