import { fileManager } from './file-manager';
import { executeOperation, normalizeMsa } from './helpers';
import { removeGapColumnsForActive } from './file-manager';

export var tableSelection = (function () {
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
    result.x = Array.prototype.indexOf.call(node.parentNode.children, node);
    node = node.parentNode;
    result.y = Array.prototype.indexOf.call(node.parentNode.children, node);
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
    if (msa_file === null) return;
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
    keepActiveNodeVisible();
  }

  function initializeSelection() {
    startSelection(1,0);
  }

  function startSelection(x,y) {
    var msa_file = fileManager.activeFile();
    if (msa_file === null) return;

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
    if (msa_file === null) return;

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
        fileManager.showSelectedFile(false, window.undoManager);
      } else if (event.keyCode === 85) { //u ndo
        window.undoManager.undo();
      } else if (event.keyCode === 82) { //r edo
        window.undoManager.redo();
      } else if (event.keyCode === 83) { //s ave
        fileManager.saveFiles();
      } else if (event.keyCode === 77) { //m inimize
        executeOperation(removeGapColumnsForActive);
      } else if (event.keyCode === 69) { //e dit cell
        tableSelection.openEditDialog(event);
      } else if (event.keyCode === 13) {
        if (event.shiftKey) {
          if (event.ctrlKey || event.metaKey) {
            executeOperation(function(msa, sel) {splitSelectionAndFill(msa, sel, 'left');});
          } else {
            executeOperation(function(msa, sel) {splitSelectionAndFill(msa, sel, 'right');});
          }
        } else if (event.ctrlKey || event.metaKey) {
          executeOperation(function(msa, sel) {mergeSelectionAndFill(msa, sel, 'left');});
        } else {
          executeOperation(function(msa, sel) {mergeSelectionAndFill(msa, sel, 'right');});
        }
      } else if (event.keyCode === 46 || event.keyCode === 8) { // DEL or Backspace
        if (event.ctrlKey || event.metaKey) {
          executeOperation(function(msa, sel) {deleteSelectionAndFill(msa, sel, 'left');});
        } else {
          executeOperation(function(msa, sel) {deleteSelectionAndFill(msa, sel, 'right');});
        }
      } else if ([37,39].indexOf(event.keyCode) !== -1 && (event.ctrlKey || event.metaKey)) {
        if (event.keyCode === 37) {
          executeOperation(function(msa, sel) {moveSelectionLeft(msa, sel);});
        } else {
          executeOperation(function(msa, sel) {moveSelectionRight(msa, sel);});
        }
      } else if ([38,40].indexOf(event.keyCode) !== -1 && (event.ctrlKey || event.metaKey)) {
        if (event.keyCode === 38) {
          executeOperation(function(msa, sel) {moveSelectionUp(msa, sel);});
        } else {
          executeOperation(function(msa, sel) {moveSelectionDown(msa, sel);});
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
      } else {
        return true;
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
      if(msa_file === null || 
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
      if (msa_file === null) return;
      var cell_content = msa_file.unique_rows[position.y].alignment[position.x-1];
      document.getElementById('cell_content').value = cell_content;
      var elem = document.getElementById("cell_edit_dialog");
      elem.event_target = event.target;
      $(elem).dialog({position: { my: "center top", at: "center bottom", of: $(event.target), collision: "fit" }});
      $(elem).dialog("open");
    },

    editActiveCell: function(cell, new_value) {
      let position = getPositionInTable(cell);
      if (position === undefined) return;
      var msa_file = fileManager.activeFile();
      if (msa_file === null) return;
      executeOperation(function(msa_file) { // , selection
        msa_file.unique_rows[position.y].alignment[position.x-1] = new_value;
      });
    }
  };

})();

function keepActiveNodeVisible() {
  var active = document.activeElement;
  if (active === undefined || active.tagName !== "TD")
    return;

  var sticky_table = document.getElementById('msa_sticky_header_table');
  var scroll_top = window.scrollY;
  var offset = $(active).offset();
  if (offset.top < $(sticky_table).height() + scroll_top) {
    window.scrollBy(0, offset.top - $(sticky_table).height() - scroll_top - 10);
  }
}


function splitSelectionAndFill(msa_file, selection, filling_from) {
  var rows = msa_file.unique_rows;
  for (var y = selection.ul.y; y <= selection.lr.y; y++) {
    rows[y].dirty = true;
    var splice_args = [selection.ul.x, selection.lr.x-selection.ul.x+1];
    for (var x = selection.ul.x; x <= selection.lr.x; x++) {
      Array.prototype.push.apply(splice_args, splitString(rows[y].alignment[x]));
    }
    Array.prototype.splice.apply(rows[y].alignment, splice_args);
  }
  msa_file.status.edited = true;
  normalizeMsa(msa_file, filling_from);
}

