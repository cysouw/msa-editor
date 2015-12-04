var dataFrame = null;
var metaData = null;

function openFile(files) {
    var datatableInitComplete = function () {
        this.api().columns().every( function () {
            var that = this;
            $('input', this.footer()).on('change', function () {
                if (that.search() !== this.value) {
                    that.search(this.value).draw();
                }
            } );
        } );
    };

    var completeCallback = function(results, file) {
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
        $('#data_table').DataTable( {
            destroy: true,
            data: results.data,
            columns: columns,
            initComplete: datatableInitComplete
        });
        $('#tabs').tabs('option', 'disabled', []);
    };

    var errorCallback = function(error, file) {
        alert('Error: File loading failed. Reason: ' + error);
    };

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

}

function initEditor() {
    var data = $('#data_table').DataTable().rows({search: 'applied'}).data();
    var msa_file = new MSAFile();

    name_key = document.getElementById('name_col').value;
    alignment_key = document.getElementById('alignment_col').value;
    msa_file.alignment_key = alignment_key;
    width = 0;
    for(var i=0; i<data.length; i++) {
        data_row = data[i];
        msa_row = new MSARow();
        msa_file.unique_rows.push(msa_row);
        msa_row.row_header = data_row[name_key];
        msa_row.alignment = data_row[alignment_key].split(' ');
        width = Math.max(width, msa_row.alignment.length);
    }
    msa_file.width = width;
    
    fileManager.setFiles([msa_file], 0);
    showMSA(msa_file, true);
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

