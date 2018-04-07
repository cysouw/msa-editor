import '../styles/msa-editor.scss';
import { MSAEditorOnLoad, fileManager, showHelpWindow } from  './msa-editor';
import { saveAs } from 'file-saver';

window.onload = MSAEditorOnLoad;
window.fileManager = fileManager;
window.showHelpWindow = showHelpWindow;
window.jQuery = $;
window.saveAs = saveAs;