// Extract error message from API response
export const getErrorMessage = (error) => {
  const data = error?.response?.data;

  // If multiple errors, join them
  if (data?.errors && Array.isArray(data.errors)) {
    return data.errors.map((err) => err.message).join(', ');
  }

  // Single error message or default
  return data?.message || 'Something went wrong';
};
