var Easing = require('../../utils/easing')
var GenerateTreeMesh = require('./mesh')
var Random = require('../../utils/random')

var internals = {
	
	addBaseSphere : function( scene ) {
	
		var geometry = new THREE.SphereGeometry(100, 40, 5, 0, Math.PI * 2, 0, Math.PI * 0.3);
		var material = new THREE.MeshBasicMaterial( {color: 0x333333, side:THREE.DoubleSide} );
		var sphere = new THREE.Mesh( geometry, material );
		sphere.position.y = -99.5
		poem.scene.add( sphere );
	},
	
	travelTreeFn : function( rootBone, callback ) {
	
		// callback( bone, depth, sibling, iteration, maxDepth )

		var iteration = 0
		var maxDepth = 0
	
		function travel( arg, bone, cb, depth, sibling ) {
		
			cb( arg, bone, depth, sibling, iteration, maxDepth )
			iteration++;
		
			for( var i=0; i < bone.children.length; i++ ) {
				travel( arg, bone.children[i], cb, depth+1, i )
			}
		}
	
		travel( undefined, rootBone, function setMaxDepth( arg, bone, depth, ortho, iteration) {
			maxDepth = Math.max( depth, maxDepth );
		}, 0, 0 )
	
		return function start( arg ) {
			iteration = 0;
			travel( arg, rootBone, callback, 0, 0 )
		}
	},

	seedRandomValuesToTree : function( bone )  {
	
		internals.travelTreeFn( bone, function( arg, bone, depth, sibling, iteration, maxDepth ) {
		
			bone.randomRotation = [
				Math.random()
			  , Math.random()
			  , Math.random()
			]
		
		})()
	
	},

	shrinkTree : function( rootBone, amount ) {
	
		var runShrink = internals.travelTreeFn( rootBone, function( arg, bone, depth, sibling, iteration, maxDepth ) {
			bone.scale.multiplyScalar( amount )
		})
	
		runShrink()
	
	},

	recursiveWriggleFn : function( growthTime ) {
	
		return function( e, bone, depth, sibling, iteration, maxDepth ) {
		
			var weight = depth / maxDepth
			
			bone.rotation.z = weight * Math.sin( bone.randomRotation[0] * (e.elapsed + 100000) * 0.0005 )
			bone.rotation.y = weight * Math.sin( bone.randomRotation[1] * (e.elapsed + 200000) * 0.000066 )
			bone.rotation.x = weight * Math.sin( bone.randomRotation[2] * (e.elapsed + 300000) * 0.0002 )
		}
	},

	growTreeFn : function( rootBone, targetScale, growthTime ) {
	
		var elapsedUnitI = 0
	
		return internals.travelTreeFn( rootBone.children[0], function( e, bone, depth, sibling, iteration, maxDepth ) {
		
			var thirdOfMaxDepth = Math.floor( maxDepth / 3 )
			var maxDepthPrime = maxDepth - thirdOfMaxDepth
			var depthPrime = Math.min( maxDepthPrime , Math.max( 0,
				depth - thirdOfMaxDepth
			))
			var depthUnitI = depthPrime / (maxDepthPrime + 1)
			var inactiveTime = growthTime * depthUnitI
			var activeTime = growthTime - inactiveTime
		
			var elapsed = e.elapsed + bone.randomRotation[0] * growthTime / maxDepth
		
			var scale = Math.min( targetScale , Math.max( 0,
				Easing.easeInOutCubic(
					 ( (elapsed % (growthTime * 2) ) - inactiveTime) / activeTime
				) * targetScale
			))
		
			scale = scale * 0.7 + 0.3
		
			bone.scale.set(
				scale, scale, scale
			)
		})
	},

	updateFn : function( mesh, config ) {
	
		var rootBone = mesh.children[0];
		
		internals.seedRandomValuesToTree( rootBone )
		
		var grow = internals.growTreeFn( rootBone, config.shrink, config.growthTime )
		
		var wriggle = internals.travelTreeFn(
			rootBone,
			internals.recursiveWriggleFn( config.growthTime )
		)
		
		return function( e ) {
		
			var bone = mesh
			
			wriggle( e )
			grow( e )
		
		}
	},
	
	start : function( config, poem, sliderValue ) {
		
		var $msg = $("<div class='preload-message'>Loading up some ones and zeros to grow...</div>")
		$('#container').append(	$msg )
	
		var depthSteps = 50
		
		var treeMeshConfig = _.extend({}, config, {
			depth : Math.floor( sliderValue / depthSteps ),
			depthRemainder : sliderValue % depthSteps,
			depthSteps : depthSteps
		})
		
		console.log( "Slider:", sliderValue )
		console.log( "Depth:", treeMeshConfig.depth )
		console.log( "Depth Remainder:", treeMeshConfig.depthRemainder )
		
	
		setTimeout(function deferredTreeGrowth() {
			
			var mesh = GenerateTreeMesh( treeMeshConfig );
			
			// mesh.scale.multiplyScalar( 1 )
			poem.scene.add( mesh )
			
			internals.countMeshChildren( mesh )
			
			internals.addBaseSphere( poem.scene )
			
			poem.emitter.on( 'update', internals.updateFn( mesh, config ) )
			
			$msg.remove()			
			
		}, 500)
		
	},
	
	countMeshChildren : function( scene ) {
		
		function count( obj ) {

			var childCount = obj.children.length

			for( var i=0; i < obj.children.length; i++ ) {
				childCount += count( obj.children[i] )
			}

			return childCount
		}

		console.log( "Total mesh objects:", count( scene ) )
		
	}

}

module.exports = function treeGrowth( poem, properties ) {
	
	var config = _.extend({
		autoStart		: true
	  , height			: 50
	  , radius			: Random.range(2, 10)
	  , rSegments		: 5
	  , hSegments		: 4
	  , depth			: 10
	  , minBranch		: 1
	  , maxBranch		: 3
	  , shrink			: Random.range(0.7, 0.95)
	  , radiusShrink	: Random.range(0.7, 0.85)
	  , growthTime		: 10000
	}, properties )
	
	var api = {
		start : _.partial( internals.start, config, poem )
	}

	if( config.autoStart ) {
		internals.start( config, api, poem, config.depth )
	}
	
	return api
	
}