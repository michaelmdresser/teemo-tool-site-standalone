import { CountUp } from './js/countUp.min.js';

////////////////////////////////////////////////////////////////////////////////
// Global Data
////////////////////////////////////////////////////////////////////////////////

let bettingactive = false;
// Username -> {"team": "blue", amount: 1000}
var attemptedbets = {};
// Username -> [{"team": "blue", amount: 1000}]
var acceptedbets = {};

////////////////////////////////////////////////////////////////////////////////
// Display/rendering components and initialization
////////////////////////////////////////////////////////////////////////////////

function TeamBetSummary() {
  var prevSum = 0;
  var betSum = 0;
  const sumreducer = (prev, current) => prev + current;

  return {
    view: function(vnode) {
      let team = vnode.attrs.team;
      let bets = vnode.attrs.bets;
      let otherbets = vnode.attrs.otherbets;

      let successmultiplediv;
      if (bets.length > 0 && otherbets.length > 0) {
        let successmultiple = otherbets.reduce(sumreducer) / bets.reduce(sumreducer)
        successmultiplediv = m("div",
                            `Bet return is ${successmultiple.toFixed(2)}x`)
      }

      let totalHS = m("span", { class: 'bet-count' }, bets.length)
      let textHS = m("span", { class: 'bet-count-label' }, `bets for ${team}`)

      let childArr = [];
      // if (team === "red") {
      //   childArr = [totalHS, textHS]
      // } else {
      //   childArr = [textHS, totalHS]
      // }
      childArr = [totalHS, textHS]

      return m("div", { class: 'summary-container' }, [
        m("div", { class: 'sum', id: `${team}-breakdown-counter` },
          betSum,
        ),
        m("span",
          childArr,
        ),
        successmultiplediv,
      ]
      )
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

// Contains the list of bets
var TeamBetsContainer = {
  view: function(vnode) {
    let team = vnode.attrs.team;
    let bets = vnode.attrs.bets.sort((a, b) => b - a);

    return m("div",
      { class: 'individual-container' },
      m("div",
        { class: 'individual-bets' },
        bets.map(amount => m("div", amount))
      )
    )
  }
}

var Menu = {
  view: function() {
    return m("div", { id: "menu-column" }, [
      m("div", [
        m("input", {
          type: "range", id: "volume", name: "volume",
          min: "0", max: "100", step: "1", value: "25",
        }),
        m("label", { for: "volume" }, "Volume"),
      ]),
      m("div",
        m("button", { id: "volume-test" }, "Test volume")),
      m("div", { id: "reset-bets" },
        m("button", { id: "reset-bets-button" }, "Reset bets")),
    ])
  }
}

var FullPage = {
  view: function(vnode) {
    let redbets = [];
    let bluebets = [];

    // Construct bets for each team
    for (const [username, betsinfo] of Object.entries(acceptedbets)) {
      betsinfo.forEach((betinfo, i) => {
        if (betinfo["team"] === "red") {
          redbets.push(betinfo["amount"]);
        } else if (betinfo["team"] === "blue") {
          bluebets.push(betinfo["amount"]);
        }
      })
    }

    return m("div", { id: "grid-wrapper" }, [
      m("div", { id: "grid-blue-bet-list", class: "blue" },
        m(TeamBetsContainer, { team: "blue", bets: bluebets })),
      m("div", { id: "grid-blue-bet-summary", class: "blue" },
        m(TeamBetSummary, { team: "blue", bets: bluebets, otherbets: redbets })),
      m("div", { id: "menu-column" },
        m(Menu)),
      m("div", { id: "grid-red-bet-summary", class: "red" },
        m(TeamBetSummary, { team: "red", bets: redbets, otherbets: bluebets })),
      m("div", { id: "grid-red-bet-list", class: "red" },
        m(TeamBetsContainer, { team: "red", bets: redbets })),
    ])
  }
}

let top = document.getElementById("mainpage");
m.mount(top, FullPage)

////////////////////////////////////////////////////////////////////////////////
// Twitch chat message handling
////////////////////////////////////////////////////////////////////////////////

let alertaudio = new Audio('elegantdoor.mp3');

function playAlertSound() {
  try {
    let volumeLevelInt = document.getElementById("volume").valueAsNumber
    alertaudio.volume = volumeLevelInt / 100.0
    alertaudio.play()
  } catch (e) {
    console.log("Failed to play alert: ", e)
  }
}

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

let redre = /!red (\d+)/;
let bluere = /!blue (\d+)/;
let atre = /@(\S+)/;

function onIRCMessage(channel, tags, message, self) {
  if (self) return; // shouldn't happen, we won't be sending

  // The tags include a lowercased username but the message might contain an
  // @Username that has mixed case. Force lowercasing to avoid problems.
  let username = tags["username"].toLowerCase();
  message = message.toLowerCase();

  // Help messages from moobot sometimes include !blue or !red commands as
  // examples
  if (username === "moobot") return;

  if (username === "xxsaltbotxx" || username === "malphite_bot" || tags.mod) {
    if (message.includes("you placed")) {
      let atmatch = atre.exec(message);
      if (atmatch === null) {
        return;
      }

      // When we get the first bet of a betting round, alert the user, reset the
      // bet data, and start a delayed function that will mark the betting round
      // as over.
      if (!bettingactive) {
        bettingactive = true;
        playAlertSound();

        acceptedbets = {};

        setTimeout(() => {
          console.log("betting is over, flipping flag");
          bettingactive = false;

          // Clear attempts but not accepted bets. Accepted will get cleared
          // on flag flip.
          attemptedbets = {};
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

tmiclient.on('message', onIRCMessage);

////////////////////////////////////////////////////////////////////////////////
// Button handlers
////////////////////////////////////////////////////////////////////////////////

document.getElementById("reset-bets-button").addEventListener('click', function() {
  attemptedbets = {};
  acceptedbets = {};
  m.redraw();
});

document.getElementById("volume-test").addEventListener('click', function() {
  playAlertSound();
});


////////////////////////////////////////////////////////////////////////////////
// Testing utilities
////////////////////////////////////////////////////////////////////////////////


// This is for local testing without requiring actual twitch messages to be sent
//
// Use with browser console `document.test("!blue 100")`
//
// Attaching to document makes this accessible from the console. I'm sure there
// is a better way.
document.test = (message) => {
  onIRCMessage(null, { "username": "tester" }, message, false);
  onIRCMessage(null, { "username": "Malphite_Bot" }, "@tester - ... You placed ... mushrooms on", false);
}

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
  "Malphite_Bot: @erbtastic You placed 200 mushrooms on BLUE.",
  "erbtastic: !blue 10",
  "Malphite_Bot: @erbtastic - You placed 10 mushrooms on BLUE.",
  "erbtastic: !red 5",
  "Malphite_Bot: @erbtastic - ??? 5",
  "krispkratos: !blue 8000",
  "Malphite_Bot: @krispkratos You placed 8,000 mushrooms on BLUE.",
  "Bongat_: !red 5000",
  "Malphite_Bot: @Bongat_ - You do not have enough. You're current balance is 3148. If you are new, type !register to get your starting balance.",
  "Ebelisk: !blue 2000",
  "Malphite_Bot: @Ebelisk You placed 2,000 mushrooms on BLUE.",
  "Bongat_: !balance",
  "Malphite_Bot: @Bongat_ - You have 3 148 mashrooms.",
  "andrewch783: !blue 7777",
  "Malphite_Bot: @andrewch783 You placed 7,777 mushrooms on BLUE.",
  "Bongat_: !red 3148",
  "VoyboyisMyWife: !blue 1000",
  "Malphite_Bot: @Bongat_ You placed 3,148 mushrooms on RED.",
  "Malphite_Bot: @VoyboyisMyWife You placed 1,000 mushrooms on BLUE.",
  "SleepyG807: !blue 10000",
  "Malphite_Bot: @SleepyG807 You placed 10,000 mushrooms on BLUE.",
  "duckycheese: !red 4000",
  "Malphite_Bot: @duckycheese You placed 4,000 mushrooms on RED.",
  "calzoking: !blue 10000",
  "Malphite_Bot: @calzoking You placed 10,0000 mushrooms on BLUE.",
  "SpaceFootballKing: !blue 5000",
  "Malphite_Bot: @SpaceFootballKing - It had over for this game. Maybe next time.....yes...",
  "bongatde: !red 10000",
  "Malphite_Bot: @bongatde - It had over for this game. Maybe next time.....yes...",
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
