import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

interface ErrorState {
  error?: string;
  details?: string;
}

export default function ErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ErrorState | undefined;

  const errorMessage = state?.error || 'An unexpected error occurred';
  const errorDetails = state?.details;

  return (
    <div className="page error-page">
      <div className="page-container">
        <div className="error-content">
          <div className="error-icon">
            <AlertTriangle size={64} />
          </div>

          <h1>Something Went Wrong</h1>
          <p className="error-message">{errorMessage}</p>

          {errorDetails && (
            <details className="error-details">
              <summary>Error Details</summary>
              <pre>{errorDetails}</pre>
            </details>
          )}

          <div className="error-actions">
            <button
              className="btn-secondary"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft />
              Go Back
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate('/')}
            >
              <Home />
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
