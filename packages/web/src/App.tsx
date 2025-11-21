import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import InputPage from './pages/InputPage';
import DomainMappingPage from './pages/DomainMappingPage';
import ProgressPage from './pages/ProgressPage';
import PreviewPage from './pages/PreviewPage';
import ErrorPage from './pages/ErrorPage';
import { Login } from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:projectId/input"
            element={
              <ProtectedRoute>
                <InputPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:projectId/domain-mapping"
            element={
              <ProtectedRoute>
                <DomainMappingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:projectId/progress"
            element={
              <ProtectedRoute>
                <ProgressPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:projectId/preview"
            element={
              <ProtectedRoute>
                <PreviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/error"
            element={
              <ProtectedRoute>
                <ErrorPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
