const g_interestedInFeatures = [
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

const events = {
    "kill": "Kill",
    "knockout": "Knockout",
    "headshot": "Headshot",
    "revived": "Revived",
    "knockedout": "Knockedout",
    "death": "Death",
    "win": "Win",
    "jump": "Jump",
    "fire": "Fire",
    "damageTaken": "Taken damage"
};
let logDev = [];

let windowId;
let isFeatureSet = false;

let voicesIds = {};
let voicesPaths = {};
let leds = {};
let playersAlert = [];


// gets overwolf's user name
overwolf.profile.getCurrentUser(function(res) {
    if (res.status === "success") {
        $(".user-name").html(res.username);
    }
});

//envoked on every game info update
overwolf.games.onGameInfoUpdated.addListener(function(res) {
    //checks if PUBG launched
    if (gameLaunched(res)) {
        registerEvents();
        setTimeout(setFeatures, 1000);
    }
    console.log("onGameInfoUpdated");
});

//gets running game info
overwolf.games.getRunningGameInfo(function(res) {
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
    if (result.status === "success") {
        windowId = result.window.id;
    }
});

overwolf.settings.registerHotKey(
    "stop_playback",
    function(arg) {
        if (arg.status == "success") {
            overwolf.media.audio.stop(function(res) {});
        }
    }
);

overwolf.settings.getHotKey("stop_playback", function(arg) {
    if (arg.status == "success") {
        $("#hotkey").html('"' + arg.hotkey + '"');
    }
});

overwolf.settings.OnHotKeyChanged.addListener(function(res) {
    if (res.source === "stop_playback") {
        $("#hotkey").html('"' + res.hotkey + '"');
    }
});

initSelect("voice");
getLEDSyncDev();
loadSettings();

overwolf.media.audio.onPlayStateChanged.addListener(function(res) {
    for (voice in voicesIds) {
        if (voicesIds.hasOwnProperty(voice)) {
            if (voicesIds[voice] == res.id) {
                if (res.playback_state == "playing") {
                    $("#" + voice + "VoicePlayBtn").html('<img src="img/svg/speakerOff.svg">');
                    $("#" + voice + "VoicePlayBtn").val(1);
                } else if (res.playback_state == "stopped") {
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
    if (!isFeatureSet) {
        // general events errors
        overwolf.games.events.onError.addListener(function(info) {
            console.log("Error: " + JSON.stringify(info));
        });

        // "static" data changed
        // This will also be triggered the first time we register
        // for events and will contain all the current information
        overwolf.games.events.onInfoUpdates2.addListener(function(info) {
            if ("match_info" in info.info) {
                //info update about match
                let match_info = info.info.match_info;
                let feature = info.feature;
                match_info_update(match_info, feature);
            }
            if ("game_info" in info.info) {
                //info update about game
                let game_info = info.info.game_info;
                game_info_update(game_info);
            }
        });

        // an event triggerd
        overwolf.games.events.onNewEvents.addListener(function(info) {
            console.log("EVENT FIRED: " + JSON.stringify(info));
            info.events.forEach((event) => {
                eventsHandler(event);
            });
        });
        isFeatureSet = true;
        console.log("registerEvents");
    } else {
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
    if (Math.floor(gameInfoResult.gameInfo.id / 10) != 10906) {
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
    if (Math.floor(gameInfo.id / 10) != 10906) {
        return false;
    }

    console.log("PUBG running");
    return true;
}

// sets all the desired features to receive  
function setFeatures() {
    overwolf.games.events.setRequiredFeatures(g_interestedInFeatures, function(info) {
        if (info.status == "error") {
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
function match_info_update(match_info, feature) {
    if ("me" in match_info) {
        if (match_info.rank_me === "1") {
            playVoice('win');
        }
    } else if (feature === "roster") {
        chkPlyrAlrt(match_info);
    }
}

//updates for game
function game_info_update(game_info) {}


/*
 *******************************************************************
 ************************events************************************
 *******************************************************************
 */

function eventsHandler(event) {
    let eventName = info.events[0].name;
    let eventData = info.events[0].data;
    playVoice(eventName, 0);
    playLed(eventName);
    if (eventName === "matchStart") {
        matchStart_Event();
    }
}

function matchStart_Event() {
    overwolf.games.events.getInfo(function(res) {
        console.log(res);
    });
}

//close app
function closeApp() {
    //show conform message box
    let params = {
        message_title: "Close app",
        message_body: "Are you sure you want to close the app?",
        message_box_icon: overwolf.windows.enums.MessagePromptIcon.QuestionMark,
    };
    overwolf.windows.displayMessageBox(params, function(res) {
        if (res.confirmed == true) {
            overwolf.windows.close(windowId);
        }
    });
}

function minimizeWindow() {
    overwolf.windows.minimize(windowId);
}

function toggleMaximize() {
    overwolf.windows.maximize(windowId);
}


function drag() {
    overwolf.windows.dragMove(windowId);
}


//save user settings
function saveVoices() {
    let json = JSON.stringify(voicesPaths);
    localStorage.voicesPaths = json;
}

function loadSettings() {
    if (localStorage.voicesPaths) {
        voicesPaths = JSON.parse(localStorage.voicesPaths);
        for (let event in voicesPaths) {
            if (voicesPaths.hasOwnProperty(event)) {
                addVoiceEvent(event);
                getVoice(event, voicesPaths[event]);
            }
        }
        console.log("voices has been loaded");
    } else {
        console.log("no settings where found");
    }

    if (localStorage.playersAlert) {
        playersAlert = JSON.parse(localStorage.playersAlert);
        playersAlert.forEach(function(element) {
            $("#playerList").append(`
        <option value="` + element + `">` + element + `</option>
      `);
        });
    }

    setTimeout(loadFlashLed, 200);
}

function loadFlashLed() {
    if (localStorage.leds) {
        leds = JSON.parse(localStorage.leds);
        for (let event in leds) {
            if (leds.hasOwnProperty(event)) {
                addLEDEvent(event, true);
                $('#' + event + 'LedDur').val(leds[event].duration);
                $('#' + event + 'LedInt').val(leds[event].interval);
                $('#' + event + 'hexVal').val(leds[event].color);
                let color = leds[event].color;
                let pixel = [parseInt(color.substring(1, 3), 16), parseInt(color.substring(3, 5), 16), parseInt(color.substring(5), 16)];
                // update preview color
                let pixelColor = "rgb(" + pixel[0] + ", " + pixel[1] + ", " + pixel[2] + ")";
                $('#' + event + 'preview').css('backgroundColor', pixelColor);

                // update controls
                $('#' + event + 'rVal').val(pixel[0]);
                $('#' + event + 'gVal').val(pixel[1]);
                $('#' + event + 'bVal').val(pixel[2]);
                $('#' + event + 'rgbVal').val(pixel[0] + ',' + pixel[1] + ',' + pixel[2]);
            }
        }
    }
}

function getVoice(event, path) {
    if (path == null) {
        overwolf.utils.openFilePicker("*.mp3,*.wav", function(res) {
            if (res.status === "success") {
                voicesPaths[event] = res.url;
                overwolf.media.audio.create(res.url, function(callback) {
                    if (callback.hasOwnProperty('id')) {
                        voicesIds[event] = callback.id;
                        console.log(event + " audio file was created");
                    }
                })
                saveVoices();
            } else {
                console.log(event + " audio file " + res.status);
            }
        });
    } else {
        overwolf.media.audio.create(path, function(callback) {
            if (callback.hasOwnProperty('id')) {
                voicesIds[event] = callback.id;
                console.log(event + " audio file was created");
            }
        });
    }
}

function playVoice(event, val) {
    if (voicesIds[event] === undefined) {
        console.log(event + " voice is undefined");
    } else {
        if (val == 0) {
            overwolf.media.audio.play(voicesIds[event], function(res) {
                if (res.status === "success") {
                    console.log(event + " voice is playing");
                } else {
                    console.log(event + " voice is playing is not successful!");
                }
            });
        } else if (val == 1) {
            overwolf.media.audio.stopById(voicesIds[event], function(res) {
                if (res.status === "success") {
                    console.log(event + " voice stopped");
                } else {
                    console.log(event + " voice is stop is not successful!");
                }
            });
        }
    }
}

function initSelect(str) {
    let select = $("#" + str + "-event-select");
    for (let property in events) {
        if (events.hasOwnProperty(property)) {
            let option = $('<option></option>');
            option.attr('value', property);
            option.text(events[property]);
            select.append(option);
        }
    }
}

function addVoiceEvent(selected) {
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

function delVoice(event) {
    //show conform message box
    let params = {
        message_title: "Delete voice event",
        message_body: "Are you sure you want to delete " + event + " voice event?",
        message_box_icon: overwolf.windows.enums.MessagePromptIcon.QuestionMark,
    };
    overwolf.windows.displayMessageBox(params, function(res) {
        if (res.confirmed == true) {
            $("#" + event + "-voice-event").remove();
            delete voicesIds[event];
            delete voicesPaths[event];
            let select = $("#voice-event-select");
            let option = $('<option></option>');
            option.attr('value', event);
            option.text(events[event]);
            select.append(option);
            saveVoices();
        }
    });
}

function addLEDEvent(selected, prev) {
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

    if (!prev) {
        let ev = { color: "#000000", duration: 3000, interval: 300 };
        leds[selected] = ev;
        saveLED();
    }


    $(function() {
        let bCanPreview = true; // can preview

        // create canvas and context objects
        let canvas = document.getElementById(selected + 'picker');
        let ctx = canvas.getContext('2d');

        // drawing active image
        let image = new Image();
        image.onload = function() {
            ctx.drawImage(image, 0, 0, image.width, image.height); // draw the image on the canvas
        }

        // select desired colorwheel
        let imageSrc = 'img/colorPicker/colorwheel1.png';
        image.src = imageSrc;

        $('#' + selected + 'LedDur').change(function() {
            let dur = $('#' + selected + 'LedDur').val();
            if (dur > 10000) {
                $('#' + selected + 'LedDur').val(10000);
            } else if (dur < 0) {
                $('#' + selected + 'LedDur').val(0);
            }
            leds[selected].duration = $('#' + selected + 'LedDur').val();
            saveLED();
        });

        $('#' + selected + 'LedInt').change(function() {
            let dur = $('#' + selected + 'LedInt').val();
            if (dur > 10000) {
                $('#' + selected + 'LedInt').val(2000);
            } else if (dur < 0) {
                $('#' + selected + 'LedInt').val(0);
            }
            leds[selected].interval = $('#' + selected + 'LedInt').val();
            saveLED();
        });

        $('#' + selected + 'picker').mousemove(function(e) { // mouse move handler
            if (bCanPreview) {
                // get coordinates of current position
                let canvasOffset = $(canvas).offset();
                let canvasX = Math.floor(e.pageX - canvasOffset.left);
                let canvasY = Math.floor(e.pageY - canvasOffset.top);

                // get current pixel
                let imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
                let pixel = imageData.data;

                // update preview color
                let pixelColor = "rgb(" + pixel[0] + ", " + pixel[1] + ", " + pixel[2] + ")";
                $('#' + selected + 'preview').css('backgroundColor', pixelColor);

                // update controls
                $('#' + selected + 'rVal').val(pixel[0]);
                $('#' + selected + 'gVal').val(pixel[1]);
                $('#' + selected + 'bVal').val(pixel[2]);
                $('#' + selected + 'rgbVal').val(pixel[0] + ',' + pixel[1] + ',' + pixel[2]);

                let dColor = pixel[2] + 256 * pixel[1] + 65536 * pixel[0];
                $('#' + selected + 'hexVal').val('#' + ('0000' + dColor.toString(16)).substr(-6));
            }
        });
        $('#' + selected + 'picker').click(function(e) { // click event handler
            bCanPreview = !bCanPreview;
        });
        $('#' + selected + 'preview').click(function(e) { // preview click
            if (!($('#' + selected + 'colorpicker').is(":visible"))) {
                bCanPreview = true;
            } else {
                leds[selected].color = $('#' + selected + 'hexVal').val();
                saveLED();
            }
            $('#' + selected + 'colorpicker').fadeToggle("fast", "linear");
        });
    });
}

function playLed(selected) {
    let col = $('#' + selected + 'hexVal').val();
    let dur = $("#" + selected + "LedDur").val();
    let int = $("#" + selected + "LedInt").val();
    if (!col || !dur || !int) {
        console.log(selected + " LED event is not defined");
    } else {
        flashLighting(col, dur, int);
    }
}

function delLED(selected) {
    //show conform message box
    let params = {
        message_title: "Delete LED flashing event",
        message_body: "Are you sure you want to delete " + selected + " LED flashing event?",
        message_box_icon: overwolf.windows.enums.MessagePromptIcon.QuestionMark,
    };
    overwolf.windows.displayMessageBox(params, function(res) {
        if (res.confirmed == true) {
            $("#" + selected + "-led-event").remove();
            let select = $("#RGB-event-select");
            let option = $('<option></option>');
            option.attr('value', selected);
            option.text(events[selected]);
            select.append(option);
            delete leds[selected];
            saveLED();
        }
    });
}

function saveLED() {
    let json = JSON.stringify(leds);
    localStorage.leds = json;
}

function flashLighting(color, duration, interval) {
    let rgbColor = convertColor(color);
    overwolf.logitech.led.flashLighting(rgbColor.rChannel, rgbColor.gChannel, rgbColor.bChannel, duration, interval, function(res) {});
}

function convertColor(color) {
    /* Check for # infront of the value, if it's there, strip it */

    if (color.substring(0, 1) == '#') {
        color = color.substring(1);
    }

    let rgbColor = {};

    /* Grab each pair (channel) of hex values and parse them to ints using hexadecimal decoding */
    rgbColor.rChannel = Math.round((parseInt(color.substring(0, 2), 16) / 255) * 100);
    rgbColor.gChannel = Math.round((parseInt(color.substring(2, 4), 16) / 255) * 100);
    rgbColor.bChannel = Math.round((parseInt(color.substring(4), 16) / 255) * 100);

    return rgbColor;
}

function getLEDSyncDev() {
    overwolf.logitech.getDevices(function(res) {
        logDev = res.devices;
        let isRGB = false;
        let rgbDev = "";
        logDev.forEach(element => {
            if (element.lightingId == '2') {
                isRGB = true;
                rgbDev += ` ${element.name} ${element.typeName}`;
            }
        });
        if (isRGB) {
            $(".logitecDevLst").append(`
        <p>Here you can set Logitech devices to flash on event, for example you can set flash effects that will play each time you get a kill or get a win.<br><br></p>
        <p>Supported devices:${rgbDev}</p>
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

            overwolf.logitech.led.init(function(res) {});

            overwolf.logitech.led.setTargetDevice([overwolf.logitech.led.enums.LogitechDeviceLightingType.RGB], function(res) {});

            overwolf.logitech.led.saveCurrentLighting(function(res) {});
        } else {
            $(".logitecDevLst").append(`
        <h3>No Logitech RGB devices found</h3>
      `);
        }
    });
}

function addPlayer(name) {
    if (name.length >= 3) {
        $("#playerList").append(`
      <option value="` + name + `">` + name + `</option>
    `);
        playersAlert.push(name);
        $("#playerTxt").val('');
        let json = JSON.stringify(playersAlert);
        localStorage.playersAlert = json;
        console.log(name + " has been added to alert list");
    }
}

function removePlayer() {
    $.each($("#playerList option:selected"), function() {
        $("#playerList option[value='" + $(this).val() + "']").remove();
        for (let i = 0; i < playersAlert.length; i++) {
            if (playersAlert[i] === $(this).val()) {
                playersAlert.splice(i, 1);
                i--;
            }
        }
        console.log($(this).val() + " has been added to alert list");
        let json = JSON.stringify(playersAlert);
        localStorage.playersAlert = json;
    });
}

function chkPlyrAlrt(roster) {
    let names = Object.getOwnPropertyNames(roster);
    let playerRos = JSON.parse(roster[names[0]]);
    if ("player" in playerRos) {
        let playerName = playerRos["player"];
        let lowercaseName = playerName.toLowerCase();
        playersAlert.forEach(function(element) {
            if (lowercaseName.includes(element.toLowerCase())) {
                if (!playerRos["out"]) {
                    console.log(playerName + " is in match");
                    $("#playerInMatch").append(`
            <option value="` + playerName + `In">` + playerName + " is in match" + `</option>
          `);
                    $("#playerInMatch").val(playerName + 'In');
                } else {
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
    let i, tabcontent, tablinks;
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