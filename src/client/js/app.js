var io = require('socket.io-client');
var render = require('./render');
var ChatClient = require('./chat-client');
var Canvas = require('./canvas');
var global = require('./global');
var sat = require('sat');

var playerNameInput = document.getElementById('playerNameInput');
var socket;

var debug = function (args) {
    if (console && console.log) {
        console.log(args);
    }
};

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
    global.mobile = true;
}

function startGame(type) {
    global.playerName = playerNameInput.value.replace(/(<([^>]+)>)/ig, '').substring(0, 25);
    global.playerType = type;

    global.screen.width = window.innerWidth;
    global.screen.height = window.innerHeight;

    document.getElementById('startMenuWrapper').style.maxHeight = '0px';
    document.getElementById('gameAreaWrapper').style.opacity = 1;
    if (!socket) {
        socket = io({ query: "type=" + type });
        setupSocket(socket);
    }
    if (!global.animLoopHandle)
        animloop();
    socket.emit('respawn');
    window.chat.socket = socket;
    window.chat.registerFunctions();
    window.canvas.socket = socket;
    global.socket = socket;
    player.zoom = 1;
}

// Checks if the nick chosen contains valid alphanumeric characters (and underscores).
function validNick() {
    var regex = /^\w*$/;
    debug('Regex Test', regex.exec(playerNameInput.value));
    return regex.exec(playerNameInput.value) !== null;
}

window.onload = function () {

    var btn = document.getElementById('startButton'),
        btnS = document.getElementById('spectateButton'),
        nickErrorText = document.querySelector('#startMenu .input-error');

    btnS.onclick = function () {
        startGame('spectator');
    };

    btn.onclick = function () {

        // Checks if the nick is valid.
        if (validNick()) {
            nickErrorText.style.opacity = 0;
            startGame('player');
        } else {
            nickErrorText.style.opacity = 1;
        }
    };

    var settingsMenu = document.getElementById('settingsButton');
    var settings = document.getElementById('settings');

    settingsMenu.onclick = function () {
        if (settings.style.maxHeight == '300px') {
            settings.style.maxHeight = '0px';
        } else {
            settings.style.maxHeight = '300px';
        }
    };

    playerNameInput.addEventListener('keypress', function (e) {
        var key = e.which || e.keyCode;

        if (key === global.KEY_ENTER) {
            if (validNick()) {
                nickErrorText.style.opacity = 0;
                startGame('player');
            } else {
                nickErrorText.style.opacity = 1;
            }
        }
    });
};

// TODO: Break out into GameControls.

var playerConfig = {
    border: 6,
    textColor: '#FFFFFF',
    textBorder: '#000000',
    textBorderSize: 3,
    defaultSize: 30
};

var player = {
    id: -1,
    x: global.screen.width / 2,
    y: global.screen.height / 2,
    screenWidth: global.screen.width,
    screenHeight: global.screen.height,
    target: { x: global.screen.width / 2, y: global.screen.height / 2 }
};
global.player = player;

var foods = [];
var viruses = [];
var fireFood = [];
var users = [];
var leaderboard = [];
var target = { x: player.x, y: player.y };
global.target = target;

window.canvas = new Canvas();
window.chat = new ChatClient();

var visibleBorderSetting = document.getElementById('visBord');
visibleBorderSetting.onchange = settings.toggleBorder;

var showMassSetting = document.getElementById('showMass');
showMassSetting.onchange = settings.toggleMass;

var continuitySetting = document.getElementById('continuity');
continuitySetting.onchange = settings.toggleContinuity;

var roundFoodSetting = document.getElementById('roundFood');
roundFoodSetting.onchange = settings.toggleRoundFood;

var c = window.canvas.cv;
var graph = c.getContext('2d');

const feedTouchStart = () => {
    socket.emit('1');
    window.canvas.reenviar = false;
};

const splitTouchStart = () => {
    socket.emit('2');
    window.canvas.reenviar = false;
};

const move = $("#move");
const joy = $("#joystick");

let isMoveTouched = false;
const moveTouchStart = () => {
    isMoveTouched = true;
};

const moveTouchEnd = () => {
    isMoveTouched = false;

    joy.css("left", '');
    joy.css("bottom", '');
};

const moveTouchMove = (touch) => {
    if (isMoveTouched) {
        let x = touch.clientX;
        let y = $(window).height() - touch.clientY;

        const centerX = x - move.width() / 2 + 10;
        const centerY = y - move.height() / 2 + 10;


        const maxD = move.width() / 2 - joy.width() / 2;
        const d = Math.min(
            maxD,
            Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2))
        );
        const direction = new sat.Vector(centerX, centerY).normalize();

        const joyX = (move.width() / 2) + (direction.x * d) - (joy.width() / 2);
        const joyY = (move.width() / 2) + (direction.y * d) - (joy.width() / 2);

        const maxSpeed = 80;

        window.canvas.target.x = direction.x * (d / maxD * maxSpeed);
        window.canvas.target.y = -1 * direction.y * (d / maxD * maxSpeed);

        joy.css("left", joyX + 'px');
        joy.css("bottom", joyY + 'px');
    }
};

