(function() {
    'use strict';

    angular
        .module('scaApp.analyzer')
        .controller('SurveyInformationAnalyzerController',
                    SurveyInformationAnalyzerController);

    SurveyInformationAnalyzerController.$inject = ['$scope',
                                                   'analysisService',
                                                   'surveyDataService',
                                                   'filtersService',
                                                   'reportService'];

    /* @ngInject */
    function SurveyInformationAnalyzerController ($scope,
                                                  analysisService,
                                                  surveyDataService,
                                                  filtersService,
                                                  reportService) {
        var vm = this;
        vm.anyPhaseWithData = false;
        vm.submittedEmails = [];
        vm.hasDataToAnalyze = hasDataToAnalyze;

        var phasesUnderAnalysis = [],
            phasesWithData = [],
            participations = [],
            participationsUnderAnalysis = [];

        activate();

        ////////////////

        function activate() {
            phasesUnderAnalysis = analysisService.getPhasesUnderAnalysis();
            participations = surveyDataService.getParticipations();
            var surveyPhases = surveyDataService.getPhases();

            var phaseNumber = 0;
            for (var i = 0; i < phasesUnderAnalysis.length; i++) {
                phaseNumber = phasesUnderAnalysis[i];

                var targetPhase = surveyPhases[phaseNumber];

                if (targetPhase.type === 'survey-information' &&
                    targetPhase.followup &&
                    targetPhase.followup.email) {
                    phasesWithData.push(phaseNumber);
                }
            }

            if (hasDataToAnalyze()) {
                participationsUnderAnalysis =
                    getAllValidParticipations(phasesWithData);

                loadResults();

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
        }

        function getAllValidParticipations(forThesePhases) {
            var validParticipations = [];

            participations.forEach(function (participation, participationN) {
                var valid = false;

                var phaseNumber = 0;
                for (var i = 0; i < forThesePhases.length; i++) {
                    phaseNumber = forThesePhases[i];

                    if (participation[phaseNumber] &&
                        angular.isString(participation[phaseNumber].email) &&
                        participation[phaseNumber].email.length > 0) {
                        valid = true;
                        break;
                    }
                }

                if (valid) {
                    validParticipations.push(participationN);
                }
            });

            return validParticipations;
        }

        function loadResults() {
            var emails = [];

            participationsUnderAnalysis.forEach(function (participationN) {
                var participation = participations[participationN];

                phasesWithData.forEach(function (phaseNumber) {
                    var participationInPhase = participation[phaseNumber];

                    if (participationInPhase &&
                        angular.isString(participationInPhase.email) &&
                        participationInPhase.email.length > 0) {
                        emails.push(participationInPhase.email);
                    }
                });
            });

            vm.submittedEmails = emails;
        }

        function hasDataToAnalyze() {
            return phasesWithData.length > 0;
        }
    }
})();
