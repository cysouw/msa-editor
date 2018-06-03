import '../styles/multi-msa-editor.css';
import '../../node_modules/jquery-ui/themes/base/all.css';
import 'jquery-ui/ui/widgets/dialog';
import 'jquery-ui/ui/widgets/tabs';
import '../../node_modules/jquery-jeditable/src/jquery.jeditable';
import 'datatables.net-jqui';
import 'datatables.net-buttons-jqui';
import { multiMSAEditorOnLoad, showHelpWindow, openFile, openFileFromPath,
  saveFile, initEditor, applyChanges } from  './multi-msa-editor';
import { saveAs } from 'file-saver';
import { executeOperation, removeGapColumnsForActive } from './helpers';

window.onload = multiMSAEditorOnLoad;
window.openFile = openFile;
window.openFileFromPath = openFileFromPath;
window.saveFile = saveFile;
window.initEditor = initEditor;
window.executeOperation = executeOperation;
window.removeGapColumnsForActive = removeGapColumnsForActive;
window.applyChanges = applyChanges;
window.showHelpWindow = showHelpWindow;
window.jQuery = $;
window.saveAs = saveAs;