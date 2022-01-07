const { CharacterClassSelection, Mode, Moment, ServerError } = require('shared');
const {
    SERVER_PORT,
    SERVER_HOSTNAME,
    MANIFEST_CHECK_INTERVAL_MS,
    MAX_ACTIVITIES_PAGE_LIMIT,
    DB_PATH,
    MANIFEST_DB_PATH,
    MANIFEST_INFO_PATH } = require('./config');

const express = require("express");

const ActivityStoreInterface = require("./activity_store_interface.js");
const ManifestInterface = require('./manifest_interface.js');

const activityStore = new ActivityStoreInterface(DB_PATH);
const manifestInterface = new ManifestInterface(MANIFEST_DB_PATH, MANIFEST_INFO_PATH, MANIFEST_CHECK_INTERVAL_MS);

const app = express();

const port = SERVER_PORT;
const hostname = SERVER_HOSTNAME;

app.get("/", (req, res, next) => {
    sendJsonResponse(res, {});
});

///player/member_id/class/mode/moment/end-moment/
//can append regex to each one : https://expressjs.com/en/guide/routing.html
app.get("/api/player/:member_id/:characterClass/:mode/:moment/:endMoment?/", (req, res, next) => {

    let memberId = req.params.member_id;

    let characterClassSelection = CharacterClassSelection.fromString(req.params.characterClass);

    //todo: need to add an all to classes
    //CharacterClassSelection (LastActive and All)
    if (characterClassSelection == characterClassSelection.UNKNOWN) {
        characterClassSelection = CharacterClassSelection.ALL;
    }

    let mode = Mode.fromString(req.params.mode);

    if (mode === Mode.UNKNOWN) {
        mode = Mode.ALL_PVP;
    }

    let moment = Moment.fromString(req.params.moment);

    if (moment === Moment.UNKNOWN) {
        moment = Moment.DAILY;
    }

    const endMoment = Moment.NOW;
    const activities = activityStore.retrieveActivities(memberId, characterClassSelection, mode, moment.getDate(), endMoment.getDate());

    const summary = activityStore.summarizeActivities(activities);

    //query for name, and whether we have synced? maybe only if no activities have returned

    //note: we could get this from the above query.
    const player = activityStore.retrieveMember(memberId);

    //rename retrieveActivitiesSince to retrieveActivities and pass in end moment date
    const query = {
        startDate: moment.getDate(),
        endDate: endMoment.getDate(),
        startMoment: moment.toString(),
        endMoment: endMoment.toString(),
        mode: mode.toString(),
        classSelection: characterClassSelection.toString(),
    }

    if (activities.length > MAX_ACTIVITIES_PAGE_LIMIT) {
        //note this remove items from the array
        activities.splice(MAX_ACTIVITIES_PAGE_LIMIT);
    }

    const out = {
        query: query,
        player: player,
        activities: activities,
        summary: summary
    }

    sendJsonResponse(res, out);
});

app.get("/api/players/", (req, res, next) => {

    let rows = activityStore.retrieveSyncMembers();

    let out = {
        players: rows,
    };

    sendJsonResponse(res, out);
});

const manifestNoUpdateData = { updated: false };
app.get("/manifest/:version/", (req, res, next) => {

    const manifestNeedsUpdating = manifestInterface.hasUpdatedManifest(req.params.version);

    let out = manifestNoUpdateData;

    if (manifestNeedsUpdating) {
        out = manifestInterface.manifest;
        out.updated = true;
    }

    sendJsonResponse(res, out);
});


const SUCCESS_STATUS = "succes";
const ERROR_STATUS = "error";

const sendJsonResponse = (res, data) => {
    const out = {
        response: data,
        status: SUCCESS_STATUS,
    }

    res.json(out);
}

//Error handler
app.use(function (err, req, res, next) {
    console.log("ERROR HANDLER");
    console.error(err.stack)

    let msg = err.message;
    let name = err.name;

    if (!(err instanceof ServerError)) {
        msg = `Server runtime error [${err.name}].`;
        name = ServerError.SERVER_RUNTIME_ERROR;
    }

    const out = {
        response: undefined,
        status: ERROR_STATUS,
        error: {
            message: msg,
            name: name,
        },
    }

    res.json(out);
});

//note, cant use await format here
//this makes a syncronous file system read
//todo: need to try to make this async
manifestInterface.init().catch(
    (err) => {
        throw err;
    }
).then(
    () => {
        app.listen(port, () => {
            console.log(`Server running at http://${hostname}:${port}/`);
        });
    }
);
