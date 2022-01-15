# teemo-tool-site-standalone

This is a fully local (no backend) version of the
[Teemo Tool](https://github.com/michaelmdresser/teemo-tool) project's
[web frontend](https://github.com/michaelmdresser/teemo-tool-site).

It watches Twitch chat by using Twitch's IRC interface and
[tmi.js](https://github.com/tmijs/tmi.js). It will prompt you to enter your
Twitch username and an OAuth token associated with that account. This data is
saved to local storage (and is never stored elsewhere). It will continuously
prompt until a successful connection is made. See the console for more info.
Future versions will hopefully use a better method.

## Developing

See the `document.test` function for simulating messages coming in.

If running the site locally, serve it from a local HTTP server to avoid CORS issues that crop up when accessing local files like the dependencies in the `js` folder. A simple way of doing this is with Python's SimpleHTTPServer. In the root directory of this project, run `python -m SimpleHTTPServer 8000` and then navigate to `localhost:8000` in your browser.
