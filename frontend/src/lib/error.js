export const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((item) => item.message).join(', ');
  }

  return data?.message || 'Something went wrong';
};