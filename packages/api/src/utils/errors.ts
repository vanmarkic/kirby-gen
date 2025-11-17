/**
 * Custom error classes for the API
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(404, message, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(409, message, 'CONFLICT', details);
  }
}

export class WorkflowError extends AppError {
  constructor(message: string, phase: string, details?: any) {
    super(500, message, 'WORKFLOW_ERROR', { phase, ...details });
  }
}

export class SkillError extends AppError {
  constructor(skillName: string, message: string, details?: any) {
    super(500, `Skill '${skillName}' failed: ${message}`, 'SKILL_ERROR', {
      skill: skillName,
      ...details,
    });
  }
}

export class StorageError extends AppError {
  constructor(message: string, details?: any) {
    super(500, message, 'STORAGE_ERROR', details);
  }
}

export class GitError extends AppError {
  constructor(message: string, details?: any) {
    super(500, message, 'GIT_ERROR', details);
  }
}

export class DeploymentError extends AppError {
  constructor(message: string, details?: any) {
    super(500, message, 'DEPLOYMENT_ERROR', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, message, 'RATE_LIMIT_EXCEEDED');
  }
}

export class FileUploadError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, 'FILE_UPLOAD_ERROR', details);
  }
}
