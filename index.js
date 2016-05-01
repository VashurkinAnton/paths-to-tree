var path = require('path');
var archy = require('archy');
var chalk = require('chalk');

var options = {
	descriptionQuotes: '()',
	separator: path.sep,
	escapedSeparator: path.sep.replace('\\', '\\\\'),
	root: 'last folder' //all, last folder, number of root folders
};
function normalize(path){
	return Array.isArray(path) ? path[0] : path;
}
function more(data){
	var str = data[0] || '';
	var strOptions = data[1];
	
	if(strOptions.descr){
		str += ' ' + options.descriptionQuotes[0] + strOptions.descr + options.descriptionQuotes[1];
	}
	
	if(strOptions.style){
		var chalkOptions = strOptions.style.split('.').filter(Boolean);
		var customChalk = chalk;
		for (var i = chalkOptions.length - 1; i >= 0; i--) {
			customChalk = customChalk[chalkOptions[i]];
		}
		str = customChalk(str);	
	}

	return str;
}
function archyAST(group){
	var root = group.samePath;
	if(options.root === 'last folder'){
		root = root.split(options.separator).pop();
	}else if(typeof options.root === 'number'){
		root = root.split(options.separator);
		root = root.slice(root.length - options.root >= 0 ? root.length - options.root : 0, root.length).join(options.separator);
	}

	var AST = {
		label: '' || root,
		nodes: []
	};
	group.paths = group.paths.sort();
	for(var i = 0; i < group.paths.length; i++){
		var points = normalize(group.paths[i]).replace(group.samePath, '').split(options.separator).filter(Boolean);
		points.reverse();
		var astPointer = AST;
		while(points.length){
			if(!astPointer['label']){
				astPointer['label'] = points.pop();
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
							createNode = false;
							break;
						}
					}
					if(createNode){
						var nodeIndex = astPointer['nodes'].push({label: nextPoint, nodes: []}) - 1;
						astPointer = astPointer['nodes'][nodeIndex];
					}
				}
			}
			if(!points.length && Array.isArray(group.paths[i])){
				group.paths[i][0] = group.paths[i][0].split(options.separator).pop();
				astPointer['label'] = more(group.paths[i]);	
			}
		}
	}

	return AST;
};

function getGroups(paths){
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
}

module.exports = function(paths){
	return getGroups(paths).map(function(group){
		return archy(archyAST(group));
	}).join('\n');
}

module.exports.set = function(_options){
	for(var i = 0, k = Object.keys(_options), key = k[0], value=_options[key], l = k.length; i < l; i++, key = k[i], value=_options[key]){
		if(key === 'separator'){
			options['escapedSeparator'] = value.replace('\\', '\\\\');
		}
		if(key !== 'escapedSeparator'){
	    	options[key] = value;
		}
	}
}

var paths = [
	['1/a/bb/fff/file-4.ext', {style: 'green', descr: '1mb'}],
	'1/a/bb/eee/file-2.ext',
	'r/file-6.ext',
	'1/a/bb/ggg/file-5.ext',
	['1/a/bb/eee/file-3.ext', {style: 'red', descr: '2mb'}],
	'1/a/bb/eee/1111/file-1.ext'
];

module.exports.set({separator: '/', root: 'all', descriptionQuotes: '<>'});
console.log(module.exports(paths));

//add default color
