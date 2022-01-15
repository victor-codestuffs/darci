const Database = require('better-sqlite3');
const fs = require("fs");

const MANIFEST_CHECK_INTERVAL_MS_MIN = 1000 * 60 * 60; //1 min
class ManifestInterface {

    #db;

    #manifest;
    #version;

    #manifestCheckIntervalMs;
    #manifestCheckIntervalId;

    #select_activity_definitions;
    #select_inventory_item_definitions;
    #select_historical_stats_definitions;
    #select_trials_inventory_item_definitions;
    #select_activity_mode_definitions;
    #select_emblem_definitions;

    #manifestDbPath;
    #manifestInfoPath;

    constructor(manifestDbPath, manifestInfoPath, manifestCheckIntervalMs = 1000 * 60 * 60) {
        this.#manifestDbPath = manifestDbPath;
        this.#manifestInfoPath = manifestInfoPath;

        if (manifestCheckIntervalMs < MANIFEST_CHECK_INTERVAL_MS_MIN) {
            console.log(
                `ManifestInterface : Warning manifestCheckIntervalMs is below minimum (${MANIFEST_CHECK_INTERVAL_MS_MIN}). Ignoring.`
            );
        } else {
            this.#manifestCheckIntervalMs = manifestCheckIntervalMs;
        }
    }

    async init(version = undefined) {
        this.#initDb();
        this.#initStatements();

        if (version === undefined) {
            this.#version = await this.#getSystemManifestVersion();
        } else {
            this.#version = version;
        }

        console.log(`Using manifest version : ${this.#version}`);

        this.#initManifest();

        if (this.#db !== undefined) {
            this.#db.close();
            this.#db == undefined;
        }

        if (this.#manifestCheckIntervalId != undefined) {
            clearInterval(this.#manifestCheckIntervalId);
        }

        if (this.#manifestCheckIntervalMs >= MANIFEST_CHECK_INTERVAL_MS_MIN) {
            this.#manifestCheckIntervalId = setInterval(async () => {
                let v = await this.#getSystemManifestVersion();
                if (this.hasUpdatedManifest(v)) {
                    console.log("New manifest version found. Updating.");
                    this.init(v);
                }
            }, this.#manifestCheckIntervalMs);
        }
    }

    #initDb() {
        if (this.#db !== undefined) {
            //check this
            this.#db.close();
        }

        console.log(`Using Manifest db at: ${this.#manifestDbPath}`);
        this.#db = new Database(this.#manifestDbPath, { readonly: true });
    }

    #initStatements() {
        this.#select_inventory_item_definitions = this.#db.prepare(`
        SELECT
            *
        FROM
        DestinyInventoryItemDefinition
        WHERE
            json like '%"itemType":3,%'`
        );

        this.#select_trials_inventory_item_definitions = this.#db.prepare(`
        SELECT
            *
        FROM
        DestinyInventoryItemDefinition
        WHERE
            json like '%"itemTypeDisplayName":"Trials Passage"%'`
        );

        this.#select_activity_definitions = this.#db.prepare(`
            SELECT
                *
            FROM
                DestinyActivityDefinition
            WHERE
                json like '%"placeHash":4088006058%'`
        );

        this.#select_historical_stats_definitions = this.#db.prepare(`
            SELECT
                *
            FROM
                DestinyHistoricalStatsDefinition
            WHERE
                json like '%medalTierIdentifier%'
        `);

        this.#select_activity_mode_definitions = this.#db.prepare(`
        SELECT
            *
        FROM
        DestinyActivityModeDefinition
        WHERE
            json like '%"activityModeCategory":2%'
    `);

        this.#select_emblem_definitions = this.#db.prepare(`
    SELECT
        *
    FROM
    DestinyInventoryItemDefinition
    WHERE
        json like '%"itemType":14,%'`
        );


        //"itemTypeDisplayName": "Emblem",
    }

    async #getSystemManifestVersion() {

        //todo: this is a sync call. should look at making this async again
        let data = await fs.promises.readFile(this.#manifestInfoPath, 'utf8');

        let obj = JSON.parse(data);
        let version = obj.url;

        if (version === undefined) {
            throw new Error("Manifest Info file invalid format. url is undefined.");
        }

        return version;
    }

    #initManifest() {
        let rows = this.#select_activity_definitions.all();

        let activityDefinition = {};
        for (let row of rows) {
            let d = JSON.parse(row.json);

            const id = idToHash(row.id);

            let out = {
                name: d.displayProperties.name,
                image: d.pgcrImage,
                description: d.displayProperties.description,
                activityModeHash: d.directActivityModeHash,
            };

            activityDefinition[id] = out;
        }

        rows = this.#select_inventory_item_definitions.all();

        let inventoryItemDefinition = {};
        for (let row of rows) {
            let d = JSON.parse(row.json);
            const id = idToHash(row.id);

            let out = {
                description: d.displayProperties.description,
                name: d.displayProperties.name,
                itemType: d.itemType,
                itemSubType: d.itemSubType,
            }

            inventoryItemDefinition[id] = out;
        }

        rows = this.#select_trials_inventory_item_definitions.all();

        let trialsPassageItemDefinitions = {};
        for (let row of rows) {
            let d = JSON.parse(row.json);
            const id = idToHash(row.id);

            let out = {
                name: d.displayProperties.name,
                description: d.displayProperties.description,
                icon: d.displayProperties.icon,
                id: id,
            }

            trialsPassageItemDefinitions[id] = out;
        }

        rows = this.#select_historical_stats_definitions.all();

        let historicalStatsDefinition = {};
        for (let row of rows) {
            let d = JSON.parse(row.json);
            let key = row.key;

            //filter out gambit medals
            if (key.toLowerCase().startsWith("medals_pvecomp")) {
                continue;
            }

            let out = {
                name: d.statName,
                description: d.statDescription,
                iconImage: d.iconImage,
            };

            historicalStatsDefinition[key] = out;
        }

        rows = this.#select_activity_mode_definitions.all();

        let activityModeDefinitions = {};
        for (let row of rows) {

            let d = JSON.parse(row.json);
            const id = idToHash(row.id);

            let out = {
                name: d.displayProperties.name,
                description: d.displayProperties.description,
                icon: d.displayProperties.icon,
                image: d.pgcrImage,
            };

            activityModeDefinitions[id] = out;
        }

        rows = this.#select_emblem_definitions.all();

        let emblemDefinitions = {};
        for (let row of rows) {
            let d = JSON.parse(row.json);
            const id = idToHash(row.id);

            let out = {
                name: d.displayProperties.name,
                icon: d.displayProperties.icon,
                secondaryIcon: d.secondaryIcon,
                secondaryOverlay: d.secondaryOverlay,
                secondarySpecial: d.secondarySpecial,
            }

            emblemDefinitions[id] = out;
        }

        this.#manifest = {
            version: this.#version,
            data: {
                activityDefinition: activityDefinition,
                inventoryItemDefinition: inventoryItemDefinition,
                historicalStatsDefinition: historicalStatsDefinition,
                trialsPassageItemDefinitions: trialsPassageItemDefinitions,
                activityModeDefinitions: activityModeDefinitions,
                emblemDefinitions: emblemDefinitions,
            }
        };
    }

    hasUpdatedManifest(version) {
        return version !== this.#version;
    }

    get manifest() {
        return this.#manifest;
    }
}

const idToHash = function (id) {

    //return id >>> 0;
    return id >>> 32;
}

module.exports = ManifestInterface;