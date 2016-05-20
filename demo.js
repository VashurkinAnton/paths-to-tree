var colorTree = require('./index.js');
var paths = [
	['C://1/a/bb/fff/file-4.ext', {color: 'green', descr: '1mb'}],
	'C://1/a/bb/eee/file-2.ext',
	'C://1/a/bb/eee/1111/file-1.ext',
	'C://1/a/bb/ggg/file-5.ext',
	['C://1/a/bb/eee/file-3.ext', {color: 'red', descr: '2mb'}],
	['C://1/a/bb/eee/file-4.ext', {color: 'green', descr: '2mb'}]
];

var colorFullTree = colorTree({separator: '/', root: 'all', descriptionQuotes: '<>', defaultColor: 'green'});
console.log(colorFullTree(paths));