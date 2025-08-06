import * as ss from 'simple-statistics'
import { ACTION_IDS } from '../../../services/constants.js'

/**
 * Строит матрицу "пользователь — клип" с накопленными весами действий.
 * @param {Array} interactions - Список взаимодействий {userId, clipId, actionId, ts, watch_time}.
 * @param {Object} ACTION_WEIGHTS - Словарь весов для actionId.
 * @returns {Object} scores[userId][clipId] = number
 */
function buildUserClipScores(interactions, ACTION_WEIGHTS) {
    const scores = {};
    interactions.forEach(it => {
        scores[it.userId] = scores[it.userId] || {};
        scores[it.userId][it.clipId] = (scores[it.userId][it.clipId] || 0) + (ACTION_WEIGHTS[it.actionId] || 0);
    });
    return scores;
}

/**
 * Рассчитывает "сырые" популярностные баллы с учётом time decay для каждого клипа,
 * затем нормализует в диапазон 0..1 по всем clips.
 *
 * @param {Array} clips - список клипов
 * @param {Array} interactions - логи взаимодействий
 * @param {number} now - текущее время (ms)
 * @param {Object} ACTION_WEIGHTS - веса по actionId
 * @returns {Object} { clipId: normalizedScore }
 */
function popularityScoresNormalized(clips, interactions, now, ACTION_WEIGHTS) {
    const raw = clips.map(c => {
        const score = interactions
            .filter(i => i.clipId === c.id)
            .map(i => {
                const ageHours = (now - i.ts) / (1000 * 60 * 60);
                const timeDecay = Math.exp(-ageHours / 72); // экспоненциальное затухание (3 дня)
                const w = ACTION_WEIGHTS[i.actionId] || 0;
                return Math.max(0, w) * timeDecay; // учитываем только положительные вклады
            })
            .reduce((acc, v) => acc + v, 0);

        return { id: c.id, score };
    });

    const values = raw.map(r => r.score);
    const min = values.length ? ss.min(values) : 0;
    const max = values.length ? ss.max(values) : 0;
    const denom = (max - min) || 1;

    return raw.reduce((acc, { id, score }) => {
        acc[id] = (score - min) / denom;
        return acc;
    }, {});
}

/**
 * Рассчитывает совпадение тегов клипа с интересами пользователя (0..1).
 * @param {string[]} clipTags
 * @param {string[]} userTags
 * @returns {number}
 */
function tagMatchScore(clipTags, userTags){
    if (!Array.isArray(clipTags) || clipTags.length === 0) return 0;
    if (!Array.isArray(userTags) || userTags.length === 0) return 0;
    const userSet = new Set(userTags);
    let inter = 0;
    for (const t of clipTags) if (userSet.has(t)) inter++;
    return inter / Math.max(1, clipTags.length);
}

/**
 * Бонус от активности друзей (логарифмически).
 * Считает уникальных друзей, которые лайкнули/сохранили/поделились клипом.
 * @param {string} clipId
 * @param {string} targetUser
 * @param {Array} interactions
 * @param {Object} friends
 * @returns {number}
 */
function friendBoost(clipId, targetUser, interactions, friends){
    const myFriends = (friends && friends[targetUser]) || [];
    if (!Array.isArray(myFriends) || myFriends.length === 0) return 0;

    const positiveActions = [ACTION_IDS.LIKE, ACTION_IDS.SAVE, ACTION_IDS.SHARE];

    const friendSet = new Set();
    for (const i of interactions) {
        if (!myFriends.includes(i.userId)) continue;
        if (i.clipId !== clipId) continue;
        if (!positiveActions.includes(i.actionId)) continue;
        friendSet.add(i.userId);
    }

    const count = friendSet.size;
    return Math.log(1 + count);
}

/**
 * Новизна клипа (множитель).
 * @param {Object} clip
 * @returns {number}
 */
function recencyBoost(clip){
    const ageDays = (Date.now() - clip.createdAt)/(1000 * 60 * 60 * 24);
    if(ageDays < 1) return 1.5;
    if(ageDays < 7) return 1.2;
    // плавный decay: 1.5 -> 1.0 в течение 14 дней
    return 1.0 + Math.max(0, (14 - ageDays) / 14) * 0.5;
}

/**
 * Watch time boost:
 * - сравнивает watch_time конкретного пользователя для клипа с медианой watch_time по жанру (genre = первый тег)
 *
 * Возвращает:
 *   0.4 — если пользователь смотрел заметно дольше медианы по жанру (ratio >= 1.2)
 *   0.1 — если близко к медиане (0.8 <= ratio < 1.2)
 *  -0.2 — если существенно меньше (ratio < 0.8)
 *
 * @param {string} clipId
 * @param {string} targetUser
 * @param {Array} interactions
 * @param {Array} clips
 * @returns {number}
 */
function watchTimeBoost(clipId, targetUser, interactions, clips){
    const clip = clips.find(c => c.id === clipId);
    if(!clip) return 0;

    const primaryGenre = clip.tags && clip.tags[0];
    if(!primaryGenre) return 0;

    const genreClipIds = clips.filter(c => c.tags && c.tags.includes(primaryGenre)).map(c => c.id);

    const genreWatchTimes = interactions
        .filter(i => genreClipIds.includes(i.clipId) && typeof i.watch_time === 'number')
        .map(i => i.watch_time);

    if(genreWatchTimes.length === 0) return 0;

    const medianGenre = ss.median(genreWatchTimes);

    const entry = interactions.find(i => i.userId === targetUser && i.clipId === clipId && typeof i.watch_time === 'number');
    if(!entry) return 0;

    const ratio = entry.watch_time / (medianGenre || 1);
    if (ratio >= 1.2) return 0.4;
    if (ratio >= 0.8) return 0.1;
    return -0.2;
}

/**
 * Определяем сколько дней прошло с нынешнего момента
 * @param {number} n - кол-во минут
 */
function daysAgo(n) {
    return Date.now() - n * 24 * 60 * 60 * 1000;
}

export default {
    buildUserClipScores,
    popularityScoresNormalized,
    tagMatchScore,
    friendBoost,
    recencyBoost,
    watchTimeBoost,
    daysAgo
}
