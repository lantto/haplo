'use strict';

var esprima = require('esprima'),
    escodegen = require('escodegen'),
    _ = require('lodash'),
    app = require('express')(),
    bodyParser = require('body-parser'),
    $ = require('jquery');
    
var serverFns = [],
    routeId = 1;

function traverse(item, fn, returnSelf) {
    var fnResult, travResult;

    fnResult = fn(item);
    
    if (fnResult) {
        return fnResult;
    }

    for (var prop in item) {
        if (item[prop] !== null && typeof(item[prop]) === 'object') {
            travResult = traverse(item[prop], fn);
            
            if (travResult) {
                return travResult;
            }
        }
    }
    
    if (returnSelf) {
        return item;
    }
}

function process(item) {
    var clientFn;
    
    if ((((item.callee || {}).callee || {}).object || {}).name === 'same'
        && item.callee.callee.property.name === 'server'
    ) {
        serverFns.push({
            id: routeId,
            fn: _.cloneDeep(item.callee.arguments[0])
        });
        
        clientFn = traverse(item.callee.arguments[0], getClientFn);

        item.callee.arguments[0] = {
            type: 'Literal',
            value: routeId
        }
        
        item.arguments = [
            {
                type: 'ArrayExpression',
                elements: item.arguments
            },
            clientFn
        ]
        
        routeId++;
    }
    
    if (Array.isArray(item) && ((item[0] || {}).id || {}).name === 'same') {
        item[0].init.callee = _.cloneDeep(item[0].init);
        
        item[0].init.arguments = [
            {
                type: 'Literal',
                value: 'client'
            }
        ];
    }
}

function getClientFn(item) {
    if (((item.callee || {}).object || {}).name === 'same' 
        && item.callee.property.name === 'client'
    ) {
        return item.arguments[0];
    }
}

function omitClientFn(item) {
    if ((((item.expression || {}).callee || {}).object || {}).name === 'same' 
        && item.expression.callee.property.name === 'client'
    ) {
        item.expression.arguments = [];
        
        item.type = 'ReturnStatement';
        
        item.argument = item.expression;
        
        delete item.expression;
    }
}

function generateServerAst(fns) {
    var serverAst = esprima.parse("\
        var same = require('./same')('server'); \
        var server = same.app.listen(3000); \
    ");
    
    var run = serverAst.body.pop();

    for (var i = 0; i < fns.length; i++) {
        fns[i].fn = traverse(fns[i].fn, omitClientFn, true);
    
        fns[i].fn.body.body.push({
            type: 'ExpressionStatement',
            expression: {
                type: 'CallExpression',
                callee: {
                    type: 'MemberExpression',
                    computed: false,
                    object: {
                        type: 'Identifier',
                        name: 'same'
                    },
                    property: {
                        type: 'Identifier',
                        name: 'die'
                    }
                },
                arguments: []
            }
        });
    
        serverAst.body.push({
            type: 'ExpressionStatement',
            expression: {
                type: 'CallExpression',
                callee: {
                    type: 'MemberExpression',
                    computed: false,
                    object: {
                        type: 'Identifier',
                        name: 'same'
                    },
                    property: {
                        type: 'Identifier',
                        name: 'on'
                    }
                },
                arguments: [
                    {
                        type: 'Literal',
                        value: fns[i].id
                    },
                    fns[i].fn
                ]
            }
        });
    }
    
    serverAst.body.push(run);
    
    return serverAst;
}

function Server() {
    this.app = app;
    this.app.use(bodyParser.json());
}

Server.prototype.on = function(id, callback) {
    var that = this;

    app.post('/' + id, function(req, res) {
        that.res = res;
        callback(req.body);
    });
}

Server.prototype.client = function() {
    this.res.send(arguments);
}

Server.prototype.die = function() {
    this.res.status(418).send('No sendback initiated.');
}

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

module.exports = {
    compile: function(code) {
        var clientAst, serverAst;
        
        // TODO: Avoid this. The problem is that the state is preserved between compilations. Do it like Browserify that you need to create the compiler each time?
        serverFns = [];
        routeId = 1; 
        
        clientAst = traverse(esprima.parse(code), process, true); // Save server functions to serverFns and return client AST
        
        serverAst = generateServerAst(serverFns);
        
        return {
            client: escodegen.generate(clientAst),
            server: escodegen.generate(serverAst)
            // server: JSON.stringify(serverFns[0].fn)
        }
    },
    server: function() {
        return new Server();
    },
    client: function() {
        return new Client();
    }
};