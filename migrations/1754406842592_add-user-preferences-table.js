export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('user_preferences', {
        user_id: {
            type: 'integer',
            notNull: true,
            references: 'users(id_user)',
            onDelete: 'cascade'
        },
        tag_id: {
            type: 'integer',
            notNull: true,
            references: 'tags(id)',
            onDelete: 'cascade'
        },
        weight: {
            type: 'float',
            default: 1.0,
            notNull: true
        }
    }, {
        ifNotExists: true
    });
};

export const down = (pgm) => {

};
