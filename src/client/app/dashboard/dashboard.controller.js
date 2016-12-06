(function () {
    'use strict';

    angular
        .module('scaApp.dashboard')
        .controller('DashboardController', DashboardController);

    DashboardController.$inject = ['surveyDataService', 'analysisService',
                                   'statisticsService', 'surveyPreviewer',
                                   'phraseNormalizer',
                                   '$scope'];
    /* @ngInject */
    function DashboardController(surveyDataService, analysisService,
                                 statisticsService, surveyPreviewer,
                                 phraseNormalizer,
                                 $scope) {
        var surveyLoaded = false,
            resultsLoaded = false;

        var analysisType = '';

        var vm = this;

        vm.surveyPhases = [];
        vm.surveyParticipationsByPhase = [];
        vm.surveyParticipations = [];
        vm.surveyIndexedParticipationsByPhase = [];

        vm.phasesToAnalyze = []; //array of phases' numbers

        vm.dataLoaded = dataLoaded;
        vm.getReadablePhaseType = getReadablePhaseType;
        vm.toogleAnalysis = toogleAnalysis;
        vm.isEligibleForAnalysis = isEligibleForAnalysis;
        vm.isUnderAnalysis = isUnderAnalysis;
        vm.clearPhasesToAnalyze = clearPhasesToAnalyze;
        vm.loadAnalysis = loadAnalysis;

        vm.noPhasesToAnalyze = function () {
            return vm.phasesToAnalyze.length === 0;
        };

        activate();

        ////////////////

        function activate() {
            surveyDataService.loadSurveyData().
            then(function () {
                vm.surveyPhases =
                    surveyDataService.getPhases();
                vm.surveyParticipations =
                    surveyDataService.getParticipations();
                vm.surveyParticipationsByPhase =
                    surveyDataService.getParticipationsByPhase();
                vm.surveyIndexedParticipationsByPhase =
                    surveyDataService.getParticipationsByPhase(true);

                surveyLoaded = true;
                resultsLoaded = true;
            });
        }

        /**
         * Tells if all the data needed to evaluate the survey results was
         * loaded from the servers/databases.
         * @returns {boolean} If survey data and its results were loaded
         */
        function dataLoaded() {
            return surveyLoaded && resultsLoaded;
        }

        function getReadablePhaseType(phaseType) {
            return phraseNormalizer.toHumanFromDashed(phaseType, true, true);
        }

        function toogleAnalysis(phaseNumber) {
            if (isUnderAnalysis(phaseNumber)) {
                removePhaseFromAnalysis(phaseNumber);
            } else {
                addPhaseToAnalysis(phaseNumber);
            }
        }

        function isEligibleForAnalysis(phaseNumber) {
            if (vm.phasesToAnalyze.length === 0) {
                return true;
            }

            var basePhaseIndex = vm.phasesToAnalyze[0],
                basePhase = vm.surveyPhases[basePhaseIndex];

            var targetPhase = vm.surveyPhases[phaseNumber];

            var compatible = isTypeOfInputCompatible(basePhase.type, targetPhase.type, phaseNumber);

            return compatible;
        }

        function isUnderAnalysis(phaseNumber) {
            return vm.phasesToAnalyze.indexOf(phaseNumber) > -1;
        }

        function clearPhasesToAnalyze() {
            vm.phasesToAnalyze = [];
        }

        function loadAnalysis() {
            if (!vm.phasesToAnalyze && vm.phasesToAnalyze.length > 0) {
                return;
            }

            analysisService.loadAnalyzer(vm.phasesToAnalyze, analysisType);
        }

        //////////////// helpers

        function addPhaseToAnalysis(phaseNumber) {
            if (phaseNumber >= vm.surveyPhases.length) {
                return;
            }

            switch (vm.surveyPhases[phaseNumber].type) {
                case 'questionnaire':
                    analysisType = 'questionnaire';
                    break;
                case 'point-a-place':
                    analysisType = 'points';
                    break;
                case 'point-multiple-places':
                    analysisType = 'points';
                    break;
                case 'draw-area':
                    analysisType = 'areas';
                    break;
                case 'draw-multiple-areas':
                    analysisType = 'multipleAreas';
                    break;
                case 'survey-information':
                    analysisType = 'surveyInformation';
                    break;
                default:
                    analysisType = '';
                    break;
            }

            vm.phasesToAnalyze.push(phaseNumber);
        }

        function removePhaseFromAnalysis(phaseNumber) {
            var index = vm.phasesToAnalyze.indexOf(phaseNumber);
            if (index > -1) {
                vm.phasesToAnalyze.splice(index, 1);
            }

            if (vm.phasesToAnalyze.length === 0) {
                analysisType = '';
            }
        }

        function isTypeOfInputCompatible(type1, type2, targetPhaseNumber) {
            if (type1 !== 'draw-multiple-areas' &&
                type1 === type2) {
                //same types of input are compatible
                // for all but draw-multiple-areas
                return true;
            }

            switch (type1) {
                case 'point-a-place':
                    return type2 === 'point-a-place' ||
                        type2 === 'point-multiple-places';
                case 'point-multiple-places':
                    return type2 === 'point-a-place' ||
                        type2 === 'point-multiple-places';
                case 'draw-multiple-areas':
                    return vm.phasesToAnalyze[0] === targetPhaseNumber;
                default:
                    return false;
            }
        }
    }
})();
