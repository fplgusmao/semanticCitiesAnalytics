(function() {
    'use strict';

    angular
        .module('scaApp.correlator')
        .controller('CorrelatorController', CorrelatorController);

    CorrelatorController.$inject = ['analysisService', 'surveyDataService',
                                    'hexbinService', 'projectToLeaflet', 'turf',
                                    'geometryHelper', '$scope'];

    /*jshint -W071*/
    /* @ngInject */
    function CorrelatorController(analysisService, surveyDataService,
                                   hexbinService, projectToLeaflet, turf,
                                   geometryHelper, $scope) {
        var vm = this;
        vm.label = '';
        vm.phases = [];
        vm.participations = [];
        vm.measures = [];

        var referenceAreaAsString = '';
        var resultingMeasurements = [];
        var allParticipations = [];

        vm.isAreaAgreement = isAreaAgreement;
        vm.createAreaAgreement = createAreaAgreement;

        vm.isSinglePointDistance = isSinglePointDistance;
        vm.createSinglePointDistance = createSinglePointDistance;

        vm.isClosestOfPointsDistance = isClosestOfPointsDistance;
        vm.createClosestOfPointsDistance = createClosestOfPointsDistance;

        vm.removeMeasure = removeMeasure;

        vm.calculateMeasurements = calculateMeasurements;
        vm.measurementsAsString = measurementsAsString;

        vm.toggleMeasurementsVisibility = toggleMeasurementsVisibility;

        vm.deleteIncompleteEntries = false;

        activate();

        ////////////////

        function activate() {
            vm.surveyData = surveyDataService.getPhases();
            allParticipations = surveyDataService.getParticipations();

            vm.label = analysisService.getLabelForCorrelation();
            vm.phases =
                analysisService.getPhasesUnderCorrelationAnalysis();
            vm.subPhase =
                analysisService.getSubPhaseUnderCorrelationAnalysis();
            vm.participations =
                analysisService.getParticipationsForCorrelation();

            vm.hasSubPhase =
                angular.isNumber(vm.subPhase) && vm.subPhase >= 0;
            vm.singlePhase = vm.phases.length === 1 ?
                vm.surveyData[vm.phases[0]] : false;

            vm.phaseTitle = vm.singlePhase ?
                vm.singlePhase.title : false;
            vm.areaName = vm.singlePhase && vm.hasSubPhase ?
                vm.singlePhase.subPhases[vm.subPhase].name :
                false;

            vm.pointAPlacePhases = [];
            vm.pointMultiplePlacesPhases = [];

            vm.surveyData.forEach(function (phase, phaseN) {
                var title = 'Phase ' + phaseN;
                //title += (phase.title ? ' "' + phase.title + '"' : '');
                title += (phase.comment ?
                          ' (' + phase.comment.substring(0, 80) + '...)' : '');

                if (phase.type === 'point-a-place') {
                    vm.pointAPlacePhases.push({
                        phaseNumber : phaseN,
                        phaseName : title
                    });
                } else if (phase.type === 'point-multiple-places') {
                    vm.pointMultiplePlacesPhases.push({
                        phaseNumber : phaseN,
                        phaseName : title
                    });
                }
            });

            vm.createAreaAgreement(); //ask right away for an area to compare to
            $scope.$watch(getReferenceAreaAsString, function (newVal, oldVal) {
                updateReferenceArea(newVal);
            });

            vm.measurementsPreview = false;
        }

        function isAreaAgreement(measureConfig, testParameters) {
            var rightConfig = measureConfig.type === 'areaAgreement';

            var rightParams = true;
            if (testParameters) {
                rightParams =
                    angular.isDefined(measureConfig.polygonAsString) &&
                    measureConfig.polygonAsString.length > 0;
            }

            return rightConfig && rightParams;
        }

        function createAreaAgreement() {
            var measure = {
                type : 'areaAgreement'
            };

            vm.measures.push(measure);
        }

        function isSinglePointDistance(measureConfig, testParameters) {
            var rightConfig = measureConfig.type === 'singlePointDistance';

            var rightParams = true;
            if (testParameters) {
                rightParams =
                    angular.isNumber(measureConfig.targetPhase) &&
                    vm.surveyData[measureConfig.targetPhase] &&
                    vm.surveyData[measureConfig.targetPhase].type ===
                    'point-a-place';
            }

            return rightConfig && rightParams;
        }

        function createSinglePointDistance() {
            var measure = {
                type : 'singlePointDistance'
            };

            vm.measures.push(measure);
        }

        function isClosestOfPointsDistance(measureConfig, testParameters) {
            var rightConfig =
                measureConfig.type === 'closestOfPointsDistance';

            var rightParams = true;
            if (testParameters) {
                rightParams =
                    angular.isNumber(measureConfig.targetPhase) &&
                    vm.surveyData[measureConfig.targetPhase] &&
                    vm.surveyData[measureConfig.targetPhase].type ===
                    'point-multiple-places';
            }

            return rightConfig && rightParams;
        }

        function createClosestOfPointsDistance() {
            var measure = {
                type : 'closestOfPointsDistance'
            };

            vm.measures.push(measure);
        }

        function removeMeasure(measureIndex) {
            if (measureIndex >= vm.measures.length) {
                return;
            }

            vm.measures.splice(measureIndex, 1);
        }

        function calculateMeasurements(deleteIncompleteEntries) {
            var measurementFunctions = {
                areaAgreement : calculateAreaAgreement,
                singlePointDistance : calculateSinglePointDistance,
                closestOfPointsDistance : calculateDistanceOfClosestOfPoints
            };

            var measurementTitles = {
                areaAgreement : ['Drawn area agreement with reference area',
                                 'Drawn area\'s area relative to reference\'s'],
                singlePointDistance : ['Distance between placed point and ' +
                                       'reference area'],
                closestOfPointsDistance : ['Distance to the reference area of ' +
                                           'the closest point among placed points']
            };

            var measurementsDescriptionRow = [];
            var measurementsByParticipant = [];

            vm.measures.forEach(function (measure) {
                var tgtPhase = measure.type === 'areaAgreement' ?
                    's ' + vm.phases.join(', ') : ' ' + measure.targetPhase;
                var titles = measurementTitles[measure.type].map(function (title) {
                    return title + ' (phase' + tgtPhase + ')';
                });
                measurementsDescriptionRow =
                    measurementsDescriptionRow.concat(titles);
            });

            vm.participations.forEach(function (participationN) {
                var participantMeasurements = [];
                var validParticipation = true;

                vm.measures.forEach(function (measure) {
                    if (!validParticipation) {
                        return;
                    }

                    var calcMeasure = measurementFunctions[measure.type];
                    var measurement = calcMeasure(participationN, measure);

                    if (deleteIncompleteEntries &&
                        isIncompleteEntry(measurement)) {
                        validParticipation = false;
                    } else if (angular.isArray(measurement)) {
                        measurement = measurement.map(function (m) {
                            return '' + m;
                        });

                        participantMeasurements =
                            participantMeasurements.concat(measurement);
                    } else {
                        measurement = '' + measurement;
                        participantMeasurements.push(measurement);
                    }
                });

                if (validParticipation) {
                    measurementsByParticipant.push(participantMeasurements);
                }
            });

            resultingMeasurements = [measurementsDescriptionRow];
            resultingMeasurements = resultingMeasurements.concat(measurementsByParticipant);

            var urlManager = window.URL || window.webkitURL;

            if (vm.linkToCSV) {
                urlManager.revokeObjectURL(vm.linkToCSV);
            }

            vm.linkToCSV = convertToCSVFileURL(resultingMeasurements);
        }

        function isIncompleteEntry(entry) {
            if (angular.isArray(entry)) {
                return entry[0] === 'undefined' || entry[1] === 'undefined';
            } else {
                return angular.isUndefined(entry);
            }
        }

        function measurementsAsString() {
            var sByParticipant = resultingMeasurements.map(function (m) {
                return m.join(', ');
            });

            return sByParticipant;
        }

        function toggleMeasurementsVisibility() {
            vm.measurementsPreview = !vm.measurementsPreview;
        }

        //////////////// measurement functions

        function convertToCSVFileURL(measurementsByParticipant) {
            var arrayOfLines = [];

            measurementsByParticipant.forEach(function (measurements, index) {
                var line = measurements.join(',');
                arrayOfLines.push(line);
                //arrayOfLines.push(index === 0 ?
                //                  'data:text/csv;charset=utf-8,' + line :
                //                  line);
            });

            var csvContent = arrayOfLines.join('\n');
            var csvBlob = new Blob([csvContent], {type: 'text/csv'});

            var urlManager = window.URL || window.webkitURL;
            var url = urlManager.createObjectURL(csvBlob);

            return url;
        }

        function calculateAreaAgreement(participationN, measure) {
            var tgtParticipation = allParticipations[participationN];

            if (!isAreaAgreement(measure, true) ||
                angular.isUndefined(tgtParticipation)) {
                return ['undefined', 'undefined'];
            }

            var agreement = 0;
            var participated = false;
            var drawnPolygons;

            for (var i = 0; i < vm.phases.length; i++) {
                var phaseN = vm.phases[i];

                if (isValidDrawAreaParticipation(phaseN, tgtParticipation)) {
                    participated = true;
                    drawnPolygons = tgtParticipation[phaseN]; //as array of vertices
                    break;
                } else if (isValidDrawMultiAreasParticipation(phaseN, vm.subPhase,
                                                              tgtParticipation)) {
                    participated = true;
                    drawnPolygons =
                        tgtParticipation[phaseN][vm.subPhase]; //as array of vertices
                    break;
                }
            }

            if (participated) {
                drawnPolygons =
                    geometryHelper.multiPolygonFeature(drawnPolygons);

                if (angular.isDefined(vm.referenceArea) &&
                    angular.isDefined(drawnPolygons)) {
                    agreement = hexbinService.intersectionInArea(
                        vm.referenceArea,
                        drawnPolygons
                    );
                }

                // agreement = agreement || 0;
                if (agreement >= 0) {
                    agreement *= 100; //turn it into percentage
                    agreement = Math.round(agreement * 10) / 10;  //round to 1 decimal case

                    var areaRelation =
                        turf.area(drawnPolygons) / turf.area(vm.referenceArea);
                    areaRelation *= 100;
                    areaRelation = Math.round(areaRelation * 10) / 10;

                    return [agreement, areaRelation];
                } else {
                    return ['undefined', 'undefined'];
                }
            }

            return ['undefined', 'undefined'];
        }

        function calculateSinglePointDistance(participationN, measure) {
            var tgtParticipation = allParticipations[participationN];

            if (!isSinglePointDistance(measure, true) ||
                angular.isUndefined(tgtParticipation)) {
                return;
            }

            var tgtPhaseNumber = measure.targetPhase;

            var distance = 0;
            var participated = isValidPointAPlaceParticipation(
                tgtPhaseNumber,
                tgtParticipation
            );
            var placedPoint;

            if (participated) {
                placedPoint = tgtParticipation[tgtPhaseNumber];
                placedPoint = placedPoint.features[0];

                if (angular.isDefined(vm.referenceArea) &&
                    angular.isDefined(placedPoint)) {
                    distance = distanceBetweenPointAndPolygon(
                        placedPoint,
                        vm.referenceArea
                    );
                }

                distance = distance || 0;
                return Math.round(distance * 100) / 100; //2 decimal digits
            }
        }

        function calculateDistanceOfClosestOfPoints(participationN, measure) {
            var tgtParticipation = allParticipations[participationN];

            if (!isClosestOfPointsDistance(measure, true) ||
                angular.isUndefined(tgtParticipation)) {
                return;
            }

            var tgtPhaseNumber = measure.targetPhase;

            var closestDistance;
            var participated = isValidPointMultiplePlacesParticipation(
                tgtPhaseNumber,
                tgtParticipation
            );
            var placedPoints;

            if (participated) {
                placedPoints = tgtParticipation[tgtPhaseNumber];
                placedPoints = placedPoints.features;

                var placedPoint, distanceAux;
                for (var i = 0; i < placedPoints.length; i++) {
                    placedPoint = placedPoints[i];

                    if (angular.isDefined(vm.referenceArea) &&
                        angular.isDefined(placedPoint)) {
                        distanceAux = distanceBetweenPointAndPolygon(
                            placedPoint,
                            vm.referenceArea
                        );

                        if (distanceAux === 0) {
                            closestDistance = 0;
                            break;
                        }
                    }

                    closestDistance =
                        Math.min(distanceAux, closestDistance || distanceAux);
                }

                return Math.round(closestDistance * 100) / 100; //2 decimal digits
            }
        }

        //////////////// helpers

        function getReferenceAreaAsString() {
            if (vm.measures[0]) {
                return vm.measures[0].polygonAsString;
            } else {
                return '';
            }
        }

        function updateReferenceArea(newAreaAsString) {
            if (!angular.isString(newAreaAsString) ||
                newAreaAsString.length <= 0) {
                return;
            }

            var newArea = angular.fromJson(newAreaAsString);

            if (angular.isUndefined(newArea)) {
                return;
            }

            newArea = normalizePolygon(newArea);

            if (newArea && newArea.geometry &&
                newArea.geometry.type === 'Polygon') {
                vm.referenceArea = newArea;
            }
        }

        function normalizePolygon(polygon, tolerance) {
            if (polygon.crs) {
                polygon = projectToLeaflet.geoJson(polygon); //geoJson layer
                polygon = polygon.toGeoJSON(); //geoJson FC object
            }

            if (polygon.type === 'FeatureCollection' &&
                polygon.features) {
                polygon = polygon.features[0]; //only supports one polygon
            }

            if (!angular.isObject(polygon) ||
                angular.isUndefined(polygon.geometry) ||
                polygon.geometry.type !== 'Polygon') {
                return;
            }

            polygon = turf.simplify(polygon, tolerance || 0.0005);

            return polygon;
        }

        function isValidDrawAreaParticipation(phaseNumber, participation) {
            return vm.surveyData[phaseNumber] &&
                vm.surveyData[phaseNumber].type === 'draw-area' &&
                angular.isArray(participation[phaseNumber]) &&
                participation[phaseNumber].length > 0;
        }

        function isValidDrawMultiAreasParticipation(phaseNumber, subPhaseNumber,
                                                    participation) {
            return vm.surveyData[phaseNumber] &&
                vm.surveyData[phaseNumber].type === 'draw-multiple-areas' &&
                vm.hasSubPhase && angular.isNumber(subPhaseNumber) &&
                angular.isDefined(participation[phaseNumber]) &&
                participation[phaseNumber] !== null &&
                angular.isArray(participation[phaseNumber][subPhaseNumber]) &&
                participation[phaseNumber][subPhaseNumber].length > 0;
        }

        function isValidPointAPlaceParticipation(phaseNumber, participation) {
            return vm.surveyData[phaseNumber].type &&
                vm.surveyData[phaseNumber].type === 'point-a-place' &&
                participation[phaseNumber] &&
                angular.isArray(participation[phaseNumber].features) &&
                participation[phaseNumber].features.length === 1;
        }

        function isValidPointMultiplePlacesParticipation(phaseNumber,
                                                          participation) {
            return vm.surveyData[phaseNumber].type &&
                vm.surveyData[phaseNumber].type === 'point-multiple-places' &&
                participation[phaseNumber] &&
                angular.isArray(participation[phaseNumber].features) &&
                participation[phaseNumber].features.length > 0;
        }

        function distanceBetweenPointAndPolygon(point, polygon) {
            if (turf.inside(point, polygon)) {
                return 0;
            }

            var closestPointsBySide =
                geometryHelper.getClosestPointsOnPolygonSides(point, polygon);

            var closestPointDistance;
            closestPointsBySide.forEach(function (pointForSide) {
                var d = turf.distance(point, pointForSide);

                if (!angular.isNumber(closestPointDistance)) {
                    closestPointDistance = d;
                } else {
                    closestPointDistance = Math.min(closestPointDistance, d);
                }
            });

            return closestPointDistance;
        }
    }
    /*jshint +W071*/
})();
