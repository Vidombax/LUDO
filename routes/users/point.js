import handler from '../../handlers/users/handler.js'

export default async function (fastify) {
    fastify.get('/recommend/:userId', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    userId: { type: 'number' }
                },
                required: ['userId']
            }
        },
        handler: handler.getUserRecommendation
    });
}