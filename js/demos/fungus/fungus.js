var KdTree = require('../../vendor/kd-tree/kdTree').kdTree
var Ease = require('eases/elastic-out')
var Lerp = require('lerp')

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
	
	_.each( geometry.vertices, function calculateSkinWeight( vertex ) {
		
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
			// sum > 0 ? 1 - result[0].distance / sum : 0.25,
			// sum > 0 ? 1 - result[1].distance / sum : 0.25,
			// sum > 0 ? 1 - result[2].distance / sum : 0.25,
			// sum > 0 ? 1 - result[3].distance / sum : 0.25
			4/10,
			3/10,
			2/10,
			1/10
		));
		
		// geometry.skinIndices.push( new THREE.Vector4(0,0,0,0) );
		// geometry.skinWeights.push( new THREE.Vector4(1,0,0,0) );
		
	})
}

function _calculateSkinWeights2( geometry, allBones ) {
	
	_.each( geometry.vertices, function calculateSkinWeight( vertex ) {
		
		var minValues = []
		var minIndices = []
		var pickCount = 4
		
		//Go through each bone
		for( var i=0; i < allBones.length; i++ ) {
			
			var bone = allBones[i]
			var distanceSq = vertex.distanceToSquared( bone.position )
			
			//Check to see if this distance is smaller
			for( var j=0; j < pickCount; j++ ) {
				if( distanceSq < minValues[j] ) {
					
					var prevValue
					var nextValue = minValues[j]
					minValues[j] = distanceSq

					var prevIndex
					var nextIndex = minIndices[j]
					minIndices[j] = distanceSq

					for( j++; j < pickCount; j++ ) {
						prevValue = minValues[j]
						minValues[j] = nextValue
						nextValue = prevValue

						prevMin = minValues[j]
						minValues[j] = nextMin
						nextMin = prevMin
					}
					break;
				}
			}
			
			var sum = _.sum(minValues)
		
			geometry.skinIndices.push( new THREE.Vector4(
				2 * minIndices[0],
				2 * minIndices[1],
				2 * minIndices[2],
				2 * minIndices[3]
			));

			geometry.skinWeights.push( new THREE.Vector4(
				4/10,
				3/10,
				2/10,
				1/10
			));
		
		}
	})
}

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

	var geometry = new THREE.IcosahedronGeometry( config.radius, config.subdivisions )
	
	var baseHue = Math.random()
		
	function generateColor( face, prop ) {
		
		var vertIndex = face[prop]
		var vert = geometry.vertices[ vertIndex ]
		var unitHue = (config.radius + vert.y ) / (2 * config.radius)
		var hue = (baseHue + unitHue * config.hueRange) % 1
		var color = new THREE.Color().setHSL( hue, 0.5, 0.5 )
		
		face.vertexColors.push( color )
	}
	
	for(var i=0; i < geometry.faces.length; i++) {
		
		generateColor( geometry.faces[i], "a" )
		generateColor( geometry.faces[i], "b" )
		generateColor( geometry.faces[i], "c" )
		
	}
	
	geometry.colorsNeedUpdate = true
	
	var material = new THREE.MeshPhongMaterial({
		skinning : true
	  , emissive : 0x000000
	  // , color : 0x224488
	  , color : 0xffffff
	  , wireframe : true
	  , vertexColors : THREE.VertexColors
	})

	var mesh = new THREE.SkinnedMesh()
	mesh.geometry = geometry
	mesh.material = material 
	
	// mesh.position.y -= config.radius * 0.2
	
	poem.scene.add( mesh )
	
	return mesh
}

function _updateGrowthFn( tree, bonePositions, config, current ) {
	
	var x,y,z
	
	return function updateGrowth(e) {
		
		current.distance *= config.distanceGrowth

		for( var i=0; i < bonePositions.length; i++ ) {
			var bone = bonePositions[i]
			
			x = y = z = 0
			
			var results = tree.nearest( bone, config.neighborsCount )
			
			for( var j=0; j < results.length; j++ ) {
				
				var nearest = results[j][0]
				var distance = results[j][1]
				
				if( distance <= current.distance ) {
					x += ( bone.x - nearest.x ) * distance / current.distance
					y += ( bone.y - nearest.y ) * distance / current.distance
					z += ( bone.z - nearest.z ) * distance / current.distance
				}
			}
			
			if( results.length > 0 ) {
				
				x = x / results.length
				y = y / results.length
				z = z / results.length
				
				bone.x += config.moveSpeed * x
				bone.y += config.moveSpeed * Math.max(0, y)
				bone.z += config.moveSpeed * z
				
			}
		}
		
	}
}

