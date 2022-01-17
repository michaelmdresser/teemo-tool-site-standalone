# teemo-tool-site-standalone

This is a fully local (no backend) version of the
[Teemo Tool](https://github.com/michaelmdresser/teemo-tool) project's
[web frontend](https://github.com/michaelmdresser/teemo-tool-site).

It watches Twitch chat by using Twitch's IRC interface and
[tmi.js](https://github.com/tmijs/tmi.js). OAuth is unnecessary because we are
only reading messages.

## Developing

If running the site locally, serve it from a local HTTP server to avoid CORS issues that crop up when accessing local files like the dependencies in the `js` folder. A simple way of doing this is with Python's SimpleHTTPServer. In the root directory of this project, run `python -m SimpleHTTPServer 8000` and then navigate to `localhost:8000` in your browser.

Use `document.test("!blue 100")` (for example) in the browser console to
simulate receiving a message of `!blue 100` from username `tester`. Use
`document.sendSampleInput()` in the console to simulate receiving multiple
bets (successful and unsucessful) from a variety of users. See the source code
for the expected result values.
