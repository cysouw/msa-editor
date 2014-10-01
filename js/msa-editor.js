if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    alert("The File APIs are not fully supported in this browser.");
}

var MSAFile = function() {
    this.meta_information = {}; //lines of the form "@<key>:<value>"
    this.dataset = undefined; //header entry
    this.alignment = undefined; //header entry
    this.lines = []; //parsed file: mix of comment lines and rows
    this.annotations = []
    this.rows = []; //alignments
    this.unique_rows = [];
    this.width = 0; //width of the alignment table without the taxon
    this.type = 'basic'; //or 'with_id'
    this.taxlen = 0; //max length of taxa
    this.filename = undefined;
    this.filecontent = undefined; //file content as read in
    this.status = { parsed: false,
                  edited: false,
                  mode: 'show'}; // or 'edit'
}


var MSARow = function() {
    this.id = undefined;
    this.row_header = undefined; //taxon
    this.alignment = []; //always modify in place to keep references valid
    this.unique = true; //if unique === true then alignment contains original data, else alignment is a
                        //shared reference to another row alignment
}

MSARow.prototype.empty_symbol = '-';

MSARow.prototype.exportRow = function (msa_file) {
    var result = '';
    var row_start = [];
    if (msa_file.type == 'with_id') {
        row_start.push(this.id);
    }
    row_start.push(this.fillWithDots(this.row_header, msa_file.taxlen));
    result += row_start.join('\t') + '\t' + this.alignment.join('\t') + '\n'
    return result;
}

// pad the taxon with dots to a specific length
MSARow.prototype.fillWithDots = function (name, len) {
    var dots = '.......................................';
    return name + dots.substring(0, len - name.length);
}

MSARow.prototype.parseRow = function(parts) {
    if (! isNaN(parts[0])) { //id as first row entry
        this.id = parseInt(parts.shift());
    }
    
    this.row_header = parts[0].replace(/\.*$/, '')
    this.alignment = parts.slice(1).map(function(x){ 
        x = x.trim();
        return x === '' && this.empty_symbol || x;
    });

    return this.row_header;
}

MSARow.prototype.getDolgo = function(cell_entry) {
    var dolgo = "dolgo_ERROR";
    if (cell_entry in DOLGO) {
        dolgo = "dolgo_" + DOLGO[cell_entry]
    } else if (cell_entry.slice(0, 2) in DOLGO) {
        dolgo = "dolgo_" + DOLGO[cell_entry.slice(0, 2)];
    } else if (cell_entry.slice(0, 1) in DOLGO) {
        dolgo = "dolgo_" + DOLGO[cell_entry.slice(0, 1)];
    } else if (cell_entry.slice(1, 3) in DOLGO) {
        dolgo = "dolgo_" + DOLGO[cell_entry.slice(1, 3)];
    } else if (cell_entry.slice(1, 2) in DOLGO) {
        dolgo = "dolgo_" + DOLGO[cell_entry.slice(1, 2)];
    } else if (cell_entry == "-") {
        dolgo = "dolgo_GAP";
    }
    return dolgo;
}

MSARow.prototype.syncRowToDom = function(table_row, tab_index) {
    //sync cell count
    while(this.alignment.length+1 > table_row.children.length) {
        var table_data = document.createElement('TD');
        table_data.classList.add('residue')
        table_data.onmousedown = tableSelection.mousedownHandler;
        table_data.ondblclick = tableSelection.openEditDialog;
        table_data.appendChild(document.createTextNode(''));
        table_row.appendChild(table_data);
    }
    while(this.alignment.length+1 < table_row.children.length) {
        table_row.removeChild(table_row.lastChild);
    }
        
    var textNode = table_row.children[0].childNodes[0];
    if (textNode.nodeValue !== this.row_header) {
        textNode.nodeValue = this.row_header;
        table_row.children[0].classList = ['taxon'];
    }
    for (var col_idx = 0; col_idx < this.alignment.length; col_idx++) {
        var cell = table_row.children[col_idx+1];
        cell.tabIndex = tab_index++;
        textNode = cell.childNodes[0];
        if (textNode.nodeValue !== this.alignment[col_idx]) {
            textNode.nodeValue = this.alignment[col_idx];
            //update dolgo css
            cell.className = cell.className.replace(/(?:^|\s)dolgo_[^\s]*(?!\S)/g , '' );
            cell.classList.add(this.getDolgo(this.alignment[col_idx]));
        }
    }
    return tab_index;
}


var AnnotationRow = function () {
    this.row_header = undefined;
    this.alignment = [];
}

