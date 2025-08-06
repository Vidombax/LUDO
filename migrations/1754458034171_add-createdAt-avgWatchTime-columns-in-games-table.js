export const shorthands = undefined;

export const up = (pgm) => {
    pgm.addColumn('games', {
        createdAt: { type: 'date', notNull: false }
    }, { ifNotExists: true });
    pgm.addColumn('games', {
        avgWatchTime: { type: 'integer', notNull: false }
    }, { ifNotExists: true });
};

export const down = (pgm) => {

};
