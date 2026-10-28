/** Error raised for any failed API call. Built from the backend ProblemDetail body. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {}
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Human readable message for any thrown value, including validation field details. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    const details = Object.values(error.fields);
    return details.length > 0 ? `${error.message}: ${details.join('; ')}` : error.message;
  }
  return fallback;
}
