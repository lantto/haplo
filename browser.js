'use strict';

(function() {
    var hasRequire = typeof require !== 'undefined';

    var $ = this.$;

    if (typeof $ === 'undefined') {
        if (hasRequire) {
            $ = require('jquery');
        } else {
            throw new Error('Haplo requires jQuery');
        }
    }

    function Client() {
        this.host = '';
    }

    Client.prototype.server = function(id) {
        var that = this;

        return function(data, callback) {
			if (typeof data === 'function') {
				callback = data;
			}
		
            $.ajax({
                type: 'POST',
                url: that.host + '/' + id,
                dataType: 'json',
                contentType : 'application/json',
                data: JSON.stringify(data),
                success: function(data) {
                    callback.apply(null, $.map(data, function(val) {
                        return val;
                    }));
                }
            });
        }
    }

    if (typeof module === 'object' && typeof module.exports === 'object' ) {
        module.exports = new Client();
    } else {
        window.haplo = new Client();
    }
}).call(this);