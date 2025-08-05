export const shorthands = undefined;

export const up = (pgm) => {
    pgm.sql('alter table games add rate float;');
};

export const down = (pgm) => {

};
