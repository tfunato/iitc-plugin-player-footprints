// ==UserScript==
// @id iitc-plugin-player-footprints
// @name IITC plugin: Player Footprints
// @category  Layer
// @version 0.0.3
// @namespace https://github.com/tfunato/iitc-plugin-player-footprints
// @updateURL https://raw.githubusercontent.com/tfunato/iitc-plugin-player-footprints/main/iitc-plugin-player-footprints.user.js?inline=false
// @downloadURL https://raw.githubusercontent.com/tfunato/iitc-plugin-player-footprints/main/iitc-plugin-player-footprints.user.js?inline=false
// @description Show Player footprints on the map.
// @include        https://intel.ingress.com/*
// @match        https://intel.ingress.com/*
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
            const type = ent && ent[2][18] ? ent[2][18] : 0;
            thisPlugin.highlight(portal, type);
        }
    }

    const footprintSettings = {
        0: { color: "#ffd700", layer: "playerUnvisitedLayerGroup" }, // unvisited
        1: { color: "#ff0000", layer: "playerFootprintsLayerGroup" }, // visited & uncaputre
        3: { color: "#9537ff", layer: "playerFootprintsLayerGroup"}// visited & captured
    };

    thisPlugin.highlight = function(portal, type) {
        if (!type in footprintSettings) {
            return;
        }
        // portal level 0 1  2  3  4 5  6  7  8
        const LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4];
        const LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9,10,11];
        const scale = portalMarkerScale();
        const level = Math.floor(portal["options"]["level"]||0);

        const portalLatLng = L.latLng(portal._latlng.lat, portal._latlng.lng);
        const lvlWeight = LEVEL_TO_WEIGHT[level] * Math.sqrt(scale) + 6;
        const lvlRadius = LEVEL_TO_RADIUS[level] * scale + 2;
        const color = footprintSettings[type].color;
        const layer = footprintSettings[type].layer;
        thisPlugin[layer].addLayer(L.circleMarker(portalLatLng, { radius: lvlRadius, fill: false, color: color, weight: lvlWeight, interactive: false, clickable: false }));
    }

    thisPlugin.clearAllFootprints = function() {
        for (let layer in thisPlugin.playerFootprintsLayerGroup._layers) {
            thisPlugin.playerFootprintsLayerGroup.removeLayer(layer);
        }
        for (let layer in thisPlugin.playerUnvisitedLayerGroup._layers) {
            thisPlugin.playerUnvisitedLayerGroup.removeLayer(layer);
        }
    }

    function getLatLngPoint(data) {
        const result = {
            lat: typeof data.lat == 'function' ? data.lat() : data.lat,
            lng: typeof data.lng == 'function' ? data.lng() : data.lng
        };
        return result;
    }

    function portalMarkerScale() {
        const zoom = map.getZoom();
        if (L.Browser.mobile)
            return zoom >= 16 ? 1.5 : zoom >= 14 ? 1.2 : zoom >= 11 ? 1.0 : zoom >= 8 ? 0.65 : 0.5;
        else
            return zoom >= 14 ? 1 : zoom >= 11 ? 0.8 : zoom >= 8 ? 0.65 : 0.5;
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
       window.plugin.PlayerFootprints.playerUnvisitedLayerGroup = new L.LayerGroup();
       window.addLayerGroup('Player Footprints', window.plugin.PlayerFootprints.playerFootprintsLayerGroup, true);
       window.addLayerGroup('Player Unvisited', window.plugin.PlayerFootprints.playerUnvisitedLayerGroup, true);
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