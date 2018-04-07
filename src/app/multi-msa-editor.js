var fileName = null;
var dataFrame = null;
var dataTable = null;
var msaFile = null;
var metaData = null;

function openFile(files) {
  var datatableInitComplete = function () {
    this.api().columns().every( function () {
      var that = this;
      $('input', this.footer()).on('change', function () {
        if (that.search() !== this.value) {
          that.search(this.value, true, false).draw();
        }
      } );
    } );
  };

  var datatableDrawCallback = function() {
    $('#data_table tbody td').editable( function(new_value, settings) {
      var data_row = dataFrame[this._DT_CellIndex.row];
      var row = dataTable.row(this._DT_CellIndex.row)
      var column = dataTable.column(this._DT_CellIndex.column);
      var field_name = metaData.fields[this._DT_CellIndex.column];
      data_row[field_name] = new_value;
      dataTable.cell(this._DT_CellIndex).data(new_value);
      //possibly reapply search
      var search_term = column.search();
      if (search_term !== '' && new_value.search(new RegExp(search_term, 'i')) === -1) {
        //fire search again because new value doesn't match anymore
        var table_row = row.node();
        $(table_row).fadeTo(1000, 0.2);
        window.setTimeout(function() {
          $(table_row).fadeIn({duration: 0});
          column.search(column.search(), true, false).draw();
        }, 1000);
      }
      return new_value;
    });
  }

  var completeCallback = function(results) {
    dataFrame = results.data;
    metaData = results.meta;

    var columns = [];
    var footer = $('#data_table tfoot tr');
    var name_selector = $('#name_col');
    var alignment_selector = $('#alignment_col');
    for(var i=0; i < results.meta.fields.length; i++) {
      var name = results.meta.fields[i];
      footer.append('<td><input type="text" placeholder="Search '+name+'" /></td>');
      name_selector.append('<option value="' + name + '">' + name + '</option>');
      alignment_selector.append('<option value="' + name + '">' + name + '</option>');
      columns.push({title: name, data: name});
    }
    dataTable = $('#data_table').DataTable( {
      destroy: true,
      data: results.data,
      columns: columns,
      initComplete: datatableInitComplete,
      drawCallback: datatableDrawCallback
    });

    $('#tabs').tabs('option', 'disabled', []);
  };

  var errorCallback = function(error, file) {
    alert('Error: File loading failed. Reason: ' + error);
  };

  fileName = files[0].name;
  Papa.parse(files[0], {
    delimiter: '\t',
    header: true,
    comments: '#',
    skipEmptyLines: true,
    complete: completeCallback,
    error: errorCallback
  });
  
  document.getElementById('save').disabled = false;
}

function saveFile() {
  var data = Papa.unparse(dataFrame, {
    delimiter: '\t',
    header: true,
    fields:metaData.fields});
  var blob = new Blob([data], {
    type: "text/plain;charset=utf-8"
  });
  saveAs(blob, fileName);
}

function initEditor() {
  var data = $('#data_table').DataTable().rows({search: 'applied'}).data();
  msaFile = new MSAFile();

  name_key = document.getElementById('name_col').value;
  alignment_key = document.getElementById('alignment_col').value;
  msaFile.alignment_key = alignment_key;
  width = 0;
  for(var i=0; i<data.length; i++) {
    data_row = data[i];
    msa_row = new MSARow();
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
  document.getElementById('minimize').disabled = false;
  document.getElementById('apply_changes').disabled = false;
}

function applyChanges() {
  for (var i=0; i< msaFile.rows.length; i++) {
    var row = msaFile.rows[i];
	row.source[msaFile.alignment_key] = row.alignment.join(' ');
  }
  dataTable.rows().invalidate().draw();
}

function multiMSAEditorOnLoad() {
  undoManager = new UndoManager();
  undoManager.setCallback(undoManagerChanged);
  undoManagerChanged();

  $( "#cell_edit_dialog" ).dialog({
    autoOpen: false,
    modal: true,
    buttons: {
      "Apply": function() {
        $( this ).dialog( "close" );
        tableSelection.editActiveCell(this.event_target, cell_content.value);

      },
      Cancel: function() {
        $( this ).dialog( "close" );
      }
    },
  });

  $( "#help_window" ).dialog({
    autoOpen: false,
    modal: true,
    width: '80ex',
    height: 'auto'
  });

  //sticky table header
  $(window)
    .scroll(updateTableHeaders)
    .trigger("scroll");  

  //tsv / editor tab
  $( "#tabs" ).tabs({disabled: [1]});
};

