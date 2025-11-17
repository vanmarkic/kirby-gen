/**
 * Standard response formats for the API
 */

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
  };
}

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ResponseBuilder {
  /**
   * Create a success response
   */
  static success<T>(data: T, meta?: Partial<ResponseMeta>): SuccessResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Create an error response
   */
  static error(
    code: string,
    message: string,
    statusCode = 500,
    details?: any
  ): ErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        statusCode,
        details,
      },
    };
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): SuccessResponse<T[]> {
    const totalPages = Math.ceil(total / limit);

    return this.success(data, {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  }

  /**
   * Create a created response (201)
   */
  static created<T>(data: T): SuccessResponse<T> {
    return this.success(data);
  }

  /**
   * Create a no content response (204)
   */
  static noContent(): SuccessResponse<null> {
    return this.success(null);
  }
}
