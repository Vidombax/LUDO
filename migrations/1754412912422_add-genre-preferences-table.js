export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('genre_preferences', {
        id: {
            type: 'serial',
            primaryKey: true,
        },
        id_user: {
            type: 'integer',
            notNull: true,
            references: 'users(id_user)',
            onDelete: 'cascade',
        },
        id_genre: {
            type: 'integer',
            notNull: true,
            references: 'genres(id_genre)',
            onDelete: 'cascade',
        },
        weight: {
            type: 'float',
            notNull: true,
            default: 1.0,
        },
    }, {
        ifNotExists: true
    });

    pgm.addConstraint('genre_preferences', 'genre_preferences_user_genre_unique', {
        unique: ['id_user', 'id_genre'],
    });

};

export const down = (pgm) => {};
