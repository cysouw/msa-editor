import { AnnotationRow } from './annotation-row';
import { MSARow } from './msa-row';
import { tableSelection } from './table-selection';
import { fileManager } from './file-manager';

export function updateTableHeaders() {
  var tbody = document.getElementById('msa_body');
  var sticky_table = document.getElementById('msa_sticky_header_table');
  var offset = $(tbody).offset();
  var scroll_top = window.scrollY;
  if (scroll_top > offset.top && scroll_top < offset.top+$(tbody).height()) {
    sticky_table.style.visibility = 'visible';
  } else {
    sticky_table.style.visibility = 'hidden';
  }
}

// utility function for MSARow and AnnotationRow
// pad the taxon with dots to a specific length
export function fillWithDots(name, len) {
  var count = Math.max(0, len - name.length);
  if (String.prototype.repeat) {
    return name + '.'.repeat(count);
  } else {
    var result = name;
    var dots = '.';
    while(count) {
      if (count % 2 == 1) {
        result += dots;
      }
      if (count > 1) {
        dots += dots;
      }
      count >>= 1;
    }
    return result;
  }
}

export function parseMSA(msa_file, fileformat) {
  var text = msa_file.filecontent;
  var lines = text.split(/\r\n|\n/);

  msa_file.original_fileformat = fileformat;
  while (lines.length > 0 && lines[lines.length-1].trim() === ''){
    lines.pop();
  }
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    var start = line[0];
    if (start === '#') {
      msa_file.lines.push(line + '\n');
      // split key, value pairs on ':'
      let index = line.indexOf(':');
      if (index !== -1) {
        let key = line.substr(1, index-1).trim();
        let val = line.substr(index+1).trim();
        if (key === 'with_id') {
          msa_file.with_id = (['false', 'no', '0' ].indexOf(val.toLowerCase()) === -1);
        }
      }
      continue;
    }
    if (start == '@') {
      msa_file.lines.push(line + '\n');
      let keyval = lines[i].split(':');
      // let key = keyval[0].trim().slice(1);
      let val = keyval[1].trim();
      msa_file.meta_information.key = val;
    } else {
      var parts = fileformat.splitLine(line, msa_file.with_id || line.substring(0,4) === ':ANN');
      var row;
      if ( start === ':' && line.substring(0,4) === ':ANN' ) {
        row = new AnnotationRow();
        msa_file.annotations.push(row);
      } else {
        row = new MSARow();
        msa_file.rows.push(row);
      }
      msa_file.lines.push(row);

      var row_header = row.parseRow(parts, msa_file.with_id);
      msa_file.taxlen = Math.max(msa_file.taxlen, row_header.length);
      msa_file.width = Math.max(msa_file.width, row.alignment.length);
    }
  }
      
  //search duplicates
  msa_file.computeUniqueRows();
      
  var splice_args = [0,0];
  Array.prototype.push.apply(splice_args, msa_file.annotations);
  Array.prototype.splice.apply(msa_file.rows, splice_args);
  Array.prototype.splice.apply(msa_file.unique_rows, splice_args);

  normalizeMsa(msa_file, 'right');
  msa_file.status.parsed = true;
}

export function normalizeMsa(msa_file, filling_from){
  if (filling_from !== 'left' && filling_from !== 'right') {
    filling_from = 'right';
  }
  //make alignments a square_matrix
  var max = 0;
  for (var i=0; i< msa_file.unique_rows.length; i++) {
    var row = msa_file.unique_rows[i];
    max = Math.max(max, row.alignment.length);
  }
  msa_file.width = max;
  for (i=0; i< msa_file.unique_rows.length; i++) {
    let row = msa_file.unique_rows[i];
    if (row.alignment.length < max) {
      row.dirty = true;
      while (row.alignment.length < max) {
        if (filling_from == 'right') {
          row.alignment.push(row.empty_symbol);
        } else {
          row.alignment.splice(0, 0, row.empty_symbol);
        }
      }
    }
  }
}

