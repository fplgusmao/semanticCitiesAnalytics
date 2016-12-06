(function () {
    'use strict';
    angular
        .module('scaApp.analyzer')
        .factory('geometryHelper', geometryHelper);

    geometryHelper.$inject = ['turf'];

    /* @ngInject */
    function geometryHelper(turf) {
        var exports = {
            featureCollection : featureCollection,
            pointsCoordinatesArray : pointsCoordinatesArray,
            generateConvexPolygon : generateConvexPolygon,
            polygonFeature : polygonFeature,
            multiPolygonFeature : multiPolygonFeature,
            multiPointFeature : multiPointFeature,
            pointFeatures : pointFeatures,
            pointFeature : pointFeature,
            getClosestPointsOnPolygonSides : getClosestPointsOnPolygonSides
        };

        return exports;

        ////////////////

        /**
         * Takes an array of features and returns a FeatureCollection
         * containing all of them
         * @param   {Array.<Feature>}   features Array of Features
         * @returns {FeatureCollection} FeatureCollection
         */
        function featureCollection(features) {
            return {
                type : 'FeatureCollection',
                features : features
            };
        }

        /**
         * Takes a FeatureCollection of points and returns an array of point
         * coordinates, each represented by a bi-dimensional array with its
         * coords as [lng, lat]
         * @param   {object} pointsFeatureCollection GeoJson's FeatureCollection
         * @returns {Array} Array of point coordinates
         */
        function pointsCoordinatesArray(pointsFeatureCollection) {
            var pointsAsCoords = [];

            if (angular.isUndefined(pointsFeatureCollection.type) ||
                pointsFeatureCollection.type !== 'FeatureCollection') {
                return pointsAsCoords;
            }

            pointsAsCoords =
                pointsFeatureCollection.features.map(getPointCoords);

            return pointsAsCoords;

            function getPointCoords(pointFeature) {
                if (pointFeature.type &&
                    pointFeature.type === 'Feature' &&
                    pointFeature.geometry &&
                    pointFeature.geometry.type === 'Point') {
                    return pointFeature.geometry.coordinates;
                }
            }
        }

        /**
         * Takes a set of points and returns a Polygon Feature containing a
         * convex polygon based on those points (if possible, as polygon
         * vertices). Supports a FeatureCollection of Point Features, an array
         * of Point Features, or an array of point coordinates (bi-dimensional
         * array with [lng, lat] as elements)
         * @param   {(FeatureCollection|Array.<Feature>|Array)} points
         *          Points to use as vertices of the polygon
         * @returns {Feature} Feature for the convex polygon. If unable to
         *                    create one, returns undefined
         */
        function generateConvexPolygon(points) {
            try {
                var pointsCollection = {};
                if (points.type && points.type === 'FeatureCollection') {
                    pointsCollection = points;
                } else if (points[0].type === 'Feature' &&
                           points[0].geometry.type === 'Point') {
                    //array of point features
                    pointsCollection = {
                        type : 'FeatureCollection',
                        features : points
                    };
                } else {
                    //array of point coordinates
                    var pointsAsFeatures = [];
                    points.forEach(function (point) {
                        if (point.length === 2 &&
                            angular.isNumber(point[0]) &&
                            angular.isNumber(point[1])) {
                            pointsAsFeatures.push(turf.point(point));
                        }
                    });

                    pointsCollection = {
                        type : 'FeatureCollection',
                        features : pointsAsFeatures
                    };
                }

                return turf.convex(pointsCollection);
            } catch (e) {
                return undefined;
            }
        }

        /**
         * Takes an array of Leaflet.FreeDraw polygon vertices and returns a
         * Polygon Feature. A Leaflet.FreeDraw polygon vertex is an object
         * with 2 properties ("lat" and "lng").
         * @param   {Array<object>}     freeDrawPolygon Array of Leaflet.FreeDraw
         *                                              polygon vertices
         * @param   {boolean}           makeItConvex    Flag for making the
         *                                              generated polygon convex
         * @returns {Feature.<Polygon>} A Polygon Feature
         * @throws  {Error} if failed to generate the polygon
         */
        function polygonFeature(freeDrawPolygon, makeItConvex) {
            var geoJsonVertices = [];
            var geoJsonPolygon = {};

            freeDrawPolygon.forEach(function (vertex) {
                if (angular.isNumber(vertex.lng) &&
                    angular.isNumber(vertex.lat)) {
                    geoJsonVertices.push([vertex.lng, vertex.lat]);
                }
            });

            //TODO: support empty geoJsonVertices
            if (makeItConvex) {
                geoJsonPolygon = generateConvexPolygon(geoJsonVertices);
            } else {
                geoJsonPolygon = turf.polygon([geoJsonVertices]);
            }

            return geoJsonPolygon;
        }

        /**
         * Takes an array of Leaflet.FreeDraw polygons (each, an array of
         * Leaflet.FreeDraw vertices) and returns a MultiPolygon Feature. A
         * Leaflet.FreeDraw polygon vertex is an object with 2 properties (
         * "lat" and "lng").
         * @param {Array<Array<object>>} freeDrawPolygons Array of
         *        Leaflet.FreeDraw polygons.
         * @param {boolean} normalizePolygons Flag for making sure the
         *        different polygons are valid. If any of them isn't, try to
         *        create a convex polygon from it, or discard it if not
         *        possible.
         * @returns {Feature.<MultiPolygon> | undefined} A MultiPolygon Feature
         *          or `undefined` if it was not possible to generate one from
         *          the given polygons
         */
        function multiPolygonFeature(freeDrawPolygons, normalizePolygons) {
            var multiPolygonCoordinates = [];

            freeDrawPolygons.forEach(function (freeDrawPolygon, i) {
                var verticesCoordinates = [];
                freeDrawPolygon.forEach(function (freeDrawVertex) {
                    if (angular.isNumber(freeDrawVertex.lng) &&
                        angular.isNumber(freeDrawVertex.lat)) {
                        verticesCoordinates.push([freeDrawVertex.lng,
                                                  freeDrawVertex.lat]);
                    }
                });
                //a geoJSON polygon is an array of linear rings
                //freeDraw polygons have only one ring per polygon
                var polygonLinearRings = [verticesCoordinates];

                var minimumVertices = 4; //turf polygon must have more than 3 vertices
                if (verticesCoordinates.length < minimumVertices) {
                    //we can clean some things up right here
                    return undefined;
                }

                try {
                    var testPolygon = turf.polygon(polygonLinearRings);
                    var kinks = turf.kinks(testPolygon);

                    if (kinks.intersections.features.length > 0) {
                        //has at least one self-intersection
                        //try to create a convex polygon out of it
                        var testPolygonPoints = turf.explode(testPolygon);
                        var convexPolygon = turf.convex(testPolygonPoints);
                        //convexPolygon is a polygon feature
                        //convexPolygon's coordinates[0] is the outermost
                        //  linear ring
                        polygonLinearRings = [
                            convexPolygon.geometry.coordinates[0]
                        ];
                    }

                    multiPolygonCoordinates.push(polygonLinearRings);
                } catch (e) {
                    //invalid polygon
                    //don't add the polygon to the final multiPolygon
                    return undefined;
                }
            });

            if (multiPolygonCoordinates.length === 0) {
                return undefined;
            }

            var multiPolygonFeature = {
                type : 'Feature',
                properties : {},
                geometry : {
                    type : 'MultiPolygon',
                    coordinates : multiPolygonCoordinates
                }
            };

            return multiPolygonFeature;
        }

        function multiPointFeature(pointsFeatureCollection) {
            var geoJsonMultiPoint = {};
            geoJsonMultiPoint.type = 'Feature';
            geoJsonMultiPoint.geometry = {};
            geoJsonMultiPoint.geometry.type = 'MultiPoint';
            geoJsonMultiPoint.geometry.coordinates = [];
            var multiPointCoordinates = geoJsonMultiPoint.geometry.coordinates;

            pointsFeatureCollection.features.forEach(function (pointFeature) {
                if (pointFeature &&
                    pointFeature.geometry &&
                    pointFeature.geometry.coordinates) {
                    multiPointCoordinates.push(
                        pointFeature.geometry.coordinates
                    );

                }
            });

            return geoJsonMultiPoint;
        }

        function pointFeatures(multiPointFeature) {
            var pointFeatures = [];

            if (!angular.isObject(multiPointFeature.geometry) ||
                !angular.isArray(multiPointFeature.geometry.coordinates)) {
                return;
            }

            pointFeatures = multiPointFeature.geometry.coordinates.
            map(function (pointCoords) {
                return pointFeature(pointCoords);
            });

            return pointFeatures;
        }

        function pointFeature(coords) {
            return {
                type : 'Feature',
                geometry : {
                    type : 'Point',
                    coordinates : coords
                }
            };
        }

        //considers only the first linear ring of polygonFeature
        function getPolygonSides(polygonFeature) {
            if (angular.isUndefined(polygonFeature.geometry) ||
                polygonFeature.geometry.type !== 'Polygon') {
                return [];
            }

            var coords = polygonFeature.geometry.coordinates[0];
            //^^^ only supports one linear ring polygon
            var polygonSides = [];
            for (var i = 0, j = 1; j < coords.length; i++, j++) {
                polygonSides.push(
                    turf.linestring([coords[i], coords[j]])
                );
            }

            return polygonSides;
        }

        function lineString(arrayOfCoords, properties) {
            return {
                type : 'Feature',
                properties : properties,
                geometry : {
                    type : 'LineString',
                    coordinates : arrayOfCoords
                }
            };
        }

        //considers only the first linear ring of polygonFeature
        function getClosestPointsOnPolygonSides(pointFeature, polygonFeature) {
            if (!pointFeature || !polygonFeature ||
                !polygonFeature.geometry || !pointFeature.geometry ||
                polygonFeature.geometry.type !== 'Polygon' ||
                pointFeature.geometry.type !== 'Point') {
                return [];
            }

            var polygonCoords = polygonFeature.geometry.coordinates[0];
            //^^^ only supports one linear ring polygon
            var closestPoints = [], currentSide;
            for (var i = 0, j = 1; j < polygonCoords.length; i++, j++) {
                currentSide =
                    turf.linestring([polygonCoords[i], polygonCoords[j]]);

                closestPoints.push(
                    turf.pointOnLine(currentSide, pointFeature)
                );
            }

            return closestPoints;
        }
    }
})();
