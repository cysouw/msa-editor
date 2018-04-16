import { AnnotationRow } from './annotation-row';

export class MSAFile {
  constructor() {
    this.meta_information = {}; //lines of the form "@<key>:<value>"
    this.lines = []; //parsed file: mix of comment lines and rows
    this.annotations = [];
    this.rows = []; //alignments
    this.unique_rows = [];
    this.width = 0; //width of the alignment table without the taxon
    this.with_id = true; // assume the first column of every row contains an ID
    this.taxlen = 0; //max length of taxa
    this.filename = undefined;
    this.filecontent = undefined; //file content as read in
    this.original_fileformat = null;
    this.status = {
      parsed: false,
      edited: false,
      mode: 'show'
    }; // or 'edit'
  }

  orderChanged() {
    var originals = this.rows.filter(function (element) { // , array, index
      return element instanceof AnnotationRow || element.unique;
    });
    if (originals.length !== this.unique_rows.length) {
      //should never happen
      return true;
    }
    for (var i = 0; i < originals.length; i++) {
      if (String(originals[i].alignment) !== String(this.unique_rows[i].alignment)) {
        return true;
      }
    }
    return false;
  }

  computeUniqueRows() {
    var seen = {};
    for (var i = 0; i < this.rows.length; i++) {
      var row = this.rows[i];
      var word = row.alignment.join('').replace(/-/g, '');
      if (word in seen) {
        row.unique = false;
        row.alignment = seen[word].alignment;
        seen[word].equal_rows.push(row);
      }
      else {
        this.unique_rows.push(row);
        seen[word] = row;
      }
    }
  }
}

