import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ConvertPage } from './pages/ConvertPage';
import { GuidePage } from './pages/GuidePage';
import {
  applyPageMeta,
  CONVERT_PAGE_META,
  GUIDE_PAGE_META,
} from './utils/pageMeta';

function PageMetaManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/guide') {
      applyPageMeta(GUIDE_PAGE_META);
      return;
    }
    applyPageMeta(CONVERT_PAGE_META);
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <PageMetaManager />
      <Routes>
        <Route path="/" element={<ConvertPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
