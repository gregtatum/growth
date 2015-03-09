var Random = require('../../utils/random')

var internals = {
	
	createRingObject : function( geometry, radius, segments, hue ) {

		var rStep = 2 * Math.PI / segments
	
		return {
		
			create : function( height, prevSkinIndex, skinIndex, skinWeight, shrink ) {
			
				for( var i=0; i < segments; i++ ) {

					geometry.vertices.push( new THREE.Vector3(
						Math.sin( i * rStep ) * radius * shrink
					  , height
					  , Math.cos( i * rStep ) * radius * shrink
					))
		
					geometry.skinIndices.push( new THREE.Vector4( prevSkinIndex, skinIndex, 0, 0 ) )
					geometry.skinWeights.push( new THREE.Vector4( 1-skinWeight, skinWeight, 0, 0 ) )
					// geometry.skinWeights.push( new THREE.Vector4( 1, 0, 0, 0 ) )
				}
			
			},
		
			radius : radius,
		
			segments : segments
		
		}
	
	},

	tubeFn : function( geometry, segments, ring ) {
	
		var hue = Math.random()
	
		function createFaces( hueOffset, a, b, c, d ) {
	
			var f1 = new THREE.Face3( a, b, c )
			var f2 = new THREE.Face3( d, c, b )
		
			f1.color = new THREE.Color().setHSL( (hue + hueOffset * 0.03) % 1, 0.5, 0.5 )
			f2.color = new THREE.Color().setHSL( (hue + hueOffset * 0.03) % 1, 0.5, 0.5 )
		
			geometry.faces.push( f1 )
			geometry.faces.push( f2 )
		
		}
	
		return function tube(
			height
		  , prevSkinIndex
		  , skinIndex
		  , prevRingVerts
		  , baseHeight
		  , radiusShrink
		  , depth
		) {
	
			var offset, a, b, c, d, r2
			var hStep = height / segments
			var skinWeight1, skinWeight2
		
			var baseOffset = geometry.vertices.length
		
			//Create the first segment
			ring.create(
				baseHeight + hStep * 1		//height
			  , prevSkinIndex				//skinIndex
			  , skinIndex
			  , (1) / (segments)			//skinWeight
			  , radiusShrink
			)
		
			//Connect the previous ring to the this first segment
			for( var r=0; r < ring.segments; r++ ) {
			
				offset = baseOffset
				r2 = (r + 1) % ring.segments // wrap around the last face

				a = geometry.vertices.indexOf( prevRingVerts[r] )
				b = geometry.vertices.indexOf( prevRingVerts[r2] )
				c = baseOffset + r
				d = baseOffset + r2
	
				createFaces( depth + 1 / segments, a, b, c, d )
			
			}
	
			//Create the rest of the segments
			for( var h=2; h <= segments; h++ ) {
		
				ring.create(
					baseHeight + h * hStep	//height
				  , prevSkinIndex			//prevSkinIndex
				  , skinIndex				//skinIndex
				  , (h) / (segments)		//skinWeight
				  , radiusShrink
				)
		
				for( r=0; r < ring.segments; r++ ) {
			
					//    c___d
					//   /   /
					//  /   /    ^
					// a___b    / direction
			
					offset = baseOffset + (h-2) * ring.segments
					r2 = (r + 1) % ring.segments // wrap around the last face

					a = offset + r
					b = offset + r2
					c = offset + r + ring.segments
					d = offset + r2 + ring.segments
				
					createFaces( depth + h / segments, a, b, c, d )
			
				}
			}
		}

	
	},

	recursiveTubes : function(
		tube
	  , ring
	  , height
	  , geometry
	  , depth
	  , targetDepth
	  , ringSlice
	  , prevSkinIndex
	  , minBranch
	  , maxBranch
	  , radiusShrink
	  , radiusShrinkI
	) {

		if( depth === targetDepth ) return

		geometry.bones.push({  
			"parent":prevSkinIndex
		  , "name":"segment"
		  , "pos":[0,height,0]
		  , "rotq":[0,0,0,1]
		})
	
		var skinIndex = geometry.bones.length - 1;
	
		tube(
			height			//tube length
		  , prevSkinIndex
		  , skinIndex		//skinIndex
		  , ringSlice		//base slice vertices
		  , height * depth	//base height
		  , radiusShrink
		  , depth
		)
	
		var nextRingSlice = geometry.vertices.slice(
			geometry.vertices.length - ring.segments,
			geometry.vertices.length
		)
	
		var rand
		if( depth > 3 ) {
			rand = Random.rangeInt( minBranch, maxBranch )
		} else {
			rand = maxBranch
		}
	
		for( var i=0; i < rand; i++ ) {
			internals.recursiveTubes(
				tube
			  , ring
			  , height
			  , geometry
			  , depth + 1
			  , targetDepth
			  , nextRingSlice
			  , skinIndex
			  , minBranch
			  , maxBranch
			  , radiusShrink * radiusShrinkI
			  , radiusShrinkI
			)
		}
	
	},

	generateGeometry : function( config ) {
	
		var geometry = new THREE.Geometry()
		var ring = internals.createRingObject(
			geometry
		  , config.radius
		  , config.rSegments
		  , Math.random() //baseHue
		)
	
		//Create a base ring
		ring.create(
			0	// height
		  , -1	// skinIndex
		  , 0 	// prevSkinIndex
		  , 1	// skinWeight
		  , 1	// radius shrink
		)

		var ringSlice = geometry.vertices.slice(0, ring.segments)
	
		var tube = internals.tubeFn(
			geometry,
			config.hSegments,
			ring
		)
	
		geometry.bones = [  
		    {
		        "parent":-1,
		        "name":"root",
		        "pos":[0,-config.height,0],
		        "rotq":[0,0,0,1]
		    }
		]
	
		internals.recursiveTubes(
			tube                 // tube
		  , ring                 // ring
		  , config.height        // height
		  , geometry             // geometry
		  , 0                    // depth
		  , config.depth         // targetDepth
		  , ringSlice            // ringSlice
		  , 0                    // prevSkinIndex
		  , config.minBranch     // minBranch
		  , config.maxBranch     // maxBranch
		  , 1                    // radiusShrink
		  , config.radiusShrink  // radiusShrinkI
		)
	
		geometry.computeFaceNormals()
		geometry.computeVertexNormals()
	
		return geometry;
	},

	createMesh : function( config, geometry ) {
	
		var mat = new THREE.MeshPhongMaterial({
			skinning : true
		  , emissive : 0x000000
		  , color : 0x888888
		  , wireframe : false
		  , vertexColors : THREE.FaceColors
		})
	
		mat.side = THREE.DoubleSide
	
		var mesh = new THREE.SkinnedMesh(
			geometry,
			mat,
			true
		)
	
		mesh.skeletonHelper = new THREE.SkeletonHelper( mesh )
		mesh.skeletonHelper.material.linewidth = 3
		// mesh.add( mesh.skeletonHelper )
	
	
		return mesh
	}

}

module.exports = function treeMesh( config ) {
	
	var geometry = internals.generateGeometry( config )
	var mesh = internals.createMesh( config, geometry )
	
	return mesh;
	
}