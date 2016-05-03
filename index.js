var path = require('path');
var archy = require('archy');
var chalk = require('chalk');
var clone = require('clone');

var chalkTypes = {
	color: ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white", "gray"],
	bg: ["bgBlack", "bgRed", "bgGreen", "bgYellow", "bgBlue", "bgMagenta", "bgCyan", "bgWhite"],
	modifer: ["reset", "bold", "dim", "italic", "underline", "inverse", "hidden", "strikethrough"]
};

function parseChalkStyle(style){
	var styles = {};
	style.split('.').filter(Boolean).forEach(function(option){
		for(var type in chalkTypes){
			if(chalkTypes[type].indexOf(option) !== -1){
				styles[type] = option;
				break;
			}
		}
	});
	return styles;
}

function normalize(path){
	return Array.isArray(path) ? path[0] : path;
};

function folderLabel(points, options){
	return points.length ? options.separator : ''
};

function paint(node, index, pathOptions, options){
	if(options.paintingStrategy && (options.paintingStrategy.coloring === 'all' || options.paintingStrategy.coloring > index)){		
		if(pathOptions.descr && !index){
			node.label += ' ' + options.descriptionQuotes[0] + pathOptions.descr + options.descriptionQuotes[1];
		}
		if(pathOptions.style){
			var customChalk = chalk;
			var styles = parseChalkStyle(pathOptions.style);
			for(var style in styles){
				var addStyles = false;

				if(!node['style']){
					node['style'] = {};
				}

				if(options.paintingStrategy.priority && options.paintingStrategy.priority[style]){
					var newStylePriority = options.paintingStrategy.priority[style].indexOf(styles[style]);
					var oldStylePriority = options.paintingStrategy.priority[style].indexOf(node['style'][style]);

					if(newStylePriority >= oldStylePriority){
						addStyles = styles[style];
					}else{
						addStyles = node['style'][style];
					}
				}

				if(addStyles){
					customChalk = customChalk[addStyles];
					node['style'][style] = addStyles;	
				}
			}

			if(customChalk instanceof Function){
				node.label = customChalk(chalk.stripColor(node.label));
			}
		}
	}

	return node;
};

function archyAST(group, options){
	var root = group.samePath;
	
	if(typeof options.root === 'number'){
		root = root.split(options.separator);
		root = root.slice(root.length - options.root >= 0 ? root.length - options.root : 0, root.length).join(options.separator);
	}

	var AST = {
		label: '' || root ? (root + folderLabel(group.paths, options)) : '',
		nodes: []
	};

	group.paths = group.paths.sort();

	for(var i = 0; i < group.paths.length; i++){
		var astPointer = AST;
		var points = normalize(group.paths[i]).replace(group.samePath, '').split(options.separator).filter(Boolean);
		points.reverse();
		var pathOptions = Array.isArray(group.paths[i]) ? group.paths[i][1] : {};
		
		if(!pathOptions.style){
			pathOptions.style = options.defaultStyle || '';
		}
		
		paint(astPointer, points.length, pathOptions, options);

		while(points.length){
			if(!astPointer['label']){
				astPointer['label'] = points.pop() + folderLabel(points, options);
				paint(astPointer, points.length, pathOptions, options);
			}
			if(points.length){
				if(!astPointer['nodes']){
					astPointer['nodes'] = [];
				}
				if(astPointer['nodes']){
					var createNode = true;
					var nextPoint = points.pop() + folderLabel(points, options);
					for(var j = 0; j < astPointer['nodes'].length; j++){
						if(chalk.stripColor(astPointer['nodes'][j]['label']) === chalk.stripColor(nextPoint)){
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
		if(points[0]){
			var groupTest = new RegExp('^' + options.escapedSeparator + '?' + points[0] + options.escapedSeparator);

			for(var i = paths.length - 1; i >= 0; i--){
				if(groupTest.test(normalize(paths[i]))){
					groups[groupIndex]['paths'].push(paths.splice(i, 1)[0]);
				}
			}

			if(groups[groupIndex]['paths'].length > 1){
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
		}else{
			groups.pop();
		}
	}
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
			priority: {
				color: ['green', 'red'],
				bg: [],
				modifer: []
			} 
		},
		defaultStyle: ''
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
				return archy(archyAST(group, defaultOptions));
			}).join('\n');
		}else{
			return null;
		}
	}
};

var paths = [
	['1/a/bb/fff/file-4.ext', {style: 'green', descr: '1mb'}],
	'1/a/bb/eee/file-2.ext',
	'r/file-6.ext',
	'1/a/bb/ggg/file-5.ext',
	['1/a/bb/eee/file-3.ext', {style: 'red', descr: '2mb'}],
	['1/a/bb/eee/file-4.ext', {style: 'green', descr: '2mb'}],
	'1/a/bb/eee/1111/file-1.ext'
];

var colorFullTree = module.exports({separator: '/', root: 'all', descriptionQuotes: '<>',/* paintingStrategy: 'all',*/ defaultStyle: 'green'});
console.log(colorFullTree(paths));