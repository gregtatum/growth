var fs = require('fs')
var InsertCss = require('insert-css');

var internals = {
	
	id : 0,
	
	createElement : function( html, className ) {
		var div = document.createElement('div');
		div.innerHTML = html;
		return div.getElementsByClassName( className )[0]
	},
	
	template : _.template( fs.readFileSync( __dirname + '/slider.html', 'utf8' ) ),
	
	attachCss : _.once(function() {
		InsertCss( fs.readFileSync( __dirname + '/slider.css' ) )
	}),
	
	handleSubmitFn : function( config, poem, el ) {
		
		return function() {
			
			var number = Number( el.getElementsByClassName('poem-slider-input')[0].value )
		
			config.callback( poem, number)
		
			if( config.destroyOnSubmit ) {
				internals.destroy( el )
			}
		
			return false
		}
	},
	
	bootElement : function( config, poem ) {
		
		internals.attachCss()
		
		var html = internals.template( _.extend({
			id: internals.id++
		}, config))
		
		var el = internals.createElement( html, "poem-slider" )
		
		el	.getElementsByClassName('poem-slider-cta')[0]
			.addEventListener( 'click', internals.handleSubmitFn( config, poem, el ), false )
		
		config.targetEl.appendChild( el )
		
		poem.emitter.on('destroy', _.partial( internals.destroy, el ) )
	},
	
	destroy : function( el ) {
		
		if( el && el.parentElement ) {
			el.parentElement.removeChild( el )
		}
	}
}

module.exports = function slider( poem, properties ) {
	
	var config = _.extend({
		targetEl : document.body
	  , message : "Adjust the Slider"
	  , className : ""
	  , min: 1
	  , max: 10
	  , step: 1
	  , value: 5
	  , callToAction: "Start"
  	  , callback : function() { return false }
	}, properties)
	
	internals.bootElement( config, poem )
	
	return {}
}