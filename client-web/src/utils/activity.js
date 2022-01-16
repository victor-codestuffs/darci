const { CompletionReason, Standing, CharacterClass } = require("shared");

const {
    calculateEfficiency, calculateKillsDeathsRatio, calculateKillsDeathsAssists } = require("shared");

export const parseCharacter = (data, manifest) => {

    let emblem = {
        id: data.emblemHash,
    };

    if (manifest) {
        emblem = manifest.getEmblem(data.emblemHash);
    }

    let character = {
        characterId: data.characterId,
        classType: CharacterClass.fromId(data.classType),
        lightLevel: data.lightLevel,
        emblem: emblem,
    };

    return character;
}

export const parsePlayer = (data, manifest) => {

    let chars = [];
    for (const c of data.characters) {
        chars.push(parseCharacter(c, manifest));
    }

    let out = {
        memberId: data.memberId,
        bungieDisplayName: data.bungieDisplayName,
        bungieDisplayNameCode: data.bungieDisplayNameCode,
        displayName: data.displayName,
        platformId: data.platformId,

        characters: chars,
    };

    return out;
}

//note this modifies the passed in reference (to save memory / cpu)
export const calculateStats = (stats, mode) => {

    let standing = Standing.fromIdAndMode(stats.standing, mode);
    stats.standing = standing;

    let completionReason = CompletionReason.fromId(stats.completionReason);
    stats.completionReason = completionReason;

    let kills = stats.kills;
    let assists = stats.assists;
    let deaths = stats.deaths;

    stats.opponentsDefeated = kills + assists;

    stats.efficiency = calculateEfficiency(kills, deaths, assists);
    stats.killsDeathsRatio = calculateKillsDeathsRatio(kills, deaths);
    stats.killsDeathsAssists = calculateKillsDeathsAssists(
        kills, deaths, assists,
    );

    return stats;
}

