# teemo-tool-site-standalone

This is a fully local (no backend) version of the
[Teemo Tool](https://github.com/michaelmdresser/teemo-tool) project's
[web frontend](https://github.com/michaelmdresser/teemo-tool-site).

## Developing

See the `document.test` function for simulating messages coming in.

If running the site locally, serve it from a local HTTP server to avoid CORS issues that crop up when accessing local files like the dependencies in the `js` folder. A simple way of doing this is with Python's SimpleHTTPServer. In the root directory of this project, run `python -m SimpleHTTPServer 8000` and then navigate to `localhost:8000` in your browser.
