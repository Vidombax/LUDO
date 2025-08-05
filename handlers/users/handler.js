import logger from '../../services/logger.js'

/**
 * Получение рекомендаций по добавленным тегам игрока
 * */
export async function getUserRecommendationByTags(req, reply) {
    try {
        const fastify = req.server;
        const { userId } = req.params;

        const client = await fastify.pg;

        const preferences = await client.query(
            'SELECT id_genre, weight FROM genre_preferences WHERE id_user = $1',
            [userId]
        );

        if (preferences.length === 0) {
            return reply.status(404).send({ message: 'Не найдено предпочтений у пользователя, пожалуйста выберите категории, которые могут быть вам интересны' });
        }

        return reply.status(200).send(user.rows);
    }
    catch (e) {
        logger.error(e);
        return reply.status(500).send({
            error: 'Ошибка на стороне сервера',
        });
    }
}

export default {
    getUserRecommendationByTags
}
