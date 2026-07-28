// Simple validation middleware using Zod schemas
export const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
      });
    }

    // Replace req.body with validated data
    req.body = result.data;
    next();
  };
};