AnnotationRow.prototype.empty_symbol = '.';

AnnotationRow.prototype.fillWithDots = MSARow.prototype.fillWithDots;

AnnotationRow.prototype.exportRow = function(msa_file) {
    return ':ANN\t' + this.fillWithDots(this.row_header, msa_file.taxlen) + '\t' + this.alignment.join('\t') + '\n';
}

AnnotationRow.prototype.parseRow = function(parts) {
    this.row_header = parts[1].replace(/\.*$/, '')
    this.alignment = parts.slice(2).map(function(x){ 
        x = x.trim();
        return x === '' && this.empty_symbol || x;
    });

    return this.row_header;
}

AnnotationRow.prototype.getDolgo = function(cell_entry) {
    return '';
}

AnnotationRow.prototype.syncRowToDom = function(table_row, tab_index) {
    //sync cell count
    while(this.alignment.length+1 > table_row.children.length) {
        var table_data = document.createElement('TD');
        table_data.classList.add('residue')
        table_data.onmousedown = tableSelection.mousedownHandler;
        table_data.ondblclick = tableSelection.openEditDialog;
        table_data.appendChild(document.createTextNode(''));
        table_row.appendChild(table_data);
    }
    while(this.alignment.length+1 < table_row.children.length) {
        table_row.removeChild(table_row.lastChild);
    }
    
    var textNode = table_row.children[0].childNodes[0];
    if (textNode.nodeValue !== this.row_header) {
        textNode.nodeValue = this.row_header;
        table_row.children[0].classList = ['taxon'];
    }
    for (var col_idx = 0; col_idx < this.alignment.length; col_idx++) {
        var cell = table_row.children[col_idx+1];
        cell.tabIndex = tab_index++;
        textNode = cell.childNodes[0];
        if (textNode.nodeValue !== this.alignment[col_idx]) {
            textNode.nodeValue = this.alignment[col_idx];
            //update dolgo css
            cell.className = cell.className.replace(/(?:^|\s)dolgo_[^\s]*(?!\S)/g , '' );
            var css_cls = this.getDolgo(this.alignment[col_idx]);
            if (css_cls !== '') {
                cell.classList.add(css_cls);
            }
        }
    }
    return tab_index;
}


var fileManager = (function () {
    var fileHandles = undefined;
    var MSAFiles = undefined;
    var active_idx = -1; //-1 means no valid selection
    var edit_mode = false;

    function setEditMode(new_mode) {
        edit_mode = new_mode;
        document.getElementById('undo_button').style.display = (new_mode && 'inline' || 'none');
        document.getElementById('redo_button').style.display = (new_mode && 'inline' || 'none');
    }

    function exportFile(msa_file) {

        var data = '';
        /*
        msa_file.meta_information.modified = getDate();
        for (key in msa_file.meta_information) {
            data += '@' + key + ': ' + msa_file.meta_information[key] + '\n';
        }
        */
        for(var i=0; i<msa_file.lines.length; i++) {
            var line = msa_file.lines[i];
            if (line instanceof MSARow || line instanceof AnnotationRow) {
                data += line.exportRow(msa_file);
            }
            else {
                data += line;
            }
        }
        var blob = new Blob([data], {
            type: "text/plain;charset=utf-8"
        });
        saveAs(blob, msa_file.filename);
    }

    return {
        handleFiles: function (_fileHandles) { //user selected new set of files
            fileHandles = _fileHandles;
            //clear drop down list
            var elem = document.getElementById('msa_select');
            while (elem.firstChild) {
                elem.removeChild(elem.firstChild);
            }
            active_idx = -1
            MSAFiles = [];
            //create an MSAFile for every selected file
            for (var i = 0; i < fileHandles.length; i++) {
                var handle = fileHandles[i];
                var msa = new MSAFile();
                msa.filename = handle.name;

                //prepare callback for read completion
                var reader = new FileReader();
                reader.onload = function (msa_obj, index) {
                    return function (event) {
                        fileManager.fileLoaded(event, msa_obj, index);
                    };
                }(msa, i);
                reader.readAsText(handle);
            }
        },

        reload: function(do_ask) {
            if (fileHandles === undefined || active_idx === undefined) return;
            if (do_ask && MSAFiles[active_idx].status.edited) {
                $("#reload_dialog").dialog("open");
                return;
            }
            var handle = fileHandles[active_idx];
            var msa = new MSAFile();
            MSAFiles[active_idx] = msa;
            var reader = new FileReader();
            reader.onload = function (msa_obj) {
                return function (event) {
                    msa_obj.filecontent = event.target.result;
                    var elem = document.getElementById('msa_select');
                    elem.onchange(elem);
                };
            }(msa);
            reader.readAsText(handle);
        },

        handleFileSelect: function (event) {
            //user selects a msa file from drop down list
            var selected_idx = parseInt(event.value);
            active_idx = selected_idx;
            showMSA(MSAFiles[selected_idx], false);
            setEditMode(false);
        },

        showSelectedFile: function(unique){
            if (unique === edit_mode) return; // no op
            showMSA(MSAFiles[active_idx], unique);
            setEditMode(unique);
            if (unique) undoManager.clear();
        },

        fileLoaded: function(event, msa_obj, index) {
            msa_obj.filecontent = event.target.result;
            MSAFiles[index] = msa_obj;
            //add msa file to drop down list
            var elem = document.getElementById('msa_select');
            var option = document.createElement('option');
            option.value = index;
            option.innerHTML = msa_obj.filename;
            elem.appendChild(option);
            elem.style.display = 'inline';
            document.getElementById('view').className = "submit active";
            document.getElementById('edit').className = "submit active";
            document.getElementById('reload').className = "submit active";
            document.getElementById('save').className = "submit active";
            document.getElementById('minimize').className = "submit active";
            if (active_idx === -1) {
                elem.value = index;
                elem.onchange(elem);
            }
        },

        saveFiles: function() {
            if (MSAFiles === undefined) {
                return;
            }
            var count = 0;
            for (var i=0; i<MSAFiles.length; i++) {
                if (MSAFiles[i].status.edited) {
                    if (i === active_idx) {
                        if (edit_mode){
                            executeOperation(removeGapColumnsForActive);
                        } else {
                            removeGapColumns(MSAFiles[i]);
                            showMSA(MSAFiles[i], edit_mode);
                        }
                    } else {
                        removeGapColumns(MSAFiles[i]);
                    }
                    exportFile(MSAFiles[i]);
                    count += 1;
                }
            }
            if (count === 0) {
                alert("No modified files found.");
            }
        },

        activeFile: function() {
           if (MSAFiles === undefined) {
                return undefined;
           }
           return MSAFiles[active_idx]; 
        }
    };
})();

