import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import ConversationUI from '../components/ConversationUI';
import SchemaVisualization from '../components/SchemaVisualization';
import { useProject } from '../hooks/useProject';
import type { DomainSchema } from '@kirby-gen/shared';

export default function DomainMappingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getProject } = useProject();

  const [schema, setSchema] = useState<DomainSchema | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    // Load project to check if schema already exists
    getProject(projectId)
      .then((project) => {
        if (project.schema) {
          setSchema(project.schema);
          setIsComplete(true);
        }
      })
      .catch((error) => {
        console.error('Failed to load project:', error);
      });
  }, [projectId, getProject]);

  const handleSchemaUpdate = (newSchema: DomainSchema) => {
    setSchema(newSchema);
  };

  const handleComplete = () => {
    setIsComplete(true);
  };

  const handleProceed = () => {
    if (!projectId) return;
    navigate(`/project/${projectId}/progress`);
  };

  return (
    <div className="page domain-mapping-page">
      <div className="page-container">
        <header className="page-header">
          <button
            className="btn-secondary btn-icon"
            onClick={() => navigate(`/project/${projectId}/input`)}
          >
            <ArrowLeft />
          </button>
          <div>
            <h1>Domain Mapping</h1>
            <p className="page-description">
              Let's discover the entities in your portfolio
            </p>
          </div>
        </header>

        <div className="page-content domain-mapping-content">
          <div className="conversation-panel">
            <ConversationUI
              projectId={projectId!}
              onSchemaUpdate={handleSchemaUpdate}
              onComplete={handleComplete}
            />
          </div>

          <div className="schema-panel">
            <h2>Domain Schema</h2>
            {schema ? (
              <SchemaVisualization schema={schema} />
            ) : (
              <div className="schema-placeholder">
                <p>
                  The AI will discover entities from your content and build
                  a schema here.
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="page-footer">
          <button
            className="btn-secondary"
            onClick={() => navigate(`/project/${projectId}/input`)}
          >
            Back
          </button>
          <button
            className="btn-primary"
            onClick={handleProceed}
            disabled={!isComplete}
          >
            Generate Portfolio
            <ArrowRight />
          </button>
        </footer>
      </div>
    </div>
  );
}
