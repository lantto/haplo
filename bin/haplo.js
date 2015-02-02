#!/usr/bin/env node

'use strict';

var fs = require('fs'),
    mkpath = require('mkpath'),
    browserify = require('browserify'),
    haplo = require('../index'),
    fork = require('child_process').fork,
    gaze = require('gaze');
    
var child,
    mainFile = process.argv[2] || 'main.js';

function compile() {
    fs.readFile(mainFile, function (err, data) {
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
        var bundleStream = fs.createWriteStream('public/dist/bundle.js');
    
        bundleStream.on('close', function() {
            console.log('Done!');
            console.log('Starting server...');
        });
    
        browserify().add('./client.js').bundle().pipe(bundleStream);
    });
}

gaze(mainFile, function() {
    this.on('changed', function() {
        console.log('\nFile change detected.');
        compile();
    });
});

compile();