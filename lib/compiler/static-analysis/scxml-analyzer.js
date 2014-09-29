var esprima = require('esprima');
var parser = require("sax").parser(true, { trim: true, xmlns: true, position: true });


var systemVariables = ["_event", "_sessionid", "_name", "_ioprocessors", "_x"];

var currentScxml, originalScxml, result, lastOpenScriptTagPosition, currentJsScriptTag;

var scxmlAnalyzer = {
	analyze: function (scxml) {
		currentScxml = originalScxml = scxml;
		result = {
			errors: [],
			newScxml: null
		};

		parser.onerror = function (e) {
		  console.log(e);
		};
		
		parser.onopentag = function (node) {
			if(node.name && openNodeTypes[node.name]) {
				openNodeTypes[node.name](node);
			}
		};

		parser.onclosetag = function (node) {
			if(node && closedNodeTypes[node]) {
				closedNodeTypes[node]();
			}
		};
		
		parser.onend = function () {
		  result = replaceErrors(result);
		};

		parser.write(currentScxml).close();

	  	result.newScxml = currentScxml;
		return result;
	}
};

var openNodeTypes = {
	"assign" : function (node) {
		if (node.attributes.location && systemVariables.indexOf(node.attributes.location.value) !== -1) {
			//If assignee is a system variable

			var newError = {
				message: 'You can\'t change system variables.',
				start: parser.startTagPosition - 1,
				end: parser.position,
				line: parser.line,
				col: parser.column,
				oldScxml: currentScxml.substring(parser.startTagPosition - 1, parser.position)
			};

			createError(newError);
		};
	},
	"script" : function (node) {
		//Catch opening of script tag.
		lastOpenScriptTagPosition = parser.startTagPosition - 1;
	}
};

var closedNodeTypes = {
	"script" : function () {
		
		if (parser.tag.isSelfClosing) {
			//Self closing script tag means it should have a src attribute
		} else{
			//Script has js in it's body 

			//Strip from <script></script> tags
			var strippedJS = currentScxml.substring(lastOpenScriptTagPosition + 8, parser.position - 9);

			var jsValidationResults = validateJavascriptExpression(strippedJS, lastOpenScriptTagPosition, parser.position);
		};

		//Reset to prevent future problems
		lastOpenScriptTagPosition = null;
	}
};

function createError (error) {
	error.message = error.message + ' At: ' + error.oldScxml;
	error.newScxml = '<raise event="error.execution"/>';
	
	//TODO add reason to data.message of raise.
	//data="You can\'t change system variables. At ' +
	//currentScxml.substring(parser.startTagPosition - 1, parser.position)+ '">'

	result.errors.push(error);
}

//Removing content from a file more than once with indexof is a tricky thing.
//I just took the shortcut and went with replace
function replaceErrors (result) {
	var errors = result.errors;
	for (var i = errors.length - 1; i >= 0; i--) {
		console.log(errors[i].message);
		currentScxml = currentScxml.replace(errors[i].oldScxml, errors[i].newScxml);
	};

	return result;
}

function validateJavascriptExpression (js, start, end) {

	var analyzedJs = esprima.parse(js, { tolerant: true });
	currentJsScriptTag = {
		start: start,
		end: end
	};

	goThroughSyntaxTree(analyzedJs.body[0]);


	//Reset to prevent future problems
	currentJsScriptTag = null;
	return "";
}

function goThroughSyntaxTree (tree) {
	if (Array.isArray(tree)) {
		//Run each children of an array separately
		for (var i = tree.length - 1; i >= 0; i--) {
			goThroughSyntaxTree(tree[i]);
		};
	} else if(tree.type && treeTypes[tree.type]) {
		//If we support the type value
		treeTypes[tree.type](tree);
	};
}

var treeTypes = {
	"BlockStatement": function (tree) {
		tree = tree.body;
		goThroughSyntaxTree(tree);
	},
	"FunctionExpression": function (tree) {
		tree = tree.body;
		goThroughSyntaxTree(tree);
	},
	"FunctionDeclaration": function (tree) {
		tree = tree.body;
		goThroughSyntaxTree(tree);
	},
	"ExpressionStatement": function (tree) {
		tree = tree.expression;
		goThroughSyntaxTree(tree);
	},
	// "VariableDeclaration": function (tree) {
		
	// },
	"AssignmentExpression": function (tree) {
		//Check if assignee is a system variable
		if(systemVariables.indexOf(tree.left.name) !== -1) {

			var newError = {
				message: 'You can\'t change system variables.',
				start: currentJsScriptTag.start,
				end: currentJsScriptTag.end,
				line: parser.line,
				col: parser.column,
				oldScxml: currentScxml.substring(currentJsScriptTag.start, currentJsScriptTag.end)
			};

			createError(newError);

			console.log('Illegal use of ' + tree.left.name);
		}
	}
	// ,
	// "ReturnStatement": function (tree) {
		
	// },
	// "CallExpression": function (tree) {
		
	// },
	// "IfStatement": function (tree) {
		
	// }
};

module.exports = scxmlAnalyzer;