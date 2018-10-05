$(document).ready(function () {
    $('#userTable').dataTable({
        lengthChange: false,
        paging: false
    });
    const userTable_wrapper = $("#userTable_wrapper");
    // const userTable_length = $("#userTable_length");
    const userTable_filter = $("#userTable_filter");

    const div = $("<div />");
    div.attr("id", "userTable_filter_div");
    // div.append(userTable_length);
    div.append(userTable_filter);
    userTable_wrapper.prepend(div);
});

const randPassword = function(){
    const input = $("#password");
    var length = 8,
    charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    input.val(retVal);
}