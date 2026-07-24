export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      status: 'error',
      message: 'validation error',
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      status: 'error',
      message: 'duplicate entry',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      status: 'error',
      message: 'record not found',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'token expired',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'internal server error';

  return res.status(statusCode).json({
    status: 'error',
    message,
  });
};

export default errorHandler;
