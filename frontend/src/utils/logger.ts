/**
 * Application logger utility.
 * Wraps console methods to allow for environment-specific logging behavior
 * (e.g., disabling logs in production or sending them to a logging service).
 */

const isProduction = import.meta.env.PROD;

export const logger = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info: (...args: any[]) => {
        if (!isProduction) {
            console.info(...args);
        }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn: (...args: any[]) => {
        if (!isProduction) {
            console.warn(...args);
        }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (...args: any[]) => {
        // Errors might still be logged in production, or sent to a tracking service
        // For now, just log them if not in prod to clean up production console
        if (!isProduction) {
            console.error(...args);
        }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug: (...args: any[]) => {
        if (!isProduction) {
            console.debug(...args);
        }
    }
};
