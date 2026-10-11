
export function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
}

export function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || 500;

    if (process.env.NODE_ENV !== "production") {
        console.error(err);
    }

    res.status(statusCode).json({
        success: false,
        message:
            statusCode === 500 && process.env.NODE_ENV === "production"
                ? "Internal server error."
                : err.message || "Internal server error.",
    });
}
