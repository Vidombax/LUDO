import * as _ from 'lodash'
import utils from './utils/utils.js'
import logger from '../../services/logger.js'

/**
 * Получение рекомендаций по добавленным тегам игрока
 * */
async function getUserRecommendation(req, reply) {
    const funcName = 'getUserRecommendation';
    const client = await req.server.pg.connect();

    try {
        const fastify = req.server;
        const { userId } = req.params;
        const cacheKey = `rec-user:${userId}`;

        const cached = await fastify.redis.get(cacheKey);
        if (cached) {
            client.release();
            return reply.send({ games: JSON.parse(cached) });
        }

        await client.query('BEGIN');


        const { rows: preferences } = await client.query(
            'SELECT id_genre, weight FROM genre_preferences WHERE id_user = $1',
            [userId]
        );

        if (preferences.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return reply.status(404).send({ message: 'Не найдено предпочтений у пользователя, пожалуйста выберите категории, которые могут быть вам интересны' });
        }

        const genreIds = preferences.map(p => p.id_genre);
        const { rows: games } = await client.query(
            `
                SELECT gam.id_game, gam.name, array_agg(gen.name) as genre_names, COUNT(gt.id_genre) AS match_score 
                FROM games gam 
                JOIN genre_to_game gt ON gam.id_game = gt.id_game
                JOIN genres gen on gen.id_genre = gt.id_genre
                WHERE gt.id_genre = ANY($1::int[])
                GROUP BY gam.id_game
                ORDER BY match_score DESC 
                LIMIT 10
            `,
            [genreIds]
        );

        await fastify.redis.set(cacheKey, JSON.stringify(games), 'EX', 1800).then(() => {
            logger.info(`${funcName}: записали в редис под ${cacheKey}`);
        });

        await client.query('COMMIT');
        return reply.status(200).send({ games });
    }
    catch (e) {
        await client.query('ROLLBACK');
        logger.error(`${funcName}:`, e);
        return reply.status(500).send({
            error: 'Ошибка на стороне сервера',
        });
    }
    finally {
        client.release();
    }
}

export default {
    getUserRecommendation
}
