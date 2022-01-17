import { CountUp } from './js/countUp.min.js';

var totalDisplayMode = true;

let alertaudio = new Audio('elegantdoor.mp3');
let bettingactive = false;

var tmiclient;

tmiclient = new tmi.Client({
  options: { debug: true, messageLogLevel: "info" },
  connection: {
    reconnect: true,
    secure: true,
  },
  skipMembership: true,
  channels: ['saltyteemo']
});

tmiclient.connect().catch((e) => {
  console.log("Failed to connect:", e);
})


var bluebets = [];
var redbets = [];

let redre = /!red (\d+)/;
let bluere = /!blue (\d+)/;
let atre = /@(\S+)/;

// descending
function sorterFunc(a, b) {
  return b - a
}

// Username -> {"team": "blue", amount: 1000}
var attemptedbets = {}

export function onIRCMessage(channel, tags, message, self) {
  if (self) return; // shouldn't happen, we won't be sending

  // The tags include a lowercased username but the message might contain an
  // @Username that has mixed case. Force lowercasing to avoid problems.
  let username = tags["username"].toLowerCase();
  message = message.toLowerCase();

  // Help messages from moobot sometimes include !blue or !red commands as
  // examples
  if (username === "moobot") return;

  if (username === "xxsaltbotxx") {
    // Eventually this branch can be used for confirming bets

    if (message.includes("accepted")) {
      let atmatch = atre.exec(message);
      if (atmatch === null) {
        return;
      }

      let acceptedUsername = atmatch[1];

      if (!(acceptedUsername in attemptedbets)) {
        return;
      }


      // When we get the first bet of a betting round, alert the user, reset the
      // bet data, and start a delayed function that will mark the betting round
      // as over.
      if (!bettingactive) {
        bettingactive = true;
        bluebets = [];
        redbets = [];
        updateBetInfo("blue");
        updateBetInfo("red");

        try {
          alertaudio.play();
        } catch (e) {
          console.log("Failed to play alert: ", e);
        }

        setTimeout(() => {
          console.log("betting is over, flipping flag");
          bettingactive = false;
        }, 1000 * 60 * 4);
      }


      let attempted = attemptedbets[acceptedUsername];
      if (attempted["team"] === "blue") {
        bluebets.push(attempted["amount"]);
        bluebets.sort(sorterFunc);
        updateBetInfo("blue");
      } else if (attempted["team"] === "red") {
        redbets.push(attempted["amount"]);
        redbets.sort(sorterFunc);
        updateBetInfo("red");
      }

    }

    return;
  }
  let redmatch = redre.exec(message);
  let bluematch = bluere.exec(message);

  if (redmatch !== null) {
    attemptedbets[username] = {
      "team": "red",
      "amount": parseInt(redmatch[1]),
    };
  } else if (bluematch !== null) {
    attemptedbets[username] = {
      "team": "blue",
      "amount": parseInt(bluematch[1]),
    };
  }
}

// TODO: remove or comment, this is for local testing without requiring
// actual twitch messages to be sent
//
// Use with browser console `document.test("!blue 100")`
//
// Attaching to document makes this accessible. I'm sure there is a better way.
document.test = (message) => {
  onIRCMessage(null, {"username": "tester"}, message, false);
  onIRCMessage(null, {"username": "xxsaltbotxx"}, "@tester - ... accepted ...", false);
}

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


// Test data from real chat log 2022-01-14
//
// If processed improperly (including unaccepted bets):
// Blue: 43977
// Red: 22148
//
// If processed correctly:
// Blue: 38977
// Red: 7148
const testmessages = [
"erbtastic: !blue 200",
"xxsaltbotxx: @erbtastic - Bet accepted for 200.",
"krispkratos: !blue 8000",
"xxsaltbotxx: @krispkratos - Bet accepted for 8,000.",
"Bongat_: !red 5000",
"xxsaltbotxx: @Bongat_ - You do not have enough. You're current balance is 3148. If you are new, type !register to get your starting balance.",
"Ebelisk: !blue 2000",
"xxsaltbotxx: @Ebelisk - Bet accepted for 2,000.",
"Bongat_: !balance",
"xxsaltbotxx: @Bongat_ - You have 3 148 mashrooms.",
"andrewch783: !blue 7777",
"xxsaltbotxx: @andrewch783 - Bet accepted for 7,777.",
"Bongat_: !red 3148",
"VoyboyisMyWife: !blue 1000",
"xxsaltbotxx: @Bongat_ - Bet accepted for 3,148.",
"xxsaltbotxx: @VoyboyisMyWife - Bet accepted for 1,000.",
"SleepyG807: !blue 10000",
"xxsaltbotxx: @SleepyG807 - Bet accepted for 10,000.",
"duckycheese: !red 4000",
"xxsaltbotxx: @duckycheese - Bet accepted for 4,000.",
"calzoking: !blue 10000",
"xxsaltbotxx: @calzoking - Bet accepted for 10,000.",
"SpaceFootballKing: !blue 5000",
"xxsaltbotxx: @SpaceFootballKing - It had over for this game. Maybe next time.....yes...",
"bongatde: !red 10000",
"xxsaltbotxx: @bongatde - It had over for this game. Maybe next time.....yes...",
"Skaigerah: !farm",
];

document.sendSampleInput = () => {
  const parsed = testmessages.map(raw => {
    let sp = raw.split(":");
    return {
      "username": sp[0],
      "message": sp[1]
    }
  })

  parsed.forEach(obj => {
    onIRCMessage("saltyteemo", {"username": obj["username"]}, obj["message"], null)
  })
}
