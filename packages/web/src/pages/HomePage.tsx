import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Upload, Wand2, Eye, LogOut } from 'lucide-react';
import { useProject } from '../hooks/useProject';
import { useAuth } from '../contexts';

export default function HomePage() {
  const navigate = useNavigate();
  const { createProject } = useProject();
  const { logout } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      const project = await createProject({
        name: `Portfolio ${new Date().toISOString().split('T')[0]}`,
      });
      navigate(`/project/${project.id}/input`);
    } catch (error) {
      console.error('Failed to create project:', error);
      navigate('/error', { state: { error: 'Failed to create project' } });
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page home-page">
      <div className="home-container">
        <header className="home-header">
          <div className="header-top">
            <div className="logo">
              <Sparkles className="logo-icon" />
              <h1>Kirby Gen</h1>
            </div>
            <button
              className="logout-button"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
          <p className="tagline">
            Generate beautiful, CMS-powered portfolio websites from your work
          </p>
        </header>

        <section className="features">
          <div className="feature">
            <div className="feature-icon">
              <Upload />
            </div>
            <h3>Upload Your Work</h3>
            <p>
              Add images, PDFs, and Pinterest boards. We'll analyze your work
              to understand your portfolio structure.
            </p>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <Wand2 />
            </div>
            <h3>AI-Powered Generation</h3>
            <p>
              Our AI discovers your domain entities and generates a custom
              CMS schema tailored to your content.
            </p>
          </div>

          <div className="feature">
            <div className="feature-icon">
              <Eye />
            </div>
            <h3>Preview & Deploy</h3>
            <p>
              Review your generated portfolio, make adjustments, and deploy
              with one click to your own domain.
            </p>
          </div>
        </section>

        <div className="cta-section">
          <button
            className="btn-primary btn-large"
            onClick={handleCreateProject}
            disabled={isCreating}
          >
            {isCreating ? 'Creating Project...' : 'Start New Project'}
          </button>
          <p className="cta-description">
            Free to use • No credit card required • Deploy anywhere
          </p>
        </div>

        <footer className="home-footer">
          <p>
            Powered by{' '}
            <a
              href="https://getkirby.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kirby CMS
            </a>
            {' '}&amp;{' '}
            <a
              href="https://astro.build"
              target="_blank"
              rel="noopener noreferrer"
            >
              Astro
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
