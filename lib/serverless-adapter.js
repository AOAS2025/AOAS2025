function adaptServerlessHandler(handler) {
  return async (req, res, next) => {
    try {
      await Promise.resolve(handler(req, res));
      if (!res.headersSent && !res.writableEnded && typeof next === 'function') {
        next();
      }
    } catch (error) {
      if (typeof next === 'function') {
        next(error);
        return;
      }
      throw error;
    }
  };
}

module.exports = {
  adaptServerlessHandler,
};
