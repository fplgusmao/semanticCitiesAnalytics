(function () {
    'use strict';
    angular
        .module('scaApp.core')
        .factory('surveyDataService', surveyDataService);

    surveyDataService.$inject = ['$http', '$q', 'hostPath'];

    /* @ngInject */
    function surveyDataService($http, $q, hostPath) {
        var dataRoot = hostPath + 'data/',
            surveyDataPath = 'survey-data.json';
        var surveyData;

        var phpRoot = hostPath + 'db/';
        var survey = {
            phases : [],
            resultsByParticipant : [],
            resultsByPhase : []
        };

        var exports = {
            loadSurveyData : loadSurveyData,
            getPhases: getPhases,
            getPhase: getPhase,
            getParticipations: getParticipations,
            getParticipationsByPhase: getParticipationsByPhase
        };

        return exports;

        ////////////////

        /**
         * Makes the due async calls in order to load the results locally.
         * @returns {object} Promise for an object containing the survey
         *                   results.
         */
        function loadSurveyData() {
            return loadSurveyPhases()
                .then(loadSurveyResults);
        }

        /**
         * Returns the data from all of the survey's phases.
         * @returns {Array} Array of objects, each containing data of a phase
         */
        function getPhases() {
            return survey.phases;
        }

        /**
         * Returns the data of the phase with the given number.
         * @returns {object} Object containing data of the phase
         */
        function getPhase(n) {
            return survey.phases[n] || {};
        }

        /**
         * Returns the results of the survey as an array of participations.
         * @param   {Array<Number>} fromParticipantsNumbers Optional array of
         *                     participation numbers from which to get the
         *                     full participations
         * @returns {Array}    Array of participations. Each participation
         *                     consists of an array of inputs/answers for each
         *                     phase of the survey.
         */
        function getParticipations(fromParticipantsNumbers) {
            if (fromParticipantsNumbers) {
                var participations =
                    fromParticipantsNumbers.map(function (participationNumber) {
                        return survey.resultsByParticipant[participationNumber];
                    });

                return participations;
            } else {
                return survey.resultsByParticipant;
            }
        }

        /**
         * Returns the results of the survey as an array, with each element
         * containing the different participations for the phase of that index.
         * @returns {Array.<Array>}   Array of participations, split by phases.
         *                    Each element contains an array representing all (
         *                    existing or not) the participations' input on the
         *                    phase
         */
        function getParticipationsByPhase() {
            return survey.resultsByPhase;
        }

        //////////////// helpers

        /**
         * Asynchronous request to fetch the survey's phases JSON.
         * @returns {object} Promise for the survey's phases as a JSON object.
         */
        function loadSurveyPhases() {
            if (angular.isUndefined(survey.phases) || survey.phases.length <= 0) {
                return $http.get(dataRoot + surveyDataPath)
                    .then(success);
            } else {
                return $q.when(survey.phases);
            }

            function success(response) {
                survey.phases = response.data;
            }
        }

        /**
         * Asynchronous request to fetch the results of the participations for
         * the survey. Fetches them from the database where the participations
         * are saved.
         * @returns {object} Promise for an array of JSON strings. Each element
         *                   of the array contains the JSON, as a string(!), of
         *                   a participation.
         */
        function loadSurveyResults() {
            if (angular.isUndefined(survey.resultsByParticipant) ||
                survey.resultsByParticipant.length <= 0) {
                return $http.get(phpRoot + 'get-survey-results.php')
                    .then(success);
            } else {
                return $q.when(survey.resultsByParticipant);
            }

            function success(response) {
                var surveyResultsAsJson = response.data;

                surveyResultsAsJson.forEach(saveParticipation);

                return survey.resultsByParticipant;
            }
        }

        /**
         * Deserializes a user's participation from JSON, saving it locally.
         * @param {string} participationAsJson JSON as a string
         * @param {number} participantNumber   Number of the participant
         */
        function saveParticipation(participationAsJson,
                                    participantNumber) {
            var participation = angular.fromJson(participationAsJson);
            survey.resultsByParticipant[participantNumber] = participation;

            survey.phases.forEach(function(phase, phaseNumber) {
                if (angular.isUndefined(survey.resultsByPhase[phaseNumber])) {
                    survey.resultsByPhase[phaseNumber] = [];
                }

                /* jshint -W116 */
                if (participation[phaseNumber] != null) {
                    //if the "author" of this participation answered this phase
                    survey.resultsByPhase[phaseNumber][participantNumber] =
                        participation[phaseNumber];
                } else {
                    //for making sure the array has the right length
                    survey.resultsByPhase[phaseNumber][participantNumber] =
                        undefined;
                }
                /* jshint +W116 */
            });
        }
    }
})();
