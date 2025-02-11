import { useLocation, useParams } from "react-router-dom";
import ActivityList from "./components/ActivityList";
import WeaponsDetail from "./components/WeaponsDetail";
import WeaponMetaDetail from "./components/WeaponMetaDetail";
import MedalHighlights from "./components/MedalHighlights";
import MapsDetail from "./components/MapsDetail";
import PlayerActivitiesHeader from "./components/PlayerActivitiesHeader";

import { useFetchPlayerActivities } from "../../hooks/remote";

import { CharacterClassSelection, Mode, Moment } from "shared";
import ErrorView from "../../components/ErrorView";

import TimePlayed from "./components/TimePlayed";

import StatDetails from "./components/StatDetails";
import StatHighlights from "./components/StatHighlights";
import PlayerOverviewBackgroundImage from "./images/player_overview_background.png";
const { useQuery } = require("../../hooks/browser");

const playerOverviewStyle = {
  padding: "var(--content-padding)",
  height: "460px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-around",

  backgroundImage: `url(${PlayerOverviewBackgroundImage})`,
  backgroundRepeat: "repeat",
};

const weaponsStyle = {
  paddingTop: "24px",
  display: "flex",
};

const playerHeaderStyle = {
  padding: "var(--content-padding)",
  height: "180px",
  display: "flex",
  alignItems: "center",
};

const PlayerView = () => {
  let params = useParams();

  let mode = Mode.fromString(params.mode);
  let moment = Moment.fromString(params.moment);
  let classSelection = CharacterClassSelection.fromString(params.classType);

  let query = useQuery();
  let hash = query.get("fr");

  /*
  let [profile, isProfileLoading, profileLoadError] = useFetchPlayerProfile(
    true,
    params.memberId,
    params.platformId
  );
  */
  //console.log(params.memberId, mode.label, moment.label, classSelection.label);
  let [activityStats, isActivitiesLoading, activitiesLoadError] =
    useFetchPlayerActivities(
      true,
      params.memberId,
      mode,
      moment,
      classSelection,
      hash
    );

  /*
    if (profileLoadError) {
        return <div>An error occured (profileLoadError) <br />{profileLoadError.toString()}<br />{profileLoadError.stack}</div>
    }
    */

  if (activitiesLoadError) {
    return (
      <div>
        An error occured (activitiesLoadError) <br />
        {activitiesLoadError.toString()}
        <br />
        {activitiesLoadError.stack}
      </div>
    );
  }

  if (!activityStats) {
    return "";
  }

  let summary = activityStats.summary;
  let weapons = summary.weapons;
  let medals = summary.medals;
  let meta = activityStats.meta;
  let maps = activityStats.maps;

  mode = Mode.fromString(activityStats.query.mode);
  moment = Moment.fromString(activityStats.query.startMoment);
  classSelection = CharacterClassSelection.fromString(
    activityStats.query.classSelection
  );

  const gappedStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "30px",
    background:
      "linear-gradient(180deg, rgba(34,34,34,1) 0%, rgba(54,54,54,1) 100%)",
  };

  return (
    <div>
      <div id="player_overview_header" style={playerHeaderStyle}>
        <PlayerActivitiesHeader
          player={activityStats.player}
          classSelection={classSelection}
          mode={mode}
          moment={moment}
        />
      </div>

      <div style={gappedStyle}>
        <div style={playerOverviewStyle}>
          <StatHighlights summary={summary} />
          <StatDetails summary={summary} />
          <MedalHighlights medals={medals} />
          <TimePlayed seconds={summary.timePlayedSeconds} />
        </div>

        <div style={weaponsStyle}>
          <WeaponsDetail weapons={weapons} />
          <WeaponMetaDetail weapons={meta} />
        </div>

        <div>
          <MapsDetail maps={maps} />
        </div>

        <div>
          <ActivityList
            activities={activityStats.activities}
            summary={summary}
            isLoading={isActivitiesLoading}
          />
        </div>

        <ErrorView error={[activitiesLoadError]} />
      </div>
    </div>
  );
};

export default PlayerView;
