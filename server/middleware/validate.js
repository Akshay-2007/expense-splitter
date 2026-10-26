const { validationResult } = require('express-validator');

/**
 * Express middleware that checks for express-validator validation errors.
 * If errors are present, responds with 400 and the first error message.
 * Otherwise, passes control to the next middleware.
 *
 * @function validateRequest
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    return res.status(400).json({
      success: false,
      message: errorArray[0].msg,
      errors: errorArray,
    });
  }

  next();
};

module.exports = { validateRequest };
