#!/bin/sh

set -euo pipefail
trap "finish" EXIT

function finish {
    if [ $SUCCESS != 1 ] ; then
	echo "ERROR: Fetching of dependencies failed."
    else
	echo "Fetching of dependencies successful."
    fi
}

BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
JSDESTDIR=$BASEDIR/js/lib
CSSDESTDIR=$BASEDIR/css/lib

SUCCESS=0

rm -rf "$JSDESTDIR"
mkdir "$JSDESTDIR"

rm -rf "$CSSDESTDIR"
mkdir "$CSSDESTDIR"

cd "$CSSDESTDIR"
curl -sf --compressed http://code.jquery.com/ui/1.11.0/themes/smoothness/jquery-ui.css > jquery-ui-1.11.0-smoothness.css 

cd "$JSDESTDIR"
curl -sf --compressed http://code.jquery.com/jquery-2.1.1.min.js > jquery-2.1.1.min.js 
curl -sf --compressed http://code.jquery.com/ui/1.11.0/jquery-ui.js > jquery-ui-1.11.0.js
curl -sf --compressed https://raw.githubusercontent.com/eligrey/FileSaver.js/master/FileSaver.js > FileSaver.js
curl -sf --compressed https://raw.githubusercontent.com/ArthurClemens/Javascript-Undo-Manager/master/lib/undomanager.js > undomanager.js

SUCCESS=1