// split a string into something approaching graphemes
function splitString(s) {
  var result = [];
  for (var i in s) {
    var code = s.charCodeAt(i);
    i = s.charAt(i);
    if (result.length > 0 &&
      ((code>=0xDC00 && code<0xE000) /*low surrogate*/ || 
       (code>=0x0300 && code<0x0370) /*combining mark*/)) {
      result[result.length-1] = result[result.length-1] + i;
    } else {
      result.push(i);
    }
  }
  return result;
}


function mergeSelectionAndFill(msa_file, selection, filling_from) {
  var rows = msa_file.unique_rows;
  var fill_position = (filling_from == 'left' && selection.ul.x || selection.ul.x+1);

  for (var y = selection.ul.y; y <= selection.lr.y; y++) {
    var row = rows[y];
    var repl = '';

    row.dirty = true;
    var filler_args = [fill_position, 0];
    for (var i = selection.ul.x; i < selection.lr.x; i++) {
      filler_args.push(row.empty_symbol);
    }
    
    for (var x = selection.ul.x; x <= selection.lr.x; x++) {
      if (row.alignment[x] !== row.empty_symbol && row.alignment[x] !== '?') {
        repl += row.alignment[x];
      }
    }
    if (repl === '') repl = row.empty_symbol;
    row.alignment.splice(selection.ul.x, selection.lr.x-selection.ul.x+1, repl);
    Array.prototype.splice.apply(row.alignment, filler_args);
  }
  msa_file.status.edited = true;
}

function deleteSelectionAndFill(msa_file, selection, filling_from) {
  var rows = msa_file.unique_rows;
  var count = selection.lr.x-selection.ul.x+1;
  for (var y=selection.ul.y; y<=selection.lr.y; y++) {
    rows[y].dirty = true;
    rows[y].alignment.splice(selection.ul.x, count);
  }
  msa_file.status.edited = true;
  normalizeMsa(msa_file, filling_from);
}

function moveSelectionLeft(msa_file, selection) {
  var rows = msa_file.unique_rows;

  for(var run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
    rows[run_y].dirty = true;
    rows[run_y].alignment.splice(selection.lr.x + 1, 0, rows[run_y].empty_symbol);
  }

  var found_empty_col = false;
  var run_x;
  column_loop:
  for (run_x = selection.ul.x - 1; run_x >= 0; run_x--) {
    for (let run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
      if (rows[run_y].alignment[run_x] !== rows[run_y].empty_symbol) {
        continue column_loop;
      }
    }
    found_empty_col = true;
    break;
  }
  if (found_empty_col) {
    for(let run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
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

  for(var run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
    rows[run_y].dirty = true;
    rows[run_y].alignment.splice(selection.ul.x, 0, rows[run_y].empty_symbol);
  }

  var found_empty_col = false;
  var run_x;
  column_loop:
  for (run_x = selection.lr.x+2; run_x < msa_file.width + 1; run_x++) {
    for (let run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
      if (rows[run_y].alignment[run_x] !== rows[run_y].empty_symbol) {
        continue column_loop;
      }
    }
    found_empty_col = true;
    break;
  }
  if (found_empty_col) {
    for(let run_y = selection.ul.y; run_y <= selection.lr.y; run_y++) {
      rows[run_y].alignment.splice(run_x, 1);
    }
  }
  normalizeMsa(msa_file, 'right');
  msa_file.status.edited = true;
  tableSelection.moveSelection(1,0);
}

function moveSelectionUp(msa_file, selection) {
  var rows = msa_file.unique_rows;

  //early return if
  //1. already at first entry or
  //2. move would mess up the annotation rows at the top of the table
  if (selection.ul.y === 0 || rows[selection.ul.y-1].constructor !== rows[selection.lr.y].constructor) return;
  
  var moved = rows.splice(selection.ul.y-1, 1);
  rows.splice(selection.lr.y, 0, moved[0]);
  
  for(var i= selection.ul.y-1; i <= selection.lr.y; i++) {
    rows[i].dirty = true;
  }

  msa_file.status.edited = true;
  tableSelection.moveSelection(0,-1);
}

function moveSelectionDown(msa_file, selection) {
  var rows = msa_file.unique_rows;

  //early return if
  //1. already at last entry or
  //2. move would mess up the annotation rows at the top of the table
  if (selection.lr.y + 1 === rows.length ||
    rows[selection.ul.y].constructor !== rows[selection.lr.y+1].constructor) return;

  var moved = rows.splice(selection.lr.y+1, 1);
  rows.splice(selection.ul.y, 0, moved[0]);

  for(var i= selection.ul.y; i <= selection.lr.y+1; i++) {
    rows[i].dirty = true;
  }
  
  msa_file.status.edited = true;
  tableSelection.moveSelection(0,1);
}
