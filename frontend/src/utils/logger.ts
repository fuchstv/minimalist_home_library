/**
 * Application logger utility.
 * Wraps console methods to allow for environment-specific logging behavior
 * (e.g., disabling logs in production or sending them to a logging service).
 */

const isProduction = import.meta.env.PROD;

export const logger = {
    info: (...args: unknown[]) => {
        if (!isProduction) {
            console.info(...args);
        }
    },
    warn: (...args: unknown[]) => {
        if (!isProduction) {
            console.warn(...args);
        }
    },
    error: (...args: unknown[]) => {
        // Errors might still be logged in production, or sent to a tracking service
        // For now, just log them if not in prod to clean up production console
        if (!isProduction) {
            console.error(...args);
        }
    },
    debug: (...args: unknown[]) => {
        if (!isProduction) {
            console.debug(...args);
        }
    }
};