function undoManagerChanged() {
    var undo = document.getElementById('undo_button');
    undo.disabled = !undoManager.hasUndo();
    var redo = document.getElementById('redo_button');
    redo.disabled = !undoManager.hasRedo();
}

function parseMSA(msa_file) {
    var text = msa_file.filecontent;
    var lines = text.split(/\r\n|\n/);

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        var start = line[0];
        if (start === '#') {
            msa_file.lines.push(line + '\n');
            continue;
        }
        if (start == '@') {
            msa_file.lines.push(line + '\n');
            keyval = lines[i].split(':');
            key = keyval[0].trim().slice(1);
            val = keyval[1].trim();
            msa_file.meta_information.key = val;
        } else {
            var parts = line.split('\t');
            if (parts.length === 1) { // special row? maybe first or second row
                if (i === 0) {
                    msa_file.dataset = line
                } else if ( i === 1 ) {
                    msa_file.alignment = line
                }
                msa_file.lines.push(line + '\n');
                continue;
            }
            var row;
            if ( start === ':' && line.substring(0,4) === ':ANN' ) {
                row = new AnnotationRow();
                msa_file.annotations.push(row);
            } else {
                row = new MSARow();
                msa_file.rows.push(row);
                if (! isNaN(parts[0])) {
                    msa_file.type = 'with_id';
                }
            }
            msa_file.lines.push(row);

            var row_header = row.parseRow(parts);
            msa_file.taxlen = Math.max(msa_file.taxlen, row_header.length);
            msa_file.width = Math.max(msa_file.width, row.alignment.length);
        }
    }
           
    //search duplicates
    var seen = {};
    for (var i = 0; i < msa_file.rows.length; i++) {
        var row = msa_file.rows[i];
        var word = row.alignment.join('').replace(/-/g, '');
        if (word in seen) {
            row.unique = false;
            row.alignment = seen[word];
        } else {
            msa_file.unique_rows.push(row)
            seen[word] = row.alignment;
        }
    }
            
    var splice_args = [0,0];
    Array.prototype.push.apply(splice_args, msa_file.annotations);
    Array.prototype.splice.apply(msa_file.rows, splice_args);
    Array.prototype.splice.apply(msa_file.unique_rows, splice_args);

    normalizeMsa(msa_file, 'right');
    msa_file.status.parsed = true;
}

