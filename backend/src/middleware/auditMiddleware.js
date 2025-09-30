import logger from '../config/logger.js';

const auditMiddleware = (req, res, onFinished) => {
    const start = Date.now();

    onFinished(res, () => {
        const duration = Date.now() - start;
        const { method, originalUrl } = req;
        const { statusCode } = res;
        const userId = req.user ? req.user.id : 'anonymous';
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const message = `[${ip}] ${userId} - ${method} ${originalUrl} ${statusCode} ${duration}ms`;

        if (statusCode >= 500) {
            logger.error(message);
        } else if (statusCode >= 400) {
            logger.warn(message);
        } else {
            logger.info(message);
        }
    });
};

export default auditMiddleware;