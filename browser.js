(function() {
    'use strict';

    function Client() {
        this._host = '';
        this._port = null;
    }
    
    Client.prototype.setOptions = function(opts) {
        for (var prop in opts) {
            this['_' + prop] = opts[prop];
        }
    }

    Client.prototype.server = function(id, data, callback) {
        var xhr, 
            url = '';
        
        if (typeof data === 'function') {
            callback = data;
        }
        
        xhr = new XMLHttpRequest();
        
        url += this._host || window.location.protocol + '//' + window.location.hostname;

        if (this._port) {
            url += ':' + this._port;
        } else if (window.location.port) {
            url += ':' + window.location.port;
        }

        url += '/' + id;
        
        xhr.open('POST', url);
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