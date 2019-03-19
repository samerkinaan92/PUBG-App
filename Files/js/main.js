var g_interestedInFeatures = [
    'kill',
    'revived',
    'death',
    'killer',
    'match',
    'team',
    'phase',
    'map',
    'rank',
  ];

  var mapNames = {
    "Desert_Main": "Miramar",
    "DihorOtok_Main": "Vikendi",
    "Erangel_Main": "Erangel",
    "Range_Main": "Camp Jackal",
    "Savage_Main": "Sanhok"
  };

  var events = ["kill", "knockout", "headshot", "revived", "knockedout", "death", "win"];


var windowId;
var team;
var match = {};
var matches = [];
var isFeatureSet = false;
let encoding = overwolf.io.UTF8;
let filePath = "D:\\overwolf PUBG app\\matches.txt";

var voicesIds= {};

var mySwiper = new Swiper('.swiper-container', {
  speed: 400,
  onClick: (swiper, ev) => {
    showMatchSession(swiper.clickedIndex);
  },
  // Default parameters
  slidesPerView: 4,
  spaceBetween: 3,
  // Responsive breakpoints
  breakpoints: {
    // when window width is <= 480px
    1000: {
      slidesPerView: 1,
      spaceBetween: 3,
    },
    // when window width is <= 640px
    1350: {
      slidesPerView: 3,
      spaceBetween: 3,
    }
  }
});

// gets overwolf's user name
overwolf.profile.getCurrentUser(function(res){
  if(res.status === "success"){
    $(".user-name").html(res.username);
  }
}); 
  
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
      //isMedMatch();
    }
    console.log("getRunningGameInfo");
});


//gets current window id
overwolf.windows.getCurrentWindow(function(result) {
  if(result.status === "success") {
    windowId = result.window.id;
  }
});
$("#live-stats-table").hide();
$(".selected-session-div").hide();

loadSessionFile();

overwolf.media.audio.setVolume(50, function(res){
  if(res.status === "success"){
    console.log("Volume was set to 50");
  }
});

initVoiceSelect();

/*
*******************************************************************
************************Methods************************************
*******************************************************************
*/


//register listeners for events
function registerEvents() {
  if(!isFeatureSet){
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
      }else if(info.events[0].name === "matchEnd"){
        matchEnd_event();
      }else if(info.events[0].name === "matchSummary"){
        matchSummary_event();
      }else if(info.events[0].name === "headshot"){
        headshot_event();
      }else if(info.events[0].name === "kill"){
        kill_event();
      }else if(info.events[0].name === "revived"){
        revived_event();
      }else if(info.events[0].name === "death"){
        death_event();
      }

    });
    isFeatureSet = true;
    console.log("registerEvents");
  }else{
    console.log("registerEvents is already set");
  }
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

//updates for match
function match_info_update(match_info){
  if("map" in match_info){
    $("#map").html("map: " + mapNames[match_info.map]);
  }else if("kills" in match_info){
    match.kills = match_info.kills;
    $("#kills").html("kills: " + match_info.kills);
  }else if("headshots" in match_info){
    match.headshots = match_info.headshots;
    $("#headshots").html("headshots: " + match_info.headshots);
  }else if("total_damage_dealt" in match_info){
    match.totalDamage = match_info.total_damage_dealt;
    $("#total_damage_dealt").html("total damage dealt: " + match_info.total_damage_dealt);
  }else if("max_kill_distance" in match_info){
    match.maxKillDist = (match_info.max_kill_distance/100).toFixed(2);
    $("#max_dist").html("max kill distance: " + (match_info.max_kill_distance/100).toFixed(2));
  }else if("mode" in match_info){
    match.mode = match_info.mode;
    $("#mode").html("mode: " + match_info.mode);
  }else if("nicknames" in match_info){
    var data = JSON.parse(match_info.nicknames);
    if("team_members" in data){
      team = data.team_members;
      $("#team").html("team: " + data.team_members);
    }
  }else if("total_teams" in match_info){
    match.rank_total = match_info.total_teams;
  }else if("total" in match_info){
    if(match.mode === "solo"){
      match.rank_total = match_info.total;
    }
  }else if("me" in match_info){
    match.rank_me = match_info.me;
  }
}

//updates for game
function game_info_update(game_info){
  if("phase" in game_info){
    if(game_info.phase === "airfield"){
      setNewMatch();
      $("#no-live-match").hide();
      $("#live-stats-table").show();
    }else if(game_info.phase === "lobby"){
      $("#live-stats-table").hide();
      resetLiveFeed();
      $("#no-live-match").show();
    }
  }
}

function death_event(){
  playVoice('death');
}

function kill_event(){
  playVoice('kill');
}

function headshot_event(){
  playVoice('headshot');
}

function revived_event(){
  playVoice('revived');
}

