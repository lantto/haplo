#!/usr/bin/env node

var fs = require('fs'),
    mkpath = require('mkpath'),
    browserify = require('browserify'),
    haplo = require('../index'),
    fork = require('child_process').fork,
    gaze = require('gaze');
    
var child;

function compile() {
    fs.readFile('main.js', function (err, data) {
        if (data.length === 0) {
            compile();
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

gaze('main.js', function() {
    this.on('changed', compile);
});

compile();