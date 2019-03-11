var g_interestedInFeatures = [
    'kill',
    'revived',
    'death',
    'killer',
    'match',
    'team',
    'phase',
    'map',
  ];

  var mapNames = {
    "Desert_Main": "Miramar",
    "DihorOtok_Main": "Vikendi",
    "Erangel_Main": "Erangel",
    "Range_Main": "Camp Jackal",
    "Savage_Main": "Sanhok"
  }

var knockouts = 0;
var knockedouts = 0;
var windowId;

// gets overwolf's user name
overwolf.profile.getCurrentUser(function(res){
  if(res.status === "success"){
    $(".user-name").html(res.username);
  }
});

//register listeners for events
function registerEvents() {
    // general events errors
    overwolf.games.events.onError.addListener(function(info) {
      console.log("Error: " + JSON.stringify(info));
    });
  
    // "static" data changed
    // This will also be triggered the first time we register
    // for events and will contain all the current information
    overwolf.games.events.onInfoUpdates2.addListener(function(info) {
      console.log("Info UPDATE: " + JSON.stringify(info));
      if("match_info" in info.info){
        //info update about match
        var match_info = info.info.match_info;
        match_info_update(match_info);
      }
      if("game_info" in info.info){
        //info update about game
        var game_info = info.info.game_info;
        game_info_update(game_info);
      }
    });
  
    // an event triggerd
    overwolf.games.events.onNewEvents.addListener(function(info) {
      console.log("EVENT FIRED: " + JSON.stringify(info));
      if(info.events[0].name === "damage_dealt"){
        damage_dealt_event(info.events[0].data);
      }else if(info.events[0].name === "killer"){
        var data = JSON.parse(info.events[0].data)
        killer_event(data.killer_name);
      }else if(info.events[0].name === "matchStart"){
        matchStart_event();
      }else if(info.events[0].name === "knockout"){
        knockout_event();
      }else if(info.events[0].name === "knockedout"){
        knockedout_event();
      }

    });
    console.log("registerEvents");
}

//fires when game is launched and checks if its pubg
function gameLaunched(gameInfoResult) {
    if (!gameInfoResult) {
      return false;
    }
  
    if (!gameInfoResult.gameInfo) {
      return false;
    }
  
    if (!gameInfoResult.runningChanged && !gameInfoResult.gameChanged) {
      return false;
    }
  
    if (!gameInfoResult.gameInfo.isRunning) {
      return false;
    }
  
    // NOTE: we divide by 10 to get the game class id without it's sequence number
    if (Math.floor(gameInfoResult.gameInfo.id/10) != 10906) {
      return false;
    }
  
    console.log("PUBG Launched");
    return true;
}

//fires when a game is running and checks if its pubg
function gameRunning(gameInfo) {
  
    if (!gameInfo) {
      return false;
    }
  
    if (!gameInfo.isRunning) {
      return false;
    }
  
    // NOTE: we divide by 10 to get the game class id without it's sequence number
    if (Math.floor(gameInfo.id/10) != 10906) {
      return false;
    }
  
    console.log("PUBG running");
    return true;
}
  
// sets all the desired features to receive  
function setFeatures() {
    overwolf.games.events.setRequiredFeatures(g_interestedInFeatures, function(info) {
      if (info.status == "error")
      {
        //console.log("Could not set required features: " + info.reason);
        //console.log("Trying in 2 seconds");
        window.setTimeout(setFeatures, 2000);
        return;
      }
  
      console.log("Set required features:");
      console.log(JSON.stringify(info));
    });
}
  
  
//envoked on every game info update
overwolf.games.onGameInfoUpdated.addListener(function (res) {
  //checks if PUBG launched
  if (gameLaunched(res)) {
    registerEvents();
    setTimeout(setFeatures, 1000);
  }
    console.log("onGameInfoUpdated");
});

//gets running game info
overwolf.games.getRunningGameInfo(function (res) {
  //checks if PUBG is currently running  
  if (gameRunning(res)) {
      registerEvents();
      setTimeout(setFeatures, 1000);
    }
    console.log("getRunningGameInfo");
});

//updates for match
function match_info_update(match_info){
  if("map" in match_info){
  $("#map").html("map: " + mapNames[match_info.map]);
  }
  if("kills" in match_info){
    $("#kills").html("kills: " + match_info.kills);
  }
  if("headshots" in match_info){
    $("#headshots").html("headshots: " + match_info.headshots);
  }
  if("total_damage_dealt" in match_info){
    $("#total_damage_dealt").html("total damage dealt: " + match_info.total_damage_dealt);
  }
  if("max_kill_distance" in match_info){
    $("#max_dist").html("max kill distance: " + (match_info.max_kill_distance/100).toFixed(2));
  }
  if("mode" in match_info){
    $("#mode").html("mode: " + match_info.mode);
  }
  if("nicknames" in match_info){
    var data = JSON.parse(match_info.nicknames);
    if("team_members" in data){
      $("#team").html("team: " + data.team_members);
    }
  }
}

//updates for game
function game_info_update(game_info){
  if("phase" in game_info){
    $("#phase").html("phase: " + game_info.phase);
  }
}

function damage_dealt_event(damage_dealt){
  $("#lst_dmg_dlt").html("last damage dealt: " + damage_dealt);
  setTimeout(function(){ $("#lst_dmg_dlt").html("last damage dealt: 0")}, 15000);
}

function killer_event(killer_name){
  $("#killer").html("killer: " + killer_name);
}

function matchStart_event(){
  knockouts = 0;
  knockedouts = 0;
  $("#kills").html("kills: 0");
  $("#knockouts").html("knockouts: " + knockouts);
  $("#knockedouts").html("knockedouts: " + knockedouts);
}

function knockout_event(){
  knockouts += 1;
  $("#knockouts").html("knockouts: " + knockouts);
}

function knockedout_event(){
  knockedouts += 1;
  $("#knockedouts").html("knockedouts: " + knockedouts);
}

overwolf.windows.getCurrentWindow(function(result) {
  if(result.status === "success") {
    windowId = result.window.id;
    console.log("window id is saved: " + windowId);
  }
});

function closeWindow(){
  console.log("close button clicked");
  overwolf.window.close(windowId, function(callback){
  });
}
