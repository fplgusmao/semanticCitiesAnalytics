
(function () {

    'use strict';
    angular
        .module('scaApp.analyzer')
        .factory('hexbinService', hexbinService);

    hexbinService.$inject = ['leaflet', 'turf',
                             'geometryHelper',
                             'projectToLeaflet'];

    /* @ngInject */
    function hexbinService(leaflet, turf,
                           geometryHelper,
                           projectToLeaflet) {
        var AREAS_HEXBIN = true,
            POINTS_HEXBIN = false;
        var DEFAULT_N_COLOR_LEVELS = 4;

        var tilesForHexbin = {
            tilesUrl : 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}' +
            '.png?access_token={accessToken}',
            tilesAttributes: {
                attribution : 'Map data &copy; <a href="http://' +
                'openstreetmap.org">OpenStreetMap</a>' +
                'contributors, <a href="http://creativecommons.org/licenses' +
                '/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://' +
                'mapbox.com">Mapbox</a>',
                id : 'fplgusmao.pia8kehj',
                accessToken : 'pk.eyJ1IjoiZnBsZ3VzbWFvIiwiYSI6IlNONWp0LUkifQ' +
                '.XYa-yuNprw_yxm_2E9jYCw'
            }
        };

        var agreementDefaultOptions = {
            floor : 0.1,
            ceil : 0.75,
            nColorLevels : 4,
            floorColor : 'ffffb2',
            ceilColor : 'f03b20',
            minOpacity : 0.5,
            maxOpacity : 0.55
        };
        var activeAgreementOptions = agreementDefaultOptions;

        var pointDistributionDefaultOptions = {
            floor : 0.05,
            ceil : 0.33,
            nColorLevels : 4,
            floorColor : 'ffffb2',
            ceilColor : 'f03b20',
            minOpacity : 0.5,
            maxOpacity : 0.55
        };

        var exports = {
            intersectionsAsHexgrid : intersectionsAsHexgrid,
            areasIntersectionAsHexbin : areasIntersectionAsHexbin,
            pointsDistributionAsHexbin : pointsDistributionAsHexbin,
            getAreasAgreementOptions : getAreasAgreementOptions,
            getPointsDistributionOptions : getPointsDistributionOptions,
            setStyleForAgreementOnHex : setStyleForAgreementOnHex,
            styleForAgreementOnHex : getStyleForAgreementOnHex,
            getGuideLayer : getGuideLayer,
            getMapTiles : function () {
                return tilesForHexbin;
            },
            intersectionInArea : intersectionInArea,
            getColorScaleLegend : getColorScaleLegend
        };

        return exports;

        ////////////////

        function areasIntersectionAsHexbin(areasCollection,
                                           hexWidth, widthUnits,
                                           options) {
            return generateHexbin(AREAS_HEXBIN, areasCollection,
                                  hexWidth, widthUnits,
                                  options);
        }

        function pointsDistributionAsHexbin(pointsCollection,
                                            hexWidth, widthUnits,
                                            options) {
            return generateHexbin(POINTS_HEXBIN, pointsCollection,
                                  hexWidth, widthUnits,
                                  options);
        }

        function generateHexbin(type, featureCollection,
                                hexWidth, widthUnits,
                                options) {
            var hexgridBB = turf.extent(featureCollection); //finds bounding box

            widthUnits = (widthUnits === 'miles' ? 'miles' : 'kilometers');

            var hexgrid = turf.hexGrid(hexgridBB, hexWidth, widthUnits);

            var calcAgreement, defaultOptions;
            if (type === POINTS_HEXBIN) {
                calcAgreement = totalPointAgreementOnHex;
                defaultOptions = pointDistributionDefaultOptions;
            } else if (type === AREAS_HEXBIN) {
                calcAgreement = totalAreaAgreementOnHex;
                defaultOptions = agreementDefaultOptions;
            } else {
                return hexgrid;
            }

            activeAgreementOptions = options || defaultOptions;

            hexgrid.features.forEach(function (currentHex) {
                var agreement = calcAgreement(currentHex,
                                              featureCollection);

                currentHex.properties = {
                    'agreement' : agreement,
                    'participations' : featureCollection.features.length
                };
            });

            return hexgrid;
        }

        /**
         * Takes a drawings collection, and returns an set of Hexagons, each
         * with the due information of the intersection of the drawings over
         * its area. The drawings collection is a FeatureCollection of
         * MultiPolygon. Each MultiPolygon Feature represents the diferent
         * polygons drawn by a participant.
         * @param   {FeatureCollection.<MultiPolygon>} drawingsCollection
         *          The collection of drawings made by the participants
         * @param   {number} hexWidth Width of each hexagon
         * @param   {number} widthUnits Units (miles|kilometers) for the hex width
         * @param   {Object} options Options for the agreement coloring
         * @returns {FeatureCollection.<Polygon>} A FeatureCollection
         *          containing a set of Polygon Features, each representing an
         *          hexagon in the produced HexGrid, and each describing the
         *          intersection of the drawings over it with the "agreement"
         *          property (on GeoJSO's Feature "properties" object property)
         */
        function intersectionsAsHexgrid(drawingsCollection,
                                        hexWidth, widthUnits,
                                        options) {
            activeAgreementOptions = options || agreementDefaultOptions;

            var hexgridBB = turf.extent(drawingsCollection); //finds bounding box

            widthUnits = (widthUnits === 'miles' ? 'miles' : 'kilometers');
            var hexgrid = turf.hexGrid(hexgridBB, hexWidth, widthUnits);

            hexgrid.features.forEach(function (currentHex) {
                var agreement = totalAreaAgreementOnHex(currentHex,
                                                        drawingsCollection);
                currentHex.properties = {
                    'agreement' : agreement,
                    'participations' : drawingsCollection.features.length
                };

                return currentHex;
            });

            return hexgrid;
        }

        function getAreasAgreementOptions() {
            return agreementDefaultOptions;
        }

        function getPointsDistributionOptions() {
            return pointDistributionDefaultOptions;
        }

        function setStyleForAgreementOnHex(styleOptions) {
            activeAgreementOptions = styleOptions;
            generateColorScale(); //update color scale hack
        }

        function getStyleForAgreementOnHex(hex) {
            var hexStyle = {
                stroke : false,
                fill : true,
                fillOpacity : 0,
                fillColor : '#FFFFFF'
            };
            var agreementOnHex = hex.properties.agreement;
            var agreementOptions = activeAgreementOptions;

            if (angular.isUndefined(agreementOptions.colorScale)) {
                generateColorScale();
            }

            if (angular.isDefined(agreementOptions.floor) &&
                agreementOnHex < agreementOptions.floor) {
                return hexStyle;
            }

            hexStyle.fillColor = '#' + getColor(agreementOnHex);
            hexStyle.fillOpacity = agreementOptions.maxOpacity;

            return hexStyle;
        }

        function getGuideLayer(collection) {
            if (angular.isString(collection)) {
                collection = angular.fromJson(collection);
            }

            if (collection.type !== 'FeatureCollection' &&
                collection.type !== 'Feature') {
                return;
            }

            if (collection.crs) {
                collection = projectToLeaflet.geoJson(collection); //geoJson layer
                collection = collection.toGeoJSON(); //geoJson FC object
            }

            if (collection.type === 'Feature') {
                return getSingleObjectGuideLayer(collection);
            }

            var guideLayer = leaflet.geoJson(collection, {
                style : guidingFeaturesStyle,
                pointToLayer : pointToGuideLayer
            });

            return guideLayer;
        }

        /**
         * Finds the intersection between a given area and a
         * MultiPolygon Feature, returning it as a relative measure, i.e: as
         * how much of the MultiPolygon intersects the area, on a number
         * from 0 to 1. If any error occurs during the calculations, returns -1
         * as the resulting intersection value
         * @param   {Feature.<Polygon>} targetArea Area to find the
         *           intersections with
         * @param   {Feature.<MultiPolygon>} multiPolygonFeature Set of
         *           polygons, given as a MultiPolygon
         * @returns {number} How much of the target area is intersected by the
         *           MultiPolygon
         */
        function intersectionInArea(targetArea, multiPolygonFeature) {
            var polygons = multiPolygonFeature.geometry.coordinates;
            var nPolygons = polygons.length;
            var intersection = 0;

            for (var i = 0, partial = 0, polygonAsFeature = {};
                 i < nPolygons; i++) { //for each polygon in the multiPolygon
                try {
                    polygonAsFeature = turf.polygon(polygons[i]);

                    partial = normalizedIntersection(polygonAsFeature,
                                                     targetArea);
                } catch (polygonCreationError) {
                    //if there was an error creating the polygon, just consider
                    //that there's was an error finding the intersection
                    partial = -1;
                }

                if (partial < 0) {
                    //one of the polygons was not correctly formed
                    //or some other error occurred
                    // -> exit function
                    intersection = -1;
                    return intersection;
                } else {
                    //multiple drawn polygons can intersect the same
                    //area. Its sum will never be greater than 1,
                    //assuming it's impossible for those drawn polygons
                    //to overlapse eachother
                    intersection += partial;
                }
            }

            /*if (intersection > 0.999 && getRelativeSize) {
                //polygon is bigger than target area
                //return its relative size to the target area
                return turf.area(multiPolygonFeature) / turf.area(targetArea);
            }*/

            return Math.min(intersection, 1); //supporting erroneous states
        }

        function getColorScaleLegend() {
            var legend = leaflet.control({position : 'bottomright'});

            if (angular.isUndefined(activeAgreementOptions.colorScale)) {
                generateColorScale();
            }

            var colorScale = activeAgreementOptions.colorScale;

            legend.onAdd = function (map) {
                var div = leaflet.DomUtil.create('div', 'info-on-map legend');

                div.innerHTML += 'Agreement (in %)<br>';

                var currentVal, nextVal;
                for (var i = 0; i < colorScale.length; i++) {
                    currentVal = Math.round(colorScale[i].value * 100);
                    nextVal = colorScale[i + 1] ?
                        Math.round(colorScale[i + 1].value * 100) : '100';
                    div.innerHTML +=
                        '<i style="background:#' + colorScale[i].color + '"></i> ' +
                        currentVal + ' &ndash; ' + nextVal + '<br>';
                }

                return div;
            };

            return legend;
        }

        //////////////// helpers

        function getSingleObjectGuideLayer(feature) {
            if (feature.type !== 'Feature' || !feature.geometry) {
                return;
            }

            var guideLayer = leaflet.geoJson(feature, {
                style : guidingFeaturesStyle,
                pointToLayer : pointToGuideLayer
            });

            return guideLayer;
        }

        function pointToGuideLayer(feature, latlng) {
            return leaflet.circleMarker(latlng, guidingPointStyle());
        }

        function guidingPointStyle() {
            return {
                radius : 5,
                color : '#222222',
                fillColor : '#777777',
                fillOpacity : 0.8
            };
        }

        function guidingFeaturesStyle(feature) {
            if (!feature || !feature.geometry) {
                return;
            }
            switch (feature.geometry.type) {
                case 'Polygon':
                    return {
                        stroke : true,
                        color : '#000044',
                        weight : 3,
                        opacity : 0.9,
                        fill : false
                    };
                case 'MultiPolygon' :
                    return {
                        stroke : true,
                        color : '#000044',
                        weight : 3,
                        opacity : 1,
                        fill : false
                    };
                case 'LineString' :
                    return {
                        stroke : true,
                        color : '#004400',
                        weight : 3,
                        opacity : 0.9,
                        fill : false
                    };
                default:
                    break;
            }
        }

        function generateColorScale() {
            var styleConfig = activeAgreementOptions;

            if (!angular.isNumber(styleConfig.floor)) {
                styleConfig.floor = 0.1;
            }

            if (!angular.isNumber(styleConfig.ceil)) {
                styleConfig.ceil = 0.75;
            }

            if (!angular.isNumber(styleConfig.nColorLevels) ||
                styleConfig.nColorLevels < 2) {
                styleConfig.nColorLevels = DEFAULT_N_COLOR_LEVELS;
            }

            var colorScale = [];
            var nSeparatorsBetween = styleConfig.nColorLevels - 2; //2 = floor and ceil
            var between = styleConfig.ceil - styleConfig.floor,
                step = between / (nSeparatorsBetween + 1);

            colorScale.push({
                value : styleConfig.floor,
                color : styleConfig.floorColor
            });

            var value, color, relativeValue;
            for (var i = 1; i <= nSeparatorsBetween; i++) {
                relativeValue = (i * step) / between;
                value = styleConfig.floor + (i * step);
                value = Math.round(value * 100) / 100;
                color = shadeColor(-1 * relativeValue, //to darken with the intensity
                                   styleConfig.floorColor,
                                   styleConfig.ceilColor);
                colorScale.push({
                    value : value,
                    color : color
                });
            }

            var lastStep = (nSeparatorsBetween + 1) * step;
            colorScale.push({
                value : styleConfig.ceil,
                color : styleConfig.ceilColor ||
                shadeColor(lastStep, styleConfig.floorColor)
            });

            styleConfig.colorScale = colorScale;
        }

        function getColor(forThisValue) {
            if (angular.isUndefined(activeAgreementOptions.colorScale)) {
                generateColorScale();
            }

            var colorScale = activeAgreementOptions.colorScale;
            var i = colorScale.length - 1;
            var color = 'FFFFFF'; //default

            while (i >= 0) {
                if (forThisValue >= colorScale[i].value) {
                    color = colorScale[i].color;
                    break;
                }

                --i;
            }

            return color;
        }

        function shadeColor(amount, colorFrom, colorTo) {
            /*jshint -W016*/
            var BLEND = angular.isString(colorTo);
            var LIGHTEN = amount >= 0, DARKEN = !LIGHTEN,
                LIGHTEST = 'FFFFFF',
                DARKEST = '000000';

            if (angular.isString(colorFrom) && colorFrom.charAt(0) === '#') {
                colorFrom = colorFrom.slice(1);
            }

            if (BLEND && colorTo.charAt(0) === '#') {
                colorTo = colorTo.slice(1);
            }

            if (colorFrom.length !== 6 ||
                (BLEND && colorFrom.length !== 6)) {
                return DARKEST;
            }

            if (!BLEND) {
                colorTo = LIGHTEN ? LIGHTEST : DARKEST;
            }

            var from = parseInt(colorFrom, 16),
                to = parseInt(colorTo, 16);

            var Rfrom = from >> 16, //get 2 leftmost hex
                Gfrom = (from >> 8) & 0x00FF, //get 2 middle hex
                Bfrom = from & 0x0000FF; //get 2 rightmost hex

            var Rto = to >> 16,
                Gto = (to >> 8) & 0x00FF,
                Bto = to & 0x0000FF;

            var n = (amount < 0 ? -1 * amount : amount);

            return (0x1000000 +
                 (Math.round((Rto - Rfrom) * n) + Rfrom) * 0x10000 + //0x10000 = shift to R in RGB
                 (Math.round((Gto - Gfrom) * n) + Gfrom) * 0x100 + //0x100 = shift to G in RGB
                 (Math.round((Bto - Bfrom) * n) + Bfrom))
                .toString(16) //base 16 for hex
                .slice(1); //remove the rightmost '1'
            /*jshint +W016*/
        }

        /**
         * Takes an hexagon (Polygon Feature) of an hex-grid and a
         * MultiPolygon FeatureCollection, and returns the total agreement
         * among the collection for that hexagon. I.e: finds the intersection
         * between each polygon and the hex, and normalizes the resulting sum,
         * reflecting how many of the given features intersect the hexagon, and
         * even how much overlapping occurs betwen each feature and the hexagon
         * @param   {Feature.<Polygon>} hex Hexagon over which the intersections
         *           will be calculated
         * @param   {FeatureCollection.<MultiPolygon>} multiPolygons The
         *           collection of MultiPolygon Features to account for the
         *           intersection calculation
         * @returns {number} How much agreement is on the given hexagon, on a
         *           number between 0 and 1, 0 representing no intersections at
         *           all, and 1 representing every valid MultiPolygon
         *           intersecting the hexagon in its entirety
         */
        function totalAreaAgreementOnHex(hex, multiPolygons) {
            if (multiPolygons.type !== 'FeatureCollection') {
                return 0;
            }

            var totalIntersection = 0,
                normalizedIntersection = 0;
            var consideredFeatures = 0;

            multiPolygons.features.forEach(function (multiPolygon) {
                if (multiPolygon.type !== 'Feature' ||
                    multiPolygon.geometry.type !== 'MultiPolygon') {
                    return;
                }

                var intersection = intersectionInArea(hex, multiPolygon);

                if (intersection >= 0) {
                    totalIntersection += intersection;
                    consideredFeatures++;
                }
            });

            if (consideredFeatures > 0 &&
                totalIntersection <= consideredFeatures) {
                normalizedIntersection = totalIntersection / consideredFeatures;
            }

            return normalizedIntersection;
        }

        function totalPointAgreementOnHex(hex, multiPoints) {
            if (multiPoints.type !== 'FeatureCollection') {
                return 0;
            }

            var participationsInside = 0,
                normalized = 0;
            var totalParticipations = multiPoints.features.length;

            multiPoints.features.forEach(function (multiPoint) {
                if (multiPoint.type !== 'Feature' ||
                    multiPoint.geometry.type !== 'MultiPoint') {
                    return;
                }

                var anyPointInside = anyPointInsideHex(hex, multiPoint);

                if (anyPointInside) {
                    participationsInside++;
                }
            });

            normalized = participationsInside / totalParticipations;

            //if (consideredFeatures > 0 &&
            //    participationsInside <= consideredFeatures) {
            //    normalizedIntersection = participationsInside / consideredFeatures;
            //}

            return normalized;
        }

        function anyPointInsideHex(hex, multiPointFeature) {
            var points = geometryHelper.pointFeatures(multiPointFeature);

            var targetPoint = {}, inside = false;
            for (var i = 0; i < points.length; i++) {
                targetPoint = points[i];

                inside = turf.inside(targetPoint, hex);

                if (inside) {
                    return true;
                }
            }

            return false;
        }

        /**
         * Calculates the intersection of two polygons, returning the result
         * normalized to the base polygon's area
         * @param   {object} intersectingPolygon Polygon Feature
         * @param   {object} basePolygon         Polygon Feature, which area
         *                                       will be the normalizing
         *                                       factor
         * @returns {number} The normalized intersection, from 0 to 1. If
         *                   calculations fail, returns -1
         */
        function normalizedIntersection(intersectingPolygon, basePolygon) {
            try {
                var intersection = turf.intersect(intersectingPolygon,
                                                  basePolygon);
                var areaOfIntersection = 0;

                if (angular.isDefined(intersection) &&
                    intersection.geometry.type === 'Polygon') {
                    areaOfIntersection = turf.area(intersection);
                }

                var normalizedIntersection =
                    areaOfIntersection / turf.area(basePolygon);

                return normalizedIntersection;
            } catch (e) {
                //error calculating the intersection
                return -1;
            }
        }
    }
})();
