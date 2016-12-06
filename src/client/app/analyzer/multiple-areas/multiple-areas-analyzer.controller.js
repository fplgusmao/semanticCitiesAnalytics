(function() {
    'use strict';

    angular
        .module('scaApp.analyzer')
        .controller('MultipleAreasAnalyzerController', MultipleAreasAnalyzerController);

    MultipleAreasAnalyzerController.$inject = ['leaflet', 'turf', '$scope', 'mapToImage',
                                               'hexbinService', 'geometryHelper',
                                               'analysisService', 'surveyDataService',
                                               'filtersService', 'reportService'];

    /* @ngInject */
    function MultipleAreasAnalyzerController (leaflet, turf, $scope, mapToImage,
                                               hexbinService, geometryHelper,
                                               analysisService, surveyDataService,
                                               filtersService, reportService) {
        /* jshint -W040 */
        var vm = this;

        vm.areas = [];

        vm.analysisOptions = {};

        vm.loadGuidingLayer = loadGuidingLayer;
        vm.guidingLayerJsonValid = true;

        vm.analysisOptions.hexSize = 0.15;
        vm.analysisOptions.hexSizeValid = true;
        vm.changeHexSize = changeHexSize;

        vm.agreementColorsValid = true;
        vm.changeColorRange = changeAgreementColorRange;

        vm.agreementCapsValid = true;
        vm.changeAgreementCaps = changeAgreementCaps;

        vm.colorScaleSteps = 4;
        vm.colorScaleStepsValid = true;
        vm.changeColorScaleSteps = changeColorScaleSteps;

        vm.saveSnapshot = saveSnapshot;
        vm.loadResults = loadResults;

        var SAME_AREA = true;

        var phaseUnderAnalysis; //phase number
        var surveyPhases = [];
        var participationsInSurvey = []; //array with a participation/element
        var participationsUnderAnalysis = [];
        var previousAreaNumber;

        var drawnAreasByParticipation;

        var map,
            infoControl,
            legendControl,
            hexGrid,
            hexGridLayer,
            hexGridColoringOptions;

        activate();

        ////////////////

        function activate() {
            //only one phase of 'draw-multiple-areas' supported
            phaseUnderAnalysis = analysisService.getPhasesUnderAnalysis()[0];
            surveyPhases = surveyDataService.getPhases();

            participationsInSurvey =
                surveyDataService.getParticipations();
            participationsUnderAnalysis =
                filtersService.getFilteredParticipations();

            vm.areas = surveyPhases[phaseUnderAnalysis].subPhases;

            var mapAttrAux = surveyPhases[phaseUnderAnalysis].mapView.view;
            loadMap(mapAttrAux.center, mapAttrAux.zoomLevel);
            infoControl = getInfoControl();
            infoControl.addTo(map);

            legendControl = hexbinService.getColorScaleLegend();
            legendControl.addTo(map);

            loadAllParticipations(phaseUnderAnalysis);

            hexGridColoringOptions = hexbinService.getAreasAgreementOptions();

            vm.analysisOptions.agreementCeilColor = hexGridColoringOptions.ceilColor;
            vm.analysisOptions.agreementFloorColor = hexGridColoringOptions.floorColor;

            vm.analysisOptions.agreementCeil = hexGridColoringOptions.ceil * 100;
            vm.analysisOptions.agreementFloor = hexGridColoringOptions.floor * 100;

            $scope.$watch(filtersService.getFilteredParticipations,
                          function (newParticipations, oldParticipations) {
                if (newParticipations === oldParticipations) {
                    return;
                }
                console.log('changed participations. new:',
                            newParticipations.length,
                            'old:', oldParticipations.length);
                participationsUnderAnalysis = newParticipations;
                loadResults(SAME_AREA);
            });
        }

        function loadResultsStyle() {
            if (angular.isUndefined(hexGrid)) {
                loadResults(0);
                return;
            }

            if (map.hasLayer(hexGridLayer)) {
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

        function loadResults(areaNumber) {
            if (areaNumber === SAME_AREA &&
                angular.isNumber(previousAreaNumber)) {
                areaNumber = previousAreaNumber;
            } else if (areaNumber === SAME_AREA &&
                       !angular.isNumber(previousAreaNumber)) {
                return;
            }

            previousAreaNumber = areaNumber;

            var drawingsForThisArea = getAreaDrawingsFromParticipations(
                areaNumber,
                participationsUnderAnalysis,
                phaseUnderAnalysis
            );

            hexGrid = hexbinService.intersectionsAsHexgrid(
                drawingsForThisArea,
                vm.analysisOptions.hexSize, 'kilometers'
            );

            if (map.hasLayer(hexGridLayer)) {
                var hexGridCopy = hexGridLayer;
                //TODO: register in history

                map.removeLayer(hexGridLayer);
            }

            hexGridLayer = leaflet.geoJson(hexGrid, {
                style : hexbinService.styleForAgreementOnHex,
                onEachFeature : hexInteractions
            });

            map.addLayer(hexGridLayer);
            vm.loading = false;
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
            if (angular.isUndefined(vm.analysisOptions.hexSize) ||
                vm.analysisOptions.hexSize <= 0) {
                vm.analysisOptions.hexSizeValid = false;
                return;
            }

            vm.analysisOptions.hexSizeValid = true;
            loadResults(SAME_AREA);
        }

        function changeAgreementCaps() {
            if (vm.analysisOptions.agreementFloor < 0 ||
                vm.analysisOptions.agreementFloor > 100 ||
                vm.analysisOptions.agreementCeil < 0 ||
                vm.analysisOptions.agreementCeil > 100) {
                vm.agreementCapsValid = false;
                return;
            }

            vm.agreementCapsValid = true;
            vm.analysisOptions.agreementCeil =
                vm.analysisOptions.agreementCeil || 100;
            vm.analysisOptions.agreementFloor =
                vm.analysisOptions.agreementFloor || 0;

            hexGridColoringOptions.ceil =
                vm.analysisOptions.agreementCeil / 100.0;
            hexGridColoringOptions.floor =
                vm.analysisOptions.agreementFloor < 1 ?
                0 : vm.analysisOptions.agreementFloor / 100.0;

            loadResultsStyle();
            //loadResults(SAME_AREA);
        }

        function changeAgreementColorRange() {
            if (angular.isUndefined(vm.analysisOptions.agreementFloorColor)) {
                //ceil can be undefined, and the color will just be darkened
                vm.agreementColorsValid = false;
                return;
            }

            vm.agreementColorsValid = true;
            hexGridColoringOptions.ceilColor =
                vm.analysisOptions.agreementCeilColor;
            hexGridColoringOptions.floorColor =
                vm.analysisOptions.agreementFloorColor;

            loadResultsStyle();
            //loadResults(SAME_AREA);
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
            snapshot.correlatable.phases = [phaseUnderAnalysis];
            snapshot.correlatable.subPhase = previousAreaNumber;
            snapshot.correlatable.participations =
                participationsUnderAnalysis;

            var phaseTitle = '',
                snapshotLabel = '';

            phaseTitle = surveyPhases[phaseUnderAnalysis.title] ||
                '(Untitled)';
            snapshotLabel =
                'Phase ' + phaseUnderAnalysis +
                ' - "' + phaseTitle + '" for the area of ' +
                (vm.areas[previousAreaNumber].name || previousAreaNumber);

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

        function loadMap(center, initialZoom) {
            var tiles = hexbinService.getMapTiles();
            map = leaflet.map('map').setView(center, initialZoom);
            leaflet.tileLayer(tiles.tilesUrl, tiles.tilesAttributes)
                .addTo(map);
        }

        function loadAllParticipations(forThisPhase) {
            if (angular.isUndefined(drawnAreasByParticipation)) {
                drawnAreasByParticipation = [];
            }

            participationsInSurvey.forEach(function (participation,
                                                     participationN) {
                var drawnAreas = participation[forThisPhase];

                if (angular.isDefined(drawnAreas) &&
                    angular.isObject(drawnAreas) &&
                    Object.keys(drawnAreas).length > 0) {
                    //if the participant participated on this phase
                    drawnAreasByParticipation[participationN] = drawnAreas;
                }
            });
        }

        function getAreaDrawingsFromParticipations(areaNumber, participations,
                                                    inThisPhase) {
            var drawingsInParticipations = [];

            if (angular.isUndefined(drawnAreasByParticipation) ||
                drawnAreasByParticipation.length === 0) {
                loadAllParticipations(inThisPhase);
            }

            participations.forEach(function(participationNumber) {
                var participation =
                    drawnAreasByParticipation[participationNumber];
                var drawnAreaPolygons = participation ?
                    participation['' + areaNumber] : false;

                if (drawnAreaPolygons &&
                    angular.isArray(drawnAreaPolygons) &&
                    drawnAreaPolygons.length > 0) {
                    var NORMALIZE = true;

                    var polygonsAsFeature = geometryHelper.multiPolygonFeature(
                        drawnAreaPolygons,
                        NORMALIZE
                    );

                    drawingsInParticipations.push(polygonsAsFeature);
                }
            });

            return {
                type : 'FeatureCollection',
                features : drawingsInParticipations
            };
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
