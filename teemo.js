import { CountUp } from './js/countUp.min.js';

var totalDisplayMode = true;

let twitchUsername = window.localStorage.getItem('twitchUsername');
let twitchToken = window.localStorage.getItem('twitchToken');

function promptForBoth() {
  twitchUsername = prompt("Enter your Twitch username");
  // https://twitchapps.com/tmi/
  twitchToken = prompt("Enter your Twitch OAuth token for chat. Visit https://twitchapps.com/tmi/ to generate one.");

  window.localStorage.setItem('twitchUsername', twitchUsername);
  window.localStorage.setItem('twitchToken', twitchToken);
}

if (twitchUsername == null || twitchToken == null) {
  promptForBoth();
}

var tmiclient;

while (true) {
  tmiclient = new tmi.Client({
    options: { debug: true, messageLogLevel: "info" },
    connection: {
      reconnect: true,
      secure: true,
    },
    identity: {
      username: twitchUsername,
      password: twitchToken,
    },
    channels: ['saltyteemo']
  });

  let failure = false
  try {
    await tmiclient.connect()
  } catch (e) {
    console.log("Failed to connect:", e);
    failure = true;
  }
  // tmiclient.connect().catch((e) => {
  // })

  if (failure === false) {
    console.log("Breaking for success")
    break;
  }

  promptForBoth();
}

var bluebets = [];
var redbets = [];

let redre = /!red (\d+)/;
let bluere = /!blue (\d+)/;

// descending
function sorterFunc(a, b) {
  return b - a
}

export function onIRCMessage(channel, tags, message, self) {
  if (self) return; // shouldn't happen, we won't be sending

  let redmatch = redre.exec(message);
  let bluematch = bluere.exec(message);

  if (redmatch !== null) {
    redbets.push(parseInt(redmatch[1]));
    redbets.sort(sorterFunc);
    updateBetInfo("red");
  } else if (bluematch !== null) {
    bluebets.push(parseInt(bluematch[1]));
    bluebets.sort(sorterFunc);
    updateBetInfo("blue");
  }
}

// TODO: remove or comment, this is for local testing without requiring
// actual twitch messages to be sent
//
// Use with browser console `document.test("!blue 100")`
//
// Attaching to document makes this accessible. I'm sure there is a better way.
document.test = (message) => onIRCMessage(null, null, message, false);

tmiclient.on('message', onIRCMessage);

function makeIndividualBetsDiv(bets) {
  let div = document.createElement("div")

  bets.map(amount => {
    let child = document.createElement("div")
    child.innerText = String(amount)
    div.appendChild(child)
  })

  return div
}

function updateBetInfo(team, bets) {
  var bets;
  if (team === "blue") {
    bets = bluebets;
  } else if (team === "red") {
    bets = redbets;
  } else {
    console.log("Unknown team:", team);
    return;
  }
  var divName = team + "-bet-total";
  var totalDiv = document.getElementById(divName);
  var individualDivName = team + "-individual-bets";
  var individualDiv = document.getElementById(individualDivName);
  var breakdownCounterName = team + "-breakdown-counter";
  var breakdownCounter = document.getElementById(breakdownCounterName);

  individualDiv.innerHTML = '';
  individualDiv.appendChild(makeIndividualBetsDiv(bets));

  const sumreducer = (prev, current) => prev + current;
  let betSum = bets.length === 0 ? 0 : bets.reduce(sumreducer)


  // if-else checks whether central counter is in total display mode, or no. of bets per side display mode
  if (totalDisplayMode) {
    let total = betSum;
    var current;

    // team total div counter
    if (totalDiv.innerHTML == '') {
      current = 0;
    }
    else {
      // replace due to countUp conversion of int to string with commas
      current = parseInt(totalDiv.innerHTML.replace(/,/g, ''));
    }

    totalDiv.dataset.total = total.toString();

    const options = {
      startVal: current,
    };

    let totalCounter = new CountUp(divName, total, options);
    totalCounter.start();
  }
  else {
    let total = individualDiv.children[0].children.length;

    var current;

    // team total div counter
    current = parseInt(totalDiv.innerHTML.replace(/,/g, ''));

    totalDiv.dataset.total = total.toString();

    const options = {
      startVal: current,
    };

    let totalCounter = new CountUp(divName, total, options);
    totalCounter.start();


  }
  // individual div parent counter

  var breakdownCurrent = parseInt(breakdownCounter.innerHTML.replace(/,/g, ''));

  const individualOptions = {
    startVal: breakdownCurrent,
  };

  let individualDivCounter = new CountUp(breakdownCounterName, betSum, individualOptions);
  individualDivCounter.start();

}

document.getElementById("show-breakdown-button").addEventListener('click', function() {
  var redIndividualBets = document.getElementById("red-individual-bets");
  var blueIndividualBets = document.getElementById("blue-individual-bets");
  var redBetsTotal = document.getElementById("red-bet-total");
  var blueBetsTotal = document.getElementById("blue-bet-total");
  var redBreakdownCounter = document.getElementById("red-breakdown-counter");
  var blueBreakdownCounter = document.getElementById("blue-breakdown-counter");

  // determines if breakdowns are visible or not
  if (totalDisplayMode === true) {
    totalDisplayMode = false;

    var redTotal = redBetsTotal.dataset.total;
    var blueTotal = blueBetsTotal.dataset.total;

    redBreakdownCounter.style.display = "block";
    blueBreakdownCounter.style.display = "block";


    const redOptions = {
      startVal: redTotal,
    };

    const blueOptions = {
      startVal: blueTotal,
    };

    var noRedBets = redIndividualBets.children.length === 0 ? 0 : redIndividualBets.children[0].children.length;
    var noBlueBets = blueIndividualBets.children.length === 0 ? 0 : blueIndividualBets.children[0].children.length;

    let redCounter = new CountUp(redBetsTotal, noRedBets, redOptions);
    let blueCounter = new CountUp(blueBetsTotal, noBlueBets, blueOptions);
    let redBreakdown = new CountUp(redBreakdownCounter, redTotal);
    let blueBreakdown = new CountUp(blueBreakdownCounter, blueTotal);


    redCounter.start();
    blueCounter.start();
    redBreakdown.start();
    blueBreakdown.start();



    redIndividualBets.style.display = "inline-block";
    blueIndividualBets.style.display = "inline-block";


    document.getElementById("red-bet-label").textContent = "Bets for Red";
    document.getElementById("blue-bet-label").textContent = "Bets for Blue";
    this.textContent = "Hide Bet Breakdown";
  }
  else {
    totalDisplayMode = true;

    updateBetInfo("red");
    updateBetInfo("blue");

    redBreakdownCounter.style.display = "none";
    blueBreakdownCounter.style.display = "none";

    redIndividualBets.style.display = "none";
    blueIndividualBets.style.display = "none";

    document.getElementById("red-bet-label").textContent = "Mushrooms";
    document.getElementById("blue-bet-label").textContent = "Mushrooms";
    this.textContent = "Show Bet Breakdown";
  }
});


document.getElementById("reset-bets-button").addEventListener('click', function() {
  bluebets = [];
  redbets = [];
  updateBetInfo("red");
  updateBetInfo("blue");
});
