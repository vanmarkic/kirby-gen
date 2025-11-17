import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileImage, FileText } from 'lucide-react';
import clsx from 'clsx';

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
}

export default function FileUpload({
  files,
  onFilesChange,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 50,
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
      onFilesChange(newFiles);
    },
    [files, onFilesChange, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept,
      maxSize,
      maxFiles: maxFiles - files.length,
    });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <FileImage size={20} />;
    }
    if (file.type === 'application/pdf') {
      return <FileText size={20} />;
    }
    return <FileText size={20} />;
  };

  return (
    <div className="file-upload">
      <div
        {...getRootProps()}
        className={clsx('dropzone', {
          'dropzone-active': isDragActive,
        })}
      >
        <input {...getInputProps()} />
        <Upload className="dropzone-icon" />
        <p className="dropzone-text">
          {isDragActive
            ? 'Drop files here...'
            : 'Drag and drop files here, or click to browse'}
        </p>
        <p className="dropzone-hint">
          Maximum {maxFiles} files, {formatFileSize(maxSize)} each
        </p>
      </div>

      {fileRejections.length > 0 && (
        <div className="file-errors">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="file-error">
              <strong>{file.name}</strong>
              {errors.map((error) => (
                <p key={error.code}>{error.message}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="file-list">
          <h3>Uploaded Files ({files.length})</h3>
          <div className="files">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="file-item">
                <div className="file-info">
                  {getFileIcon(file)}
                  <div className="file-details">
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="btn-icon btn-small"
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
