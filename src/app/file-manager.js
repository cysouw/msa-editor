import { AnnotationRow } from './annotation-row';
import { MSARow } from './msa-row';
import { MSAFile } from './msa-file';
import {
  parseMSA,
  showMSA,
  executeOperation,
  removeGapColumns,
  removeGapColumnsForActive
} from './helpers';
import { flatFormat } from './flat-format';
import { nestedFormat } from './nested-format';
import * as fs from 'fs';

export var fileManager = (function() {
  var fileFormat = null;
  var fileHandles = null;
  var MSAFiles = null;
  var active_idx = -1; //-1 means no valid selection
  var edit_mode = false;

  function setEditMode(new_mode) {
    edit_mode = new_mode;
    if (document.getElementById('undo_button')) {
      document.getElementById('undo_button').style.display =
        (new_mode && 'inline') || 'none';
    }
    if (document.getElementById('redo_button')) {
      document.getElementById('redo_button').style.display =
        (new_mode && 'inline') || 'none';
    }
  }

  function exportFile(msa_file) {
    if (fileFormat === null) {
      alert('No file format selected');
      return;
    }
    var data = '';

    if (msa_file.orderChanged()) {
      //reordered file, export only initial comments, annotation and alignment rows
      for (let i = 0; i < msa_file.lines.length; i++) {
        let line = msa_file.lines[i];
        if (!(typeof line === 'string' || line instanceof String)) {
          break;
        }
        data += line;
      }
      for (let i = 0; i < msa_file.unique_rows.length; i++) {
        var row = msa_file.unique_rows[i];
        data += row.exportRow(msa_file, fileFormat.secondary_separator);
        if (row instanceof MSARow) {
          for (var j = 0; j < row.equal_rows.length; j++) {
            data += row.equal_rows[j].exportRow(
              msa_file,
              fileFormat.secondary_separator
            );
          }
        }
      }
    } else {
      //export file as close as possible to the original
      for (let i = 0; i < msa_file.lines.length; i++) {
        let line = msa_file.lines[i];
        if (line instanceof MSARow || line instanceof AnnotationRow) {
          data += line.exportRow(msa_file, fileFormat.secondary_separator);
        } else {
          data += line;
        }
      }
    }

    if (typeof fs.writeFile === 'function') {
      fs.writeFile(msa_file.filepath, data, function(err) {
        if (err) {
          return alert('There was an error writing the file: ', err);
        }
        return alert('File saved.');
      });
    } else {
      const blob = new Blob([data], {
        type: 'text/plain;charset=utf-8'
      });
      window.saveAs(blob, msa_file.filename);
    }
  }

  return {
    setFiles: function(files) {
      // _active_idx
      MSAFiles = files;
      active_idx = 0;
    },

    handleFiles: function(_fileHandles) {
      //user selected new set of files
      fileHandles = _fileHandles;
      //clear drop down list
      var elem = document.getElementById('msa_select');
      while (elem.firstChild) {
        elem.removeChild(elem.firstChild);
      }
      active_idx = -1;
      MSAFiles = [];
      var get_onload_callback = function(msa_obj, index) {
        return function(event) {
          fileManager.fileLoaded(event, msa_obj, index);
        };
      };
      //create an MSAFile for every selected file
      for (var i = 0; i < fileHandles.length; i++) {
        var handle = fileHandles[i];
        var msa = new MSAFile();
        msa.filename = handle.name;
        msa.filepath = handle.path;

        //prepare callback for read completion
        var reader = new FileReader();
        reader.onload = get_onload_callback(msa, i);
        reader.readAsText(handle);
      }
    },

    reload: function(do_ask) {
      if (fileHandles === null || active_idx === undefined) return;
      if (do_ask && MSAFiles[active_idx].status.edited) {
        $('#reload_dialog').dialog('open');
        return;
      }
      var handle = fileHandles[active_idx];
      var msa = new MSAFile();
      var reader = new FileReader();
      msa.filename = handle.name;
      reader.onload = (function(msa, MSAFiles, active_idx) {
        return function(event) {
          msa.filecontent = event.target.result;
          MSAFiles[active_idx] = msa;
          var elem = document.getElementById('msa_select');
          elem.onchange(elem);
        };
      })(msa, MSAFiles, active_idx);
      reader.onerror = function(event) {
        var error = event.target.error;
        if (error.name !== undefined) {
          alert(
            'Reloading failed with the following error code: ' + error.name
          );
        } else if (
          window.FileError !== undefined &&
          error instanceof FileError
        ) {
          //Safari
          if (error.code == FileError.NOT_FOUND_ERR) {
            alert(
              'Reloading failed with error code NOT_FOUND_ERR. The Reload feature is known not to ' +
                'work in Safari if you change the file outside the Browser before reloading. ' +
                'In this case, please use another browser.'
            );
          } else {
            let code_to_name = {};
            for (var name in FileError) {
              if (name.endsWith('ERR')) {
                code_to_name[FileError[name]] = name;
              }
            }
            alert(
              'Reloading failed with the following error code: ' +
                code_to_name[error.code] +
                '.'
            );
          }
        } else {
          alert('Reloading failed with an unexpected error: ' + error);
        }
      };
      reader.readAsText(handle);
    },

    handleFileSelect: function(event) {
      //user selects a msa file from drop down list
      var selected_idx = parseInt(event.value);
      active_idx = selected_idx;
      if (!MSAFiles[selected_idx].status.parsed) {
        parseMSA(MSAFiles[selected_idx], fileFormat);
      }
      showMSA(MSAFiles[selected_idx], false);
      setEditMode(false);
    },

    handleFileFormatSelect: function(event) {
      if (event.value == 'nested') {
        fileFormat = nestedFormat;
      } else if (event.value == 'flat') {
        fileFormat = flatFormat;
      } else {
        alert('Unknown file format');
        fileFormat = null;
      }
    },

    showSelectedFile: function(unique) {
      if (unique === edit_mode) return; // no op
      showMSA(MSAFiles[active_idx], unique);
      setEditMode(unique);
      if (unique) window.undoManager.clear();
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
      document.getElementById('view').className = 'submit active';
      document.getElementById('edit').className = 'submit active';
      document.getElementById('reload').className = 'submit active';
      document.getElementById('save').className = 'submit active';
      document.getElementById('minimize').className = 'submit active';
      if (active_idx === -1) {
        elem.value = index;
        elem.onchange(elem);
      }
    },

    saveFiles: function() {
      if (MSAFiles === null) {
        return;
      }
      var count = 0;
      for (var i = 0; i < MSAFiles.length; i++) {
        if (
          MSAFiles[i].status.edited ||
          fileFormat !== MSAFiles[i].original_fileformat
        ) {
          if (i === active_idx) {
            if (edit_mode) {
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
        alert('No modified files found.');
      }
    },

    activeFile: function() {
      if (MSAFiles === null) {
        return null;
      }
      return MSAFiles[active_idx];
    }
  };
})();
