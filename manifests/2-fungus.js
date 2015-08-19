module.exports = {
	name : "Growth #2",
	description : "The fungal state",
	order : 1,
	config : {
		camera : {
			z : -300,
			y : -100
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
				subtitleCss : {
					"font-size": "1.36em",
					"letter-spacing" : "0.2em",
				},
				arrowPrevHref : "#/1-seedling",
				arrowNextHref : "http://gregtatum.com/category/interactive/",
			}
		},
		slider : {
			function: require("../js/components/slider"),
			properties: {
		  		message : "How hot do you want your device to get?",
		  		min: 0.1,
		  		max: 1,
		  		step: 0.001,
				value: 0.5,
		  		callToAction: "Grow a Fungus",
				destroyOnSubmit : true,
		    	callback : function( poem, number ) {
					poem.fungus( number )
				}
			}
		},
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