export const shorthands = undefined;


export const up = (pgm) => {
    pgm.createTable('user_interactions', {
        id: {
            type: 'serial',
            primaryKey: true,
        },
        id_user: {
            type: 'integer',
            notNull: true,
            references: 'users(id_user)',
            onDelete: 'cascade'
        },
        id_game: {
            type: 'integer',
            notNull: true,
            references: 'games(id_game)',
            onDelete: 'cascade',
        },
        action: {
            type: 'integer',
            notNull: true,
            comment: 'like - 1, \n save - 2 \n share - 3 \n view - 4 \n swipe - 5 \n dislike - 6'
        },
        watch_time: {
            type: 'integer',
            notNull: true,
            comment: 'Время просмотра'
        },
        ts: {
            type: 'date',
            notNull: true,
            comment: 'Актуальность действия'
        }
    }, {
        ifNotExists: true
    });
};


export const down = (pgm) => {};
