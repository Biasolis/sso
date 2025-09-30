import winston from 'winston';

const { combine, timestamp, printf, colorize, align } = winston.format;

// Formato personalizado para os logs na consola
const consoleFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

// Formato para os logs em ficheiro
const fileFormat = combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: fileFormat,
    transports: [
        // Em produção, queremos registar em ficheiros
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

// Se não estivermos em produção, também registamos na consola com um formato mais legível
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
    }));
}

export default logger;