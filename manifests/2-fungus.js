module.exports = {
	name : "Growth #2",
	description : "The fungal state",
	order : 1,
	config : {
		camera : {
			z : -300,
			y : 25
		},
		// renderer : {
		// 	useEffects : true
		// },
		fog : {
			nearFactor : 0.8,
			farFactor : 1.1
		}
	},
	components : {
		info : {
			construct: require("../js/components/Info"),
			properties : {
				documentTitle : "Growth #2: The Fungal State | Greg Tatum",
				title : "Growth #2",
				subtitle : "The fungal state",
				// titleCss : { "font-size": "3.35em" },
				// subtitleCss : {	"font-size": "0.7em" },
				showArrowNext : true
			}
		},
		// slider : {
		// 	function: require("../js/components/slider"),
		// 	properties: {
		//   		message : "Adjust the Intensity",
		//   		min: 300,
		//   		max: 600,
		//   		step: 1,
		// 		value: 400,
		//   		callToAction: "Start Growing",
		// 		destroyOnSubmit : true,
		//     	callback : function( poem, number ) {
		// 			poem.treeGrowth.start( number )
		// 		}
		// 	}
		// },
		controls : {
			construct: require("../js/components/cameras/Controls"),
			properties: {
				target : new THREE.Vector3(0, 110, 0)
			}
		},
		fungus : {
			function: require("../js/demos/fungus/fungus"),
			properties: {
				autoStart : true
			}
		},
		// grid : {
		// 	construct: require("../js/components/Grid"),
		// },
		lights : {
			construct: require("../js/components/lights/TrackCameraLights")
		}
	}
};