#!/usr/bin/env node

var fs = require('fs'),
    mkpath = require('mkpath'),
    browserify = require('browserify'),
    haplo = require('../index'),
    fork = require('child_process').fork;
    
var child, fsTimeout;

function compile() {
    if (fsTimeout) {
        return;
    }
    
    fsTimeout = setTimeout(function() { fsTimeout = null; }, 100); // http://stackoverflow.com/questions/12978924/fs-watch-fired-twice-when-i-change-the-watched-file

    console.log('compiling...');
    
    fs.readFile('main.js', function (err, data) {
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
        
        console.log('done!');
    });
}

fs.watch('main.js', compile);

compile();