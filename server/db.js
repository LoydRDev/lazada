export const isDbConfigured = false;

export const query = async () => {
  throw new Error('SQL database access is disabled. The API is running on the NoSQL document store.');
};