export //completely rebuild DOM table for the given msa_file
function showMSA(msa_file, edit_mode) {
  var msa_head = document.getElementById('msa_head');
  var text = '';
  if (text.length !== 0) {
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
    var row_class;
    row.dirty = true;
    if (row instanceof AnnotationRow) {
      row_class = 'ann_row';
    } else {
      row_class = 'alm_row';
    }
    text += '<tr class="' + row_class + '"><td class="taxon">' + row.row_header + '</td>';
    for (var col_idx = 0; col_idx < alignment.length; col_idx++) {
      let cell = '&nbsp;'; //make sure a textNode gets always created as a child of table data node
      let tab_definition;
      if (edit_mode) {
        tab_definition = '" tabindex=' + tabindex;
      } else {
        tab_definition = '';
      }
      text += '<td class="' + css_class + tab_definition + '">' + cell + '</td>';
      tabindex++;
    }
    text += '</tr>';
  }
  msa_body.innerHTML = text;
  syncMsaToDom(msa_file);

  $('#msa_table').off('keydown'); 
  if (msa_file.status.mode === 'edit') {
    $('#msa_table').keydown(tableSelection.keydownHandler);
    var td = document.querySelectorAll('TD');
    for (var i = 0; i < td.length; i++) {
      td[i].onmousedown = tableSelection.mousedownHandler;
      td[i].ondblclick = tableSelection.openEditDialog;
    }
  }
 
  if (document.getElementById('view'))
    document.getElementById('view').disabled = !edit_mode;
  if (document.getElementById('edit'))
    document.getElementById('edit').disabled = edit_mode;
  if (document.getElementById('minimize'))
    document.getElementById('minimize').style.display = (edit_mode && 'inline' || 'none');
  if (edit_mode) tableSelection.initializeSelection();
  cloneTableHeaders();
}

export //has to be called to propagate updates of the msa_file during edit to the DOM
function syncMsaToDom(msa_file) {
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
    table_row.classList.add('alm_row');
    document.body.appendChild(table_row);
  }
  while(rows.length > tbody.children.length) {
    tbody.removeChild(tbody.lastChild);
  }

  //sync rows
  var tab_index = 1;
  for(var row_idx=0; row_idx < rows.length; row_idx++) {
    tab_index = rows[row_idx].syncRowToDom(tbody.children[row_idx], tab_index);
  }
  cloneTableHeaders();
}

export function executeOperation(func) {
  var msa_file = fileManager.activeFile();
  var selection = tableSelection.getSelection();
  if (msa_file === null || selection === undefined) return;

  var undoFunc = captureCurrentState();
  tableSelection.clearSelection();
  func(msa_file, selection);
  syncMsaToDom(msa_file);
  tableSelection.markSelection();
  window.undoManager.add({ undo: undoFunc,
    redo: function() {
      tableSelection.clearSelection();
      tableSelection.setSelection(selection);
      func(msa_file, selection);
      syncMsaToDom(msa_file);
      tableSelection.markSelection();
    }
  });
}

// ---------------------------- PRIVATE --------------------------------------

//sticky table headers
function cloneTableHeaders() {
  var sticky_table = document.getElementById('msa_sticky_header_table');
  sticky_table.style.visibility = 'hidden';
  var sticky_body = document.getElementById('msa_sticky_header_body');
  $(sticky_body).empty();
  var tbody = document.getElementById('msa_body');
  var table = tbody.parentElement;
  sticky_table.style.width = $(table).width() + 'px';
  for (var index = 0; index < tbody.children.length; index++) {
    var tr = tbody.children[index];
    if (tr.classList.contains('ann_row')) {
      var cloned_row = tr.cloneNode(true);
      sticky_body.appendChild(cloned_row);
      for(var cell_index=0; cell_index < cloned_row.children.length; cell_index++) {
        var cell = cloned_row.children[cell_index];
        cell.style.width = $(tr.children[cell_index]).width() + 'px';
        cell.removeAttribute('tabIndex');
        cell.classList.remove('selected-left');
        cell.classList.remove('selected-right');
        cell.classList.remove('selected-top');
        cell.classList.remove('selected-bottom');
      }
    }
  }
  updateTableHeaders();
}

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
    if (msa_file === null) return;
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
    rows[i].dirty = true;
    //modify alignment in place to keep referencing rows in sync with change
    var splice_args = [0, rows[i].alignment.length];
    Array.prototype.push.apply(splice_args, alignments[i]);
    Array.prototype.splice.apply(rows[i].alignment, splice_args);
  }
  msa_file.width = rows[0].alignment.length;
}

//include UI update
export function removeGapColumnsForActive(msa_file) {
  tableSelection.clearSelection(); //may become invalid
  removeGapColumns(msa_file);
  tableSelection.fixSelection();
}

//do the actual work
export function removeGapColumns(msa_file) {
  //remove columns containing only gaps
  for (var x=msa_file.width-1; x>=0; x--) {
    var only_gaps = true;
    for(var i=0; i < msa_file.unique_rows.length; i++) {
      var row = msa_file.unique_rows[i];
      if (row.alignment[x].trim() !== row.empty_symbol) {
        only_gaps = false;
        break;
      }
    }
    if (!only_gaps) continue;
    msa_file.width -= 1;
    for(let i=0; i< msa_file.unique_rows.length; i++) {
      let row = msa_file.unique_rows[i];
      row.dirty = true;
      row.alignment.splice(x,1);
    }
  }
}