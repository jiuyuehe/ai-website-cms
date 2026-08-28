export class CmsError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'CmsError';
    this.details = details;
  }
}

export class ValidationError extends CmsError {
  constructor(details) {
    super(`Validation failed with ${details.length} error${details.length === 1 ? '' : 's'}.`, details);
    this.name = 'ValidationError';
  }
}
