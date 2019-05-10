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
    'me',
    'roster'
  ];

var mapNames = {
    "Desert_Main": "Miramar",
    "DihorOtok_Main": "Vikendi",
    "Erangel_Main": "Erangel",
    "Range_Main": "Camp Jackal",
    "Savage_Main": "Sanhok"
};

var events = {"kill": "Kill", "knockout": "Knockout", "headshot": "Headshot", "revived": "Revived", "knockedout": "Knockedout", "death": "Death", "win": "Win", "jump": "Jump", "fire": "Fire", "damageTaken": "Taken damage"};
var logDev = [];

var windowId;
var team;
var match = {};
var matches = [];
var isFeatureSet = false;

var voicesIds= {};
var voicesPaths = {};
var leds = {};
var playersAlert = [];
var matchesNum = 0;

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
    // when window width is <= 1000px
    600: {
      slidesPerView: 1,
      spaceBetween: 3,
    },
    // when window width is <= 1000px
    1000: {
      slidesPerView: 2,
      spaceBetween: 3,
    },
    // when window width is <= 1350px
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

overwolf.settings.registerHotKey(
  "stop_playback",
  function(arg) {
    if (arg.status == "success") {
        overwolf.media.audio.stop(function(res){
      });
    }
  }
);

overwolf.settings.getHotKey("stop_playback", function(arg){
  if(arg.status == "success"){
    $("#hotkey").html('"' + arg.hotkey + '"');
  }
});

overwolf.settings.OnHotKeyChanged.addListener(function(res){
  $("#hotkey").html('"' + res.hotkey + '"');
});


$("#live-stats-table").hide();
$(".selected-session-div").hide();

loadSessionFile();

initSelect("voice");
getLEDSyncDev();
loadSettings();

overwolf.media.audio.onPlayStateChanged.addListener(function(res){
  for(voice in voicesIds){
    if(voicesIds.hasOwnProperty(voice)){
      if(voicesIds[voice] == res.id){
        if(res.playback_state == "playing"){
          $("#" + voice + "VoicePlayBtn").html('<img src="img/svg/speakerOff.svg">');
          $("#" + voice + "VoicePlayBtn").val(1);
        }else if(res.playback_state == "stopped"){
          $("#" + voice + "VoicePlayBtn").html('<img src="img/svg/speaker.svg">');
          $("#" + voice + "VoicePlayBtn").val(0);
        }
      }
    }
  }
});

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
      if("match_info" in info.info){
        //info update about match
        var match_info = info.info.match_info;
        var feature = info.feature;
        match_info_update(match_info, feature);
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
      playVoice(info.events[0].name, 0);
      playLed(info.events[0].name);
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
      }else if(info.events[0].name === "fire"){
        fire_event();
      }else if(info.events[0].name === "damageTaken"){
        damageTaken_event();
      }else if(info.events[0].name === "jump"){
        jump_event();
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
function match_info_update(match_info, feature){
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
      console.log(Object.prototype.toString.call(team));
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
    if(match.rank_me === "1"){
      playVoice('win');
    }
  }else if(feature === "roster"){
    chkPlyrAlrt(match_info);
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


/*
*******************************************************************
************************events************************************
*******************************************************************
*/


function death_event(){
}

function kill_event(){
}

function headshot_event(){
}

function revived_event(){
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

function matchEnd_event(){
}

function matchSummary_event(){
  addMatch();
}

function knockout_event(){
  match.knockouts += 1;
  $("#knockouts").html("knockouts: " + match.knockouts);
}

function knockedout_event(){
  match.knockedouts += 1;
  $("#knockedouts").html("knockedouts: " + match.knockedouts);
}

function fire_event(){
}

function damageTaken_event(){
}

function jump_event(){
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
  match.date = getDateString();
  matchesNum++;

  match.matchName = "Match " + (matchesNum.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}));
  if(matchesNum > 50){
    matches.shift();
    mySwiper.removeSlide(0);
  }
  appendSlide(match);
  matches.push(match);
  mySwiper.slideNext();
  saveSessionFile();
}

function getDateString(){
  var date = new Date();
  var str = date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear() + 
    " " + (date.getHours()).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + ":" + (date.getMinutes()).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
  return str;
}

//resets live feed after match has been end
function resetLiveFeed(){
  $("#map").html("map:");
  $("#kills").html("kills: 0");
  $("#headshots").html("headshots: 0");
  $("#mode").html("mode:");
  $("#team").html("team:");
  $("#max_dist").html("max kill distance: 0");
  $("#knockedouts").html("knockedouts: 0");
  $("#knockouts").html("knockouts:");
  $("#killer").html("killer:");
  $("#playerInMatch").empty();
  $("#live-stats-team-table").empty();
}


//shows clicked previuse match stats
function showMatchSession(index){
  $(".selected-session-div").empty();
  $(".selected-session-div").show();
  $(".selected-session-div").append(`
      <h2>` + matches[index].matchName + `</h2>
      <div class="session-controls-group">
        <button class="session-control" onclick="hideSession()">
          <img class="svg-icon-fill" src="img/svg/closeB.svg" width="10", height="10">
        </button>
      </div>`);
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
  }else if(matches[index].team_kills !== undefined){
    $(".selected-session-div").append(`
      <table style="width:100%">
      ` + matches[index].team_kills + `
      </table>
    `);
  }
}

