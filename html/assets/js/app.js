var startButton = document.getElementById("start-button");
var stopButton = document.getElementById("stop-button");
var muteMyself = document.getElementById("mute-myself");
var btnSessionCode = document.getElementById("btnSessionCode");
var txtSessionId = document.getElementById("txtSessionId");
var dashboard = document.getElementById("dashboard");
var urlParams = new URLSearchParams(window.location.search);
var sessionUrl = "https://40hps3f0i8.execute-api.ap-southeast-1.amazonaws.com/dev/device/session?id=";
var muted = false;
var timer;

function generateString() {
    return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
    );
}

var isMeetingHost = false;
var meetingId = urlParams.get("meetingId");
var clientId = generateString();

const logger = new ChimeSDK.ConsoleLogger(
    "ChimeMeetingLogs",
    ChimeSDK.LogLevel.INFO
);
const deviceController = new ChimeSDK.DefaultDeviceController(logger);

let requestPath = `join?clientId=${clientId}`;
if (!meetingId) {
    isMeetingHost = true;
} else {
    requestPath += `&meetingId=${meetingId}`;
}

if (!isMeetingHost) {
    startButton.innerText = "Join!";
} else {
    startButton.innerText = "Start!";
    stopButton.style.display = "block";
}

startButton.style.display = "block";

async function start() {
    if (window.meetingSession) {
        return
    }
    try {
        var response = await fetch(requestPath, {
            method: "POST",
            headers: new Headers(),
        });

        const data = await response.json();
        meetingId = data.Info.Meeting.Meeting.MeetingId;
        if (isMeetingHost) {
            document.getElementById("meeting-link").innerText = window.location.href + "?meetingId=" + meetingId;
        }
        const configuration = new ChimeSDK.MeetingSessionConfiguration(
            data.Info.Meeting.Meeting,
            data.Info.Attendee.Attendee
        );
        window.meetingSession = new ChimeSDK.DefaultMeetingSession(
            configuration,
            logger,
            deviceController
        );

        const audioInputs = await meetingSession.audioVideo.listAudioInputDevices();
        const videoInputs = await meetingSession.audioVideo.listVideoInputDevices();

        await meetingSession.audioVideo.chooseAudioInputDevice(
            audioInputs[0].deviceId
        );
        await meetingSession.audioVideo.chooseVideoInputDevice(
            videoInputs[0].deviceId
        );

        const observer = {
            // videoTileDidUpdate is called whenever a new tile is created or tileState changes.
            videoTileDidUpdate: (tileState) => {
                console.log("VIDEO TILE DID UPDATE");
                console.log(tileState);
                // Ignore a tile without attendee ID and other attendee's tile.
                if (!tileState.boundAttendeeId) {
                    return;
                }
                updateTiles(meetingSession);
            },
        };

        meetingSession.audioVideo.addObserver(observer);

        meetingSession.audioVideo.startLocalVideoTile();

        const audioOutputElement = document.getElementById("meeting-audio");
        meetingSession.audioVideo.bindAudioElement(audioOutputElement);
        meetingSession.audioVideo.start();
    } catch (err) {
        // handle error
    }
}

function updateTiles(meetingSession) {
    const tiles = meetingSession.audioVideo.getAllVideoTiles();
    console.log("tiles", tiles);
    tiles.forEach(tile => {
        let tileId = tile.tileState.tileId
        var videoElement = document.getElementById("video-" + tileId);

        if (!videoElement) {
            videoElement = document.createElement("video");
            videoElement.id = "video-" + tileId;
            document.getElementById("video-list").append(videoElement);
            meetingSession.audioVideo.bindVideoElement(
                tileId,
                videoElement
            );
        }
    })
}

async function stop() {
    clearInterval(timer);
    const response = await fetch("end", {
        body: {
            "meetingId": meetingId,
        },
        method: "POST",
        headers: new Headers(),
    });

    const data = await response.json();
    console.log(data);
}

function toggleMute() {
    if (!muted) {
        window.meetingSession.audioVideo.realtimeMuteLocalAudio();
        muteMyself.innerText = "Unmute Myself";
    } else {
        window.meetingSession.audioVideo.realtimeUnmuteLocalAudio();
        muteMyself.innerText = "Mute Myself";
    }
}

async function getSessionDetails() {
    timer = setInterval(
        async() => {
            var url = sessionUrl + txtSessionId.value;
            console.log(url);
            jQuery.getJSON(url, (data) => {
                console.log(data.members);
                data.members.forEach((member) => {
                    if (document.getElementById("member-" + member.id) === null) {
                        var data = '<div id="member-' + member.id + '" class="col mb-4"><div class="card"><div class="card-body"><h5 class="card-title">';
                        data = data + member.name + '</h5><p class="card-text" id="hr-' + member.id + '">' + member.last_hr + ' BPM</p></div></div></div>';
                        $("#dashboard").append(data);
                    } else {
                        document.getElementById('hr-' + member.id).innerText = member.last_hr + ' BPM';
                    }
                });
            });
        }, 2000
    );
}

window.addEventListener("DOMContentLoaded", () => {
    startButton.addEventListener("click", start);

    if (isMeetingHost) {
        stopButton.addEventListener("click", stop);
    }

    muteMyself.addEventListener("click", toggleMute);
    btnSessionCode.addEventListener("click", getSessionDetails);
});

$.urlParam = function(name){
	var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
	return results[1] || 0;
}

$(document).ready(function() { 
    var sessionId = $.urlParam('sessionId');
    if (sessionId !== undefined && sessionId !== null) {
        txtSessionId.value = sessionId;
        getSessionDetails();
    }
 });
