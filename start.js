import Fastify from 'fastify'
import dotenv from 'dotenv'
dotenv.config();
import logger from './services/logger.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
    logger: true
});

fastify.register(await import ('@fastify/postgres'), {
    connectionString: `${process.env.DATABASE_URL}`
}).then(() => {
    logger.info('Соединение с базой установлено');
});

fastify.register(await import('@fastify/redis'), {
    host: 'localhost'
}).then(() => {
    logger.info('Соединение с redis установлено');
});

const autoload = (await import('fastify-autoload')).default;
fastify.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    options: { prefix: '/api' },
    dirNameRoutePrefix: false,
    ignorePattern: /.*(test|spec).js/
});

const PORT = process.env.PORT || 3000;

const start = async () => {
    try {
        await fastify.listen({
            port: PORT,
            host: '0.0.0.0'
        });
    } catch (err) {
        logger.error('Server failed to start', err);
        process.exit(1);
    }
}

start();
