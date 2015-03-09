var crossroads = require('crossroads');
var hasher = require('hasher');
var manifestToPoem = require('./manifestToPoem');

var _baseUrl = '/growth';
var _defaultLevel = "1-seedling";

var routing = {
	
	start : function( Poem, manifests ) {
		manifestToPoem.init( Poem, manifests );
		
		function parseHash( newHash, oldHash ){
			crossroads.parse( newHash );
		}
		
		crossroads.addRoute( '/{name}',	routing.loadUpALevel );
	
		crossroads.addRoute( /.*/, function reRouteToMainTitlesIfNoMatch() {
			hasher.replaceHash('/'+_defaultLevel);
		});
		crossroads.addRoute( '/', function reRouteToMainTitlesIfNoMatch() {
			hasher.replaceHash('/'+_defaultLevel);
		});
	
		hasher.initialized.add(parseHash); // parse initial hash
		hasher.changed.add(parseHash); //parse hash changes
		hasher.init(); //start listening for history change
		
	},
	
	showMainTitles : function() {
		
		

		_gaq.push( [ '_trackPageview', _baseUrl ] );
	
		manifestToPoem.load( _defaultLevel );		

	},

	loadUpALevel : function( levelName ) {

		_gaq.push( [ '_trackPageview', _baseUrl+'/#level/'+levelName ] );
	
		var levelFound = manifestToPoem.load( levelName );
	
		if( !levelFound ) {
			manifestToPoem.load( _defaultLevel );
		}
		
	}
	
};

module.exports = routing;