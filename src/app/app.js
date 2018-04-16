import '../styles/msa-editor.css';
import '../../node_modules/jquery-ui/themes/base/all.css';
import { MSAEditorOnLoad, showHelpWindow } from  './msa-editor';
import { fileManager } from './file-manager';
import { saveAs } from 'file-saver';

window.onload = MSAEditorOnLoad;
window.fileManager = fileManager;
window.showHelpWindow = showHelpWindow;
window.jQuery = $;
window.saveAs = saveAs;