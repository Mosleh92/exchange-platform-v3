class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Not Found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class BadRequestError extends Error {
  constructor(message = 'Bad Request') {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = 400;
  }
}

class ValidationError extends Error {
  constructor(message = 'Validation Error', details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 422;
    this.details = details;
  }
}

module.exports = {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  ValidationError
};