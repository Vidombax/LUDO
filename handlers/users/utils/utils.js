import * as _ from 'lodash'
import * as ss from 'simple-statistics'

/**
 * Строит матрицу "пользователь — клип" с накопленными весами действий.
 */
function buildUserClipScores(interactions, ACTION_WEIGHTS) {
    const scores = {};
    interactions.forEach(it => {
        scores[it.userId] = scores[it.userId] || {};
        scores[it.userId][it.clipId] = (scores[it.userId][it.clipId] || 0) + (ACTION_WEIGHTS[it.action] || 0);
    });
    return scores;
}

/**
 * Рассчитывает "популярность" клипа с учетом затухания по времени.
 * Возвращает нормализованное значение (0–1) по всем клипам.
 */
function popularityScoresNormalized(clips, interactions, now, ACTION_WEIGHTS) {
    const rawScores = clips.map(c => {
        const score = _.sum(interactions.filter(i => i.clipId === c.id).map(i => {
            const ageHours = (now - i.ts) / (1000 * 60 * 60);
            const timeDecay = Math.exp(-ageHours / 72);
            const w = ACTION_WEIGHTS[i.action] || 0;
            return Math.max(0, w) * timeDecay;
        }));
        return { id: c.id, score };
    });

    const values = rawScores.map(r => r.score);
    const min = ss.min(values);
    const max = ss.max(values);

    return rawScores.reduce((acc, { id, score }) => {
        acc[id] = (score - min) / (max - min || 1);
        return acc;
    }, {});
}

/**
 * Совпадение тегов пользователя и клипа.
 */
function tagMatchScore(clipTags, userTags){
    if(!userTags || userTags.length === 0) return 0;
    const inter = _.intersection(clipTags, userTags).length;
    return inter / Math.max(1, clipTags.length);
}

/**
 * Бонус за активность друзей.
 */
function friendBoost(clipId, targetUser, interactions, friends){
    const myFriends = friends[targetUser] || [];
    const count = _.uniq(interactions.filter(i => myFriends.includes(i.userId) && i.clipId === clipId && (i.action === 'like' || i.action === 'save' || i.action === 'share')).map(i => i.userId)).length;
    return Math.log(1 + count);
}

/**
 * Бонус за новизну клипа.
 */
function recencyBoost(clip){
    const ageDays = (Date.now() - clip.createdAt)/(1000 * 60 * 60 * 24);
    if(ageDays < 1) return 1.5;
    if(ageDays < 7) return 1.2;
    return 1.0;
}

/**
 * Бонус/штраф за время просмотра относительно медианы по жанрам.
 */
function watchTimeBoost(clipId, targetUser, interactions, clips){
    const clip = clips.find(c => c.id === clipId);
    if(!clip) return 0;

    // находим все клипы того же жанра
    const genre = clip.tags[0];
    const genreClipsIds = clips.filter(c => c.tags.includes(genre)).map(c => c.id);

    // собираем времена просмотра по жанру
    const genreWatchTimes = interactions
        .filter(i => genreClipsIds.includes(i.clipId) && i.watch_time != null)
        .map(i => i.watch_time);

    if(genreWatchTimes.length === 0) return 0;

    const medianGenreTime = ss.median(genreWatchTimes);

    // время просмотра этого клипа конкретным пользователем
    const entry = interactions.find(i => i.userId === targetUser && i.clipId === clipId && i.watch_time != null);
    if(!entry) return 0;

    const ratio = entry.watch_time / medianGenreTime;
    if(ratio >= 1.2) return 0.4;
    if(ratio >= 0.8) return 0.1;
    return -0.2;
}

/**
 * Определяем сколько дней прошло с нынешнего момента
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
