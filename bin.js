#!/usr/bin/env node

var fs = require('fs'),
    mkpath = require('mkpath'),
    browserify = require('browserify'),
    haplo = require('./haplo'),
    fork = require('child_process').fork;
    
var child, fsTimeout;

function compile() {
    if (fsTimeout) {
        return;
    }
    
    fsTimeout = setTimeout(function() { fsTimeout = null; }, 100); // http://stackoverflow.com/questions/12978924/fs-watch-fired-twice-when-i-change-the-watched-file

    console.log('compiling...');
    
    fs.readFile('main.js', function (err, data) {
        var code = haplo.compile(data);

        fs.writeFile('server.js', code.server, run);
        
        fs.writeFile('client.js', code.client, pack);
    });
}

function run() {
    if (child) {
        child.kill();
    }
    
    child = fork('./snail');
}

function pack() {
    mkpath('public/dist', function (err) {
        browserify().add('./client.js').bundle().pipe(fs.createWriteStream('public/dist/bundle.js'));
        
        console.log('done!');
    });
}

fs.watch('main.js', compile);

compile();