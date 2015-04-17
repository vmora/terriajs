'use strict';

/*global require,L*/
var DeveloperError = require('../../Cesium/Source/Core/DeveloperError');
var ImageryProvider = require('../../Cesium/Source/Scene/ImageryProvider');
var WebMercatorTilingScheme = require('../../Cesium/Source/Core/WebMercatorTilingScheme');

var CesiumTileLayer = L.TileLayer.extend({
    initialize: function(imageryProvider, options) {
        this.imageryProvider = imageryProvider;
        this.tileSize = 256;
        this._delayedUpdate = undefined;
        this._ready = false;
        this._zSubtract = 0;

        L.TileLayer.prototype.initialize.call(this, undefined, options);
    },

    getTileUrl: function(tilePoint) {
        var z = tilePoint.z - this._zSubtract;
        if (z < 0) {
            return this.options.errorTileUrl;
        }

        var oldLoad = ImageryProvider.loadImage;
        
        var tileUrl = this.options.errorTileUrl;
        ImageryProvider.loadImage = function(imageryProvider, url) {
            tileUrl = url;
        };

        this.imageryProvider.requestImage(tilePoint.x, tilePoint.y, z);

        ImageryProvider.loadImage = oldLoad;

        return tileUrl;
    },

    _update: function() {
        if (!this.imageryProvider.ready) {
            if (!this._delayedUpdate) {
                var that = this;
                this._delayedUpdate = setTimeout(function() {
                    that._delayedUpdate = undefined;
                    that._update.apply(that, arguments);
                }, 100);
            }
            return;
        }

        if (!this._ready) {
            this._ready = true;

            var tilingScheme = this.imageryProvider.tilingScheme;
            if (!(tilingScheme instanceof WebMercatorTilingScheme)) {
                throw new DeveloperError('Only ImageryProviders using the WebMercatorTilingScheme can be used with Leaflet.');
            }

            if (tilingScheme.getNumberOfXTilesAtLevel(0) === 2 && tilingScheme.getNumberOfYTilesAtLevel(0) === 2) {
                this._zSubtract = 1;
            } else if (tilingScheme.getNumberOfXTilesAtLevel(0) !== 1 || tilingScheme.getNumberOfYTilesAtLevel(0) !== 1) {
                throw new DeveloperError('Only ImageryProviders with 1x1 or 2x2 tiles at level 0 can be used with Leaflet.');
            }
        }

        L.TileLayer.prototype._update.apply(this, arguments);
    }
});

module.exports = CesiumTileLayer;