function _updateSmoothFn( bonePositions, boneNeighbors, config, current ) {
	
	var bone = new THREE.Vector3()
	var ptA = new THREE.Vector3()
	var ptB = new THREE.Vector3()
	var ptC = new THREE.Vector3()
	var ptD = new THREE.Vector3()
	
	var vScratch = new THREE.Vector3()
	var normalA = new THREE.Vector3()
	var normalB = new THREE.Vector3()
	var normal = new THREE.Vector3()
	
	var plane = new THREE.Plane()
	
	return function updateSmooth() {
		
		for( var i=0; i < bonePositions.length; i++ ) {
			var bone = bonePositions[i]
			var neighbors = boneNeighbors[i]

			ptA = neighbors[0]
			ptB = neighbors[1]
			ptC = neighbors[2]
			ptD = neighbors[3]

			// Calculate normals
			normalA.subVectors( ptC, ptA ).cross( vScratch.subVectors( bone, ptA ) ).normalize()
			normalB.subVectors( ptD, ptB ).cross( vScratch.subVectors( bone, ptB ) ).normalize()
			
			//Get averaged normals
			normal.addVectors( normalA, normalB ).normalize()
			
			plane.setFromNormalAndCoplanarPoint( normal, bone )
			
			var dA = plane.distanceToPoint( ptA )
			var dB = plane.distanceToPoint( ptB )
			var dC = plane.distanceToPoint( ptC )
			var dD = plane.distanceToPoint( ptD )
			
			//Update the points
			neighbors[0].x -= normal.x * dA * config.smoothSpeed
			neighbors[0].y -= normal.y * dA * config.smoothSpeed
			neighbors[0].z -= normal.z * dA * config.smoothSpeed
			neighbors[1].x -= normal.x * dB * config.smoothSpeed
			neighbors[1].y -= normal.y * dB * config.smoothSpeed
			neighbors[1].z -= normal.z * dB * config.smoothSpeed
			neighbors[2].x -= normal.x * dC * config.smoothSpeed
			neighbors[2].y -= normal.y * dC * config.smoothSpeed
			neighbors[2].z -= normal.z * dC * config.smoothSpeed
			neighbors[3].x -= normal.x * dD * config.smoothSpeed
			neighbors[3].y -= normal.y * dD * config.smoothSpeed
			neighbors[3].z -= normal.z * dD * config.smoothSpeed
		}
	}
}

function _distance( a, b ) { return b.distanceTo(a) }

function _getBonePositions( bones ) {
	
	var bonesEven = _.filter( bones, function( bone, i ) {
		return i % 2 === 0
	})
	
	return _.pluck(bonesEven, "position")
}

function _addSkeletonHelper( poem, mesh ) {
	var skeletonHelper = new THREE.SkeletonHelper( mesh );
	skeletonHelper.material.linewidth = 2;
	skeletonHelper.material.opacity = 0.3;
	skeletonHelper.material.transparent = true;
	
	poem.scene.add( skeletonHelper )
	
	poem.emitter.on('update', skeletonHelper.update.bind(skeletonHelper))
}

function _getBoneNeighbors( positions, tree ) {
	
	return _.map( positions, function selectNearest( position ) {
		
		var pointAndDistances = tree.nearest( position, 5 )
		var points = _.map(pointAndDistances, function(tuple) {
			return tuple[0]
		})
		
		return _.filter(points, function(pt) {
			return pt !== position
		})
	})
}

module.exports = function createFungus( poem, properties ) {
	
	return function startGrowingFungus( number ) {
		
		var config = _.extend({
			radius          : 10
		  , neighborsCount  : 3
		  , nearestDistance : 10
		  , distanceGrowth  : 1.001
		  , moveSpeed       : 0.1
		  , rotationSpeed   : 0.0001
		  , subdivisions    : 7
		  // , widthSegments   : 40 * 2
		  // , heightSegments  : 10 * 2
		  , boneCount       : 400
		  , thetaLength     : Math.PI * 0.3
		  , smoothSpeed     : 0.005
		  , hueRange        : 0.2
		}, properties)
		
		config.subdivisions = Math.round(number * config.subdivisions)
		config.boneCount = Math.round(number * config.boneCount)
		
	
		var current = {
			distance : config.nearestDistance
		}
	
		// console.profile("blob")
		var mesh = _createMesh( poem, config )
		var bones = _createBones( mesh, config )
		var bonePositions = _getBonePositions( bones )
		var tree = new KdTree( bonePositions, _distance, ['x','y','z'] )
		var boneNeighbors = _getBoneNeighbors( bonePositions, tree )

		_addSkeletonHelper( poem, mesh )

		poem.emitter.on('update', _updateGrowthFn( tree, bonePositions, config, current ) )
		poem.emitter.on('update', _updateSmoothFn( bonePositions, boneNeighbors, config, current ) )

		var accumulate = 1
		poem.emitter.on('update', function(e) {
			accumulate += e.dt
			var amt = 50
			mesh.position.y = 50 + amt + -amt * Ease( Math.min(1, accumulate / 10000) )
			mesh.rotation.y += e.dt * config.rotationSpeed
		})

		// poem.emitter.once('update', function() {
		// 	console.profileEnd("blob")
		// })
	
		return mesh
	}	
	
	
}