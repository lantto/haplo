'use strict';

var esprima = require('esprima'),
    escodegen = require('escodegen'),
    _ = require('lodash');
    
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
    
    if ((((item.callee || {}).callee || {}).object || {}).name === 'haplo'
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
    
    if (Array.isArray(item) && ((item[0] || {}).id || {}).name === 'haplo') {
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
    if (((item.callee || {}).object || {}).name === 'haplo' 
        && item.callee.property.name === 'client'
    ) {
        return item.arguments[0];
    }
}

function omitClientFn(item) {
    if ((((item.expression || {}).callee || {}).object || {}).name === 'haplo' 
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
        var haplo = require('./haplo')('server'); \
        var server = haplo.app.listen(3000); \
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
    }
};