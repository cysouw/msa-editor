import { tableSelection } from './table-selection';
import { fillWithDots } from './helpers';

export class AnnotationRow {
  constructor() {
    this.row_header = undefined;
    this.alignment = [];
    this.empty_symbol = '.';
    this.dirty = true;
  }

  exportRow(msa_file, secondary_separator) {
    return ':ANN\t' + fillWithDots(this.row_header, msa_file.taxlen) + '\t' +
      this.alignment.join(secondary_separator) + '\n';
  }

  parseRow(parts) {
    this.row_header = parts[1].replace(/\.*$/, '');
    this.alignment = parts.slice(2).map(x => {
      x = x.trim();
      return x === '' && this.empty_symbol || x;
    });
    return this.row_header;
  }

  syncRowToDom(table_row, tab_index) {
    if (!this.dirty)
      return tab_index + this.alignment.length;
    //sync cell count
    while (this.alignment.length + 1 > table_row.children.length) {
      var table_data = document.createElement('TD');
      table_data.classList.add('residue');
      table_data.onmousedown = tableSelection.mousedownHandler;
      table_data.ondblclick = tableSelection.openEditDialog;
      table_data.appendChild(document.createTextNode(''));
      table_row.appendChild(table_data);
    }
    while (this.alignment.length + 1 < table_row.children.length) {
      table_row.removeChild(table_row.lastChild);
    }
    var textNode = table_row.children[0].childNodes[0];
    if (textNode.nodeValue !== this.row_header) {
      textNode.nodeValue = this.row_header;
      table_row.children[0].classList = ['taxon'];
    }
    for (var col_idx = 0; col_idx < this.alignment.length; col_idx++) {
      var cell = table_row.children[col_idx + 1];
      cell.tabIndex = tab_index++;
      textNode = cell.childNodes[0];
      if (textNode.nodeValue !== this.alignment[col_idx]) {
        textNode.nodeValue = this.alignment[col_idx];
        //update backgroundColor
        cell.style.backgroundColor = '';
      }
    }
    this.dirty = false;
    return tab_index;
  }
}
