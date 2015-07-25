var KdTree = require('../../vendor/kd-tree/kdTree').kdTree

function _createBones ( mesh, config ) {

	var bones = []
	var bonesA = []
	
	//Unique list of vertices
	var vertices = _.uniq( mesh.geometry.vertices, function( v ) {
		return "" + v.x + v.y + v.z
	})

	var prevBone = mesh;
	for ( var i = 0; i < config.boneCount ; i ++ ) {
		
		var boneA = new THREE.Bone()
		var boneB = new THREE.Bone()
		
		var index = _.random(0, vertices.length - 1)
		boneA.position.copy( vertices[index] )
		boneB.position.copy( vertices[index] ).normalize().multiplyScalar( config.radius / 10 )
		
		bonesA.push( boneA )
		bones.push( boneA )
		bones.push( boneB )
		
		mesh.add( boneA )
		boneA.add( boneB )
		
		vertices.splice( index, 1 )
	}
	
	_calculateSkinWeights( mesh.geometry, bonesA )
	var skeleton = new THREE.Skeleton( bones )
	
	mesh.bind( skeleton )
	skeleton.calculateInverses()
	mesh.normalizeSkinWeights()

	return bones;

}

function _calculateSkinWeights( geometry, allBones ) {
	
	_.each( geometry.vertices, function( vertex ) {
		
		var result = _.chain( allBones )
		
			.map(function( bone, index ) {
				var distanceSq = vertex.distanceToSquared( bone.position )
				var tuple = [bone, distanceSq, index]
				return tuple
			})
			.sortBy(function( tuple ) {
				return tuple[1]
			})
			.take(4)
			.map(function( tuple ) {
				var bone       = tuple[0]
				var distanceSq = tuple[1]
				var i          = tuple[2]
				
				return {
					bone : bone,
					distance : distanceSq,
					index : i
				}
			})
			.value()
		
		var sum = _.sum( _.pluck(result, "distance") )
			
		geometry.skinIndices.push( new THREE.Vector4(
			2 * result[0].index,
			2 * result[1].index,
			2 * result[2].index,
			2 * result[3].index
		));

		geometry.skinWeights.push( new THREE.Vector4(
			sum > 0 ? 1 - result[0].distance / sum : 0.25,
			sum > 0 ? 1 - result[1].distance / sum : 0.25,
			sum > 0 ? 1 - result[2].distance / sum : 0.25,
			sum > 0 ? 1 - result[3].distance / sum : 0.25
		));
		
		// geometry.skinIndices.push( new THREE.Vector4(0,0,0,0) );
		// geometry.skinWeights.push( new THREE.Vector4(1,0,0,0) );
		
	})
}

function _createMesh( poem, config ) {

	var geometry = new THREE.SphereGeometry(
		config.radius          // radius
	  , config.widthSegments   // widthSegments
	  , config.heightSegments  // heightSegments
	  , 0                      // phiStart
	  , Math.PI * 2            // phiLength
	  , 0                      // thetaStart
	  , config.thetaLength     // thetaLength
	)

	// var geometry = new THREE.IcosahedronGeometry( config.radius, 4 )
	
	var material = new THREE.MeshPhongMaterial({
		skinning : true
	  , emissive : 0x000000
	  , color : 0x224488
	  // , wireframe : true
	})

	var mesh = new THREE.SkinnedMesh( geometry, material )
	
	mesh.position.y -= config.radius * 0.2
	
	// mesh.position.y += config.radius * 1
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

function _update2Fn( mesh, tree, bones, config, current ) {

	return function update2() {
		for( var i=0; i < bones.length; i+=2 ) {
			
			bones[i].position.x += _.random(-1,1,true)
			bones[i].position.y += _.random(-1,1,true)
			bones[i].position.z += _.random(-1,1,true)
			
		}
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
	  , boneCount       : 50
	  , thetaLength     : Math.PI * 0.3
	}, properties)
	
	var current = {
		distance : config.nearestDistance
	}
		
	var mesh = _createMesh( poem, config )
	var bones = _createBones( mesh, config )
	var tree = new KdTree( _.clone(mesh.geometry.vertices), _distance, ['x','y','z'] )

	var skeletonHelper = new THREE.SkeletonHelper( mesh );
	skeletonHelper.material.linewidth = 2;
	poem.scene.add( skeletonHelper )
	
	poem.emitter.on('update', function() {
		skeletonHelper.update();
	})
	
	// poem.emitter.on('update', _updateFn( mesh, tree, config, current ) )
	poem.emitter.on('update', _update2Fn( mesh, tree, bones, config, current ) )
	
	return mesh
}