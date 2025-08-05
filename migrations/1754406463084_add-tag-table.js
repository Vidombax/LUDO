export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('tags', {
        id: { type: 'serial', primaryKey: true },
        name: { type: 'varchar(50)', notNull: true, unique: true },
    }, {
        ifNotExists: true
    });
};


export const down = (pgm) => {};