//has to be called to propagate updates of the msa_file during edit to the DOM
function syncMsaToDom(msa_file) {
    if (msa_file.status.parsed == false) {
        parseMSA(msa_file);
    }

    var rows;
    if (msa_file.status.mode == 'edit') {
        rows = msa_file.unique_rows;
    } else {
        rows = msa_file.rows;
    }
    
    var tbody = document.getElementById('msa_body');
    
    //sync row count
    while(rows.length < tbody.children.length) {
        var table_row = document.createElement('TR');
        table_row.classList.add('alm_row')
        body.appendChild(table_row);
    }
    while(rows.length > tbody.children.length) {
        tbody.removeChild(tbody.lastChild);
    }

    //sync rows
    var tab_index = 1;
    for(var row_idx=0; row_idx < rows.length; row_idx++) {
        tab_index = rows[row_idx].syncRowToDom(tbody.children[row_idx], tab_index);
    }
}

//completely rebuild DOM table for the given msa_file
function showMSA(msa_file, edit_mode) {
    /* parse MSA files */
    if (msa_file.status.parsed == false) {
        parseMSA(msa_file);  
    }

    var msa_head = document.getElementById('msa_head');
    var text = '';
    if (msa_file.dataset !== undefined) {
        text += '<tr class="header"><th id="dataset" class="header" colspan="' + (msa_file.width + 1) + '">DATASET: ' 
            + msa_file.dataset + "</th></tr>";
    }
    if (msa_file.alignment !== undefined) {
        text += '<tr class="header"><th id="alignment" class="header" colspan="' + (msa_file.width + 1) + '">ALIGNMENT: '
            + msa_file.alignment + '</th></tr>';
    }
    if (text.length != 0) {
        msa_head.innerHTML = text;
    }

    var msa_body = document.getElementById('msa_body');
    text = '';
    var rows;
    var css_class;
    if (edit_mode) {
        rows = msa_file.unique_rows;
        msa_file.status.mode = 'edit';
        css_class = 'residue ';
    } else {
        rows = msa_file.rows;
        msa_file.status.mode = 'show';
        css_class = 'residue_show';
    }

    var tabindex = 1;
    for (var row_idx = 0; row_idx < rows.length; row_idx++) {
        var row = rows[row_idx];
        var alignment = row.alignment;
        text += '<tr class="alm_row"><td class="taxon">' + row.row_header + '</td>';
        for (var col_idx = 0; col_idx < alignment.length; col_idx++) {
            var cell = alignment[col_idx];
            if (cell === '') cell = '&nbsp;' //make sure a textNode gets allways created as a child of table data node
            var dolgo = row.getDolgo(cell);
            var tab_definition;
            if (edit_mode) {
                tab_definition = '" tabindex=' + tabindex;
            } else {
                tab_definition = '';
            }
            text += '<td class="' + css_class +' ' + dolgo + tab_definition + '">' + cell + '</td>';
            tabindex++;
        }
        text += '</tr>';
    }
    msa_body.innerHTML = text;

    $(document).off('keydown'); 
    if (msa_file.status.mode === 'edit') {
        $(document).keydown(tableSelection.keydownHandler);
        $("TD").mousedown(tableSelection.mousedownHandler);
        $("TD").dblclick(tableSelection.openEditDialog);
    
    }
    
    document.getElementById('view').disabled = !edit_mode;
    document.getElementById('edit').disabled = edit_mode;
    document.getElementById('minimize').style.display = (edit_mode && 'inline' || 'none');
    if (edit_mode) tableSelection.initializeSelection();
}

