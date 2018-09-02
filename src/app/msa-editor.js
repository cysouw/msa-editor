import UndoManager from 'undo-manager';
import 'jquery-ui/ui/widgets/dialog';

import { updateTableHeaders } from './helpers';
import { fileManager } from './file-manager';
import { tableSelection } from './table-selection';

function undoManagerChanged() {
  var undo = document.getElementById('undo_button');
  if (undo) {
    undo.disabled = !window.undoManager.hasUndo();
  }
  var redo = document.getElementById('redo_button');
  if (redo) {
    redo.disabled = !window.undoManager.hasRedo();
  }
}

/*
 * (generic) helper functions
 */

// function getDate() {
//   var today = new Date();
//   var dd = today.getDate();
//   var mm = today.getMonth() + 1; //January is 0!
//   var yyyy = today.getFullYear();
//   var hh = today.getHours();
//   var mins = today.getMinutes();

//   if (mm < 10) mm = '0' + mm;
//   if (dd < 10) dd = '0' + dd;
//   if (hh < 10) hh = '0' + hh;
//   if (mins < 10) mins = '0' + mins;

//   return [yyyy, mm, dd].join('-') + ' ' + hh + ':' + mins;
// }

function checkDependencies() {
  var result = '';
  if (UndoManager === undefined) result += 'Loading of UndoManager failed.\n';
  if (window.saveAs === undefined) result += 'Loading of FileSaver failed.\n';
  if (window.jQuery === undefined) result += 'Loading of JQuery failed.\n';
  else if (window.jQuery.ui === undefined)
    result += 'Loading of JQueryUI failed.\n';
  if (result !== '')
    result +=
      '\nThe application will not work as intended. Did you run fetch-dependencies.sh?';
  return result;
}

export function showHelpWindow() {
  $('#help_window').dialog('open');
}

//initialisation
export function MSAEditorOnLoad() {
  //check if all dependencies are loaded:
  const errMsg = checkDependencies();
  if (errMsg !== '') {
    alert(errMsg);
  }

  window.undoManager = new UndoManager();
  window.undoManager.setCallback(undoManagerChanged);
  undoManagerChanged();

  //initialize FileFormat properly
  var event = new Event('change');
  document.getElementById('msa_file_format').dispatchEvent(event);

  //prepare dialogs
  $('#reload_dialog').dialog({
    autoOpen: false,
    modal: true,
    width: 400,
    position: {
      my: 'center top',
      at: 'center bottom',
      of: $('#reload'),
      collision: 'fit'
    },
    buttons: {
      Proceed: function() {
        fileManager.reload(false);
        $(this).dialog('close');
      },
      Cancel: function() {
        $(this).dialog('close');
      }
    }
  });

  $('#cell_edit_dialog').dialog({
    autoOpen: false,
    modal: true,
    buttons: {
      Apply: function() {
        $(this).dialog('close');
        let cell_content;
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
}
