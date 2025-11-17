import { Database, Link as LinkIcon } from 'lucide-react';
import type { DomainSchema, Entity } from '@kirby-gen/shared';

interface SchemaVisualizationProps {
  schema: DomainSchema;
}

export default function SchemaVisualization({
  schema,
}: SchemaVisualizationProps) {
  const renderField = (field: any) => {
    return (
      <div key={field.name} className="field">
        <span className="field-name">{field.name}</span>
        <span className="field-type">{field.type}</span>
        {field.required && <span className="field-badge">Required</span>}
      </div>
    );
  };

  const renderEntity = (entity: Entity) => {
    return (
      <div key={entity.name} className="entity-card">
        <div className="entity-header">
          <Database size={18} />
          <h3>{entity.name}</h3>
        </div>

        {entity.description && (
          <p className="entity-description">{entity.description}</p>
        )}

        <div className="entity-fields">
          <h4>Fields</h4>
          <div className="fields-list">
            {entity.fields.map(renderField)}
          </div>
        </div>

        {entity.relationships && entity.relationships.length > 0 && (
          <div className="entity-relationships">
            <h4>Relationships</h4>
            <div className="relationships-list">
              {entity.relationships.map((rel) => (
                <div key={rel.name} className="relationship">
                  <LinkIcon size={14} />
                  <span className="relationship-name">{rel.name}</span>
                  <span className="relationship-target">{rel.targetEntity}</span>
                  <span className="relationship-type">({rel.type})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="schema-visualization">
      <div className="schema-header">
        <div className="schema-info">
          <span className="schema-badge">
            {schema.entities.length} Entities
          </span>
        </div>
      </div>

      <div className="entities-grid">
        {schema.entities.map(renderEntity)}
      </div>

      {schema.entities.length === 0 && (
        <div className="schema-empty">
          <Database size={48} />
          <p>No entities discovered yet</p>
        </div>
      )}
    </div>
  );
}
