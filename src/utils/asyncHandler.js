//2nd approach promises

const asyncHandler = (requestHandler) => {
  //MIDDLEWARE PART=>>
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

/*
1st approach try catch
const asyncHand = (func) => async (req, res, next) => {
  try {
    await func(req,res,next)
  } catch (error) {
    res.status(err.code || 500).json({
        success: false,
        message: err.message
    })

  }
};
*/
