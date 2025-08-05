export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('game_tags', {
        game_id: {
            type: 'integer',
            notNull: true,
            references: 'games(id_game)',
            onDelete: 'cascade'
        },
        tag_id: {
            type: 'integer',
            notNull: true,
            references: 'tags(id)',
            onDelete: 'cascade'
        }
    }, {
        ifNotExists: true
    });
};

export const down = (pgm) => {

};
