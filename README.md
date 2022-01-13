# teemo-tool-site-standalone

This is a fully local (no backend) version of the
[Teemo Tool](https://github.com/michaelmdresser/teemo-tool) project's
[web frontend](https://github.com/michaelmdresser/teemo-tool-site).

## Developing

The `teemo.js` file is an artifact of the Typescript built but is included in the repo because the site is served from Github Pages. It should not be edited and should be treated purely as a build artifact necessary for serving the page.

`tsc -b` to compile the `teemo.ts` file to `teemo.js` with correct options.

If running the site locally, serve it from a local HTTP server to avoid CORS issues that crop up when accessing local files like the dependencies in the `js` folder. A simple way of doing this is with Python's SimpleHTTPServer. In the root directory of this project, run `python -m SimpleHTTPServer 8000` and then navigate to `localhost:8000` in your browser.