//saves match to local DB
function saveSessionFile(){
  var json = JSON.stringify(matches);
  localStorage.matches = json;
  json = JSON.stringify(matchesNum);
  localStorage.matchesNum = json;
}

//load all matches from local DB
function loadSessionFile(){
  if(localStorage.matches){
    var json = localStorage.matches;
    matches = JSON.parse(json);
    matches.forEach(element => {
      appendSlide(element);
    });
    mySwiper.slideTo(matches.length - 1);
    matchesNum = JSON.parse(localStorage.matchesNum);
    console.log("matches been loaded");
  }else{
    console.log("matches is null");
  }

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

//save user settings
function saveVoices(){
  var json = JSON.stringify(voicesPaths);
  localStorage.voicesPaths = json;
}

function loadSettings(){
  if(localStorage.voicesPaths){
    voicesPaths = JSON.parse(localStorage.voicesPaths);
    for(var event in voicesPaths){
      if(voicesPaths.hasOwnProperty(event)){
        addVoiceEvent(event);
        getVoice(event, voicesPaths[event]);
      }
    }
    console.log("voices has been loaded");
  }else{
    console.log("no settings where found");
  }

  if(localStorage.playersAlert){
    playersAlert = JSON.parse(localStorage.playersAlert);
    playersAlert.forEach(function(element){
      $("#playerList").append(`
        <option value="` + element + `">` + element + `</option>
      `);
    });
  }

  setTimeout(loadFlashLed, 200);
}

function loadFlashLed(){
  if(localStorage.leds){
    leds = JSON.parse(localStorage.leds);
    for(var event in leds){
      if(leds.hasOwnProperty(event)){
        addLEDEvent(event, true);
        $('#' + event + 'LedDur').val(leds[event].duration);
        $('#' + event + 'LedInt').val(leds[event].interval);
        $('#' + event + 'hexVal').val(leds[event].color);
        var color = leds[event].color;
        var pixel = [parseInt(color.substring(1,3),16), parseInt(color.substring(3,5),16), parseInt(color.substring(5),16)];
        // update preview color
        var pixelColor = "rgb("+pixel[0]+", "+pixel[1]+", "+pixel[2]+")";
        $('#' + event + 'preview').css('backgroundColor', pixelColor);

        // update controls
        $('#' + event + 'rVal').val(pixel[0]);
        $('#' + event + 'gVal').val(pixel[1]);
        $('#' + event + 'bVal').val(pixel[2]);
        $('#' + event + 'rgbVal').val(pixel[0]+','+pixel[1]+','+pixel[2]);
      }
    }
  }
}

function getVoice(event, path){
  if(path == null){
    overwolf.utils.openFilePicker("*.mp3,*.wav", function(res){
      if(res.status === "success"){
        voicesPaths[event] = res.url;
        overwolf.media.audio.create(res.url, function(callback){
          if(callback.hasOwnProperty('id')){
            voicesIds[event] = callback.id;
            console.log(event + " audio file was created");
          }
        })
        saveVoices();
      }else{
        console.log(event + " audio file " + res.status);
      }
    });
  }else{
    overwolf.media.audio.create(path, function(callback){
      if(callback.hasOwnProperty('id')){
        voicesIds[event] = callback.id;
        console.log(event + " audio file was created");
      }
    });
  }
}

function playVoice(event, val){
  if (voicesIds[event] === undefined){
    console.log(event + " voice is undefined");
  }else{
    if(val == 0){
      overwolf.media.audio.play(voicesIds[event], function(res){
        if(res.status === "success"){
          console.log(event + " voice is playing");
        }else{
          console.log(event + " voice is playing is not successful!");
        }
      });
    }else if(val == 1){
      overwolf.media.audio.stopById(voicesIds[event], function(res){
        if(res.status === "success"){
          console.log(event + " voice stopped");
        }else{
          console.log(event + " voice is stop is not successful!");
        }
      });
    }
  }
}

function initSelect(str){
  var select = $("#"+ str + "-event-select");
  for(var property in events){
    if (events.hasOwnProperty(property)) {
      var option = $('<option></option>');
      option.attr('value', property);
      option.text(events[property]);
      select.append(option);
    }
  }
}

function addVoiceEvent(selected){
  $("#voice-table").append(`
  <tr id="` + selected + `-voice-event">
    <th scope="row">` + events[selected] + `</th>
    <td>
      <button class="settings-btns" onclick="getVoice('` + selected + `', null)">Choose...</button>
    </td>
    <td>
      <button value="0" id="` + selected + `VoicePlayBtn" class="session-control" onclick="playVoice('` + selected + `', this.value)"><img src="img/svg/speaker.svg"></button>
    </td>
    <td>
      <button class="settings-btns" onclick="delVoice('` + selected + `')">Remove</button>
    </td>
  </tr>
  `);

  $("#voice-event-select option[value='" + selected + "']").remove();
}

function delVoice(event){
  //show conform message box
  let params = {
    message_title: "Delete voice event",
    message_body: "Are you sure you want to delete " + event + " voice event?",
    message_box_icon: overwolf.windows.enums.MessagePromptIcon.QuestionMark,
  };
  overwolf.windows.displayMessageBox(params, function(res){
    if(res.confirmed == true){
      $("#" + event + "-voice-event").remove();
      delete voicesIds[event];
      delete voicesPaths[event];
      var select = $("#voice-event-select");
      var option = $('<option></option>');
      option.attr('value', event);
      option.text(events[event]);
      select.append(option);
      saveVoices();
    }
  });
}

function addLEDEvent(selected, prev){
  $("#RGB-table").append(`
  <tr id="` + selected + `-led-event">
    <th>` + events[selected] + `</th>
    <td>
      <!-- preview element -->
      <div class="preview" id="` + selected + `preview"></div>

      <!-- colorpicker element -->
      <div class="colorpicker" id="` + selected + `colorpicker" style="display:none">
        <canvas id="` + selected + `picker" width="300" height="300"></canvas>

          <div class="controls">
            <div><label>R</label> <input type="text" id="` + selected + `rVal" /></div>
            <div><label>G</label> <input type="text" id="` + selected + `gVal" /></div>
            <div><label>B</label> <input type="text" id="` + selected + `bVal" /></div>
            <div><label>RGB</label> <input type="text" id="` + selected + `rgbVal" /></div>
            <div><label>HEX</label> <input type="text" id="` + selected + `hexVal" /></div>
          </div>
      </div>
    </td>
    <td>
      <input type="number" id="` + selected + `LedDur" value="3000" min="0" max="10000"> ms
    </td>
    <td>
      <input type="number" id="` + selected + `LedInt" value="300" min="0" max="2000"> ms
    </td>
    <td>
      <button class="session-control" id="playLEDBtn" onclick="playLed('` + selected + `')"><img src="img/svg/light.svg"></button>
    </td>
    <td>
      <button class="settings-btns" id="delLEDBtn" onclick="delLED('` + selected + `')">Remove</button>
    </td>
  </tr>
  `);
  
  $("#RGB-event-select option[value='" + selected + "']").remove();
  
  if(!prev){
    var ev = {color: "#000000", duration: 3000, interval: 300};
    leds[selected] = ev;
    saveLED();
  }
  
  
  $(function(){
    var bCanPreview = true; // can preview

    // create canvas and context objects
    var canvas = document.getElementById(selected + 'picker');
    var ctx = canvas.getContext('2d');

    // drawing active image
    var image = new Image();
    image.onload = function () {
        ctx.drawImage(image, 0, 0, image.width, image.height); // draw the image on the canvas
    }

    // select desired colorwheel
    var imageSrc = 'img/colorPicker/colorwheel1.png';
    image.src = imageSrc;

    $('#' + selected + 'LedDur').change(function() {
      var dur = $('#' + selected + 'LedDur').val();
      if(dur > 10000){
        $('#' + selected + 'LedDur').val(10000);
      }else if(dur < 0){
        $('#' + selected + 'LedDur').val(0);
      }
      leds[selected].duration = $('#' + selected + 'LedDur').val();
      saveLED();
    });

    $('#' + selected + 'LedInt').change(function() {
      var dur = $('#' + selected + 'LedInt').val();
      if(dur > 10000){
        $('#' + selected + 'LedInt').val(2000);
      }else if(dur < 0){
        $('#' + selected + 'LedInt').val(0);
      }
      leds[selected].interval = $('#' + selected + 'LedInt').val();
      saveLED();
    });

    $('#' + selected + 'picker').mousemove(function(e) { // mouse move handler
        if (bCanPreview) {
            // get coordinates of current position
            var canvasOffset = $(canvas).offset();
            var canvasX = Math.floor(e.pageX - canvasOffset.left);
            var canvasY = Math.floor(e.pageY - canvasOffset.top);

            // get current pixel
            var imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
            var pixel = imageData.data;

            // update preview color
            var pixelColor = "rgb("+pixel[0]+", "+pixel[1]+", "+pixel[2]+")";
            $('#' + selected + 'preview').css('backgroundColor', pixelColor);

            // update controls
            $('#' + selected + 'rVal').val(pixel[0]);
            $('#' + selected + 'gVal').val(pixel[1]);
            $('#' + selected + 'bVal').val(pixel[2]);
            $('#' + selected + 'rgbVal').val(pixel[0]+','+pixel[1]+','+pixel[2]);

            var dColor = pixel[2] + 256 * pixel[1] + 65536 * pixel[0];
            $('#' + selected + 'hexVal').val('#' + ('0000' + dColor.toString(16)).substr(-6));
        }
    });
    $('#' + selected + 'picker').click(function(e) { // click event handler
        bCanPreview = !bCanPreview;
    }); 
    $('#' + selected + 'preview').click(function(e) { // preview click
        if(!($('#' + selected + 'colorpicker').is(":visible"))){
          bCanPreview = true;
        }else{
          leds[selected].color = $('#' + selected + 'hexVal').val();
          saveLED();
        }
        $('#' + selected + 'colorpicker').fadeToggle("fast", "linear");
    });
  });
}

function playLed(selected){
  var col = $('#' + selected + 'hexVal').val();
  var dur = $("#" + selected + "LedDur").val();
  var int = $("#" + selected + "LedInt").val();
  if(!col || !dur || !int){
    console.log(selected + " LED event is not defined");
  }else{
    flashLighting(col, dur, int);
  }
}

function delLED(selected){
  //show conform message box
  let params = {
    message_title: "Delete LED flashing event",
    message_body: "Are you sure you want to delete " + selected + " LED flashing event?",
    message_box_icon: overwolf.windows.enums.MessagePromptIcon.QuestionMark,
  };
  overwolf.windows.displayMessageBox(params, function(res){
    if(res.confirmed == true){
      $("#" + selected + "-led-event").remove();
      var select = $("#RGB-event-select");
      var option = $('<option></option>');
      option.attr('value', selected);
      option.text(events[selected]);
      select.append(option);
      delete leds[selected];
      saveLED();
    }
  });
}

function saveLED(){
  var json = JSON.stringify(leds);
  localStorage.leds = json;
}

function flashLighting(color, duration, interval){
  var rgbColor = convertColor(color);
  overwolf.logitech.led.flashLighting(rgbColor.rChannel, rgbColor.gChannel, rgbColor.bChannel, duration, interval, function(res){
  });
}

function convertColor(color) {
  /* Check for # infront of the value, if it's there, strip it */

  if(color.substring(0,1) == '#') {
     color = color.substring(1);
   }

  var rgbColor = {};

  /* Grab each pair (channel) of hex values and parse them to ints using hexadecimal decoding */
  rgbColor.rChannel = Math.round((parseInt(color.substring(0,2),16)/255)*100);
  rgbColor.gChannel = Math.round((parseInt(color.substring(2,4),16)/255)*100);
  rgbColor.bChannel = Math.round((parseInt(color.substring(4),16)/255)*100);

  return rgbColor;
 }

function getLEDSyncDev(){
  overwolf.logitech.getDevices(function(res){
    logDev = res.devices;
    var isRGB = false;
    logDev.forEach(element => {
      if(element.lightingId == '2'){
        isRGB = true;
      }
    });
    if(isRGB){
      $(".logitecDevLst").append(`
        <p>Here you can set Logitech devices to flash on event, for example you can set flash effects that will play each time you get a kill or get a win.<br><br></p>
        <table class="table">
          <tr>
            <td>
              <span>Event: </span><select id="RGB-event-select"></select>
            </td>
            <td>
              <button class="settings-btns tooltip" onclick="addLEDEvent($('#RGB-event-select').val(), false)">ADD<span class="tooltiptext">Add LED effect</span></button>
            </td>
          </tr>
        </table>
        <table id="RGB-table" class="table">
          <thead class="thead-dark">
            <tr>
              <th>Event</th>
              <th class="tooltip">Color<span class="tooltiptext">Set LED color effect</span></th>
              <th class="tooltip">Duration<span class="tooltiptext">Set the duration time LED effect will play</span></th>
              <th class="tooltip">Interval<span class="tooltiptext">Set the interval time flash will play</span></th>
              <th class="tooltip">Test<span class="tooltiptext">Test LED effect</span></th>
              <th> </th>
            </tr>
          </thead>
        </table>
      `);
      initSelect("RGB");
      
      overwolf.logitech.led.init(function(res){
      });
    
      overwolf.logitech.led.setTargetDevice([overwolf.logitech.led.enums.LogitechDeviceLightingType.RGB], function(res){
      });
    
      overwolf.logitech.led.saveCurrentLighting(function(res){
      });
    }else{
      $(".logitecDevLst").append(`
        <h3>No Logitech RGB devices found</h3>
      `);
    }
  });
}

function addPlayer(name){
  if(name.length >= 3){
    $("#playerList").append(`
      <option value="` + name + `">` + name + `</option>
    `);
    playersAlert.push(name);
    $("#playerTxt").val('');
    var json = JSON.stringify(playersAlert);
    localStorage.playersAlert = json;
    console.log(name + " has been added to alert list");
  }
}

function removePlayer(){
  $.each($("#playerList option:selected"), function(){
    $("#playerList option[value='" + $(this).val() + "']").remove();
    for( var i = 0; i < playersAlert.length; i++){ 
      if ( playersAlert[i] === $(this).val()) {
        playersAlert.splice(i, 1); 
        i--;
      }
    }
    console.log($(this).val() + " has been added to alert list");
    var json = JSON.stringify(playersAlert);
    localStorage.playersAlert = json;
  });
}

function chkPlyrAlrt(roster){
  var names = Object.getOwnPropertyNames(roster);
  var playerRos = JSON.parse(roster[names[0]]);
  if("player" in playerRos){
    var playerName = playerRos["player"];
    if(match.mode !== "solo"){
        if(playerRos["out"]){
        team.forEach(function(element){
          if(element === playerName){
            $("#live-stats-team-table").append("<tr><td>" + playerName + " has " + playerRos["kills"] + " kills</td></tr>");
            match.team_kills = $("#live-stats-team-table").html();
          }
        });
      }
    }
    var lowercaseName = playerName.toLowerCase();
    playersAlert.forEach(function(element){
      if(lowercaseName.includes(element.toLowerCase())){
        if(!playerRos["out"]){
          console.log(playerName + " is in match");
          $("#playerInMatch").append(`
            <option value="` + playerName + `In">` + playerName + " is in match" + `</option>
          `);
          $("#playerInMatch").val(playerName + 'In');
        }else{
          console.log(playerName + " has died with " + playerRos["kills"] + " kills");
          $("#playerInMatch").append(`
            <option value="` + playerName + `Out">` + playerName + " has died with " + playerRos["kills"] + " kills" + `</option>
          `);
          $("#playerInMatch").val(playerName + 'Out');
        }
      }
    });
  }
}

function openSetting(evt, SettingName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(SettingName).style.display = "block";
  evt.currentTarget.className += " active";
}