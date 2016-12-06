(function() {
    'use strict';

    angular
        .module('scaApp.analyzer')
        .controller('PointsAnalyzerController', PointsAnalyzerController);

    PointsAnalyzerController.$inject = ['$scope', 'leaflet', 'turf',
                                        'mapToImage', 'hexbinService',
                                        'geometryHelper', 'analysisService',
                                        'surveyDataService', 'filtersService',
                                        'reportService'];

    /* @ngInject */
    /*jshint -W072*/
    function PointsAnalyzerController($scope, leaflet, turf,
                                       mapToImage, hexbinService,
                                       geometryHelper, analysisService,
                                       surveyDataService, filtersService,
                                       reportService) {
        var vm = this;
        vm.loadResults = loadResults;

        vm.loadGuidingLayer = loadGuidingLayer;
        vm.guidingLayerJsonValid = true;

        vm.hexSize = 1;
        vm.hexSizeValid = true;
        vm.changeHexSize = changeHexSize;

        vm.colorRangeValid = true;
        vm.changeColorRange = changeColorRange;

        vm.valueRangeValid = true;
        vm.changeHexValueRange = changeHexValueRange;

        vm.colorScaleSteps = 4;
        vm.colorScaleStepsValid = true;
        vm.changeColorScaleSteps = changeColorScaleSteps;

        var HEXBIN_MODE = true, MARKERS_MODE = false;
        vm.resultsMode = HEXBIN_MODE;
        vm.toggleResultsMode = toggleResultsMode;
        vm.onHexbinMode = function() {
            return vm.resultsMode === HEXBIN_MODE;
        };
        vm.onMarkersMode = function() {
            return vm.resultsMode === MARKERS_MODE;
        };

        vm.saveSnapshot = saveSnapshot;

        var phasesUnderAnalysis = [],
            participationsUnderAnalysis = [];
        var surveyPhases = [],
            surveyParticipations = [];
        var multiPointsByParticipation,
            multiPointsUnderAnalysis;
        var markersByParticipation = [],
            markersUnderAnalysis;

        var map,
            infoControl,
            legendControl,
            cachedHexBin,
            cachedHexBinLayer,
            hexbinOptions,
            cachedMarkersLayer;

        activate();

        ////////////////

        function activate() {
            phasesUnderAnalysis = analysisService.getPhasesUnderAnalysis();
            participationsUnderAnalysis = filtersService.getFilteredParticipations();
            surveyPhases = surveyDataService.getPhases();
            surveyParticipations =
                surveyDataService.getParticipations();

            //number of the first phase under analysis
            var targetPhaseNumber = phasesUnderAnalysis[0];
            //TODO: set center as the center of the different centers
            var center = surveyPhases[targetPhaseNumber].mapView.view.center;
            var zoom = surveyPhases[targetPhaseNumber].mapView.view.zoomLevel;

            vm.loaded = false;
            var tiles = hexbinService.getMapTiles();
            map = leaflet.map('map').setView(center, zoom);
            leaflet.tileLayer(tiles.tilesUrl, tiles.tilesAttributes)
                .addTo(map);

            //prepare data for feeding algorithm
            multiPointsByParticipation =
                getPointsFromAllParticipations(phasesUnderAnalysis);
            multiPointsUnderAnalysis =
                getPointsInParticipations(participationsUnderAnalysis,
                                          phasesUnderAnalysis);

            hexbinOptions = hexbinOptions ||
                hexbinService.getPointsDistributionOptions();

            vm.ceilColor = hexbinOptions.ceilColor;
            vm.floorColor = hexbinOptions.floorColor;

            vm.ceilValue = hexbinOptions.ceil * 100;
            vm.floorValue = hexbinOptions.floor * 100;

            $scope.$watch(filtersService.getFilteredParticipations,
                          function (newParticipations, oldParticipations) {
                if (newParticipations === oldParticipations) {
                    return;
                }
                console.log('changed participations. new:',
                            newParticipations.length,
                            'old:', oldParticipations.length);
                participationsUnderAnalysis = newParticipations;
                loadResults();
            });
        }

        function loadResultsStyle() {
            if (angular.isUndefined(cachedHexBin)) {
                loadResults();
                return;
            }

            hexbinOptions =
                hexbinOptions ||
                hexbinService.getPointsDistributionOptions();
            hexbinService.setStyleForAgreementOnHex(hexbinOptions);

            if (map.hasLayer(cachedHexBinLayer)) {
                map.removeLayer(cachedHexBinLayer);
            }

            if (legendControl) {
                legendControl.removeFrom(map);
            }
            legendControl = hexbinService.getColorScaleLegend();
            legendControl.addTo(map);

            var hexbinLayer = leaflet.geoJson(cachedHexBin, {
                style : hexbinService.styleForAgreementOnHex,
                onEachFeature : hexInteractions
            });

            cachedHexBinLayer = hexbinLayer;
            map.addLayer(cachedHexBinLayer);

            vm.loaded = true;
        }

        function loadResults() {
            vm.loading = true;
            vm.loadingState = 'Loading valid participations';

            if (vm.resultsMode === HEXBIN_MODE) {
                multiPointsUnderAnalysis = getPointsInParticipations(
                    participationsUnderAnalysis,
                    phasesUnderAnalysis
                );

                if (map.hasLayer(cachedMarkersLayer)) {
                    map.removeLayer(cachedMarkersLayer);
                }

                if (angular.isUndefined(infoControl)) {
                    infoControl = getInfoControl();
                    infoControl.addTo(map);
                }

                if (legendControl) {
                    legendControl.removeFrom(map);
                }
                legendControl = hexbinService.getColorScaleLegend();
                legendControl.addTo(map);

                hexbinOptions = hexbinOptions ||
                    hexbinService.getPointsDistributionOptions();

                reloadHexbin();
            } else if (vm.resultsMode === MARKERS_MODE) {
                markersUnderAnalysis = getMarkersInParticipations(
                    //filtersService.getFilteredParticipations(),
                    participationsUnderAnalysis,
                    phasesUnderAnalysis
                );

                if (map.hasLayer(cachedHexBinLayer)) {
                    map.removeLayer(cachedHexBinLayer);

                    infoControl.removeFrom(map);
                    infoControl = undefined;

                    if (legendControl) {
                        legendControl.removeFrom(map);
                        legendControl = undefined;
                    }
                } else if (map.hasLayer(cachedMarkersLayer)) {
                    map.removeLayer(cachedMarkersLayer);
                }

                cachedMarkersLayer = leaflet.layerGroup(markersUnderAnalysis);
                map.addLayer(cachedMarkersLayer);
            }

            vm.loading = false;
            vm.loadingState = '';
            vm.loaded = true;
        }

        function loadGuidingLayer() {
            if (angular.isUndefined(vm.guidingLayerGeoJson) ||
                vm.guidingLayerGeoJson.length === 0) {
                if (map.hasLayer(vm.guidingLayer)) {
                    map.removeLayer(vm.guidingLayer);
                }

                return;
            }

            var geoJsonObj = angular.fromJson(vm.guidingLayerGeoJson);
            var guidingLayerAux =
                hexbinService.getGuideLayer(geoJsonObj);

            if (angular.isUndefined(guidingLayerAux)) {
                vm.guidingLayerJsonValid = false;
                return;
            }
            vm.guidingLayerJsonValid = true;

            if (map.hasLayer(vm.guidingLayer)) {
                map.removeLayer(vm.guidingLayer);
            }

            vm.guidingLayer = guidingLayerAux;

            map.addLayer(vm.guidingLayer);
        }

        function changeHexSize() {
            if (!angular.isNumber(vm.hexSize) ||
                vm.hexSize <= 0) {
                vm.hexSizeValid = false;
                return;
            } else {
                vm.hexSizeValid = true;
            }

            //reloadHexbin();
            loadResults();
        }

        function changeColorRange() {
            var HEX_REGEXP = /#?[\da-f]+/i;
            var high = vm.ceilColor;
            var low = vm.floorColor;

            if (angular.isUndefined(vm.floorColor) ||
                !HEX_REGEXP.test(high) || !HEX_REGEXP.test(low)) {
                //ceil can be undefined, color will just be darkened
                vm.colorRangeValid = false;
                return;
            }

            vm.colorRangeValid = true;
            hexbinOptions.ceilColor = vm.ceilColor;
            hexbinOptions.floorColor = vm.floorColor;

            loadResultsStyle();
            //reloadHexbin();
        }

        function changeHexValueRange() {
            if (vm.valueFloor < 0 || vm.valueFloor > 100 ||
                vm.valueCeil < 0 || vm.valueCeil > 100) {
                vm.valueRangeValid = false;
                return;
            }

            vm.valueRangeValid = true;
            vm.valueCeil = vm.valueCeil || 100;
            vm.valueFloor = vm.valueFloor || 0;

            hexbinOptions.ceil = vm.valueCeil / 100.0;
            hexbinOptions.floor =
                vm.valueFloor < 1 ? 0 : vm.valueFloor / 100.0;

            loadResultsStyle();
            //reloadHexbin();
        }

        function changeColorScaleSteps() {
            if (vm.colorScaleSteps < 2 || vm.colorScaleSteps > 20) {
                vm.colorScaleStepsValid = false;
                return;
            }

            vm.colorScaleStepsValid = true;
            hexbinOptions.nColorLevels = vm.colorScaleSteps;

            loadResultsStyle();
        }

        function toggleResultsMode() {
            if (vm.resultsMode === HEXBIN_MODE) {
                vm.resultsMode = MARKERS_MODE;
            } else {
                vm.resultsMode = HEXBIN_MODE;
            }

            loadResults();
        }

        function saveSnapshot() {
            if (!vm.loaded) {
                return;
            }

            var snapshot = {};

            var snapshotPhases = phasesUnderAnalysis;
            snapshot.phases = snapshotPhases;

            var phaseTitle = '',
                snapshotLabel = '';

            if (phasesUnderAnalysis.length === 1) {
                phaseTitle = surveyPhases[phasesUnderAnalysis[0]].title ||
                    '(Untitled)';
                snapshotLabel =
                    'Phase ' + phasesUnderAnalysis[0] +
                    ' - ' + phaseTitle;
            } else {
                snapshotLabel = 'Phases ' + phasesUnderAnalysis.join(', ');
            }

            snapshot.label = snapshotLabel;

            mapToImage(map, function(err, canvas) {
                snapshot.originalLayer = (vm.onHexbinMode() ?
                                          (cachedHexBinLayer || {}) :
                                          (cachedMarkersLayer || {}));

                canvas.toBlob(function (blob) {
                    var urlManager = window.URL || window.webkitURL;
                    var url = urlManager.createObjectURL(blob);

                    snapshot.src = url;

                    reportService.addSnapshot(snapshot);
                });
            });
        }

        //////////////// helpers

        function reloadHexbin() {
            if (angular.isUndefined(multiPointsUnderAnalysis) ||
                multiPointsUnderAnalysis.length <= 0) {
                multiPointsUnderAnalysis = getPointsInParticipations(
                    participationsUnderAnalysis,
                    phasesUnderAnalysis
                );
            }
            var multiPointsFC =
                geometryHelper.featureCollection(multiPointsUnderAnalysis);

            //var hexbin =
            cachedHexBin =
                hexbinService.pointsDistributionAsHexbin(
                    multiPointsFC,
                    vm.hexSize, 'kilometers',
                    hexbinOptions
                );
            var hexbinLayer = leaflet.geoJson(cachedHexBin, {
                style : hexbinService.styleForAgreementOnHex,
                onEachFeature : hexInteractions
            });

            if (map.hasLayer(cachedHexBinLayer)) {
                map.removeLayer(cachedHexBinLayer);
            }
            cachedHexBinLayer = hexbinLayer;
            map.addLayer(cachedHexBinLayer);
        }

        function getPointsFromAllParticipations(inThesePhases) {
            var multiPointsOnAllParticipations = [];

            surveyParticipations.forEach(function (participation,
                                                   participationN) {
                inThesePhases.forEach(function (phaseNumber) {
                    var participationInPhase = participation[phaseNumber];
                    if (angular.isObject(participationInPhase) &&
                        participationInPhase.type &&
                        participationInPhase.type === 'FeatureCollection' &&
                        participationInPhase.features.length > 0) {
                        //if user participated on phase
                        var pointsCoordsOnPhase =
                            geometryHelper.pointsCoordinatesArray(
                                participationInPhase
                            );

                        var multiPointOnPhase =
                            geometryHelper.multiPointFeature(
                                participationInPhase
                            );

                        if (angular.isArray(pointsCoordsOnPhase)) {
                            //array initialization
                            multiPointsOnAllParticipations[participationN] =
                                multiPointsOnAllParticipations[participationN] || [];
                            markersByParticipation[participationN] =
                                markersByParticipation[participationN] || [];
                            //end array initialization

                            var LNG = 0, LAT = 1;
                            var leafletMarkersOnPhase =
                                pointsCoordsOnPhase.map(function (pointCoords) {
                                    //return leaflet.circle(
                                    //    [pointCoords[LAT], pointCoords[LNG]],
                                    //    surveyPhases[phaseNumber].markerRadius,
                                    //    surveyPhases[phaseNumber].markerDetails
                                    //);
                                    return leaflet.circleMarker(
                                        [pointCoords[LAT], pointCoords[LNG]],
                                        surveyPhases[phaseNumber].markerDetails
                                    );
                                });

                            multiPointsOnAllParticipations[participationN] =
                                multiPointsOnAllParticipations[participationN]
                                .concat(multiPointOnPhase);
                            markersByParticipation[participationN] =
                                markersByParticipation[participationN]
                                .concat(leafletMarkersOnPhase);
                        }
                    }
                });
            });

            return multiPointsOnAllParticipations;
        }

        function getMarkersInParticipations(participations, inThesePhases) {
            if (angular.isUndefined(multiPointsByParticipation)) {
                multiPointsByParticipation =
                    getPointsFromAllParticipations(inThesePhases);
            }

            var markersInSelectedParticipations = [];

            participations.forEach(function (participationNumber) {
                if (multiPointsByParticipation[participationNumber]) {
                    //if participated
                    var markersInThisParticipation =
                        markersByParticipation[participationNumber];

                    markersInSelectedParticipations =
                        markersInSelectedParticipations
                        .concat(markersInThisParticipation);
                }
            });

            return markersInSelectedParticipations;
        }

        function getPointsInParticipations(participations, inThesePhases) {
            if (angular.isUndefined(multiPointsByParticipation)) {
                multiPointsByParticipation =
                    getPointsFromAllParticipations(inThesePhases);
            }

            var pointsInSelectedParticipations = [];

            participations.forEach(function (participationNumber) {
                if (multiPointsByParticipation[participationNumber]) {
                    var pointsInThisParticipation =
                        multiPointsByParticipation[participationNumber];

                    pointsInSelectedParticipations =
                        pointsInSelectedParticipations
                        .concat(pointsInThisParticipation);
                }
            });

            return pointsInSelectedParticipations;
        }

        function getHexInfo (d) {
            if (infoControl && infoControl.update) {
                infoControl.update(d);
            }
        }

        function getInfoControl() {
            var agreementInfo = leaflet.control();

            agreementInfo.onAdd = function (map) {
                this._div = leaflet.DomUtil.create('div', 'info-on-map');
                //^^ create a div with a class "info-on-map"
                this.update();
                return this._div;
            };

            agreementInfo.update = function (props) {
                var infoText = 'Hover over an hexagon';

                if (props && props.agreement) {
                    infoText = 'Around <b>' +
                        Math.round(props.agreement * 100) + '%</b>' +
                        ' of participants (of ' + props.participations +
                        ')<br/>placed one or more markers here';
                }

                this._div.innerHTML = '<h4>Drawings agreement</h4>' + infoText;
            };

            return agreementInfo;
        }

        function hexInteractions(hexFeature, layer) {
            layer.on({
                mouseover: highlightHex,
                mouseout: resetHighlight
            });
        }

        function highlightHex(e) {
            var layer = e.target;

            layer.setStyle({
                weight: 5,
                color: '#ddd',
                fillOpacity: 0.9
            });

            if (!leaflet.Browser.ie && !leaflet.Browser.opera) {
                layer.bringToFront();
            }

            if (infoControl && infoControl.update) {
                infoControl.update(layer.feature.properties);
            }
        }

        function resetHighlight(e) {
            cachedHexBinLayer.resetStyle(e.target);

            if (infoControl && infoControl.update) {
                infoControl.update();
            }
        }
    }
})();