var tableSelection = (function () {
    var ul = { //upper left corner
        x: undefined,
        y: undefined
    }; 

    var lr = { //lower right corner
        x: undefined,
        y: undefined
    }; 

    var selectionStart = {
        x: undefined,
        y: undefined
    };

    function getPositionInTable(node) {
        if (node.tagName !== "TD") return undefined;
        var result = { x:-1, y:-1};
        result.x = Array.prototype.indexOf.call(node.parentNode.children, node)
        node = node.parentNode;
        result.y = Array.prototype.indexOf.call(node.parentNode.children, node)
        return result;
    }

    function getCellInTable(x, y) {
        var body = document.getElementById('msa_body');
        var row = body.children[y];
        if (row === undefined) return undefined;
        return row.children[x];
    }

    function clearSelection() {
        var x, y, node;

        if (ul.x === undefined || ul.y === undefined ||
            lr.x === undefined || lr.y === undefined) {
            return;
        }
        for (y = ul.y; y <= lr.y; y++) {
            node = getCellInTable(ul.x, y);
            node === undefined || node.classList.remove('selected-left');
            node = getCellInTable(lr.x, y);
            node === undefined || node.classList.remove('selected-right');
        }
        for (x = ul.x; x<= lr.x; x++) {
            node = getCellInTable(x,ul.y);
            node === undefined || node.classList.remove('selected-top');
            node = getCellInTable(x,lr.y);
            node === undefined || node.classList.remove('selected-bottom');
        }
    }

    /* called after minimize; reduction of size may have made the selection invalid */
    function fixSelection() {
        if (ul.x === undefined || ul.y === undefined ||
            lr.x === undefined || lr.y === undefined) {
            return;
        }
        var msa_file = fileManager.activeFile();
        if (lr.x > msa_file.width) lr.x = msa_file.width;
        if (ul.x > msa_file.width) ul.x = msa_file.width;
        if (selectionStart.x > msa_file.width) selectionStart.x = msa_file.width;
    }

    function markSelection() {
        var x, y, node;

        if (ul.x === undefined || ul.y === undefined ||
            lr.x === undefined || lr.y === undefined) {
            return;
        }
        for (y = ul.y; y <= lr.y; y++) {
            node = getCellInTable(ul.x, y);
            node.classList.add('selected-left');
            node = getCellInTable(lr.x, y);
            node.classList.add('selected-right');
        }
        for (x = ul.x; x<= lr.x; x++) {
            node = getCellInTable(x,ul.y);
            node.classList.add('selected-top');
            node = getCellInTable(x,lr.y);
            node.classList.add('selected-bottom');
        }
        x = selectionStart.x === ul.x && lr.x || ul.x;
        y = selectionStart.y === ul.y && lr.y || ul.y;
        node = getCellInTable(x, y);
        node === undefined || node.focus();
    }

    function initializeSelection() {
        startSelection(1,0);
    }

    function startSelection(x,y) {
        var msa_file = fileManager.activeFile();
        if (msa_file === undefined) return;

        //wrap around in x direction
        if (x < 1) x = msa_file.width;
        else if (x > msa_file.width) x = 1;

        var node = getCellInTable(x,y);
        if (node === undefined) return;
        clearSelection();
        selectionStart.x = ul.x = lr.x = x;
        selectionStart.y = ul.y = lr.y = y;
        markSelection();
        node.focus();
    }

    function extendSelection(nx, ny) {
        var msa_file = fileManager.activeFile();
        if (msa_file === undefined) return;

        //wrap around in x and y direction
        if (nx < 1) nx = msa_file.width;
        else if (nx > msa_file.width) nx = 1;

        if (ny < 0) ny = msa_file.unique_rows.length - 1;
        else if (ny >= msa_file.unique_rows.length) ny = 0;

        var node = getCellInTable(nx,ny);
        if (node === undefined) return;
        clearSelection();
        ul.x = Math.min(selectionStart.x, nx);
        ul.y = Math.min(selectionStart.y, ny);
        lr.x = Math.max(selectionStart.x, nx);
        lr.y = Math.max(selectionStart.y, ny);
        markSelection();
        node.focus();
    }
    
    return {
        keydownHandler: function keydownHandler(event) {
            var active = document.activeElement;
            if (active === undefined || active.tagName !== "TD")
                return undefined;
            var position = getPositionInTable(active);
            if (event.keyCode === 86) { //v iew
                fileManager.showSelectedFile(false)
            } else if (event.keyCode === 85) { //u ndo
                undoManager.undo();
            } else if (event.keyCode === 82) { //r edo
                undoManager.redo();
            } else if (event.keyCode === 83) { //s ave
                fileManager.saveFiles();
            } else if (event.keyCode === 77) { //m inimize
                executeOperation(removeGapColumnsForActive);
            } else if (event.keyCode === 69) { //e dit cell
                tableSelection.openEditDialog(event);
            } else if (event.keyCode === 13) {
                if (event.shiftKey) {
                    if (event.ctrlKey || event.metaKey) {
                        executeOperation(function(msa, sel) {splitSelectionAndFill(msa, sel, 'left')});
                    } else {
                        executeOperation(function(msa, sel) {splitSelectionAndFill(msa, sel, 'right')});
                    }
                } else if (event.ctrlKey || event.metaKey) {
                    executeOperation(function(msa, sel) {mergeSelectionAndFill(msa, sel, 'left')});
                } else {
                    executeOperation(function(msa, sel) {mergeSelectionAndFill(msa, sel, 'right')});
                }
            } else if (event.keyCode === 46 || event.keyCode === 8) { // DEL or Backspace
                if (event.ctrlKey || event.metaKey) {
                    executeOperation(function(msa, sel) {deleteSelectionAndFill(msa, sel, 'left')});
                } else {
                    executeOperation(function(msa, sel) {deleteSelectionAndFill(msa, sel, 'right')});
                }
            } else if ([37,39].indexOf(event.keyCode) !== -1 && (event.ctrlKey || event.metaKey)) {
                if (event.keyCode === 37) {
                    executeOperation(function(msa, sel) {moveSelectionLeft(msa, sel)});
                } else {
                    executeOperation(function(msa, sel) {moveSelectionRight(msa, sel)});
                }
            } else if ([37,38,39,40].indexOf(event.keyCode) != -1) { //arrow keys
                var nx = position.x;
                var ny = position.y;
                if (event.keyCode == 37 ) {
                    nx--;
                }
                else if (event.keyCode == 38) {
                    ny--;
                }
                else if (event.keyCode == 39) {
                    nx++;
                }
                else if (event.keyCode == 40) {
                    ny++;
                }
                if (event.shiftKey) {
                    extendSelection(nx, ny);
                } else {
                    startSelection(nx, ny);
                }
            }
            return false;
        },

        mousedownHandler: function mousedownHandler(event) {
            var position = getPositionInTable(event.target);
            if (position === undefined) return;
            if (event.shiftKey) {
                extendSelection(position.x, position.y);
            } else {
                startSelection(position.x, position.y);
            }
        },

        getSelection: function getSelection() {
            if (ul.x === undefined || ul.y === undefined ||
                lr.x === undefined || lr.y === undefined ||
                selectionStart.x === undefined || selectionStart.y === undefined) {
                return undefined;
            }
            return {ul: {x: ul.x-1, y: ul.y}, lr: {x: lr.x-1, y: lr.y},
                    selectionStart: {x: selectionStart.x-1, y: selectionStart.y}};
        },

        setSelection: function setSelection(selection) {
            if (selection === undefined) {
                ul.x = ul.y = lr.x = lr.y = selectionStart.x = selectionStart.y = undefined;
                return;
            }
            ul.x = selection.ul.x+1;
            ul.y = selection.ul.y;
            lr.x = selection.lr.x+1;
            lr.y = selection.lr.y;
            selectionStart.x = selection.selectionStart.x+1;
            selectionStart.y = selection.selectionStart.y;
        },

        initializeSelection: initializeSelection,

        clearSelection: clearSelection,
        
        markSelection: markSelection,

        fixSelection: fixSelection,

        moveSelection: function moveSelection(dx,dy) {
           if (ul.x === undefined || ul.y === undefined ||
                lr.x === undefined || lr.y === undefined) {
                return;
            }
            var msa_file = fileManager.activeFile();
            if(msa_file === undefined || 
               0 > ul.x + dx || lr.x+dx > msa_file.width ||
               0 > ul.y + dy || lr.y+dy > msa_file.unique_rows.length) {
                return;
            }

            ul.x += dx;
            lr.x += dx;
            ul.y += dy;
            lr.y += dy;
            selectionStart.x += dx;
            selectionStart.y += dy;
        },

        openEditDialog: function(event) {
            var position = getPositionInTable(event.target);
            if (position === undefined) return;
            var msa_file = fileManager.activeFile();
            if (msa_file === undefined) return;
            var cell_content = msa_file.unique_rows[position.y].alignment[position.x-1]
            document.getElementById('cell_content').value = cell_content;
            var elem = document.getElementById("cell_edit_dialog");
            elem.event_target = event.target;
            $(elem).dialog({position: { my: "center top", at: "center bottom", of: $(event.target), collision: "fit" }});
            $(elem).dialog("open");
        },

        editActiveCell: function(cell, new_value) {
            position = getPositionInTable(cell);
            if (position === undefined) return;
            var msa_file = fileManager.activeFile();
            if (msa_file === undefined) return;
            executeOperation(function(msa_file, selection) {
                msa_file.unique_rows[position.y].alignment[position.x-1] = new_value;
            });
        }
    };

})();

