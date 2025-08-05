import handler from '../../handlers/users/handler.js'

export default async function (fastify, options) {
    fastify.route({
        method: 'GET',
        url: '/recommend/:userId',
        schema: {
            params: {
                type: 'object',
                properties: {
                    userId: { type: 'number' }
                },
                required: ['userId'],
            },
        },
        handler: handler.getUserRecommendationByTags
    });
}
