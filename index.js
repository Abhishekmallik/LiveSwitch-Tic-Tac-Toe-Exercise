/*
 * LiveSwitch Tic-Tac-Toe Exercise
 *
 * Below is a basic, single-player Tic-Tac-Toe implementation. It also
 * includes code that registers to a LiveSwitch server and shows how to send
 * messages to all clients.
 *
 * Task: Create a fork of this project that turns this single-player
 *       implementation into a remote two-player implementation using the
 *       LiveSwitch Client SDK.
 *
 * Some of the things to consider:
 * 1. How to determine a start player.
 * 2. What messages to pass back and forth to maintain a consistent game
 *    state.
 * 3. How to handle scenarios where more then 2 clients join the game.
 *
 * Please feel free to make any other changes that you think will improve
 * this implementation and/or leave comments on potential issues with the
 * current implementation. All changes should be documented with code
 * comments.
 *
 * Notes:
 * 1. A LiveSwitch channel is the equivalent of a "room". All clients in the
 *    same channel will be able to communicate with one another. Channels are
 *    uniquely identified by their channel ID which is "tic-tac-toe" for this
 *    exercise.
 * 2. In the initial implementation, a game can only be started if a second
 *    client joins. This can be done by opening the CodePen project in a
 *    second tab.
 * 3. LiveSwitch Client SDK log messages are being sent to the browser
 *    console. Please feel free to log any other messages you thing would be
 *    useful.
 * 4. The LiveSwitch SDK documentation can be found at
 *    https://developer.liveswitch.io/liveswitch-server/index.html and the API
 *    documentation can be found at
 *    https://developer.liveswitch.io/reference/ts/api/modules/fm.liveswitch.html
 *
 */

let liveswitchClient;
let liveswitchChannel;

const gatewayURL = "https://v1.liveswitch.fm:8443/sync";
const applicationId = "my-app-id";
const sharedSecret = "--replaceThisWithYourOwnSharedSecret--";
const channelId = "tic-tac-toe"; // Please change channelId to something unique

// Tic-tac-toe code derived from https://dev.to/bornasepic/pure-and-simple-tic-tac-toe-with-javascript-4pgn

let gameActive = false;
let currentPlayer = "X";
let gameState = ["", "", "", "", "", "", "", "", ""];

const winningConditions = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

const startButton = document.querySelector('.start');
const statusDisplay = document.querySelector('.status');
const winningMessage = () => `Player ${currentPlayer} has won!`;
const drawMessage = () => `Game ended in a draw!`;

let connectToLiveSwitchServer = function() {
  let promise = new fm.liveswitch.Promise();

  liveswitchClient = new fm.liveswitch.Client(gatewayURL, applicationId);
  let channelClaims = [new fm.liveswitch.ChannelClaim(channelId)];
  let token = fm.liveswitch.Token.generateClientRegisterToken(applicationId, liveswitchClient.getUserId(), liveswitchClient.getDeviceId(), liveswitchClient.getId(), null, channelClaims, sharedSecret);

  liveswitchClient.register(token).then((channels) => {
    liveswitchChannel = channels[0];
    promise.resolve(null);
  }).fail((ex) => {
    promise.reject(ex);
  });

  return promise;
}

let handleStartClick = function() {
  gameActive = true;
  startButton.style.display = "none";
  liveswitchChannel.sendMessage("Started game.");
}

let handleCellClick = function(clickedCellEvent) {
  const clickedCell = clickedCellEvent.target;
  const clickedCellIndex = parseInt(
    clickedCell.getAttribute('data-cell-index')
  );
  if (!gameActive || gameState[clickedCellIndex] !== "") {
    return;
  }
  handleCellPlayed(clickedCell, clickedCellIndex);
  handleResultValidation();
}

let handleCellPlayed = function(clickedCell, clickedCellIndex) {
  gameState[clickedCellIndex] = currentPlayer;
  clickedCell.innerHTML = currentPlayer;
  liveswitchChannel.sendMessage(`${currentPlayer} played in cell ${clickedCellIndex}`);
}

let handleResultValidation = function() {
  let roundWon = false;
  for (let i = 0; i <= 7; i++) {
    const winCondition = winningConditions[i];
    let a = gameState[winCondition[0]];
    let b = gameState[winCondition[1]];
    let c = gameState[winCondition[2]];
    if (a === '' || b === '' || c === '') {
      continue;
    }
    if (a === b && b === c) {
      roundWon = true;
      break
    }
  }
  if (roundWon) {
    var message = winningMessage();
    statusDisplay.innerHTML = message
    gameActive = false;
    liveswitchChannel.sendMessage(message);
    return;
  }

  let roundDraw = !gameState.includes("");
  if (roundDraw) {
    var message = drawMessage();
    statusDisplay.innerHTML = message;
    gameActive = false;
    liveswitchChannel.sendMessage(message);
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
}

fm.liveswitch.Log.registerProvider(new fm.liveswitch.ConsoleLogProvider(fm.liveswitch.LogLevel.Debug));

startButton.addEventListener('click', handleStartClick);
document.querySelectorAll('.cell').forEach(cell => cell.addEventListener('click', handleCellClick));

connectToLiveSwitchServer().then(() => {
  fm.liveswitch.Log.debug("Connected to server");

  liveswitchChannel.addOnRemoteClientJoin((remoteClientInfo) => {
    startButton.disabled = false;
  });

  liveswitchChannel.addOnRemoteClientLeave((remoteClientInfo) => {
    if (liveswitchChannel.getRemoteClientInfos().length == 0) {
      startButton.disabled = true;
    }
  });

  liveswitchChannel.addOnMessage(function (sender, message) {
    if (sender.getId() == liveswitchClient.getId()) {
      // ignore self
      return;
    }
    fm.liveswitch.Log.debug(`Message received: ${message} from: ${sender.getId()}`);
  });

  if (liveswitchChannel.getRemoteClientInfos().length > 0) {
    startButton.disabled = false;
  }
})
.fail((ex) => {
  fm.liveswitch.Log.debug("Failed to connect to server");
});
