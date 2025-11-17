import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import BrandingForm from '../components/BrandingForm';
import { useProject } from '../hooks/useProject';
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

  const handleSubmit = async () => {
    if (!projectId) return;

    setIsSubmitting(true);
    try {
      // Upload files and update project
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      if (pinterestUrl) {
        formData.append('pinterestUrl', pinterestUrl);
      }

      formData.append('branding', JSON.stringify(branding));

      await updateProject(projectId, formData);

      // Navigate to domain mapping
      navigate(`/project/${projectId}/domain-mapping`);
    } catch (error) {
      console.error('Failed to upload files:', error);
      navigate('/error', { state: { error: 'Failed to upload files' } });
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

            <FileUpload
              files={files}
              onFilesChange={setFiles}
              accept={{
                'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
                'application/pdf': ['.pdf'],
              }}
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
