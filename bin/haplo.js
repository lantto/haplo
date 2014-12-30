#!/usr/bin/env node

var fs = require('fs'),
    mkpath = require('mkpath'),
    browserify = require('browserify'),
    haplo = require('../index'),
    fork = require('child_process').fork;
    
var child, fsTimeout;

function compile(force) {
    if (fsTimeout && !force) {
        return;
    }
    
    fsTimeout = setTimeout(function() { fsTimeout = null; }, 100); // http://stackoverflow.com/questions/12978924/fs-watch-fired-twice-when-i-change-the-watched-file

    fs.readFile('main.js', function (err, data) {
        if (data.length === 0) {
            compile(true);
            return;
        }
        
        console.log('Compiling...');
    
        var compiler = haplo('compiler');

        var code = compiler.compile(data);

        fs.writeFile('server.js', code.server, run);
        
        fs.writeFile('client.js', code.client, pack);
    });
}

function run() {
    if (child) {
        child.kill();
    }
    
    child = fork('./server');
}

function pack() {
    mkpath('public/dist', function (err) {
        browserify().add('./client.js').bundle().pipe(fs.createWriteStream('public/dist/bundle.js'));
        
        console.log('Done!');
    });
}

fs.watch('main.js', function() {
    compile();
});

compile();