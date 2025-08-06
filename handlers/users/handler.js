import utils from './utils/utils.js'
import logger from '../../services/logger.js'
import { ACTION_WEIGHTS } from '../../services/constants.js'

/**
 * Получение рекомендаций
 *
 * Возвращаем: JSON { recommendations: [ { id, title, final, details } ] }
 */
async function getUserRecommendation(req, reply) {
    const funcName = 'getUserRecommendation';
    const client = await req.server.pg.connect();

    try {
        const { userId } = req.params;
        const now = Date.now();

        await client.query('BEGIN');

        const { rows: games } = await client.query(
            `
                SELECT g.id_game, g.name, array_agg(gen.name) as genres, g."release_date" as createdAt, g."avgWatchTime"
                FROM games g
                         JOIN public.genre_to_game gtg ON g.id_game = gtg.id_game
                         JOIN public.genres gen ON gen.id_genre = gtg.id_genre
                GROUP BY g.id_game, g.name, g."release_date", g."avgWatchTime"
                LIMIT 200
            `
        );

        const { rows: preferences } = await client.query(
            `
              SELECT gp.id_genre, gen.name as genre_name, gp.weight
              FROM genre_preferences gp
                JOIN genres gen ON gen.id_genre = gp.id_genre
              WHERE gp.id_user = $1
            `,
            [userId]
        );

        if (!preferences || preferences.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return reply.status(404).send({ message: 'Не найдено предпочтений у пользователя, пожалуйста выберите категории, которые могут быть вам интересны' });
        }

        const userTags = {};
        userTags[userId] = preferences.map(p => p.genre_name);

        const nowDate = new Date(now);
        const { rows: userInteractionRows } = await client.query(
            `
                SELECT id_user, id_game, action, watch_time, coalesce(ts, $2) as ts
                FROM user_interactions
                WHERE id_user = $1
            `,
            [userId, nowDate]
        );

        const { rows: userFriendsRows } = await client.query(
            `
            SELECT user2_id as id_friend
            FROM friends
            WHERE user1_id = $1
            `,
            [userId]
        );

        const friendIds = userFriendsRows.map(r => r.id_friend).filter(Boolean);

        let friendsInteractionsRows = [];

        if (friendIds.length > 0) {
            const params = friendIds.map((_, idx) => `$${idx + 2}`).join(', ');
            const sql = `
                SELECT id_user, id_game, action, watch_time, coalesce(ts, $1) as ts
                FROM user_interactions
                WHERE id_user IN (${params})
            `;
            const values = [nowDate, ...friendIds];
            const res = await client.query(sql, values);
            friendsInteractionsRows = res.rows;
        }

        const interactions = [
            ...userInteractionRows.map(r => ({
                userId: r.id_user,
                clipId: r.id_game,
                actionId: r.action,
                watch_time: r.watch_time,
                ts: r.ts || now
            })),
            ...friendsInteractionsRows.map(r => ({
                userId: r.id_user,
                clipId: r.id_game,
                actionId: r.action,
                watch_time: r.watch_time,
                ts: r.ts || now
            }))
        ];

        const clips = games.map(g => ({
            id: g.id_game,
            title: g.name,
            tags: (g.genres || []).map(String), // genres уже names из запроса
            createdAt: g.createdAt ? new Date(g.createdAt).getTime() : now,
            avgWatchTime: Number(g.avgWatchTime) || null
        }));


        const friendsMap = { [userId]: friendIds };

        const scoresMap = utils.buildUserClipScores(interactions, ACTION_WEIGHTS);

        const userScoreVector = scoresMap[userId] || {};

        const disliked = Object.entries(userScoreVector)
            .filter(([id, sc]) => sc < 0)
            .map(([id]) => id
        );

        const popNorm = utils.popularityScoresNormalized(clips, interactions, now, ACTION_WEIGHTS);

        const results = clips.map(clip => {
            if (disliked.includes(clip.id)) {
                return { clip, final: -999, details: { reason: 'disliked' } };
            }

            const tagScore = utils.tagMatchScore(clip.tags, userTags[userId] || []);
            const pop = popNorm[clip.id] || 0;
            const fboost = utils.friendBoost(clip.id, userId, interactions, friendsMap);
            const recBoost = utils.recencyBoost(clip);
            const wBoost = utils.watchTimeBoost(clip.id, userId, interactions, clips);

            const alpha = 0.45, beta = 0.25, gamma = 0.15, delta = 0.05, epsilon = 0.08;
            const finalRaw = alpha * tagScore + beta * Math.log(1 + pop) + gamma * fboost + delta * recBoost + epsilon * wBoost;
            const noise = (Math.random() - 0.5) * 0.05;

            return {
                clip,
                final: finalRaw + noise,
                details: { tagScore, pop, fboost, recBoost, wBoost }
            };
        });

        const ranked = results
            .filter(r => r.final > -100)
            .sort((a, b) => b.final - a.final);
        const topN = 20;
        const response = ranked.slice(0, topN).map(r => ({
            id: r.clip.id,
            title: r.clip.title,
            final: r.final,
            details: r.details
        }));

        await client.query('COMMIT');

        return reply.status(200).send({ recommendations: response });
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
