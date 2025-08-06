export const shorthands = undefined;


export const up = (pgm) => {
    pgm.createTable('friends', {
        id: {
            type: 'serial',
            primaryKey: true,
        },
        user1_id: {
            type: 'integer',
            notNull: true,
            references: 'users(id_user)',
            onDelete: 'cascade'
        },
        user2_id: {
            type: 'integer',
            notNull: true,
            references: 'users(id_user)',
            onDelete: 'cascade',
        },
    }, {
        ifNotExists: true
    });
};


export const down = (pgm) => {};
