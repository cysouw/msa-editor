import { tableSelection } from './table-selection';
import { fillWithDots } from './helpers';
import { getCssBackgroundColor } from './cell-style';

export class MSARow {
  constructor() {
    this.id = undefined;
    this.row_header = undefined; //taxon
    this.alignment = []; //always modify in place to keep references valid
    this.equal_rows = []; //list of rows with the same alignment as this one
    this.unique = true; //if unique === true then alignment contains original data, else alignment is a shared reference to another row alignment
    this.empty_symbol = '-';
    this.dirty = true;
    this.exportRow = function (msa_file, secondary_separator) {
      var result = '';
      var row_start = [];
      if (msa_file.with_id) {
        row_start.push(this.id);
      }
      row_start.push(fillWithDots(this.row_header, msa_file.taxlen));
      result += row_start.join('\t') + '\t' + this.alignment.join(secondary_separator) + '\n';
      return result;
    };
  }

  parseRow(parts, with_id) {
    if (with_id) { //id as first row entry
      this.id = parts.shift();
    }
    this.row_header = parts[0].replace(/\.*$/, '');
    this.alignment = parts.slice(1).map(function (x) {
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
        //update background color
        cell.style.backgroundColor = getCssBackgroundColor(this.alignment[col_idx]);
      }
    }
    this.dirty = false;
    return tab_index;
  }
}
