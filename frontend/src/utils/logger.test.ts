import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger utility', () => {
    beforeEach(() => {
        vi.spyOn(console, 'info').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        import.meta.env.PROD = false;
    });

    describe('in non-production environment', () => {
        it('should call console.info with provided arguments', () => {
            logger.info('Info message', { key: 'value' });
            expect(console.info).toHaveBeenCalledTimes(1);
            expect(console.info).toHaveBeenCalledWith('Info message', { key: 'value' });
        });

        it('should call console.warn with provided arguments', () => {
            logger.warn('Warning message', 123);
            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith('Warning message', 123);
        });

        it('should call console.error with provided arguments', () => {
            const error = new Error('Test error');
            logger.error('Error occurred', error);
            expect(console.error).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledWith('Error occurred', error);
        });

        it('should call console.debug with provided arguments', () => {
            logger.debug('Debug message', [1, 2, 3]);
            expect(console.debug).toHaveBeenCalledTimes(1);
            expect(console.debug).toHaveBeenCalledWith('Debug message', [1, 2, 3]);
        });

        it('should handle zero arguments gracefully', () => {
            logger.info();
            expect(console.info).toHaveBeenCalledWith();

            logger.warn();
            expect(console.warn).toHaveBeenCalledWith();

            logger.error();
            expect(console.error).toHaveBeenCalledWith();

            logger.debug();
            expect(console.debug).toHaveBeenCalledWith();
        });
    });

    describe('in production environment', () => {
        it('should suppress log output when PROD is true', async () => {
            vi.resetModules();
            vi.stubEnv('PROD', true);
            // Also set import.meta.env.PROD directly if stubEnv affects import.meta.env
            import.meta.env.PROD = true;

            const { logger: prodLogger } = await import('./logger');

            prodLogger.info('Info message');
            prodLogger.warn('Warning message');
            prodLogger.error('Error message');
            prodLogger.debug('Debug message');

            expect(console.info).not.toHaveBeenCalled();
            expect(console.warn).not.toHaveBeenCalled();
            expect(console.error).not.toHaveBeenCalled();
            expect(console.debug).not.toHaveBeenCalled();

            // Reset back for other tests
            import.meta.env.PROD = false;
        });
    });
});
