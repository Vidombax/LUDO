export const ACTION_IDS = {
    LIKE: 1,
    SAVE: 2,
    SHARE: 3,
    VIEW: 4,
    SWIPE: 5,
    DISLIKE: 6
};

export const ACTION_MAP = {
    [ACTION_IDS.LIKE]: 'like',
    [ACTION_IDS.SAVE]: 'save',
    [ACTION_IDS.SHARE]: 'share',
    [ACTION_IDS.VIEW]: 'view',
    [ACTION_IDS.SWIPE]: 'swipe',
    [ACTION_IDS.DISLIKE]: 'dislike'
};

/**
 * Веса для алгоритмов
 * 1: like
 * 2: save
 * 3: share
 * 4: view
 * 5: swipe
 * 6: dislike
 */
export const ACTION_WEIGHTS = {
    1: 3,
    2: 4,
    3: 2,
    4: 0.4,
    5: -0.2,
    6: -6
};
