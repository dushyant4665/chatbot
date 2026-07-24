export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        const errors = result.error.errors.map((error) => ({
          field: error.path.join('.'),
          message: error.message,
        }));

        return res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors,
        });
      }

      req.body = result.data.body;
      req.query = result.data.query;
      req.params = result.data.params;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error.errors.map((error) => ({
          field: error.path.join('.'),
          message: error.message,
        }));

        return res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors,
        });
      }

      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};
