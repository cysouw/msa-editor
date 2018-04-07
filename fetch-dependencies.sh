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
JSDESTDIR=$BASEDIR/src/app/js/lib
CSSDESTDIR=$BASEDIR/src/app/css/lib

SUCCESS=0

rm -rf "$JSDESTDIR"
mkdir "$JSDESTDIR"

rm -rf "$CSSDESTDIR"
mkdir "$CSSDESTDIR"

cd "$CSSDESTDIR"
curl -sf --compressed http://jqueryui.com/resources/download/jquery-ui-themes-1.11.4.zip > jquery-ui-themes-1.11.4.zip
unzip -uq jquery-ui-themes-1.11.4.zip jquery-ui-themes-1.11.4/themes/smoothness/\* || [ $? -eq 1 ]
mv jquery-ui-themes-1.11.4/themes/smoothness .
rm -r jquery-ui-themes-1.11.4

cd "$JSDESTDIR"
curl -sf --compressed http://code.jquery.com/jquery-2.1.4.min.js > jquery-2.1.4.min.js 
curl -sf --compressed http://code.jquery.com/ui/1.11.4/jquery-ui.js > jquery-ui-1.11.4.js
curl -sf --compressed http://www.appelsiini.net/download/jquery.jeditable.js > jquery.jeditable.js
curl -sf --compressed https://raw.githubusercontent.com/eligrey/FileSaver.js/master/FileSaver.js > FileSaver.js
curl -sf --compressed https://raw.githubusercontent.com/ArthurClemens/Javascript-Undo-Manager/master/lib/undomanager.js > undomanager.js
curl -sf --compressed https://raw.githubusercontent.com/mholt/PapaParse/master/papaparse.js > papaparse.js
curl -sf --compressed https://www.datatables.net/download/builder?dt/dt-1.10.11,b-1.1.2,b-colvis-1.1.2 > DataTables.zip
#unzip exits with code 1 in case of warnings like stripped leading slashes
unzip -uq DataTables.zip || [ $? -eq 1 ]

SUCCESS=1

