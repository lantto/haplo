'use strict';
    
    // Compiler dependencies
var esprima = require('esprima'),
    escodegen = require('escodegen'),
    _ = require('lodash'),

    // Server dependencies
    express = require('express'),
    bodyParser = require('body-parser'),
    path = require('path');

function Compiler() {
    this.serverFns = [];
    this.routeId = 1;
}

Compiler.prototype.traverse = function(item, fn, returnSelf) {
    var fnResult, travResult;

    fnResult = fn.call(this, item);
    
    if (fnResult) {
        return fnResult;
    }

    for (var prop in item) {
        if (item[prop] !== null && typeof(item[prop]) === 'object') {
            travResult = this.traverse(item[prop], fn);
            
            if (travResult) {
                return travResult;
            }
        }
    }
    
    if (returnSelf) {
        return item;
    }
}

Compiler.prototype.process = function(item) {
    var clientFn;

    if ((((item.callee || {}).callee || {}).object || {}).name === 'haplo'
        && item.callee.callee.property.name === 'server'
    ) {
        this.serverFns.push({
            id: this.routeId,
            fn: _.cloneDeep(item.callee.arguments[0])
        });
        
        clientFn = this.traverse(item.callee.arguments[0], this.getClientFn);

        item.callee.arguments[0] = {
            type: 'Literal',
            value: this.routeId
        }
        
        item.arguments = [
            {
                type: 'ArrayExpression',
                elements: item.arguments
            },
            clientFn
        ]
        
        this.routeId++;
    }
}

Compiler.prototype.getClientFn = function(item) {
    if (((item.callee || {}).object || {}).name === 'haplo' 
        && item.callee.property.name === 'client'
    ) {
        return item.arguments[0];
    }
}

Compiler.prototype.omitClientFn = function(item) {
    // haplo.client(function () { ... })
    if ((((item.expression || {}).callee || {}).object || {}).name === 'haplo' 
        && item.expression.callee.property.name === 'client'
    ) {
        item.expression.arguments = [];
        
        item.type = 'ReturnStatement';
        
        item.argument = item.expression;

        delete item.expression;
    }
    
    // haplo.client(function () { ... })(arg)
    if (((((item.expression || {}).callee || {}).callee || {}).object || {}).name === 'haplo'
        && item.expression.callee.callee.property.name === 'client'
    ) {
        item.expression.arguments = [
            {
                type: 'ArrayExpression',
                elements: item.expression.arguments
            }
        ];
        
        item.type = 'ReturnStatement';
        
        item.expression.callee = item.expression.callee.callee;
        
        item.argument = item.expression;
        
        delete item.expression;
    }
}

Compiler.prototype.generateServerAst = function(fns) {
    var serverAst = esprima.parse("\
        var haplo = require('haplo')('server'); \
        var server = haplo.app.listen(3000); \
    ");
    
    var run = serverAst.body.pop();

    for (var i = 0; i < fns.length; i++) {
        fns[i].fn = this.traverse(fns[i].fn, this.omitClientFn, true);
    
        fns[i].fn.body.body.push({
            type: 'ExpressionStatement',
            expression: {
                type: 'CallExpression',
                callee: {
                    type: 'MemberExpression',
                    computed: false,
                    object: {
                        type: 'Identifier',
                        name: 'haplo'
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
                        name: 'haplo'
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

Compiler.prototype.compile = function(code) {
    var clientAst, serverAst;

    clientAst = this.traverse(esprima.parse(code), this.process, true); // Save server functions to this.serverFns and return client AST
    
    serverAst = this.generateServerAst(this.serverFns);
    
    return {
        client: escodegen.generate(clientAst),
        server: escodegen.generate(serverAst)
    }
}

function Server() {
    this.app = express();
    this.app.use(bodyParser.json());
    this.app.use(express.static(path.join(__dirname, '..', '..', 'public')));
}

Server.prototype.on = function(id, callback) {
    var that = this;

    this.app.post('/' + id, function(req, res) {
        that.res = res;
        callback.apply(null, req.body);
    });
}

Server.prototype.client = function() {
    this.res.send(arguments);
}

Server.prototype.die = function() {
    this.res.status(418).send('No sendback initiated.');
}

module.exports = function(context) {
    switch (context) {
        case 'compiler':
            return new Compiler();
            break;
        case 'server':
            return new Server();
            break;
    }
}