document.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
        if (touch.target.id === 'move' || touch.target.id === 'joystick') {
            moveTouchEnd();
        }
    }
});
document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (const touch of e.touches) {
        if (touch.target.id === 'move' || touch.target.id === 'joystick') {
            moveTouchStart();
        } else if (touch.target.id === 'split') {
            splitTouchStart();
        } else if (touch.target.id === 'feed') {
            feedTouchStart();
        }
    }
});

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const touch of e.touches) {
        if (touch.target.id === 'move' || touch.target.id === 'joystick') {
            moveTouchMove(touch);
        }
    }
});

function handleDisconnect() {
    socket.close();
    if (!global.kicked) { // We have a more specific error message 
        render.drawErrorMessage('Disconnected!', graph, global.screen);
    }
}

// socket stuff.
    function setupSocket(socket) {
        // Handle ping.
            socket.on('pongcheck', function () {
                var latency = Date.now() - global.startPingTime;
                debug('Latency: ' + latency + 'ms');
                window.chat.addSystemLine('Ping: ' + latency + 'ms');
            });

        // Handle error.
            socket.on('connect_error', handleDisconnect);
        socket.on('disconnect', handleDisconnect);

        // Handle connection.
            socket.on('welcome', function (playerSettings, gameSizes) {
                player = playerSettings;
                player.name = global.playerName;
                player.screenWidth = global.screen.width;
                player.screenHeight = global.screen.height;
                player.target = window.canvas.target;
                player.isMobile = global.mobile;
                global.player = player;
                window.chat.player = player;
                socket.emit('gotit', player);
                global.gameStart = true;
                window.chat.addSystemLine('Connected to the game!');
                window.chat.addSystemLine('Type <b>-help</b> for a list of commands.');
                if (global.mobile) {
                    document.getElementById('gameAreaWrapper').removeChild(document.getElementById('chatbox'));
                }
                c.focus();
                global.game.width = gameSizes.width;
                global.game.height = gameSizes.height;
                resize();
            });

        socket.on('playerDied', (data) => {
            const player = isUnnamedCell(data.playerEatenName) ? 'An unnamed cell' : data.playerEatenName;
            //const killer = isUnnamedCell(data.playerWhoAtePlayerName) ? 'An unnamed cell' : data.playerWhoAtePlayerName;

            //window.chat.addSystemLine('{GAME} - <b>' + (player) + '</b> was eaten by <b>' + (killer) + '</b>');
            window.chat.addSystemLine('{GAME} - <b>' + (player) + '</b> was eaten');
        });

        socket.on('playerDisconnect', (data) => {
            window.chat.addSystemLine('{GAME} - <b>' + (isUnnamedCell(data.name) ? 'An unnamed cell' : data.name) + '</b> disconnected.');
        });

        socket.on('playerJoin', (data) => {
            window.chat.addSystemLine('{GAME} - <b>' + (isUnnamedCell(data.name) ? 'An unnamed cell' : data.name) + '</b> joined.');
        });

        socket.on('leaderboard', (data) => {
            leaderboard = data.leaderboard;
            var status = '<span class="title">Leaderboard</span>';
            for (var i = 0; i < leaderboard.length; i++) {
                status += '<br />';
                if (leaderboard[i].id == player.id) {
                    if (leaderboard[i].name.length !== 0)
                        status += '<span class="me">' + (i + 1) + '. ' + leaderboard[i].name + "</span>";
                    else
                        status += '<span class="me">' + (i + 1) + ". An unnamed cell</span>";
                } else {
                    if (leaderboard[i].name.length !== 0)
                        status += (i + 1) + '. ' + leaderboard[i].name;
                    else
                        status += (i + 1) + '. An unnamed cell';
                }
            }
            //status += '<br />Players: ' + data.players;
            document.getElementById('status').innerHTML = status;
        });

        socket.on('serverMSG', function (data) {
            window.chat.addSystemLine(data);
        });

        // Chat.
            socket.on('serverSendPlayerChat', function (data) {
                window.chat.addChatLine(data.sender, data.message, false);
            });

        // Handle movement.
            socket.on('serverTellPlayerMove', function (playerData, userData, foodsList, massList, virusList) {
                if (global.playerType == 'player') {
                    player.x = playerData.x;
                    player.y = playerData.y;
                    player.hue = playerData.hue;
                    player.massTotal = playerData.massTotal;
                    player.cells = playerData.cells;
                    player.zoom = playerData.zoom || 1;
                } else if (global.playerType === 'spectator') {
                    player.zoom = 1;
                }
                users = userData;
                foods = foodsList;
                viruses = virusList;
                fireFood = massList;
            });

        // Death.
            socket.on('RIP', function () {
                global.gameStart = false;
                render.drawErrorMessage('You died!', graph, global.screen);
                window.setTimeout(() => {
                    document.getElementById('gameAreaWrapper').style.opacity = 0;
                    document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
                    if (global.animLoopHandle) {
                        window.cancelAnimationFrame(global.animLoopHandle);
                        global.animLoopHandle = undefined;
                    }
                }, 2500);
            });

        socket.on('kick', function (reason) {
            global.gameStart = false;
            global.kicked = true;
            if (reason !== '') {
                render.drawErrorMessage('You were kicked for: ' + reason, graph, global.screen);
            }
            else {
                render.drawErrorMessage('You were kicked!', graph, global.screen);
            }
            socket.close();
        });
    }

