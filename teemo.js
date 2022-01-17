import { CountUp } from './js/countUp.min.js';

var totalDisplayMode = true;
let alertaudio = new Audio('elegantdoor.mp3');
var tmiclient;

let bettingactive = false;
// Username -> {"team": "blue", amount: 1000}
var attemptedbets = {};
// Username -> [{"team": "blue", amount: 1000}]
var acceptedbets = {};

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

// Contains the count of bets
var TeamBetCount = {
  view: function(vnode) {
    let team = vnode.attrs.team;
    let bets = vnode.attrs.bets;

    let totalHS = m("span", { class: 'bet-total' }, bets.length)
    let textHS = m("span", { id: `${team}-bet-label`, class: 'label' }, `Bets for ${team}`)

    let childArr = [];
    if (team === "red") {
      childArr = [totalHS, textHS]
    } else {
      childArr = [textHS, totalHS]
    }

    return m("span",
      { id: `${team}-total-container`, class: 'bet-container' },
      childArr)
  }
}


// Contains the list of bets
function TeamBetsContainer() {
  var prevSum = 0;
  var betSum = 0;
  const sumreducer = (prev, current) => prev + current;

  return {
    view: function(vnode) {
      let team = vnode.attrs.team;
      let bets = vnode.attrs.bets;

      return m("div",
        { id: `${team}-individual-container`, class: 'individual-container' },
        [
          m("div",
            { id: `${team}-breakdown-counter`, class: 'breakdown-counter' },
            // TODO: this should be a CountUp
            betSum
          ),
          m("div",
            { id: `${team}-individual-bets`, class: 'individual-bets' },
            bets.map(amount => m("div", amount))
          )
        ])
    },
    // Before we update the component, store the old bet info so that the
    // CountUp can be initialized correctly in onupdate.
    onbeforeupdate: function(vnode, old) {
      let oldbets = old.attrs.bets
      let newbets = vnode.attrs.bets
      prevSum = oldbets.length === 0 ? 0 : oldbets.reduce(sumreducer)
      betSum = newbets.length === 0 ? 0 : newbets.reduce(sumreducer)
    },
    onupdate: function(vnode) {
      let team = vnode.attrs.team;
      let cu = new CountUp(
        `${team}-breakdown-counter`,
        betSum,
        { startVal: prevSum },
      )
      cu.start();
    }
  }
}

var TeamBetInfo = {
  view: function(vnode) {
    let team = vnode.attrs.team;
    let bets = [];

    // Construct bets for request team
    for (const [username, betsinfo] of Object.entries(acceptedbets)) {
      betsinfo.forEach((betinfo, i) => {
        if (betinfo["team"] !== team) {
          return;
        }

        bets.push(betinfo["amount"]);
      })
    }


    return m("span", { id: `${team}-bet-info` }, [
      m(TeamBetCount, { team: team, bets: bets }),
      m(TeamBetsContainer, { team: team, bets: bets }),
    ]
    )
  }
}

var AllBetInfo = {
  view: function(vnode) {
    return m("div", [
      m(TeamBetInfo, { team: 'blue' }),
      m(TeamBetInfo, { team: 'red' }),
    ])
  }
}

let topBetInfo = document.getElementById("bet-info");
m.mount(topBetInfo, AllBetInfo)


let redre = /!red (\d+)/;
let bluere = /!blue (\d+)/;
let atre = /@(\S+)/;

// descending
function sorterFunc(a, b) {
  return b - a
}


function onIRCMessage(channel, tags, message, self) {
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

      // When we get the first bet of a betting round, alert the user, reset the
      // bet data, and start a delayed function that will mark the betting round
      // as over.
      if (!bettingactive) {
        bettingactive = true;

        try {
          alertaudio.play();
        } catch (e) {
          console.log("Failed to play alert: ", e);
        }

        setTimeout(() => {
          console.log("betting is over, flipping flag");
          bettingactive = false;

          // Reset the data holders but don't call update. Will be updated when
          // an actual bet message is received.
          attemptedbets = {};
          acceptedbets = {};
        }, 1000 * 60 * 4);
      }

      let acceptedUsername = atmatch[1];

      if (!(acceptedUsername in attemptedbets)) {
        console.log(`Expected username '${acceptedUsername}' to be in attempted bets, but it wasn't`);
        return
      }

      if (!(acceptedUsername in acceptedbets)) {
        acceptedbets[acceptedUsername] = [];
      }

      acceptedbets[acceptedUsername].push(attemptedbets[acceptedUsername])
      delete attemptedbets[acceptedUsername]

      m.redraw();
      return;
    }

    return;
  }

  // console.log(tags)
  // console.log(message)

  let redmatch = redre.exec(message);
  let bluematch = bluere.exec(message);

  if (redmatch !== null) {
    attemptedbets[username] = {
      "team": "red",
      "amount": parseInt(redmatch[1]),
    };
    m.redraw();
    return;
  } else if (bluematch !== null) {
    attemptedbets[username] = {
      "team": "blue",
      "amount": parseInt(bluematch[1]),
    };
    m.redraw();
    return;
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


document.getElementById("reset-bets-button").addEventListener('click', function() {
  attemptedbets = {};
  acceptedbetusernames = {};
  m.redraw();
});


// Test data from real chat log 2022-01-14
//
// If processed improperly (including unaccepted bets):
// Blue: 43977
// Red: 22148
//
// If processed correctly:
// Blue: 38987
// Red: 7148
const testmessages = [
  "erbtastic: !blue 200",
  "xxsaltbotxx: @erbtastic - Bet accepted for 200.",
  "erbtastic: !blue 10",
  "xxsaltbotxx: @erbtastic - Bet accepted for 10.",
  "erbtastic: !red 5",
  "xxsaltbotxx: @erbtastic - ??? 5",
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
    let sp = raw.split(": ");
    return {
      "username": sp[0],
      "message": sp[1]
    }
  })

  parsed.forEach(obj => {
    onIRCMessage("saltyteemo", {"username": obj["username"]}, obj["message"], null)
  })
}