/*
 * Operations on alignments
 *
 * They should reside in the prototype of MSAFile, but they may (in the future)
 * get (de)serialized with JSON and the functions would be lost.
 */
function captureCurrentState() {
    var selection = tableSelection.getSelection();
    var alignments = getAlignmentState(fileManager.activeFile());
    
    return function () {
        var msa_file = fileManager.activeFile();
        tableSelection.clearSelection();
        setAlignmentState(msa_file, alignments);
        syncMsaToDom(msa_file);
        tableSelection.setSelection(selection);
        tableSelection.markSelection();
    };
}

function getAlignmentState(msa_file) {
    var result = [];
    for (var i = 0; i < msa_file.unique_rows.length; i++) {
        var row = msa_file.unique_rows[i];
        result.push(row.alignment.slice(0));
    }
    return result;
}

function setAlignmentState(msa_file, alignments) {
    var rows = msa_file.unique_rows;
    for (var i = 0; i < rows.length; i++) {
        //modify alignment in place to keep referencing rows in sync with change
        var splice_args = [0, rows[i].alignment.length];
        Array.prototype.push.apply(splice_args, alignments[i]);
        Array.prototype.splice.apply(rows[i].alignment, splice_args);
    }
    msa_file.width = rows[0].alignment.length;
}

function executeOperation(func) {
    var msa_file = fileManager.activeFile();
    var selection = tableSelection.getSelection();
    if (msa_file === undefined || selection == undefined) return;

    var undoFunc = captureCurrentState();
    tableSelection.clearSelection();
    func(msa_file, selection);
    syncMsaToDom(msa_file);
    tableSelection.markSelection();
    undoManager.add({ undo: undoFunc,
                      redo: function() {
                          tableSelection.clearSelection();
                          tableSelection.setSelection(selection);
                          func(msa_file, selection);
                          syncMsaToDom(msa_file);
                          tableSelection.markSelection();
                      }
                    });
}

