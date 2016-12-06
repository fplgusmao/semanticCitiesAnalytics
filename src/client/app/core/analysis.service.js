(function () {
    'use strict';
    angular
        .module('scaApp.core')
        .factory('analysisService', analysisService);

    analysisService.$inject = ['$state'];

    /* @ngInject */
    function analysisService($state) {
        var phasesUnderAnalysis = [];

        var participationsForCorrelation = [],
            phasesUnderCorrelationAnalysis = [],
            subPhaseUnderCorrelationAnalysis,
            labelForCorrelation = '';

        var exports = {
            getPhasesUnderAnalysis : getPhasesUnderAnalysis,
            loadAnalyzer : loadAnalyzer,
            getPhasesUnderCorrelationAnalysis :
                getPhasesUnderCorrelationAnalysis,
            getSubPhaseUnderCorrelationAnalysis :
                getSubPhaseUnderCorrelationAnalysis,
            getParticipationsForCorrelation :
                getParticipationsForCorrelation,
            getLabelForCorrelation :
                getLabelForCorrelation,
            loadCorrelator : loadCorrelator
        };

        return exports;

        ////////////////

        function getPhasesUnderAnalysis() {
            return phasesUnderAnalysis;
        }

        /**
         * Loads the due state for survey results analysis, and sets
         * the phases which data is to be analyzed
         * @param {Array} phases Array containing the numbers of the
         *                       phases to be analyzed
         */
        function loadAnalyzer(phases, analysisType) {
            var analyzerState = 'analyzer';
            if (angular.isDefined(analysisType) &&
                analysisType !== '') {
                analyzerState += '.' + analysisType;
            }

            phasesUnderAnalysis = phases;

            $state.go(analyzerState);
        }

        function getPhasesUnderCorrelationAnalysis() {
            return phasesUnderCorrelationAnalysis;
        }

        function getSubPhaseUnderCorrelationAnalysis() {
            return subPhaseUnderCorrelationAnalysis >= 0 ?
                subPhaseUnderCorrelationAnalysis : false;
        }

        function getParticipationsForCorrelation() {
            return participationsForCorrelation;
        }

        function getLabelForCorrelation() {
            return labelForCorrelation;
        }

        function loadCorrelator(resultsLabel, participations, phases, subPhase) {
            labelForCorrelation = resultsLabel;
            participationsForCorrelation = participations;
            phasesUnderCorrelationAnalysis = phases;
            subPhaseUnderCorrelationAnalysis = subPhase;

            $state.go('correlator');
        }
    }
})();
