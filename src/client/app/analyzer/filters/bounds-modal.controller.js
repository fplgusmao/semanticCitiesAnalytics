(function() {
    'use strict';

    angular
        .module('scaApp.analyzer')
        .controller('boundsModalController', boundsModalController);

    boundsModalController.$inject = ['$uibModalInstance', 'leaflet', 'turf',
                                     'resolvedMapCenter', 'geometryHelper'];

    /* @ngInject */
    function boundsModalController ($uibModalInstance, leaflet, turf,
                                    resolvedMapCenter, geometryHelper) {
        /*jshint -W040, -W055, -W016*/
        var DRAW = true, DELETE = false;
        var vm = this;
        vm.saveMapBounds = saveMapBounds;
        vm.confirm = confirmAndExit;
        vm.cancel = cancelAndExit;

        var map, waitAndLoadMap;
        var mapCenter, mapZoom;

        var tiles = {
            'tilesUrl': 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
            'tilesAttributes': {
                'attribution': '&copy; <a href=\'http://osm.org/copyright\'>' +
                'OpenStreetMap</a> contributors',
                'maxZoom': 18,
                'minZoom': 10
                //id : 'myId.ifNeeded',
                //accessToken : 'accessToken4MapAPI.ifNeeded'
            }
        };

        activate();

        ////////////////

        function activate() {
            vm.boundsSaved = false;
            vm.saveBoundsLabel = 'Save these bounds';

            mapCenter = resolvedMapCenter;
            mapZoom = 11;
            waitAndLoadMap = window.setTimeout(loadMap, 500);
        }

        function loadMap() {
            map = leaflet.map('bounds-map')
                .setView(mapCenter, mapZoom);
            vm.mapLoaded = true;

            leaflet.tileLayer(tiles.tilesUrl, tiles.tilesAttributes)
                .addTo(map);

            map.on('zoomend', newMapBounds);
            map.on('movestart', newMapBounds);
        }

        function newMapBounds() {
            vm.boundsSaved = false;
            vm.saveBoundsLabel = 'Save these bounds';
        }

        function saveMapBounds() {
            var boundsSW = map.getBounds().getSouthWest(),
                boundsNE = map.getBounds().getNorthEast();
            vm.mapBounds = [
                boundsSW.lng,
                boundsSW.lat,
                boundsNE.lng,
                boundsNE.lat
            ];

            vm.boundsSaved = true;
            vm.saveBoundsLabel = 'Saved!';

            confirmAndExit();
        }

        function savePolygonsVertices(eventData) {
            var polygons = eventData.latLngs;
            if (polygons.length <= 0) {
                vm.boundsAsPolygon = {
                    type : 'Feature',
                    geometry : {}
                };
                return;
            }

            vm.boundsAsPolygon =
                geometryHelper.multiPolygonFeature(polygons);
        }

        function confirmAndExit(returnValue) {
            if (waitAndLoadMap) {
                window.clearTimeout(waitAndLoadMap);
            }

            if (vm.mapBounds) {
                $uibModalInstance.close(vm.mapBounds);
            } else {
                $uibModalInstance.dismiss('No Bounds');
            }
        }

        function cancelAndExit() {
            if (waitAndLoadMap) {
                window.clearTimeout(waitAndLoadMap);
            }
            $uibModalInstance.dismiss('Canceled');
        }
        /*jshint +W040, +W054, +W016*/
    }
})();
