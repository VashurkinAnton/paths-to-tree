var path = require('path');
var CAT = require('classic-ancii-tree');
var clone = require('clone');

function normalize(path){
	return Array.isArray(path) ? path[0] : path;
};

function paint(node, index, pathOptions, options){
	if(options.paintingStrategy && (options.paintingStrategy.coloring === 'all' || options.paintingStrategy.coloring > index)){		
		if(pathOptions.descr && !index){
			node.label += ' ' + options.descriptionQuotes[0] + pathOptions.descr + options.descriptionQuotes[1];
		}
		var addColor = false;

		if(options.paintingStrategy.priority){
			var newColorPriority = options.paintingStrategy.priority.indexOf(pathOptions.color);
			var oldColorPriority = options.paintingStrategy.priority.indexOf(node.color);

			if(newColorPriority >= oldColorPriority){
				addColor = pathOptions.color;
			}else{
				addColor = node.color;
			}
		}

		if(addColor){
			node.color = addColor;	
		}
	}

	return node;
};

function getAST(group, options){
	var AST = {
		label: '',
		nodes: []
	};

	group.paths = group.paths.sort();

	for(var i = 0; i < group.paths.length; i++){
		var astPointer = AST;
		var points = normalize(group.paths[i]).replace(group.samePath, '').split(options.separator);
		points.reverse();
		var pathOptions = Array.isArray(group.paths[i]) ? group.paths[i][1] : {};
		
		if(!pathOptions.color){
			pathOptions.color = options.defaultColor || '';
		}
		
		paint(astPointer, points.length, pathOptions, options);
		while(points.length){
			if(!astPointer['label']){
				astPointer['label'] = points.pop();
				paint(astPointer, points.length, pathOptions, options);
			}
			if(points.length){
				if(!astPointer['nodes']){
					astPointer['nodes'] = [];
				}
				if(astPointer['nodes']){
					var createNode = true;
					var nextPoint = points.pop();
					for(var j = 0; j < astPointer['nodes'].length; j++){
						if(astPointer['nodes'][j]['label'] === nextPoint){
							astPointer = astPointer['nodes'][j];
							paint(astPointer, points.length, pathOptions, options);
							createNode = false;
							break;
						}
					}
					if(createNode){
						var nodeIndex = astPointer['nodes'].push({label: nextPoint, nodes: []}) - 1;
						astPointer = astPointer['nodes'][nodeIndex];
						paint(astPointer, points.length, pathOptions, options);
					}
				}
			}
		}
	}

	var root = group.samePath;
	if(typeof options.root === 'number'){
		root = root.split(options.separator);
		root = root.slice(root.length - options.root >= 0 ? root.length - options.root : 0, root.length).join(options.separator);
	}

	AST.label = root;

	return AST;
};

function getGroups(paths, options){
	var groups = [];

	paths.reverse();
	while(paths.length){
		var groupIndex = groups.push({
			paths: [paths.pop()],
			samePath: ''
		}) - 1;

		var points = normalize(groups[groupIndex]['paths'][0]).split(options.separator);
		var groupTest = new RegExp('^' + options.escapedSeparator + '?' + points[0] + options.escapedSeparator);

		for(var i = paths.length - 1; i >= 0; i--){
			if(groupTest.test(normalize(paths[i]))){
				groups[groupIndex]['paths'].push(paths.splice(i, 1)[0]);
			}
		}

		if(groups[groupIndex]['paths'].length >= 1){
			var fullMatch = true;
			for(var i = 0; i < points.length; i++){
				var samePathTest = new RegExp(points.slice(0, i + 1).join(options.escapedSeparator));
				
				for(var j = 1; j < groups[groupIndex]['paths'].length; j++){
					if(!samePathTest.test(normalize(groups[groupIndex]['paths'][j]))){
						fullMatch = false;
					}
				}

				if(!fullMatch){
					groups[groupIndex]['samePath'] = points.slice(0, i).join(options.separator);
					break;
				}
			}
		}
	}
	//console.log(JSON.stringify(groups, true, 2));
	return groups;
};

module.exports = function(options){
	var defaultOptions = {
		descriptionQuotes: '()',
		separator: path.sep,
		escapedSeparator: path.sep.replace('\\', '\\\\'),
		root: 'last folder', //all, last folder, number of root folders (like: 2)
		paintingStrategy: {
			coloring: 'all',// all, last node, number of nodes (like: 2)
			priority: ['green', 'yellow', 'red']
		},
		defaultColor: ''
	};

	var ignore = ['escapedSeparator', 'paintingStrategy'];
	for(optionName in options){
		if(optionName === 'separator'){
			defaultOptions['escapedSeparator'] = options[optionName].replace('\\', '\\\\');
		}

		if(optionName === 'paintingStrategy'){
			for(stategyOption in options['paintingStrategy']){
				defaultOptions['paintingStrategy'][stategyOption] = options['paintingStrategy'][stategyOption];
			}
		}

		if(ignore.indexOf(optionName) === -1){
	    	defaultOptions[optionName] = options[optionName];
		}
	}

	if(defaultOptions['root'] === 'last folder'){
		defaultOptions['root'] = 1;
	}

	if(defaultOptions['paintingStrategy']['coloring'] === 'last point'){
		defaultOptions['paintingStrategy']['coloring'] = 1;
	}

	return function(_paths){
		var paths = clone(_paths);
		if(paths && Array.isArray(paths)){
			return getGroups(paths, defaultOptions).map(function(group){
				console.log(JSON.stringify(getAST(group, defaultOptions), true, 2))
				return CAT(getAST(group, defaultOptions));
			}).join('\n');
		}else{
			return null;
		}
	}
};