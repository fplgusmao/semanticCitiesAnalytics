(function () {
    'use strict';
    angular
        .module('scaApp.core')
        .factory('statisticsService', statisticsService);

    statisticsService.$inject = ['surveyDataService', 'phraseNormalizer'];

    /* @ngInject */
    function statisticsService(surveyDataService, phraseNormalizer) {
        var exports = {
            getSurveyStatistics : getSurveyStatistics,
            getGeneralStatisticsForPhase: getGeneralStatisticsForPhase
        };

        return exports;

        ////////////////

        function getSurveyStatistics() {
            var surveyPhases = surveyDataService.getPhases();
            var participations = surveyDataService.getParticipations();
            var nParticipations = 0;

            participations.forEach(function (participation) {
                if (!angular.isArray(participation) ||
                    participation.length <= 0) {
                    return;
                } else {
                    nParticipations++;
                }

                //TODO: know if target participation is complete
            });

            var surveyStatistics = {
                generalStatistics : '',
                phasesStatistics : []
            };

            surveyStatistics.phasesStatistics =
                surveyPhases.map(function (phase, phaseN) {
                var phaseStats = getGeneralStatisticsForPhase(phaseN);

                var phaseNumber = 'Phase ' + phaseN;

                var phaseTitle = '"' + phase.title + '"';

                if (angular.isUndefined(phase.title)) {
                    phaseTitle = '(Untitled "' + phase.type + '" phase)';
                }

                if (phaseStats.stats.noStats) {
                    return {
                        title : phaseNumber,
                        subtitle : phaseTitle,
                        description : [phaseStats.stats.noStats]
                    };
                }

                var description = [
                    phaseStats.stats.numberOfParticipations,
                    phaseStats.stats.numberOfCompleteParticipations,
                    phaseStats.stats.numberOfIncompleteParticipations
                ];

                return {
                    title : phaseNumber,
                    subtitle : phaseTitle,
                    description : description
                };
            });

            surveyStatistics.generalStatistics =
                'Total number of people who reached this survey: ' + nParticipations;

            return surveyStatistics;
        }

        function getGeneralStatisticsForPhase(phaseNumber) {
            var phaseStats = {};
            phaseStats.type = 'stats';
            phaseStats.stats = {};

            var targetPhase = surveyDataService.getPhase(phaseNumber);
            var resultsForThisPhase =
                surveyDataService.getParticipationsByPhase()[phaseNumber];

            if (targetPhase.type === 'survey-information') {
                phaseStats.stats.noStats = {
                    description : 'There are no useful statistics for this phase'
                };

                return phaseStats;
            }

            if (typeof(resultsForThisPhase) === 'undefined' ||
                angular.equals(resultsForThisPhase, {}) ||
                resultsForThisPhase.length === 0) {
                phaseStats.stats.noStats = {
                    description : 'There are no saved participations for this phase'
                };

                return phaseStats;
            }

            phaseStats.stats.numberOfParticipations = {
                description : 'Reached/passed through this phase',
                value : countParticipations(resultsForThisPhase)
            };

            phaseStats.stats.numberOfCompleteParticipations = {
                description : 'Complete participations on this phase',
                value : countCompleteParticipations(targetPhase, resultsForThisPhase)
            };
            phaseStats.stats.numberOfIncompleteParticipations = {
                description : 'Incomplete participations on this phase',
                value : phaseStats.stats.numberOfParticipations.value -
                    phaseStats.stats.numberOfCompleteParticipations.value
            };

            phaseStats.stats.totalParticipations = {
                description : 'Participations on this survey',
                value : surveyDataService.getParticipations().length
            };

            return phaseStats;
        }

        //////////////// helpers

        function countParticipations(participationsOnPhase) {
            var counting = 0;
            participationsOnPhase.forEach(function (participation, participationN) {
                if (angular.isDefined(participation)) {
                    counting++;
                }
            });

            return counting;
        }

        function countCompleteParticipations(phase, participations) {
            var phaseInputValidator = {
                questionnaire: questionnaireValidator,
                pointAPlace: pointAPlaceValidator,
                pointMultiplePlaces : pointMultiplePlacesValidator,
                drawArea : drawAreaValidator,
                drawMultipleAreas : drawMultipleAreasValidator
            };

            var typeAsCamel = phraseNormalizer.toCamelCase(phase.type);

            var isValid = phaseInputValidator[typeAsCamel](phase);

            var nValid = 0;

            participations.forEach(function (participation, n) {
                if (typeof(participation) === 'undefined' ||
                    angular.equals(participation, {})) {
                    return false;
                }

                if (isValid(participation)) {
                    ++nValid;
                }
            });

            return nValid;
        }

        function questionnaireValidator(phaseData) {
            return validator;

            function validator(inputInPhase) {
                var answeredAllTheQuestions =
                    inputInPhase.hasOwnProperty('answers') &&
                    inputInPhase.answers.length === phaseData.questions.length;

                if (answeredAllTheQuestions) {
                    var allAnswersValid = true;

                    inputInPhase.answers.forEach(function(answer) {
                        if (angular.equals(answer, {})) {
                            //TODO: deep validation for each type of question
                            allAnswersValid = false;
                        }
                    });

                    return answeredAllTheQuestions && allAnswersValid;
                }

                return answeredAllTheQuestions;
            }
        }

        function pointAPlaceValidator(phaseData) {
            return validator;

            function validator(inputInPhase) {
                var isFeatureCollection =
                    inputInPhase.hasOwnProperty('type') &&
                    inputInPhase.type === 'FeatureCollection';

                var hasOneMarker = isFeatureCollection &&
                    inputInPhase.features.length === 1;

                return hasOneMarker;
            }
        }

        function pointMultiplePlacesValidator(phaseData) {
            return validator;

            function validator(inputInPhase) {
                var isFeatureCollection =
                    inputInPhase.hasOwnProperty('type') &&
                    inputInPhase.type === 'FeatureCollection';

                var hasAtLeastOneMarker = isFeatureCollection &&
                    inputInPhase.features.length > 0;

                return hasAtLeastOneMarker;
            }
        }

        function drawAreaValidator(phaseData) {
            return validator;

            function validator(inputInPhase) {
                var isArray = angular.isArray(inputInPhase);

                var hasAtLeastOnePolygon = inputInPhase.length > 0;

                return isArray && hasAtLeastOnePolygon;
            }
        }

        function drawMultipleAreasValidator(phaseData) {
            return validator;

            function validator(inputInPhase) {
                var hasAtLeastOneDrawnArea = false;

                for (var areaId in inputInPhase) {
                    if (inputInPhase.hasOwnProperty(areaId) &&
                        typeof(inputInPhase[areaId]) !== 'undefined' &&
                        angular.isArray(inputInPhase[areaId]) &&
                        inputInPhase[areaId].length > 0) {
                        hasAtLeastOneDrawnArea = true;
                        break;
                    }
                }

                return hasAtLeastOneDrawnArea;
            }
        }
    }
})();