const isUnnamedCell = (name) => name.length < 1;

const getPosition = (entity, player, screen, zoom) => {
    return {
        x: screen.width / 2 + (entity.x - player.x) / zoom,
        y: screen.height / 2 + (entity.y - player.y) / zoom
    };
};

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

window.cancelAnimFrame = (function (handle) {
    return window.cancelAnimationFrame ||
        window.mozCancelAnimationFrame;
})();

function animloop() {
    global.animLoopHandle = window.requestAnimFrame(animloop);
    gameLoop();
}

function gameLoop() {
    if (global.gameStart) {
        graph.fillStyle = global.backgroundColor;
        graph.fillRect(0, 0, global.screen.width * player.zoom, global.screen.height * player.zoom);

        render.drawGrid(global, player, global.screen, graph, player.zoom);
        foods.forEach(food => {
            let position = getPosition(food, player, global.screen, player.zoom);
            render.drawFood(position, food, graph, player.zoom);
        });
        fireFood.forEach(fireFood => {
            let position = getPosition(fireFood, player, global.screen, player.zoom);
            render.drawFireFood(position, fireFood, playerConfig, graph, player.zoom);
        });

        let borders = { // Position of the borders on the screen
            left: global.screen.width / 2 - player.x,
            right: global.screen.width / 2 + global.game.width - player.x,
            top: global.screen.height / 2 - player.y,
            bottom: global.screen.height / 2 + global.game.height - player.y
        };
        if (global.borderDraw) {
            render.drawBorder(borders, graph);
        }

        var cellsToDraw = [];
        for (var i = 0; i < users.length; i++) {
            let color = 'hsl(' + users[i].hue + ', 100%, 50%)';
            let borderColor = 'hsl(' + users[i].hue + ', 100%, 45%)';
            for (var j = 0; j < users[i].cells.length; j++) {
                const cellPosition = getPosition(users[i].cells[j], player, global.screen, player.zoom)
                cellsToDraw.push({
                    color: color,
                    borderColor: borderColor,
                    mass: users[i].cells[j].mass,
                    name: users[i].name,
                    radius: users[i].cells[j].radius,
                    x: cellPosition.x,
                    y: cellPosition.y
                });
            }
        }

        const sorted = [
            ...cellsToDraw.map(e => ({ type: 'cell', val: e })),
            ...viruses.map(e => ({ type: 'virus', val: e }))
        ].sort((a, b) => a.val.radius - b.val.radius);

        for (const e of sorted) {
            switch (e.type) {
                case 'cell':
                    render.drawCell(e.val, playerConfig, global.toggleMassState, borders, graph, player.zoom);
                    break;
                case 'virus':
                    const pos = getPosition(e.val, player, global.screen, player.zoom);
                    render.drawVirus(pos, e.val, graph, player.zoom);
                    break;
            }
        }

        socket.emit('0', window.canvas.target); // playerSendTarget "Heartbeat".
    }
}

window.addEventListener('resize', resize);

function resize() {
    if (!socket) return;

    player.screenWidth = c.width = global.screen.width = global.playerType == 'player' ? window.innerWidth : global.game.width;
    player.screenHeight = c.height = global.screen.height = global.playerType == 'player' ? window.innerHeight : global.game.height;

    if (global.playerType == 'spectator') {
        player.x = global.game.width / 2;
        player.y = global.game.height / 2;
    }

    socket.emit('windowResized', { screenWidth: global.screen.width, screenHeight: global.screen.height });
}
