# MSA Editor

A HTML editor for multiple alignment files containing (phonetic) alignments.

This is an HTML application to modify existing multiple alignment files without requiring a
Web server. You can simply open `dist/msa-editor.html` in a browser and edit MSA
files on your hard disk.

## Dependency Installation and Build

Please first install all dependencies via `npm`:

  $ npm install

You can then start a development build with a file watch for changes:

  $ npm run watch

This will build the app into the `dist` folder. You can directly open the file\
`msa-editor.html` to work with the app. The `watch` task also starts a
development server at `http:\\localhost:8080` with automatic reload on file
changes.

To build the production version:

  $ npm run production

To build the electron app for your local platform:

  $ npm run build:electron

## Compatibility notes

We target modern browsers on desktop operating systems, where *modern* means
the current stable version of the major browsers, or the version before that.