function damage_dealt_event(damage_dealt){
  $("#lst_dmg_dlt").html("last damage dealt: " + damage_dealt);
  setTimeout(function(){ $("#lst_dmg_dlt").html("last damage dealt: 0")}, 15000);
}

function killer_event(killer_name){
  match.killer = killer_name;
  $("#killer").html("killer: " + killer_name);
}

function matchStart_event(){
}

function setNewMatch(){
  match = {};
  overwolf.games.events.getInfo(function(res){
    match.map = res.res.match_info.map;
    match.mode = res.res.match_info.mode;
    $("#mode").html("mode: " + match.mode);
    $("#map").html("map: " + mapNames[match.map]);
    if(match.mode !== "solo"){
      data = JSON.parse(res.res.match_info.nicknames)
      match.team = data.team_members;
      $("#team").html("team: " + match.team);
      $("#team").show();
    }else{
      $("#team").hide();
    }
  });
  match.kills = 0;
  match.headshots = 0;
  match.totalDamage = 0;
  match.knockouts = 0;
  match.knockedouts = 0;
  $("#kills").html("kills: 0");
  $("#knockouts").html("knockouts: " + match.knockouts);
  $("#knockedouts").html("knockedouts: " + match.knockedouts);
}

function matchEnd_event(){
}

function matchSummary_event(){
  addMatch();
  if(match.rank_me === "1")
    playVoice('win');
}

function knockout_event(){
  match.knockouts += 1;
  $("#knockouts").html("knockouts: " + match.knockouts);
  playVoice('knockout');
}

function knockedout_event(){
  match.knockedouts += 1;
  $("#knockedouts").html("knockedouts: " + match.knockedouts);
  playVoice('knockedout');
}

//close app
function closeApp(){
  //show conform message box
  let params = {
    message_title: "Close app",
    message_body: "Are you sure you want to close the app?",
    message_box_icon: overwolf.windows.enums.MessagePromptIcon.QuestionMark,
  };
  overwolf.windows.displayMessageBox(params, function(res){
    if(res.confirmed == true){
      overwolf.windows.close(windowId);
    }
  });
}

function minimizeWindow(){
  overwolf.windows.minimize(windowId);
}

function toggleMaximize(){
  overwolf.windows.maximize(windowId);
}


function drag(){
  overwolf.windows.dragMove(windowId);
}

function prevMatch(){
  mySwiper.slidePrev();
}

function nextMatch(){
  mySwiper.slideNext();
}

//hides selected match
function hideSession(){
  $(".selected-session-div").hide();
}

//adds match to swiper and saves in DB
function addMatch(){
  var date = new Date();
  match.date = date.toDateString() + " " + date.toTimeString();

  let slides = mySwiper.slides.length + 1;

  match.matchName = "Match " + (slides.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})); 
  appendSlide(match);
  matches.push(match);
  mySwiper.slideNext()
  saveSessionFile();
}


/*
//checks when opnning the app if game is med match
function isMedMatch(){
  overwolf.games.events.getInfo(function(res){
    if(res.res.status === "success"){
      if (['freefly', 'aircraft'].contains(res.res.game_info.phase)) {
        setMatch(res);
      }
    }
  });
}

/*
//sets match properties
function setMatch(res){
  console.log(res);
  if(res.status === "success"){
    match.date = (new Date()).toString();
    match.map = res.res.match_info.map;
    $("#map").html("map: " + mapNames[match.map]);
    match.mode = res.res.match_info.mode;
    $("#mode").html("mode: " + match.mode);
    if(res.res.match_info.kills !== undefined)
      match.kills = res.res.match_info.kills;
    $("#kills").html("kills: " + match.kills);
    match.headshots = res.res.match_info.headshots;
    $("#headshots").html("headshots: " + match.headshots);

    match.maxKillDist = res.res.match_info.max_kill_distance;
    $("#max_dist").html("max kill distance:: " + match.maxKillDist);
    match.totalDamage = res.res.match_info.total_damage_dealt;
    $("#total_damage_dealt").html("total damage dealt: " + match.totalDamage);
    if(match.mode !== "solo"){
      match.rank_total = res.res.match_info.total_teams;
      data = JSON.parse(res.res.match_info.nicknames);
      match.team = data.team_members;
      $("#team").html("team: " + match.team);
      $("#team").show();
      console.log(match.team);
    }
    console.log("setMatch was successful");
  }else{
    console.log("getInfo was not successful");
  }
}
*/

//TODO: save user settings
function setSttings(){

}

//resets live feed after match has been end
function resetLiveFeed(){
  $("#map").html("map:");
  $("#kills").html("kills: 0");
  $("#headshots").html("headshots: 0");
  $("#total_damage_dealt").html("total damage dealt: 0");
  $("#mode").html("mode:");
  $("#team").html("team:");
  $("#lst_dmg_dlt").html("last damage dealt: 0");
  $("#max_dist").html("max kill distance: 0");
  $("#knockedouts").html("knockedouts: 0");
  $("#knockouts").html("knockouts:");
  $("#killer").html("killer:");
}