function splitSelectionAndFill(msa_file, selection, filling_from) {
    var rows = msa_file.unique_rows;
    for (var y = selection.ul.y; y <= selection.lr.y; y++) {
        var splice_args = [selection.ul.x, selection.lr.x-selection.ul.x+1];
        for (var x = selection.ul.x; x <= selection.lr.x; x++) {
            Array.prototype.push.apply(splice_args, splitString(rows[y].alignment[x]));
        }
        Array.prototype.splice.apply(rows[y].alignment, splice_args);
    }
    msa_file.status.edited = true;
    normalizeMsa(msa_file, filling_from);
}

function mergeSelectionAndFill(msa_file, selection, filling_from) {
    var rows = msa_file.unique_rows;
    var fill_position = (filling_from == 'left' && selection.ul.x || selection.ul.x+1);

    for (var y = selection.ul.y; y <= selection.lr.y; y++) {
        var row = rows[y];
        var repl = '';

        var filler_args = [fill_position, 0];
        for (var i = selection.ul.x; i < selection.lr.x; i++) {
            filler_args.push(row.empty_symbol);
        }
        
        for (var x = selection.ul.x; x <= selection.lr.x; x++) {
            if (rows[y].alignment[x] !== row.empty_symbol && rows[y].alignment[x] !== '?') {
                repl += rows[y].alignment[x];
            }
        }
        if (repl === '') repl = row.empty_symbol;
        rows[y].alignment.splice(selection.ul.x, selection.lr.x-selection.ul.x+1, repl);
        Array.prototype.splice.apply(rows[y].alignment, filler_args);
    }
    msa_file.status.edited = true;
}

function deleteSelectionAndFill(msa_file, selection, filling_from) {
    var rows = msa_file.unique_rows;
    var count = selection.lr.x-selection.ul.x+1;
    for (var y=selection.ul.y; y<=selection.lr.y; y++) {
        rows[y].alignment.splice(selection.ul.x, count);
    }
    msa_file.status.edited = true;
    normalizeMsa(msa_file, filling_from);
}

function moveSelectionLeft(msa_file, selection) {
    var rows = msa_file.unique_rows;
    for(run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
            rows[run_y].alignment.splice(selection.lr.x + 1, 0, rows[run_y].empty_symbol);
    }

    var found_empty_col = false;
    column_loop:
    for (var run_x = selection.ul.x - 1; run_x >= 0; run_x--) {
        for (var run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
            if (rows[run_y].alignment[run_x] !== rows[run_y].empty_symbol) {
                continue column_loop;
            }
        }
        found_empty_col = true;
        break;
    }
    if (found_empty_col) {
        for(run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
            rows[run_y].alignment.splice(run_x, 1);
        }
        tableSelection.moveSelection(-1,0);
    } else {
        normalizeMsa(msa_file, 'left');
    }
    msa_file.status.edited = true;
}

