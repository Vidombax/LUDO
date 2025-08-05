import logger from '../../services/logger.js'

/**
 * Получение рекомендаций по добавленным тегам игрока
 * */
export async function getUserRecommendationByTags(req, reply) {
    const funcName = 'getUserRecommendationByTags';

    try {
        const fastify = req.server;
        const { userId } = req.params;
        const cacheKey = `rec-user:${userId}`;

        const cached = await fastify.redis.get(cacheKey);
        if (cached) return reply.send({ games: JSON.parse(cached) });

        const client = await fastify.pg;


        const { rows: preferences } = await client.query(
            'SELECT id_genre, weight FROM genre_preferences WHERE id_user = $1',
            [userId]
        );

        if (preferences.length === 0) {
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

        return reply.status(200).send({ games });
    }
    catch (e) {
        logger.error(`${funcName}:`, e);
        return reply.status(500).send({
            error: 'Ошибка на стороне сервера',
        });
    }
}

export default {
    getUserRecommendationByTags
}