//shows clicked previuse match stats
function showMatchSession(index){
  $(".selected-session-div").empty();
  $(".selected-session-div").show();
  $(".selected-session-div").append(`
    <header class"app-header">
      <h2>` + matches[index].matchName + `</h2>
      <div class="app-controls-group">
        <button class="app-control" onclick="hideSession()">
          <img class="svg-icon-fill" src="img/svg/close.svg" width="10", height="10">
        </button>
    </div>
    </header>`);
  $(".selected-session-div").append(`
    <table style="width:100%">
      <tr>
          <td>map: ` + mapNames[matches[index].map] + `</td>
          <td>kills: `+ matches[index].kills + `</td>
      </tr>
      <tr>
          <td>headshots: ` + matches[index].headshots + `</td>
          <td>total damage dealt: ` + matches[index].totalDamage + `</td>
      </tr>
      <tr>
          <td>mode: ` + matches[index].mode + `</td>
          <td id="old-session-team">team: ` + matches[index].team + `</td>
      </tr>
      <tr>
          <td>max kill distance: ` + matches[index].maxKillDist + `</td>
          <td>killer: ` + matches[index].killer + `</td>
      </tr>
      <tr id="old-session-knock">
          <td>knockouts: ` + matches[index].knockouts + `</td>
          <td>knockedouts: ` + matches[index].knockedouts + `</td>
      </tr>
    </table>
  `);
  if(matches[index].mode === "solo"){
    $("#old-session-team").hide();
    $("#old-session-knock").hide();
  }
}

//saves match to local DB
function saveSessionFile(){
  let json = JSON.stringify(matches);
  overwolf.io.writeFileContents(filePath, json, encoding, true, function(res){
    if(res.status === "success")
      console.log("File was saved successfly");
  });
}

//load all matches from local DB
function loadSessionFile(){
  overwolf.io.fileExists(filePath, function(res){
    if(res.status === "success"){
      if(res.found){
        overwolf.io.readFileContents(filePath, encoding, function(res){
          if(res.status === "success"){
            json = res.content;
            matches = JSON.parse(json);
            matches.forEach(element => {
              appendSlide(element);
            });
            mySwiper.slideTo(matches.length - 1);
            console.log("matches been loaded");
          }else if(res.status === "error"){
            console.log("Error loading file: " + res.reason);
          }
        });
      }else{
        console.log("File was not found");
      }
    }
  });
}

function appendSlide(match){
  var mapIcon = "img/icons/" + match.map + ".png";
  mySwiper.appendSlide(`
  <div class="swiper-slide">
    <article class="game">
      <div class="game-avatar">
        <img src="` + mapIcon + `" class="game-image">
      </div>
      <div class="game-info">
        <p class="game-title">` + match.matchName + `</p>
        <table>
        <tr>
          <td><p class="game-subtitle">Kills: ` + match.kills + `</p></td>
          <td><p class="game-subtitle">` + match.date + `</p></td>
        </tr>
        <tr>
          <td><p class="game-subtitle">Rank: ` + match.rank_me + `/` + match.rank_total + `</p></td>
        </tr>
        </table>
      </div> 
    </article>
  </div>
  `);
}

function getVoice(event){
  overwolf.utils.openFilePicker("*.mp3,*.wav", function(res){
    if(res.status === "success"){
      overwolf.media.audio.create(res.url, function(callback){
        if(callback.status === "success"){
          voicesIds[event] = callback.id;
          console.log(event + " audio file was created");
        }
      });
    }else{
      console.log(event + " audio file " + res.status);
    }
  });
}

function playVoice(event){
  if (voicesIds[event] === undefined){
    console.log(event + " voice is undefined");
  }else{
    overwolf.media.audio.play(voicesIds[event], function(res){
      if(res.status === "success"){
        console.log(event + " voice is playing");
      }
    });
  }
}

function initVoiceSelect(){
  var select = $("#voice-event-select");
  events.forEach(element => {
    var option = $('<option></option>');
    option.attr('value', element);
    option.text(element);
    select.append(option);
  });
}

function addVoiceEvent(){
  var selected = $("#voice-event-select").val();
  $("#voice-table").append(`
  <tr>
    <td>` + selected + `</td>
    <td>
      <button id="getVoicePathBtn" onclick="getVoice('` + selected + `')">Choose...</button>
    </td>
    <td>
      <button id="playVoiceBtn" onclick="playVoice('` + selected + `')"><img src="img/svg/speaker.svg"></button>
    </td>
  </tr>
  `);

  $("#voice-event-select option[value='" + selected + "']").remove();
}

function LEDSync(){
  
}