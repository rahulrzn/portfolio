import { StrictMode, Suspense, lazy } from 'react';
import './admin/historyGuard';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LazyMotion, domMax, MotionConfig } from 'motion/react';
import './styles.css';
import { ContentProvider } from './content/context';
import { ErrorBoundary } from './components/ErrorBoundary';
const PublicRoutes = lazy(() => import('./public/PublicRoutes'));
const Admin = lazy(() => import('./admin/AdminApp'));
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domMax}>
          <BrowserRouter>
            <Suspense
              fallback={
                <div className="page-loading" role="status">
                  Loading portfolio…
                </div>
              }
            >
              <Routes>
                <Route
                  path="/admin/*"
                  element={
                    <ErrorBoundary admin>
                      <Admin />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/*"
                  element={
                    <ContentProvider>
                      <PublicRoutes />
                    </ContentProvider>
                  }
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </LazyMotion>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
);
