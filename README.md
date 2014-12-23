MSA Editor
==========

A HTML editor for MSA files containing phonetic alignments.

This is an HTML application to modify existing MSA files without requiring a
Web server. You can simply open `msa-editor.html` in a browser and edit MSA
files on your hard disk.

## Installation
After cloning the repository you have to fetch the required
dependencies. Under Linux or OSX you can simply run the script
`fetch-dependencies.sh` in a terminal window. Under Windows execute
`fetch-dependencies.bat`.

## Compatibility notes
We target modern browsers on desktop operating systems, where *modern* means
the current stable version of the major browsers, or the version before that.

### Safari
The Safari browser doesn't support the HTML5 FileApi to the same extent as the
other browsers. When you press "SAVE" the file will open in a new Tab instead
of directly opening a file dialog. Additionally, the text shown may be
garbled; make sure to choose 'UTF-8' as default character encoding when you
want to check the generated file directly in the browser window.
