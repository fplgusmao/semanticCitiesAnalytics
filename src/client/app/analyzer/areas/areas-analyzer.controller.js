(function() {
    'use strict';

    angular
        .module('scaApp.analyzer')
        .controller('AreasAnalyzerController', AreasAnalyzerController);

    AreasAnalyzerController.$inject = ['leaflet', 'turf', '$scope', 'mapToImage',
                                       'hexbinService', 'geometryHelper',
                                       'analysisService', 'surveyDataService',
                                       'filtersService', 'reportService'];

    /* @ngInject */
    function AreasAnalyzerController(leaflet, turf, $scope, mapToImage,
                                     hexbinService, geometryHelper,
                                     analysisService, surveyDataService,
                                     filtersService, reportService) {
        var vm = this;
        vm.loadResults = loadResults;
        vm.undoHexgrid = undoHexgrid;
        vm.redoHexgrid = redoHexgrid;

        vm.loadGuidingLayer = loadGuidingLayer;
        vm.guidingLayerJsonValid = true;

        vm.hexSize = 1;
        vm.hexSizeValid = true;
        vm.changeHexSize = changeHexSize;

        vm.agreementColorsValid = true;
        vm.changeColorRange = changeColorRange;

        vm.agreementCapsValid = true;
        vm.changeAgreementCaps = changeAgreementCaps;

        vm.colorScaleSteps = 4;
        vm.colorScaleStepsValid = true;
        vm.changeColorScaleSteps = changeColorScaleSteps;

        vm.saveSnapshot = saveSnapshot;

        var phasesUnderAnalysis = []; //array of phases numbers
        var surveyPhases = [];
        var participationsInSurvey = []; //array with a participation/element
        var participationsUnderAnalysis = []; //array of participations numbers

        var drawingsByParticipation;

        var hexGrid, hexGridLayer;
        vm.hexGridsHistory = [];
        vm.hexGridsFuture = [];

        var map = {};
        var infoControl = {};
        var legendControl;
        var hexGridColoringOptions = {};

        activate();

        ////////////////

        function activate() {
            surveyPhases = surveyDataService.getPhases();
            phasesUnderAnalysis = analysisService.getPhasesUnderAnalysis();

            participationsInSurvey =
                surveyDataService.getParticipations();
            participationsUnderAnalysis =
                filtersService.getFilteredParticipations();

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
            infoControl = getInfoControl();
            infoControl.addTo(map);

            legendControl = hexbinService.getColorScaleLegend();
            legendControl.addTo(map);

            loadDrawingsFromAllParticipations(phasesUnderAnalysis);

            hexGridColoringOptions = hexbinService.getAreasAgreementOptions();

            vm.agreementCeilColor = hexGridColoringOptions.ceilColor;
            vm.agreementFloorColor = hexGridColoringOptions.floorColor;

            vm.agreementCeil = hexGridColoringOptions.ceil * 100;
            vm.agreementFloor = hexGridColoringOptions.floor * 100;

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
            if (angular.isUndefined(hexGrid)) {
                loadResults();
                return;
            }

            if (map.hasLayer(hexGridLayer)) {
                var hexGridCopy = hexGridLayer;
                vm.hexGridsHistory.push(hexGridCopy);
                vm.hexGridsFuture = [];
                map.removeLayer(hexGridLayer);
            }

            hexGridColoringOptions =
                hexGridColoringOptions ||
                hexbinService.getAreasAgreementOptions();
            hexbinService.setStyleForAgreementOnHex(hexGridColoringOptions);

            if (legendControl) {
                legendControl.removeFrom(map);
            }
            legendControl = hexbinService.getColorScaleLegend();
            legendControl.addTo(map);

            hexGridLayer = leaflet.geoJson(hexGrid, {
                style : hexbinService.styleForAgreementOnHex,
                onEachFeature : hexInteractions
            });
            map.addLayer(hexGridLayer);

            vm.loaded = true;
        }

        function loadResults() {
            var allDrawings = [];

            var drawingsAsCollection = getDrawingsInParticipations(
                //filtersService.getFilteredParticipations(),
                participationsUnderAnalysis,
                phasesUnderAnalysis
            );

            hexGrid = hexbinService.areasIntersectionAsHexbin(
                drawingsAsCollection,
                vm.hexSize, 'kilometers',
                hexGridColoringOptions
            );

            if (map.hasLayer(hexGridLayer)) {
                var hexGridCopy = hexGridLayer;
                vm.hexGridsHistory.push(hexGridCopy);
                vm.hexGridsFuture = [];
                map.removeLayer(hexGridLayer);
            }

            hexGridLayer = leaflet.geoJson(hexGrid, {
                style : hexbinService.styleForAgreementOnHex,
                onEachFeature : hexInteractions
            });
            map.addLayer(hexGridLayer);

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

        function undoHexgrid() {
            if (vm.hexGridsHistory.length > 0) {
                if (map.hasLayer(hexGridLayer)) {
                    var hexGridCopy = hexGridLayer;
                    vm.hexGridsFuture.push(hexGridCopy);
                    map.removeLayer(hexGridLayer);
                }

                hexGridLayer = vm.hexGridsHistory.pop();
                map.addLayer(hexGridLayer);
            }
        }

        function redoHexgrid() {
            if (vm.hexGridsFuture.length > 0) {
                if (map.hasLayer(hexGridLayer)) {
                    var hexGridCopy = hexGridLayer;
                    vm.hexGridsHistory.push(hexGridCopy);
                    map.removeLayer(hexGridLayer);
                }

                hexGridLayer = vm.hexGridsFuture.pop();
                map.addLayer(hexGridLayer);
            }
        }

        function changeHexSize() {
            if (angular.isUndefined(vm.hexSize) ||
                vm.hexSize <= 0) {
                vm.hexSizeValid = false;
                return;
            }

            vm.hexSizeValid = true;
            loadResults();
        }

        function changeColorRange() {
            if (angular.isUndefined(vm.agreementFloorColor)) {
                //ceil can be undefined, and the color will just be darkened
                vm.agreementColorsValid = false;
                return;
            }

            vm.agreementColorsValid = true;
            hexGridColoringOptions.ceilColor = vm.agreementCeilColor;
            hexGridColoringOptions.floorColor = vm.agreementFloorColor;

            loadResultsStyle();
            //loadResults();
        }

        function changeAgreementCaps() {
            if (vm.agreementFloor < 0 || vm.agreementFloor > 100 ||
                vm.agreementCeil < 0 || vm.agreementCeil > 100) {
                vm.agreementCapsValid = false;
                return;
            }

            vm.agreementCapsValid = true;
            vm.agreementCeil = vm.agreementCeil || 100;
            vm.agreementFloor = vm.agreementFloor ? vm.agreementFloor : 0;

            hexGridColoringOptions.ceil = vm.agreementCeil / 100.0;
            hexGridColoringOptions.floor =
                vm.agreementFloor < 1 ? 0 : vm.agreementFloor / 100.0;

            loadResultsStyle();
            //loadResults();
        }

        function changeColorScaleSteps() {
            if (vm.colorScaleSteps < 2 || vm.colorScaleSteps > 20) {
                vm.colorScaleStepsValid = false;
                return;
            }

            vm.colorScaleStepsValid = true;
            hexGridColoringOptions.nColorLevels = vm.colorScaleSteps;

            loadResultsStyle();
        }

        function saveSnapshot() {
            if (!vm.loaded) {
                return;
            }

            var snapshot = {};

            snapshot.correlatable = {};
            snapshot.correlatable.phases = phasesUnderAnalysis;
            snapshot.correlatable.participations = participationsUnderAnalysis;

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
                snapshot.originalLayer = hexGridLayer || {};

                canvas.toBlob(function (blob) {
                    var urlManager = window.URL || window.webkitURL;
                    var url = urlManager.createObjectURL(blob);

                    snapshot.src = url;

                    reportService.addSnapshot(snapshot);
                });
            });
        }

        //////////////// helpers

        function getDrawingsInParticipations(participations, inThesePhases) {
            var drawingsInSelectedParticipations = [];

            if (angular.isUndefined(drawingsByParticipation) ||
                drawingsByParticipation.length === 0) {
                loadDrawingsFromAllParticipations(inThesePhases);
            }

            participations.forEach(function(participationNumber) {
                if (drawingsByParticipation[participationNumber]) {
                    var drawingsInThisParticipation =
                        drawingsByParticipation[participationNumber];
                    drawingsInSelectedParticipations =
                        drawingsInSelectedParticipations
                        .concat(drawingsInThisParticipation);
                }
            });

            return {
                type : 'FeatureCollection',
                features : drawingsInSelectedParticipations
            };
        }

        function loadDrawingsFromAllParticipations(inThesePhases) {
            if (angular.isUndefined(drawingsByParticipation)) {
                drawingsByParticipation = [];
            }
            participationsInSurvey.forEach(function (participation,
                                                     participationN) {
                inThesePhases.forEach(function (phaseNumber) {
                    var polygons = participation[phaseNumber];

                    if (angular.isDefined(polygons) &&
                        angular.isArray(polygons) &&
                        polygons.length > 0) {
                        //if the participant participated on this phase
                        var drawingsOnThisPhase =
                            geometryHelper.multiPolygonFeature(polygons, true);

                        if (angular.isDefined(drawingsOnThisPhase)) {
                            drawingsByParticipation[participationN] =
                                drawingsByParticipation[participationN] || [];

                            drawingsByParticipation[participationN]
                                .push(drawingsOnThisPhase);
                        }
                    }
                });
            });
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
                        ' agreement on ' + props.participations +
                        ' participations';
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
            hexGridLayer.resetStyle(e.target);

            if (infoControl && infoControl.update) {
                infoControl.update();
            }
        }
    }
})();
