import { useEffect } from 'react';
import type { BrandingConfig } from '@kirby-gen/shared';

interface BrandingFormProps {
  branding: BrandingConfig;
  onChange: (branding: BrandingConfig) => void;
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Lora', label: 'Lora' },
];

export default function BrandingForm({
  branding,
  onChange,
}: BrandingFormProps) {
  const handleChange = (field: keyof BrandingConfig, value: string) => {
    onChange({
      ...branding,
      [field]: value,
    });
  };

  // Dynamically load Google Font when font family changes
  useEffect(() => {
    if (!branding.fontFamily) return;
    const fontName = branding.fontFamily.replace(/ /g, '+');
    const linkId = 'google-font-branding';

    let link = document.getElementById(linkId) as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`;
  }, [branding.fontFamily]);

  return (
    <div className="branding-form">
      <div className="form-group">
        <label htmlFor="primary-color">Primary Color</label>
        <div className="color-input-group">
          <input
            id="primary-color"
            type="color"
            value={branding.primaryColor}
            onChange={(e) => handleChange('primaryColor', e.target.value)}
            className="color-picker"
          />
          <input
            type="text"
            value={branding.primaryColor}
            onChange={(e) => handleChange('primaryColor', e.target.value)}
            className="input color-text-input"
            pattern="^#[0-9A-Fa-f]{6}$"
          />
        </div>
        <p className="input-hint">Main brand color for headings and accents</p>
      </div>

      <div className="form-group">
        <label htmlFor="secondary-color">Secondary Color</label>
        <div className="color-input-group">
          <input
            id="secondary-color"
            type="color"
            value={branding.secondaryColor}
            onChange={(e) => handleChange('secondaryColor', e.target.value)}
            className="color-picker"
          />
          <input
            type="text"
            value={branding.secondaryColor}
            onChange={(e) => handleChange('secondaryColor', e.target.value)}
            className="input color-text-input"
            pattern="^#[0-9A-Fa-f]{6}$"
          />
        </div>
        <p className="input-hint">Background and secondary elements</p>
      </div>

      <div className="form-group">
        <label htmlFor="font-family">Font Family</label>
        <select
          id="font-family"
          value={branding.fontFamily}
          onChange={(e) => handleChange('fontFamily', e.target.value)}
          className="select"
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
        <p className="input-hint">Typography for your portfolio</p>
      </div>

      <div className="branding-preview">
        <h3>Preview</h3>
        <div
          className="preview-card"
          style={{
            backgroundColor: branding.secondaryColor,
            fontFamily: branding.fontFamily,
          }}
        >
          <h4 style={{ color: branding.primaryColor }}>Your Portfolio</h4>
          <p>This is how your branding will look</p>
        </div>
      </div>
    </div>
  );
}
