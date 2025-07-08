const { logger } = require('./logger');

const errorHandler = (error, req, res) => {
    logger.error('Error occurred:', {
        path: req.path,
        method: req.method,
        error: error.message,
        stack: error.stack
    });

    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'خطای اعتبارسنجی',
            errors: Object.values(error.errors).map(err => err.message)
        });
    }

    if (error.name === 'MongoError' && error.code === 11000) {
        return res.status(409).json({
            success: false,
            message: 'داده تکراری'
        });
    }

    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'توکن نامعتبر است'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'توکن منقضی شده است'
        });
    }

    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'شناسه نامعتبر است'
        });
    }

    res.status(500).json({
        success: false,
        message: 'خطای سرور'
    });
};

module.exports = errorHandler;