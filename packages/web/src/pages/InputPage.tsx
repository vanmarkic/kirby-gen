import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import BrandingForm from '../components/BrandingForm';
import { useProject } from '../hooks/useProject';
import { fileEndpoints } from '../api/endpoints';
import type { BrandingConfig } from '@kirby-gen/shared';

export default function InputPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { updateProject } = useProject();

  const [files, setFiles] = useState<File[]>([]);
  const [pinterestUrl, setPinterestUrl] = useState('');
  const [branding, setBranding] = useState<BrandingConfig>({
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    fontFamily: 'Inter',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Redirect to home if projectId is missing
  useEffect(() => {
    if (!projectId) {
      console.error('No project ID provided, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [projectId, navigate]);

  // Clear validation error when files change
  useEffect(() => {
    if (validationError) {
      setValidationError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]);

  // Don't render if no projectId
  if (!projectId) {
    return null;
  }

  const handleSubmit = async () => {
    if (!projectId) return;

    setValidationError(null);
    setIsSubmitting(true);
    try {
      // Step 1: Upload content files if any
      if (files.length > 0) {
        await fileEndpoints.uploadContent(projectId, files);
      }

      // Step 2: Update project metadata (Pinterest URL and branding)
      const updateData: any = {
        inputs: {},
      };

      if (pinterestUrl) {
        updateData.inputs.pinterestUrl = pinterestUrl;
      }

      if (branding) {
        updateData.inputs.brandingAssets = {
          colors: {
            primary: branding.primaryColor,
            secondary: branding.secondaryColor,
          },
          fonts: [{ family: branding.fontFamily }],
        };
      }

      // Only update if there's metadata to update
      if (Object.keys(updateData.inputs).length > 0) {
        await updateProject(projectId, updateData);
      }

      // Navigate to domain mapping
      navigate(`/project/${projectId}/domain-mapping`);
    } catch (error: any) {
      console.error('Failed to upload files:', error);

      // Extract error message from API response
      let errorMessage = 'Failed to upload files';
      if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setValidationError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = files.length > 0 || pinterestUrl.trim() !== '';

  return (
    <div className="page input-page">
      <div className="page-container">
        <header className="page-header">
          <button
            className="btn-secondary btn-icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft />
          </button>
          <div>
            <h1>Upload Your Work</h1>
            <p className="page-description">
              Add your portfolio content and customize your branding
            </p>
          </div>
        </header>

        <div className="page-content">
          <section className="input-section">
            <h2>Portfolio Content</h2>
            <p className="section-description">
              Upload images, PDFs, or provide a Pinterest board URL
            </p>

            {validationError && (
              <div className="alert alert-error">
                <AlertCircle size={20} />
                <p>{validationError}</p>
              </div>
            )}

            <FileUpload
              files={files}
              onFilesChange={setFiles}
            />

            <div className="pinterest-input">
              <label htmlFor="pinterest-url">Pinterest Board URL (optional)</label>
              <input
                id="pinterest-url"
                type="url"
                placeholder="https://pinterest.com/username/board-name/"
                value={pinterestUrl}
                onChange={(e) => setPinterestUrl(e.target.value)}
                className="input"
              />
              <p className="input-hint">
                We'll extract images and metadata from your Pinterest board
              </p>
            </div>
          </section>

          <section className="input-section">
            <h2>Branding</h2>
            <p className="section-description">
              Customize colors and typography for your portfolio
            </p>

            <BrandingForm branding={branding} onChange={setBranding} />
          </section>
        </div>

        <footer className="page-footer">
          <button
            className="btn-secondary"
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!canProceed || isSubmitting}
          >
            {isSubmitting ? 'Uploading...' : 'Continue'}
            <ArrowRight />
          </button>
        </footer>
      </div>
    </div>
  );
}