function moveSelectionRight(msa_file, selection) {
    var rows = msa_file.unique_rows;

    for(run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
        rows[run_y].alignment.splice(selection.ul.x, 0, rows[run_y].empty_symbol);
    }

    var found_empty_col = false;
    column_loop:
    for (var run_x = selection.lr.x+2; run_x < msa_file.width + 1; run_x++) {
        for (var run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
            if (rows[run_y].alignment[run_x] !== rows[run_y].empty_symbol) {
                continue column_loop;
            }
        }
        found_empty_col = true;
        break;
    }
    if (found_empty_col) {
        for(run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
            rows[run_y].alignment.splice(run_x, 1);
        }
    }
    normalizeMsa(msa_file, 'right');
    msa_file.status.edited = true;
    tableSelection.moveSelection(1,0);
}

function normalizeMsa(msa_file, filling_from){
    if (filling_from !== 'left' && filling_from !== 'right') {
        filling_from = 'right';
    }
    //make alignments a square_matrix
    max = 0;
    for (var i=0; i< msa_file.unique_rows.length; i++) {
        var row = msa_file.unique_rows[i];
        max = Math.max(max, row.alignment.length);
    }
    msa_file.width = max;
    for (i=0; i< msa_file.unique_rows.length; i++) {
        row = msa_file.unique_rows[i];
        while (row.alignment.length < max) {
            if (filling_from == 'right') {
                row.alignment.push(row.empty_symbol);
            } else {
                row.alignment.splice(0, 0, row.empty_symbol);
            }
        }
    }
}

//include UI update
function removeGapColumnsForActive(msa_file) {
    tableSelection.clearSelection(); //may become invalid
    removeGapColumns(msa_file);
    tableSelection.fixSelection();
}

//do the actual work
function removeGapColumns(msa_file) {
    //remove columns containing only gaps
    for (var x=msa_file.width-1; x>=0; x--) {
        var only_gaps = true;
        for(i=0; i < msa_file.unique_rows.length; i++) {
            var row = msa_file.unique_rows[i];
            if (row.alignment[x].trim() !== row.empty_symbol) {
                only_gaps = false;
                break
            }
        }
        if (!only_gaps) continue;
        msa_file.width -= 1;
        for(i=0; i< msa_file.unique_rows.length; i++) {
            row = msa_file.unique_rows[i];
            row.alignment.splice(x,1);
        }
    }
}

/*
 * (generic) helper functions
 */

function getDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    var hh = today.getHours();
    var mins = today.getMinutes();

    if (mm < 10) mm = '0' + mm;
    if (dd < 10) dd = '0' + dd;
    if (hh < 10) hh = '0' + hh;
    if (mins < 10) mins = '0' + mins;

    return [yyyy, mm, dd].join('-') + ' ' + hh + ':' + mins;
}

// split a string into something approaching graphemes
function splitString(s) {
    var result = [];
    for (var i in s) {
        var code = s.charCodeAt(i);
        i = s.charAt(i);
        if (result.length > 0 &&
            ((code>=0xDC00 && code<0xE000) /*low surrogate*/
              || (code>=0x0300 && code<0x0370) /*combining mark*/))  {
            result[result.length-1] = result[result.length-1] + i;
        } else {
            result.push(i);
        }
    }
    return result;
}

function checkDependencies() {
    result = '';
    if (window.UndoManager === undefined)
        result += 'Loading of UndoManager failed.\n';
    if (window.saveAs === undefined)
        result += 'Loading of FileSaver failed.\n';
    if (window.jQuery === undefined)
        result += 'Loading of JQuery failed.\n';
    else if (window.jQuery.ui === undefined)
        result += 'Loading of JQueryUI failed.\n';
    if (result !== '')
        result += '\nThe application will not work as intended. Did you run fetch-dependencies.sh?' 
    return result
}

function showHelpWindow() {
    $("#help_window").dialog("open");
}

//initialisation
window.onload = function() {
    //check if all dependencies are loaded:
    errMsg = checkDependencies();
    if (errMsg !== '') {
        alert(errMsg);
    }

    undoManager = new UndoManager();
    undoManager.setCallback(undoManagerChanged);
    undoManagerChanged();

    //prepare dialogs
    $("#reload_dialog").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        position: { my: "center top", at: "center bottom", of: $("#reload"), collision: "fit" },
        buttons : {
            "Proceed" : function() {
                fileManager.reload(false);
                $(this).dialog("close");
            },
            "Cancel" : function() {
                $(this).dialog("close");
            }
        }
    });

    $( "#cell_edit_dialog" ).dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            "Apply": function() {
                $( this ).dialog( "close" );
                tableSelection.editActiveCell(this.event_target, cell_content.value);

            },
            Cancel: function() {
                $( this ).dialog( "close" );
            }
        },
    });

    $( "#help_window" ).dialog({
        autoOpen: true,
        modal: true,
        width: '80ex',
        height: 'auto'
    });
    
}
