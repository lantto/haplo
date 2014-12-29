'use strict';

var $ = require('jquery');

function Client() {
    this.host = '';
}

Client.prototype.server = function(id) {
    var that = this;

    return function(data, callback) {
        $.ajax({
            type: 'POST',
            url: that.host + '/' + id,
            dataType: 'json',
            contentType : 'application/json',
            data: JSON.stringify(data),
            success: callback
        });
    }
}

module.exports = function(context) {
    switch (context) {
        case 'client':
            return new Client();
            break;
    }
}