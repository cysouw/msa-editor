import Papa from 'papaparse';
import UndoManager from 'undo-manager';
import { saveAs } from 'file-saver';
import electron from 'electron';

import { updateTableHeaders } from './helpers';
import { MSARow } from './msa-row';
import { MSAFile } from './msa-file';
import { normalizeMsa, showMSA } from './helpers';
import { fileManager } from './file-manager';
import { tableSelection } from './table-selection';
import * as fs from 'fs';


var fileName = null;
var filePath = null;
var dataFrame = null;
var dataTable = null;
var msaFile = null;
var metaData = null;

export function showHelpWindow() {
  $('#help_window').dialog('open');
}

export function openFileFromPath(path) {
  fs.readFile(path, function(err, data) {
    if (!err) {
      const fileObj = new Blob([data], {
        type: 'text/plain;charset=utf-8'
      });
      fileObj.path = path;
      fileObj.name = path.replace(/^.*[\\\/]/, '');
      openFile([fileObj]);
    }
  });
}

export function openFile(files) {
  var datatableInitComplete = function() {
    this.api()
      .columns()
      .every(function() {
        var that = this;
        $('input', this.footer()).on('change', function() {
          if (that.search() !== this.value) {
            that.search(this.value, true, false).draw();
          }
        });
      });
  };

  var datatableDrawCallback = function() {
    $('#data_table tbody td').editable(function(new_value) {
      //, settings
      var data_row = dataFrame[this._DT_CellIndex.row];
      var row = dataTable.row(this._DT_CellIndex.row);
      var column = dataTable.column(this._DT_CellIndex.column);
      var field_name = metaData.fields[this._DT_CellIndex.column];
      data_row[field_name] = new_value;
      dataTable.cell(this._DT_CellIndex).data(new_value);
      //possibly reapply search
      var search_term = column.search();
      if (
        search_term !== '' &&
        new_value.search(new RegExp(search_term, 'i')) === -1
      ) {
        //fire search again because new value doesn't match anymore
        var table_row = row.node();
        $(table_row).fadeTo(1000, 0.2);
        window.setTimeout(function() {
          $(table_row).fadeIn({ duration: 0 });
          column.search(column.search(), true, false).draw();
        }, 1000);
      }
      return new_value;
    });
  };

  var completeCallback = function(results) {
    dataFrame = results.data;
    metaData = results.meta;

    var columns = [];
    var footer = $('#data_table tfoot tr');
    var name_selector = $('#name_col');
    var alignment_selector = $('#alignment_col');
    for (var i = 0; i < results.meta.fields.length; i++) {
      var name = results.meta.fields[i];
      footer.append(
        '<td><input type="text" placeholder="Search ' + name + '" /></td>'
      );
      name_selector.append(
        '<option value="' + name + '">' + name + '</option>'
      );
      alignment_selector.append(
        '<option value="' + name + '">' + name + '</option>'
      );
      columns.push({ title: name, data: name });
    }
    dataTable = $('#data_table').DataTable({
      destroy: true,
      data: results.data,
      columns: columns,
      initComplete: datatableInitComplete,
      drawCallback: datatableDrawCallback
    });

    $('#tabs').tabs('option', 'disabled', []);
  };

  var errorCallback = function(error) {
    // , file
    alert('Error: File loading failed. Reason: ' + error);
  };

  fileName = files[0].name;
  filePath = files[0].path;
  Papa.parse(files[0], {
    delimiter: '\t',
    header: true,
    comments: '#',
    skipEmptyLines: true,
    complete: completeCallback,
    error: errorCallback
  });

  const saveButton = document.getElementById('save');
  if (saveButton) {
    saveButton.disabled = false;
  }
}

export function saveFile() {
  var data = Papa.unparse(dataFrame, {
    delimiter: '\t',
    header: true,
    fields: metaData.fields
  });
  if (typeof fs.writeFile === 'function') {
    fs.writeFile(filePath, data, function(err) {
      if (err) {
        return alert('There was an error writing the file: ', err);
      }
      return alert('File saved.');
    });
  } else {
    var blob = new Blob([data], {
      type: 'text/plain;charset=utf-8'
    });
    saveAs(blob, fileName);
  }
}

export function initEditor() {
  var data = $('#data_table')
    .DataTable()
    .rows({ search: 'applied' })
    .data();
  msaFile = new MSAFile();

  const name_key = document.getElementById('name_col').value;
  const alignment_key = document.getElementById('alignment_col').value;
  msaFile.alignment_key = alignment_key;
  let width = 0;
  for (var i = 0; i < data.length; i++) {
    const data_row = data[i];
    const msa_row = new MSARow();
    msa_row.source = data_row;
    msaFile.rows.push(msa_row);
    msa_row.row_header = data_row[name_key];
    msa_row.alignment = data_row[alignment_key].split(' ');
    width = Math.max(width, msa_row.alignment.length);
  }
  msaFile.width = width;
  msaFile.computeUniqueRows();
  normalizeMsa(msaFile, 'right');

  fileManager.setFiles([msaFile], 0);
  showMSA(msaFile, true);
  if (electron) {
    const menu = electron.remote.Menu.getApplicationMenu();
    menu.getMenuItemById('minimize').enabled = true;
    menu.getMenuItemById('applyToTsv').enabled = true;
  }
  if (document.getElementById('minimize')) {
    document.getElementById('minimize').disabled = false;
  }
  if (document.getElementById('apply_changes')) {
    document.getElementById('apply_changes').disabled = false;
  }
}

export function applyChanges() {
  for (var i = 0; i < msaFile.rows.length; i++) {
    var row = msaFile.rows[i];
    row.source[msaFile.alignment_key] = row.alignment.join(' ');
  }
  dataTable
    .rows()
    .invalidate()
    .draw();
}

export function multiMSAEditorOnLoad() {
  window.undoManager = new UndoManager();
  window.undoManager.setCallback(undoManagerChanged);
  undoManagerChanged();

  $('#cell_edit_dialog').dialog({
    autoOpen: false,
    modal: true,
    buttons: {
      Apply: function() {
        $(this).dialog('close');
        const cell_content = document.getElementById('cell_content');
        tableSelection.editActiveCell(this.event_target, cell_content.value);
      },
      Cancel: function() {
        $(this).dialog('close');
      }
    }
  });

  $('#help_window').dialog({
    autoOpen: false,
    modal: true,
    width: '80ex',
    height: 'auto'
  });

  //sticky table header
  $(window)
    .scroll(updateTableHeaders)
    .trigger('scroll');

  //tsv / editor tab
  $('#tabs').tabs({ disabled: [1] });
}

function undoManagerChanged() {
  var undo = document.getElementById('undo_button');
  if (undo) {
    undo.disabled = !window.undoManager.hasUndo();
  }
  var redo = document.getElementById('redo_button');
  if (redo) {
    redo.disabled = !window.undoManager.hasRedo();
  }
  if (electron) {
    const menu = electron.remote.Menu.getApplicationMenu();
    menu.getMenuItemById('undo').enabled = window.undoManager.hasUndo();
    menu.getMenuItemById('redo').enabled = window.undoManager.hasRedo();
  }
}
