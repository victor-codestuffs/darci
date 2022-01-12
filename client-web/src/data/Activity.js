import { CompletionReason, Standing, Mode } from "shared";


const TEAM_NAMES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot",
    "Golf", "Hotel", "India", "Juliett", "Kilo", "Lima", "Mike", "November",
    "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor",
    "Whiskey", "X-ray", "Yankee", "Zulu"];

export default class Activity {

    #data;
    #manifest;

    constructor(data, manifest) {
        this.#data = data;
        this.#manifest = manifest;
        this.#parse();
    }

    #parse() {

        let activity = this.#data.activity;

        let map = this.#manifest.getActivityDefinition(activity.referenceId);
        activity.map = map;

        let modeInfo = this.#manifest.getModeInfo(activity.directorActivityHash);
        activity.modeInfo = modeInfo;

        let mode = Mode.fromId(activity.mode);
        activity.mode = mode;

        this.teams.forEach((team, index) => {
            team.name = TEAM_NAMES[index];
            for (const player of team.players) {
                player.stats.standing = Standing.fromId(player.stats.standing);
                player.stats.completionReason = Standing.fromId(player.stats.completionReason);
            }
        });
    }

    getCompletionReason(memberId = undefined) {
        let teams = this.teams;

        for (const team of teams) {
            for (const player of team.players) {

                //if memberId is not specified, and the completion reason is known
                //return the completion reason
                if (!memberId && player.stats.completionReason != CompletionReason.UNKNOWN) {
                    return player.stats.completionReason;
                }

                if (player.player.memberId == memberId) {
                    return player.stats.standing;
                }
            }
        }

        return CompletionReason.UNKNOWN;
    }

    getStandingForMember(memberId) {

        let teams = this.teams;

        for (const team of teams) {
            for (const player of team.players) {
                if (player.player.memberId == memberId) {
                    return player.stats.standing;
                }
            }
        }

        return Standing.UNKNOWN;
    }

    get teams() {
        return this.#data.teams;
    }

    get overview() {
        return this.#data.activity;
    }
}