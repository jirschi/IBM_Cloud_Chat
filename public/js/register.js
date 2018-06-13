//Tom Maier, 751605; Jerg Bengel, 752685

function init() {

    $('#picture').before('<input type="button" id="button-file" class=" form-control btn btn-md btn-primary btn-block" value="Add File" onchange="checkIfMsgEx()"/> ');
    $('#picture').hide();
    $('body').on('click', '#button-file', function () {
        $('#picture').trigger('click');
    });
}

function nospaces(t) {

    if (t.value.match(/\s/g)) {

        alert('Sorry, you are not allowed to enter any spaces');

        t.value = t.value.replace(/\s/g, '');

    }

}