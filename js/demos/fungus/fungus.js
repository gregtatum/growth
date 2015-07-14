var KdTree = require('../../vendor/kd-tree/kdTree').kdTree

function _createMesh( poem, config ) {

	// var geometry = new THREE.SphereGeometry(
	// 	config.radius          // radius
	//   , config.widthSegments   // widthSegments
	//   , config.heightSegments  // heightSegments
	//   , 0                      // phiStart
	//   , Math.PI * 2            // phiLength
	//   , 0                      // thetaStart
	//   , config.thetaLength     // thetaLength
	// )
	
	var geometry = new THREE.IcosahedronGeometry( config.radius, 5 )
	
	var material = new THREE.MeshPhongMaterial({
		emissive : 0x000000
	  , color : 0x224488
	  // , wireframe : true
	})

	var mesh = new THREE.Mesh( geometry, material )
	
	// mesh.position.y -= config.radius * 0.2
	
	mesh.position.y += config.radius * 1
	poem.scene.add( mesh )
	
	return mesh
}

function _updateFn( mesh, tree, config, current ) {
	
	var verts = mesh.geometry.vertices
	var x,y,z
	
	return function() {
		
		current.distance *= config.distanceGrowth
		
		for( var i=0; i < verts.length; i++ ) {
			var vert = verts[i]
			
			x = y = z = 0
			
			var results = tree.nearest( vert, config.neighborsCount )
			
			for( var j=0; j < results.length; j++ ) {
				
				var nearest = results[j][0]
				var distance = results[j][1]
				
				if( distance <= current.distance ) {
					x += ( vert.x - nearest.x ) * distance / current.distance
					y += ( vert.y - nearest.y ) * distance / current.distance
					z += ( vert.z - nearest.z ) * distance / current.distance
				}
			}
			
			if( results.length > 0 ) {
				
				x = x / results.length
				y = y / results.length
				z = z / results.length
				
				vert.x += config.moveSpeed * x
				vert.y += config.moveSpeed * Math.max(0, y)
				vert.z += config.moveSpeed * z
			}
		}
		
		mesh.geometry.verticesNeedUpdate = true
		mesh.geometry.normalsNeedUpdate = true
	}
}

function _distance( a, b ) { return b.distanceTo(a) }

module.exports = function createFungus( poem, properties ) {
	
	var config = _.extend({
		radius          : 100
	  , neighborsCount  : 3
	  , nearestDistance : 5
	  , distanceGrowth  : 1.001
	  , moveSpeed       : 0.1
	  , widthSegments   : 40
	  , heightSegments  : 10
	  , thetaLength     : Math.PI * 0.3
	}, properties)
	
	var current = {
		distance : config.nearestDistance
	}
		
	var mesh = _createMesh( poem, config )
	
	var tree = new KdTree( _.clone(mesh.geometry.vertices), _distance, ['x','y','z'] )
	
	poem.emitter.on('update', _updateFn( mesh, tree, config, current ) )
}