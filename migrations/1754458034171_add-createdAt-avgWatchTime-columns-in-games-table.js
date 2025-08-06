export const shorthands = undefined;

export const up = (pgm) => {
    pgm.addColumn('games', {
        ts: { type: 'date', notNull: false, comment: 'Актуальность игры, обновляем при каждом действии юзеров' }
    }, { ifNotExists: true });
    pgm.addColumn('games', {
        avgWatchTime: { type: 'integer', notNull: false }
    }, { ifNotExists: true });
};

export const down = (pgm) => {

};
