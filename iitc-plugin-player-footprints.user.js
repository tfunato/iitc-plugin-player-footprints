// ==UserScript==
// @id iitc-plugin-player-footprints
// @name IITC plugin: Player Footprints
// @category  Layer
// @version 0.0.1
// @namespace https://github.com/tfunato/iitc-plugin-player-footprints
// @updateURL https://raw.githubusercontent.com/tfunato/iitc-plugin-player-footprints/main/iitc-plugin-player-footprints.user.js?inline=false
// @downloadURL https://raw.githubusercontent.com/tfunato/iitc-plugin-player-footprints/main/iitc-plugin-player-footprints.user.js?inline=false
// @description Show Player footprints on the map.
// @include		https://intel.ingress.com/*
// @match		https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if(typeof window.plugin !== 'function') window.plugin = function() {};

    //PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
    //(leaving them in place might break the 'About IITC' page or break update checks)
    plugin_info.buildName = 'iitc';
    plugin_info.dateTimeVersion = '20210210000000';
    plugin_info.pluginId = 'player-footprints';
    //END PLUGIN AUTHORS NOTE

// PLUGIN START ////////////////////////////////////////////////////////

    // use own namespace for plugin
    window.plugin.PlayerFootprints = function() {};
    const thisPlugin = window.plugin.PlayerFootprints;

    thisPlugin.updatePlayerFootprints = function() {
        if(map.getZoom() < 15) {
            return;
        }
        console.log('refreshing footprints');
        for (let guid in window.portals) {
            let portal = window.portals[guid];
            let ent = portal.options.ent;
            if(ent && ent[2][18]) {
                if(ent[2][18] === 3 || ent[2][18] === 1){
                    thisPlugin.highlightFootprint(portal, ent[2][18]);
                }
            }
        }
    }

    const footprintColor = {
        1: "#ff0000", // visited & uncaputre
        3: "#9537ff" // visited & captured
    };

    thisPlugin.highlightFootprint = function(portal, type) {
		const scale = map.getZoom();
		const portalLatLng = L.latLng(portal._latlng.lat, portal._latlng.lng);
		const lvlWeight = 30;
		const lvlRadius = 2;
        const color = footprintColor[type];
		thisPlugin.playerFootprintsLayerGroup.addLayer(L.circleMarker(portalLatLng, { radius: lvlRadius, fill: false, color: color, weight: lvlWeight, interactive: false, clickable: false }));
	}

    thisPlugin.clearAllFootprints = function() {
        for (let layer in thisPlugin.playerFootprintsLayerGroup._layers) {
            thisPlugin.playerFootprintsLayerGroup.removeLayer(layer);
        }
    }

    function getLatLngPoint(data) {
		const result = {
			lat: typeof data.lat == 'function' ? data.lat() : data.lat,
			lng: typeof data.lng == 'function' ? data.lng() : data.lng
		};
		return result;
	}

    // ass calculating portal marker visibility can take some time when there's lots of portals shown, we'll do it on
    // a short timer. this way it doesn't get repeated so much
    window.plugin.PlayerFootprints.delayedUpdatePlayerFootprints = function(wait) {
        if (window.plugin.PlayerFootprints.timer === undefined) {
            window.plugin.PlayerFootprints.timer = setTimeout ( function() {
                window.plugin.PlayerFootprints.timer = undefined;
                window.plugin.PlayerFootprints.updatePlayerFootprints();
            }, wait*1000);
        }
    }

    // The entry point for this plugin.
   function setup() {
       window.plugin.PlayerFootprints.playerFootprintsLayerGroup = new L.LayerGroup();
       window.addLayerGroup('Player Footprints', window.plugin.PlayerFootprints.playerFootprintsLayerGroup, true);
       window.addHook('requestFinished', function() { setTimeout(function(){window.plugin.PlayerFootprints.delayedUpdatePlayerFootprints(3.0);},1); });
       window.map.on('zoomend', window.plugin.PlayerFootprints.clearAllFootprints);
   }

    setup.info = plugin_info; //add the script info data to the function as a property
	// if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded) {
        setup();
    } else {
        if (!window.bootPlugins) {
            window.bootPlugins = [];
        }
        window.bootPlugins.push(setup);
    }
}

// PLUGIN END //////////////////////////////////////////////////////////

(function () {
	const plugin_info = {};
	if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
		plugin_info.script = {
			version: GM_info.script.version,
			name: GM_info.script.name,
			description: GM_info.script.description
		};
	}
	// Greasemonkey. It will be quite hard to debug
	if (typeof unsafeWindow != 'undefined' || typeof GM_info == 'undefined' || GM_info.scriptHandler != 'Tampermonkey') {
	// inject code into site context
		const script = document.createElement('script');
		script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(plugin_info) + ');'));
		(document.body || document.head || document.documentElement).appendChild(script);
	} else {
		// Tampermonkey, run code directly
		wrapper(plugin_info);
	}
})();
