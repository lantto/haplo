haplo
====
haplo lets you write both your front-end and back-end in the same codebase.

```javascript
// main.js
haplo.server(function() {
    var data = 'foobar';
    haplo.client(function(data) {
        alert(data);
    })(data);
});
```

The data variable will only exist on the server and be retrieved by the client via AJAX on load. It works by compiling it down to separate files, one for each end, and automatically setting up routes for the transition between contexts.

```sh
$ haplo main.js
```

```javascript
// client.js
haplo.server(1)(function (data) {
    alert(data);
});
```

```javascript
// server.js
haplo.on(1, function () {
    var data = 'foobar';
    return haplo.client(data);
});
```
