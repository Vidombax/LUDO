export const shorthands = undefined;

export const up = (pgm) => {
    pgm.addColumn('games', {
        rate: { type: 'float', notNull: false, default: 1.0 }
    }, { ifNotExists: true });
};

export const down = (pgm) => {

};
