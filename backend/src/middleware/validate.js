// Simple validation middleware using Zod schemas
export const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((error) => ({
        field: error.path.join('.'),
        message: error.message
      }));

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    // Replace req.body with validated data
    req.body = result.data;
    next();
  };
};
