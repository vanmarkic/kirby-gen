import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import InputPage from './pages/InputPage';
import DomainMappingPage from './pages/DomainMappingPage';
import ProgressPage from './pages/ProgressPage';
import PreviewPage from './pages/PreviewPage';
import ErrorPage from './pages/ErrorPage';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/:projectId/input" element={<InputPage />} />
          <Route path="/project/:projectId/domain-mapping" element={<DomainMappingPage />} />
          <Route path="/project/:projectId/progress" element={<ProgressPage />} />
          <Route path="/project/:projectId/preview" element={<PreviewPage />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
