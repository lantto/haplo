(function() {
    'use strict';

    function Client() {
        this._host = '';
    }
    
    Client.prototype.setOptions = function(opts) {
        for (var prop in opts) {
            this['_' + prop] = opts[prop];
        }
    }

    Client.prototype.server = function(id, data, callback) {
        var xhr;
        
        if (typeof data === 'function') {
            callback = data;
        }
        
        xhr = new XMLHttpRequest();
        xhr.open('POST', this._host + '/' + id);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function() {
            var data;
            
            if (xhr.readyState === 4 && xhr.status === 200) {
                data = JSON.parse(xhr.responseText);
                callback.apply(null, Object.keys(data).map(function(key) {
                    return data[key];
                }));
            }
        }
        xhr.send(JSON.stringify(data));
    }

    if (typeof module === 'object' && typeof module.exports === 'object' ) {
        module.exports = new Client();
    } else {
        window.haplo = new Client();
    }
}).call(this);