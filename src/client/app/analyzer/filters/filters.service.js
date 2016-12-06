(function () {
    'use strict';
    angular
        .module('scaApp.analyzer')
        .factory('filtersService', filtersService);

    filtersService.$inject = ['surveyDataService',
                              'turf', 'geometryHelper', '$filter'];

    /* @ngInject */
    function filtersService(surveyDataService,
                            turf, geometryHelper, $filter) {
        /*jshint -W101*/
        var EMAIL_REGEXP = /^[a-z0-9!#$%&'*+\/=?^_`{|}~.-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
        /*jshint +W101*/
        var ALL = true;

        var surveyPhases;
        var resultsByParticipation,
            resultsByPhase,
            resultsByPhaseIndexed;

        var allParticipations = [],
            validParticipations = [];
        var resultsFilters = [];

        var exports = {
            setParticipations: setParticipations,
            setAllParticipationsAsValid : function () {
                setParticipations(ALL);
            },
            getFilteredParticipations: getFilteredParticipations,
            getFilters : getFilters,
            applyFilter : applyFilter,
            participationsIntersection : participationsIntersection,
            participationsUnion : participationsUnion
        };

        /*jshint -W071*/
        var filters = [
            {name : 'Questionnaire, Number Input, Values Equal To',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'number-input',
             description : 'Selects participants that ' +
             'inserted the given number',
             filterFunction : numberInputEqualFilter,
             prompt: 'inserted a number',
             parameters : [
                 {type : 'number',
                  prompt : 'equal to:'}
             ]},
            {name : 'Questionnaire, Number Input, Values Greater Than',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'number-input',
             description : 'Selects participants that ' +
             'inserted a number greater than the given one',
             filterFunction : numberInputGreaterFilter,
             prompt: 'inserted a number',
             parameters : [
                 {type : 'number',
                  prompt : 'greater than:'}
             ]},
            {name : 'Questionnaire, Number Input, Values Less Than',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'number-input',
             description : 'Selects participants that ' +
             'inserted a number smaller than the given one',
             filterFunction : numberInputLessThanFilter,
             prompt: 'inserted a number',
             parameters : [
                 {type : 'number',
                  prompt : 'smaller than:'}
             ]},
            {name : 'Questionnaire, Number Input, Values Between',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'number-input',
             description : 'Selects participants that ' +
             'inserted a number between the two given numbers',
             filterFunction : numberInputBetweenFilter,
             prompt: 'inserted a number',
             parameters : [
                 {type : 'number',
                  prompt : 'between:'},
                 {type : 'number',
                  prompt : 'and:'}
             ]},

            {name : 'Questionnaire, Choose One Option, Chosen Option',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'choose-one',
             description : 'Selects participants that ' +
             'chose the given option',
             filterFunction : chooseOneChosenFilter,
             prompt: 'chose this option:',
             parameters : [
                 {type : 'radio',
                  supportPropertyPath : ['answer', 'answerOptions'],
                  supportProperty : 'answerBody'}
             ]},
            {name : 'Questionnaire, Choose One Option, Not Chosen Option',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'choose-one',
             description : 'Selects participants that ' +
             'chose an option other than the given one',
             filterFunction : chooseOneNotChosenFilter,
             prompt: 'chose some other option than:',
             parameters : [
                 {type : 'radio',
                  supportPropertyPath : ['answer', 'answerOptions'],
                  supportProperty : 'answerBody'}
             ]},

            //6
            {name : 'Questionnaire, Choose Multiple Options, Chosen Options',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'choose-multiple',
             description : 'Selects participants that ' +
             'chose, at least, the given options',
             filterFunction : chooseMultipleChosenFilter,
             prompt: 'chosen options included:',
             parameters : [
                 {type : 'checkbox',
                  supportPropertyPath : ['answer', 'answerOptions'],
                  supportProperty : 'answerBody'}
             ]},
            {name : 'Questionnaire, Choose Multiple Options, All Chosen Options',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'choose-multiple',
             description : 'Selects participants that ' +
             'chose all of the given options',
             filterFunction : chooseMultipleAllChosenFilter,
             prompt: 'chosen options were these, and only these:',
             parameters : [
                 {type : 'checkbox',
                  supportPropertyPath : ['answer', 'answerOptions'],
                  supportProperty : 'answerBody'}
             ]},
            {name : 'Questionnaire, Choose Multiple Options, Not Chosen Options',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'choose-multiple',
             description : 'Selects participants that ' +
             'dind\'t chose the given options',
             filterFunction : chooseMultipleNotChosenFilter,
             prompt : 'chosen options didn\'t include:',
             parameters : [
                 {type : 'checkbox',
                  supportPropertyPath : ['answer', 'answerOptions'],
                  supportProperty : 'answerBody'}
             ]},
            {name : 'Questionnaire, Choose Multiple Options, Number of Chosen Options',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'choose-multiple',
             description : 'Selects participants that ' +
             'chose an equal amout of options to the given number',
             filterFunction : chooseMultipleNumberOfChosenFilter,
             prompt : 'chose this number of options',
             parameters : [
                 {type : 'number',
                  prompt : 'equal to:'}
             ]},

            //10
            {name : 'Questionnaire, Month and Year Input, After a Date',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'month-input',
             description : 'Selects participants that ' +
             'inserted a date after the given one',
             filterFunction : monthInputAfterFilter,
             prompt: 'inserted a date after',
             parameters : [
                 {type : 'number',
                  prompt : 'this month:'},
                 {type : 'number',
                  prompt : 'and year:'}
             ]},
            {name : 'Questionnaire, Month and Year Input, Before a Date',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'month-input',
             description : 'Selects participants that ' +
             'inserted a date previous to the given one',
             filterFunction : monthInputBeforeFilter,
             prompt: 'inserted a date before',
             parameters : [
                 {type : 'number',
                  prompt : 'this month:'},
                 {type : 'number',
                  prompt : 'and year:'}
             ]},
            {name : 'Questionnaire, Month and Year Input, Equals a Date',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'month-input',
             description : 'Selects participants that ' +
             'inserted the given month and year',
             filterFunction : monthInputEqualFilter,
             prompt: 'inserted a date with',
             parameters : [
                 {type : 'number',
                  prompt : 'this month:'},
                 {type : 'number',
                  prompt : 'and year:'}
             ]},
            {name : 'Questionnaire, Month and Year Input, Between Two Dates',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'month-input',
             description : 'Selects participants that ' +
             'inserted a month and year between the two given dates',
             filterFunction : monthInputBetweenFilter,
             prompt: 'inserted a date between',
             parameters : [
                 {type : 'number',
                  prompt : 'this month:'},
                 {type : 'number',
                  prompt : 'and year:'},
                 {type : 'number',
                  prompt : 'and this month:'},
                 {type : 'number',
                  prompt : 'and year:'}
             ]},
            {name : 'Questionnaire, Month and Year Input, Equals a Year',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'month-input',
             description : 'Selects participants that ' +
             'inserted a date which year is equal to the given one',
             filterFunction : monthInputEqualYearFilter,
             prompt: 'inserted any month and',
             parameters : [
                 {type : 'number',
                  prompt : 'this year:'}
             ]},

            //15
            {name : 'Questionnaire, Dropdown Select, Chosen Option',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'select-dropdown',
             description : 'Selects participants that ' +
             'chose the given option',
             filterFunction : selectDropdownChosenFilter,
             prompt: 'chose this option:',
             parameters : [
                 {type : 'select',
                  supportPropertyPath : ['answer', 'selectOptions'],
                  supportProperty : 'optionBody'}
             ]},
            {name : 'Questionnaire, Dropdown Select, Not Chosen Option',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'select-dropdown',
             description : 'Selects participants that ' +
             'chose some other option but the given one',
             filterFunction : selectDropdownNotChosenFilter,
             prompt: 'chose some option other than:',
             parameters : [
                 {type : 'select',
                  supportPropertyPath : ['answer', 'selectOptions'],
                  supportProperty : 'optionBody'}
             ]},

            //17
            {name : 'Questionnaire, Time Input, More Than',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'time-input',
             description : 'Selects participants that ' +
             'inserted a time period greater than the given one',
             filterFunction : timeInputMoreThanFilter,
             prompt: 'inserted a period',
             parameters : [
                 {type : 'number',
                  prompt : 'greater than:'},
                 {type : 'select',
                  supportPropertyPath : ['answer', 'timeUnits']}
             ]},
            {name : 'Questionnaire, Time Input, Less Than',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'time-input',
             description : 'Selects participants that ' +
             'inserted a time period smaller than the given one',
             filterFunction : timeInputLessThanFilter,
             prompt: 'inserted a period',
             parameters : [
                 {type : 'number',
                  prompt : 'shorter than:'},
                 {type : 'select',
                  supportPropertyPath : ['answer', 'timeUnits']}
             ]},
            {name : 'Questionnaire, Time Input, Equal To',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'time-input',
             description : 'Selects participants that ' +
             'inserted a time period of same number and unit as the given one',
             filterFunction : timeInputEqualFilter,
             prompt: 'inserted a period',
             parameters : [
                 {type : 'number',
                  prompt : 'exactly equal to:'},
                 {type : 'select',
                  supportPropertyPath : ['answer', 'timeUnits']}
             ]},
            {name : 'Questionnaire, Time Input, Between',
             intendedPhaseType : 'questionnaire',
             intendedAnswerType : 'time-input',
             description : 'Selects participants that ' +
             'inserted a time period of same unit, and between the given numbers',
             filterFunction : timeInputBetweenFilter,
             prompt: 'inserted a period',
             parameters : [
                 {type : 'number',
                  prompt : 'between:'},
                 {type : 'number',
                  prompt : 'and:'},
                 {type : 'select',
                  supportPropertyPath : ['answer', 'timeUnits']}
             ]},

            //21
            {name : 'Point A Place, Inside an Area',
             intendedPhaseType : 'point-a-place',
             description : 'Selects participants that ' +
             'pointed a place inside the given bounding area',
             filterFunction : pointAPlaceInsideFilter,
             prompt: 'pointed the place inside this area:',
             parameters : [
                 {type : 'bounds',
                  supportPropertyPath : ['mapView', 'view', 'center']}
             ]},
            {name : 'Point A Place, Outside an Area',
             intendedPhaseType : 'point-a-place',
             description : 'Selects participants that ' +
             'pointed a place outside the given bounding area',
             filterFunction : pointAPlaceOutsideFilter,
             prompt: 'pointed the place outside this area:',
             parameters : [
                 {type : 'bounds',
                  supportPropertyPath : ['mapView', 'view', 'center']}
             ]},

            //23
            {name : 'Point Multiple Places, Inside an Area',
             intendedPhaseType : 'point-multiple-places',
             description : 'Selects participants that ' +
             'pointed some places inside the given bounding area',
             filterFunction : pointMultiplePlacesInsideFilter,
             prompt: 'pointed some places inside this area:',
             parameters : [
                 {type : 'bounds',
                  supportPropertyPath : ['mapView', 'view', 'center']}
             ]},
            {name : 'Point Multiple Places, All Inside an Area',
             intendedPhaseType : 'point-multiple-places',
             description : 'Selects participants that ' +
             'pointed ALL their places inside the given bounding area',
             filterFunction : pointMultiplePlacesAllInsideFilter,
             prompt: 'pointed all of the places inside this area:',
             parameters : [
                 {type : 'bounds',
                  supportPropertyPath : ['mapView', 'view', 'center']}
             ]},
            {name : 'Point Multiple Places, Outside an Area',
             intendedPhaseType : 'point-multiple-places',
             description : 'Selects participants that ' +
             'pointed some places outside the given bounding area',
             filterFunction : pointMultiplePlacesOutsideFilter,
             prompt: 'pointed some places outside this area:',
             parameters : [
                 {type : 'bounds',
                  supportPropertyPath : ['mapView', 'view', 'center']}
             ]},
            {name : 'Point Multiple Places, All Outside an Area',
             intendedPhaseType : 'point-multiple-places',
             description : 'Selects participants that ' +
             'pointed ALL their places outside the given bounding area',
             filterFunction : pointMultiplePlacesAllOutsideFilter,
             prompt: 'pointed all of the places outside this area:',
             parameters : [
                 {type : 'bounds',
                  supportPropertyPath : ['mapView', 'view', 'center']}
             ]},
            {name : 'Point Multiple Places, More Pointed Places Than',
             intendedPhaseType : 'point-multiple-places',
             description : 'Selects participants that ' +
             'pointed more places than the specified',
             filterFunction : pointMultiplePlacesMoreThanFilter,
             prompt: 'pointed a number of places',
             parameters : [
                 {type : 'number',
                  prompt : 'greater than:'}
             ]},
            {name : 'Point Multiple Places, Less Pointed Places Than',
             intendedPhaseType : 'point-multiple-places',
             description : 'Selects participants that ' +
             'pointed less places than the specified',
             filterFunction : pointMultiplePlacesLessThanFilter,
             prompt: 'pointed a number of places',
             parameters : [
                 {type : 'number',
                  prompt : 'smaller than:'}
             ]},
            {name : 'Point Multiple Places, Number of Pointed Places',
             intendedPhaseType : 'point-multiple-places',
             description : 'Selects participants that ' +
             'pointed the same exact number of places as the specified',
             filterFunction : pointMultiplePlacesEqualToFilter,
             prompt: 'pointed a number of places',
             parameters : [
                 {type : 'number',
                  prompt : 'equal to:'}
             ]},

            //30
            {name : 'Draw Area, Whole Drawings Inside an Area',
             intendedPhaseType : 'draw-area',
             description : 'Selects participants that ' +
             'drew ONLY inside the given bounding area',
             filterFunction : drawAreaWholeDrawingsInsideFilter,
             prompt : 'drew ONLY inside this area',
             parameters : [
                 {type : 'bounds',
                  supportPropertyPath : ['mapView', 'view', 'center']}
             ]},
            {name : 'Draw Area, Drawings Intersect an Area',
             intendedPhaseType : 'draw-area',
             description : 'Selects participants that ' +
             'drew inside the given bounding area',
             filterFunction : drawAreaDrawingsIntersectFilter,
             prompt : 'drew drawings that intersect this area:',
             parameters : [
                 {type : 'bounds',
                  supportPropertyPath : ['mapView', 'view', 'center']}
             ]},
            {name : 'Draw Area, Whole Drawings Outside an Area',
             intendedPhaseType : 'draw-area',
             description : 'Selects participants that ' +
             'drew ONLY outside the given bounding area',
             filterFunction : drawAreaWholeDrawingsOutsideFilter,
             prompt : 'drew ONLY outside this area:',
             parameters : [
                 {type : 'bounds',
                  supportPropertyPath : ['mapView', 'view', 'center']}
             ]},

            //33
            {name : 'Draw Multiple Areas, Number of Areas Drawn Equal To',
             intendedPhaseType : 'draw-multiple-areas',
             description : 'Selects participants that ' +
             'drew the specified number of areas',
             filterFunction : drawMultipleAreasNumberOfAreasFilter,
             prompt: 'drew a number of areas',
             parameters : [
                 {type : 'number',
                  prompt : 'equal to:'}
             ]},
            {name : 'Draw Multiple Areas, Number of Areas Drawn Greater Than',
             intendedPhaseType : 'draw-multiple-areas',
             description : 'Selects participants that ' +
             'drew a number of areas greater than the given one',
             filterFunction : drawMultipleAreasNumberOfAreasGreaterThanFilter,
             prompt: 'drew a number of areas',
             parameters : [
                 {type : 'number',
                  prompt : 'greater than:'}
             ]},
            {name : 'Draw Multiple Areas, Number of Areas Drawn Less Than',
             intendedPhaseType : 'draw-multiple-areas',
             description : 'Selects participants that ' +
             'drew a number of areas smaller than the given one',
             filterFunction : drawMultipleAreasNumberOfAreasSmallerThanFilter,
             prompt: 'drew a number of areas',
             parameters : [
                 {type : 'number',
                  prompt : 'smaller than:'}
             ]},
            {name : 'Draw Multiple Areas, Areas Drawn',
             intendedPhaseType : 'draw-multiple-areas',
             description : 'Selects participants that ' +
             'drew at least the specified areas',
             filterFunction : drawMultipleAreasDrawnAreasFilter,
             prompt: 'drew, at least, these areas:',
             parameters : [
                 {type : 'checkbox',
                  supportPropertyPath : ['subPhases'],
                  supportProperty : 'name'}
             ]},
            //37
            /* TODO
            {name : 'Draw Multiple Areas, Certain Area, Drawings Intersect an Area',
             intendedPhaseType : 'draw-multiple-areas',
             intendedSubPhaseType : 'draw-area',
             description : 'Selects participants that ' +
             'drew the selected area and whose drawings ' +
             'intersected the specified bounding area',
             filterFunction : drawMultipleAreasAreaDrawingsIntersectFilter,
             prompt: 'drew this area:',
             parameters : [
                 {type : 'bounds',
                 supportPropertyPath : ['']}
             ]}*/
        ];

        return exports;

        ////////////////

        /**
         * Sets active valid participations to the specified ones. Can set all
         * as valid by passing `true`.
         * @param   {Array} participationNumbers Array containing the numbers
         *  of the valid participations
         */
        function setParticipations(participationNumbers) {
            //TODO: Fill history/cache not only with the layers,
            //      but also with the participations array
            if (participationNumbers === ALL) {
                if (allParticipations.length === 0) {
                    //allParticipations not yet initialized
                    allParticipations = resultsByParticipation.map(
                        function (element, index) {
                            return index;
                        }
                    );
                }
                validParticipations = allParticipations;
            } else {
                validParticipations = participationNumbers;
            }
        }

        function getFilteredParticipations() {
            return validParticipations;
        }

        function getFilters() {
            initializeFilters();
            return filters;
        }

        function applyFilter(filterConfig, filterParams,
                              targetPhaseN, targetQuestionN,
                              toFilter) {
            var filteredParticipations = [];
            var participationsToFilter = toFilter || allParticipations;

            participationsToFilter.forEach(function (participationN) {
                var participation =
                    resultsByParticipation[participationN][targetPhaseN];

                var inputToValidate = {},
                    validParticipation = false;

                var participatedOnThisPhase =
                    angular.isDefined(participation) &&
                    !angular.equals(participation, {}) &&
                    participation != null;

                if (participatedOnThisPhase &&
                    angular.isNumber(targetQuestionN) &&
                    targetQuestionN >= 0) {  //if there's a target question
                    var answeredTheQuestion =
                        participatedOnThisPhase &&
                        angular.isArray(participation.answers) &&
                        participation.answers.length > targetQuestionN;
                    validParticipation = answeredTheQuestion;

                    if (validParticipation) {
                        inputToValidate =
                            participation.answers[targetQuestionN];
                    }
                } else {  //if there's no target question
                    validParticipation = participatedOnThisPhase;
                    inputToValidate = participation;
                }

                if (!validParticipation) {
                    return;
                }

                var respectsFilter = filterConfig.filterFunction;
                if (respectsFilter(filterParams, inputToValidate)) {
                    filteredParticipations.push(participationN);
                }
            });
            console.log('filtered participations', filteredParticipations);
            return filteredParticipations;
        }

        function participationsIntersection(participations1, participations2) {
            if (angular.isUndefined(participations1) ||
                participations1.length === 0 ||
                angular.isUndefined(participations2) ||
                participations2.length === 0) {
                return [];
            }

            var shorter = [], longer = []; //to reduce iterations
            if (participations1.length <= participations2.length) {
                shorter = participations1;
                longer = participations2;
            } else {
                shorter = participations2;
                longer = participations1;
            }

            var intersection = [];
            for (var i = 0; i < shorter.length; i++) {
                if (longer.indexOf(shorter[i]) > -1) {
                    intersection.push(shorter[i]);
                }
            }

            return intersection;
        }

        function participationsUnion(participations1, participations2) {
            if (angular.isUndefined(participations1) ||
                participations1.length === 0) {
                return participations2;
            } else if (angular.isUndefined(participations2) ||
                       participations2.length === 0) {
                return participations1;
            }

            var shorter = [], longer = []; //to reduce iterations
            if (participations1.length <= participations2.length) {
                shorter = participations1;
                longer = participations2;
            } else {
                shorter = participations2;
                longer = participations1;
            }

            var union = longer;
            for (var i = 0; i < shorter.length; i++) {
                if (longer.indexOf(shorter[i]) <= -1) {
                    union.push(shorter[i]);
                }
            }

            union = $filter('orderBy')(union);

            return union;
        }

        //////////////// helpers

        /**
         * Initializes all the due data needed to run all this service's
         * functionality
         * @returns {Array} Array of the possible filters
         */
        function initializeFilters() {
            if (angular.isUndefined(surveyPhases)) {
                surveyPhases = surveyDataService.getPhases();
            }

            if (angular.isUndefined(resultsByParticipation)) {
                resultsByParticipation = surveyDataService.getParticipations();
            }

            if (angular.isUndefined(resultsByPhase)) {
                resultsByPhase = surveyDataService.getParticipationsByPhase();
            }

            if (angular.isUndefined(resultsByPhaseIndexed)) {
                resultsByPhaseIndexed =
                    surveyDataService.getParticipationsByPhase(true);
            }

            return;
        }

        /**
         * Tells if an answer to a number-input type of question is a number
         * equal to the used as parameter of the filter.
         * @param   {Array}   params          The set of filter parameters.
         *                                    Takes only one parameter: a
         *                                    number.
         * @param   {object}  inputToValidate The input object. It should
         *                                    correspond to a number-input type
         *                                    of answer
         * @returns {boolean} Wether the user input is equal to the specified
         *                    number or not
         */
        function numberInputEqualFilter(params, inputToValidate) {
            var n = params[0];

            var validParam = angular.isNumber(n);
            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.hasOwnProperty('number') &&
                angular.isNumber(inputToValidate.number);

            if (validParam && validInput) {
                return n === inputToValidate.number;
            } else {
                return false;
            }
        }

        /**
         * Tells if an answer to a number-input type of question is a number
         * greater than the number used as parameter of the filter.
         * @param   {Array}   params          The set of filter parameters.
         *                                    Takes only one parameter: a
         *                                    number.
         * @param   {object}  inputToValidate The input object. It should
         *                                    correspond to a number-input type
         *                                    of answer
         * @returns {boolean} Wether the user input is greater than the specified
         *                    number or not
         */
        function numberInputGreaterFilter(params, inputToValidate) {
            var n = params[0];

            var validParam = angular.isNumber(n);
            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.hasOwnProperty('number') &&
                angular.isNumber(inputToValidate.number);

            if (validParam && validInput) {
                return inputToValidate.number > n;
            } else {
                return false;
            }
        }

        /**
         * Tells if an answer to a number-input type of question is a number
         * less than the number used as parameter of the filter.
         * @param   {Array}   params          The set of filter parameters.
         *                                    Takes only one parameter: a
         *                                    number.
         * @param   {object}  inputToValidate The input object. It should
         *                                    correspond to a number-input type
         *                                    of answer
         * @returns {boolean} Wether the user input is less than the specified
         *                    number or not
         */
        function numberInputLessThanFilter(params, inputToValidate) {
            var n = params[0];
            var validParam = angular.isNumber(n);
            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.hasOwnProperty('number') &&
                angular.isNumber(inputToValidate.number);

            if (validParam && validInput) {
                return inputToValidate.number < n;
            } else {
                return false;
            }
        }

        /**
         * Tells if an answer to a number-input type of question is a number
         * between the two numbers given to parameters of the filter.
         * @param   {Array}   params          The set of filter parameters.
         *                                    Takes only one parameter: a
         *                                    number.
         * @param   {object}  inputToValidate The input object. It should
         *                                    correspond to a number-input type
         *                                    of answer
         * @returns {boolean} Wether the user input is less than the specified
         *                    number or not
         */
        function numberInputBetweenFilter(params, inputToValidate) {
            var low = params[0], high = params[1];

            var validParams = angular.isNumber(low) &&
                angular.isNumber(high) &&
                high >= 0 && low >= 0 &&
                high !== low;
            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.hasOwnProperty('number') &&
                angular.isNumber(inputToValidate.number);

            if (high < low) {
                var aux = high;
                high = low;
                low = aux;
            }

            if (validParams && validInput) {
                return inputToValidate.number > low &&
                    inputToValidate.number < high;
            } else {
                return false;
            }
        }

        function chooseOneChosenFilter(params, inputToValidate) {
            //as parameter: the index of the option chosen on the filter
            var paramOptionN = params[0];

            var validParam = angular.isNumber(paramOptionN) &&
                paramOptionN >= 0;
            var validInput = angular.isDefined(inputToValidate) &&
                angular.isNumber(inputToValidate.index) &&
                inputToValidate.index >= 0;

            return validParam && validInput &&
                inputToValidate.index === paramOptionN;
        }

        function chooseOneNotChosenFilter(params, inputToValidate) {
            //as parameter: the index of the option chosen on the filter
            var paramOptionN = params[0];

            var validParam = angular.isNumber(paramOptionN) &&
                paramOptionN >= 0;
            var validInput = angular.isDefined(inputToValidate) &&
                angular.isNumber(inputToValidate.index) &&
                inputToValidate.index >= 0;

            return validParam && validInput &&
                inputToValidate.index !== paramOptionN;
        }

        /**
         * Checks if the given user input contains, at least, the options
         * given as parameters of the filter
         * @param   {Array}    params Array containing the filter parameters.
         * It should contain only one parameter: an array with each
         * element set to true or false/undefined, representing the chosen
         * options on the filter parameterization
         * @param   {object}   inputToValidate Input of a given participant on
         * the target phase and question. Should contain the property 'checks'
         * which in turn should be an object with the indexes of the options as
         * properties and true/false as their values.
         * @returns {boolean}  If the input respects the parameters as desired
         */
        function chooseMultipleChosenFilter(params, inputToValidate) {
            //as parameter: an array with each element telling if the option
            //was selected (true) or not (false/undefined)
            var paramCheckedOptions = params[0];

            var validParam = angular.isArray(paramCheckedOptions);
            var validInput = angular.isDefined(inputToValidate) &&
                angular.isObject(inputToValidate.checks);

            if (validParam && validInput) {
                for (var i = 0; i < paramCheckedOptions.length; i++) {
                    if (paramCheckedOptions[i] &&
                        !inputToValidate.checks['' + i]) {
                        //the participant did not check one of the desired options
                        return false;
                    }
                }
                return true;
            } else {
                return false;
            }
        }

        function chooseMultipleAllChosenFilter(params, inputToValidate) {
            var paramCheckedOptions = params[0];

            var validParam = angular.isArray(paramCheckedOptions);
            var validInput = angular.isDefined(inputToValidate) &&
                angular.isObject(inputToValidate.checks);

            if (validParam && validInput) {
                for (var i = 0; i < paramCheckedOptions.length; i++) {
                    if ((paramCheckedOptions[i] &&
                         !inputToValidate.checks['' + i]) ||
                        (!paramCheckedOptions[i] &&
                         inputToValidate.checks['' + i])) {
                        //either the participant didn't include a chosen option
                        //or the participant included an option not chosen in the filter
                        return false;
                    }
                }
                return true;
            } else {
                return false;
            }
        }

        function chooseMultipleNotChosenFilter(params, inputToValidate) {
            var paramCheckedOptions = params[0];

            var validParam = angular.isArray(paramCheckedOptions);
            var validInput = angular.isDefined(inputToValidate) &&
                angular.isObject(inputToValidate.checks);

            if (validParam && validInput) {
                for (var i = 0; i < paramCheckedOptions.length; i++) {
                    if (paramCheckedOptions[i] &&
                        inputToValidate.checks['' + i]) {
                        //the participant included an option that
                        //shouldn't have been chosen
                        return false;
                    }
                }
                return true;
            } else {
                return false;
            }
        }

        function chooseMultipleNumberOfChosenFilter(params, inputToValidate) {
            var paramNOptions = params[0];

            var validParam = angular.isNumber(paramNOptions);
            var validInput = angular.isDefined(inputToValidate) &&
                angular.isObject(inputToValidate.checks);

            if (validParam && validInput) {
                var nInput = 0;
                angular.forEach(inputToValidate.checks, function (val, prop) {
                    if (val) {
                        nInput++;
                    }
                });

                return paramNOptions === nInput;
            } else {
                return false;
            }
        }

        function monthInputAfterFilter(params, inputToValidate) {
            //params: month and year
            var month = params[0],
                year = params[1];
            var validParams = month >= 1 && month <= 12 && year > 0;

            var monthFromInput = inputToValidate.month || false,
                yearFromInput = inputToValidate.year || false;
            var validInput = angular.isObject(inputToValidate) &&
                angular.isNumber(monthFromInput) &&
                monthFromInput >= 1 && monthFromInput <= 12 &&
                angular.isNumber(yearFromInput) && yearFromInput > 0;

            if (validParams && validInput) {
                if (yearFromInput > year) {
                    return true;
                } else if (yearFromInput === year) {
                    return monthFromInput > month;
                }
            } else {
                return false;
            }
        }

        function monthInputBeforeFilter(params, inputToValidate) {
            //params: month and year
            var month = params[0],
                year = params[1];
            var validParams = month >= 1 && month <= 12 && year > 0;

            var monthFromInput = inputToValidate.month || false,
                yearFromInput = inputToValidate.year || false;
            var validInput = angular.isObject(inputToValidate) &&
                angular.isNumber(monthFromInput) &&
                monthFromInput >= 1 && monthFromInput <= 12 &&
                angular.isNumber(yearFromInput) && yearFromInput > 0;

            if (validParams && validInput) {
                if (yearFromInput < year) {
                    return true;
                } else if (yearFromInput === year) {
                    return monthFromInput < month;
                }
            } else {
                return false;
            }
        }

        function monthInputEqualFilter(params, inputToValidate) {
            //params: month and year
            var month = params[0],
                year = params[1];
            var validParams = month >= 1 && month <= 12 && year > 0;

            var monthFromInput = inputToValidate.month || false,
                yearFromInput = inputToValidate.year || false;
            var validInput = angular.isObject(inputToValidate) &&
                angular.isNumber(monthFromInput) &&
                monthFromInput >= 1 && monthFromInput <= 12 &&
                angular.isNumber(yearFromInput) && yearFromInput > 0;

            if (validParams && validInput) {
                return yearFromInput === year && monthFromInput === month;
            } else {
                return false;
            }
        }

        function monthInputBetweenFilter(params, inputToValidate) {
            //params: startMonth, startYear, endMonth, endYear
            var startMonth = params[0],
                startYear = params[1],
                endMonth = params[2],
                endYear = params[3];
            var validParams = startMonth >= 1 && startMonth <= 12 &&
                endMonth >= 1 && endMonth <= 12 &&
                startYear > 0 && endYear > 0;

            if (endYear < startYear) {
                var aux = startYear;
                startYear = endYear;
                endYear = aux;
            }

            var monthFromInput = inputToValidate.month || false,
                yearFromInput = inputToValidate.year || false;
            var validInput = angular.isObject(inputToValidate) &&
                angular.isNumber(monthFromInput) &&
                monthFromInput >= 1 && monthFromInput <= 12 &&
                angular.isNumber(yearFromInput) && yearFromInput > 0;

            if (validParams && validInput) {
                var pastStart = false;
                if (yearFromInput === startYear) {
                    pastStart = monthFromInput > startMonth;
                }

                var preEnd = false;
                if (yearFromInput === endYear) {
                    preEnd = monthFromInput < endYear;
                }

                if (startYear < yearFromInput && yearFromInput < endYear) {
                    pastStart = true;
                    preEnd = true;
                }

                return pastStart && preEnd;
            }

            return false;
        }

        function monthInputEqualYearFilter(params, inputToValidate) {
            //params: year
            var year = params[0];
            var validParams = year > 0;

            var yearFromInput = inputToValidate.year || false;
            var validInput = angular.isObject(inputToValidate) &&
                angular.isNumber(yearFromInput) && yearFromInput > 0;

            return validParams && validInput && year === yearFromInput;
        }

        function selectDropdownChosenFilter(params, inputToValidate) {
            //params: selected (string)
            var selectedOption = params[0];
            var validParams = angular.isString(selectedOption);

            var validInput = angular.isObject(inputToValidate) &&
                angular.isString(inputToValidate.selected);

            return validParams && validInput &&
                selectedOption === inputToValidate.selected;
        }

        function selectDropdownNotChosenFilter(params, inputToValidate) {
            //params: selected (string)
            var selectedOption = params[0];
            var validParams = angular.isString(selectedOption);

            var validInput = angular.isObject(inputToValidate) &&
                angular.isString(inputToValidate.selected);

            return validParams && validInput &&
                selectedOption !== inputToValidate.selected;
        }

        function timeInputMoreThanFilter(params, inputToValidate) {
            var toDays = {
                years : 366,
                months : 30.5,
                days : 1
            };

            //params: number, units
            var num = params[0],
                units = params[1];
            var validParams = angular.isNumber(num) && angular.isString(units);

            var validInput = angular.isObject(inputToValidate) &&
                angular.isNumber(inputToValidate.number) &&
                angular.isString(inputToValidate.timeUnit);

            if (validInput && validParams) {
                units = $filter('lowercase')(units);

                var inputNumber = inputToValidate.number;
                var inputUnits = inputToValidate.timeUnit;

                if (units === inputUnits) {
                    return inputNumber > num;
                }

                var inputInDays = inputNumber * toDays[inputUnits],
                    filterInDays = num * toDays[units];

                return inputInDays > filterInDays;
            } else {
                return false;
            }
        }

        function timeInputLessThanFilter(params, inputToValidate) {
            var toDays = {
                years : 366,
                months : 30.5,
                days : 1
            };

            //params: number, units
            var num = params[0],
                units = params[1];
            var validParams = angular.isNumber(num) && angular.isString(units);

            var validInput = angular.isObject(inputToValidate) &&
                angular.isNumber(inputToValidate.number) &&
                angular.isString(inputToValidate.timeUnit);

            if (validInput && validParams) {
                units = $filter('lowercase')(units);

                var inputNumber = inputToValidate.number;
                var inputUnits = inputToValidate.timeUnit;

                if (units === inputUnits) {
                    return inputNumber < num;
                }

                var inputInDays = inputNumber * toDays[inputUnits],
                    filterInDays = num * toDays[units];

                return inputInDays < filterInDays;
            } else {
                return false;
            }
        }

        function timeInputEqualFilter(params, inputToValidate) {
            var toDays = {
                years : 366,
                months : 30.5,
                days : 1
            };

            //params: number, units
            var num = params[0],
                units = params[1];
            var validParams = angular.isNumber(num) && angular.isString(units);

            var validInput = angular.isObject(inputToValidate) &&
                angular.isNumber(inputToValidate.number) &&
                angular.isString(inputToValidate.timeUnit);

            if (validInput && validParams) {
                units = $filter('lowercase')(units);

                var inputNumber = inputToValidate.number;
                var inputUnits = inputToValidate.timeUnit;

                if (inputUnits === units) {
                    return inputNumber === num;
                }

                var diff = inputNumber * toDays[inputUnits] - num * toDays[units];
                diff = Math.abs(diff);

                return diff < 1;
            } else {
                return false;
            }
        }

        function timeInputBetweenFilter(params, inputToValidate) {
            //params: start, end, units
            var start = params[0],
                end = params[1],
                units = params[2];
            var validParams = angular.isNumber(start) &&
                angular.isNumber(end) &&
                angular.isString(units);

            if (end < start) {
                var aux = start;
                start = end;
                end = aux;
            }

            var validInput = angular.isObject(inputToValidate) &&
                angular.isNumber(inputToValidate.number) &&
                angular.isString(inputToValidate.timeUnit);

            if (validInput && validParams) {
                units = $filter('lowercase')(units);

                var inputNumber = inputToValidate.number;
                var inputUnits = inputToValidate.timeUnit;

                return inputUnits === units &&
                    inputNumber > start &&
                    inputNumber < end;
            } else {
                return false;
            }
        }

        function pointAPlaceInsideFilter(params, inputToValidate) {
            //params: bounds
            var bounds = params[0];
            var inside = false;

            var isBBox = angular.isArray(bounds) && bounds.length === 4;
            var isPolygon = bounds.type === 'Feature' && bounds.geometry &&
                            bounds.geometry.type === 'MultiPolygon';

            var validParams = isBBox || isPolygon;

            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.type === 'FeatureCollection' &&
                inputToValidate.features.length > 0;

            if (validInput && validParams) {
                var bbox = turf.bboxPolygon(bounds);
                var markerFeature = inputToValidate.features[0];

                if (markerFeature.type === 'Feature' &&
                    angular.isObject(markerFeature.geometry) &&
                    markerFeature.geometry.type === 'Point') {
                    inside = turf.inside(markerFeature, bbox);
                }
            }

            return inside;
        }

        function pointAPlaceOutsideFilter(params, inputToValidate) {
            var bounds = params[0];
            var outside = false;

            var validParams = angular.isArray(bounds) &&
                bounds.length === 4;

            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.type === 'FeatureCollection' &&
                inputToValidate.features.length > 0;

            if (validInput && validParams) {
                var bbox = turf.bboxPolygon(bounds);
                var markerFeature = inputToValidate.features[0];

                if (markerFeature.type === 'Feature' &&
                    angular.isObject(markerFeature.geometry) &&
                    markerFeature.geometry.type === 'Point') {
                    outside = !turf.inside(markerFeature, bbox);
                }
            }

            return outside;
        }

        function pointMultiplePlacesInsideFilter(params, inputToValidate) {
            var bounds = params[0];
            var somePointsInside = false;

            var validParams = angular.isArray(bounds) &&
                bounds.length === 4;

            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.type === 'FeatureCollection' &&
                inputToValidate.features.length > 0;

            if (validInput && validParams) {
                var bbox = turf.bboxPolygon(bounds);
                var markersAsFeatures = inputToValidate.features;

                markersAsFeatures.forEach(function (marker) {
                    if (marker.type === 'Feature' &&
                        angular.isObject(marker.geometry) &&
                        marker.geometry.type === 'Point') {
                        somePointsInside =
                            turf.inside(marker, bbox) || somePointsInside;
                    }
                });
            }

            return somePointsInside;
        }

        function pointMultiplePlacesAllInsideFilter(params, inputToValidate) {
            var bounds = params[0];
            var allPointsInside = false;

            var validParams = angular.isArray(bounds) &&
                bounds.length === 4;

            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.type === 'FeatureCollection' &&
                inputToValidate.features.length > 0;

            if (validInput && validParams) {
                var bbox = turf.bboxPolygon(bounds);
                var markersAsFeatures = inputToValidate.features;

                markersAsFeatures.forEach(function (marker, i) {
                    var INITIALIZATION = (i === 0);

                    if (marker.type === 'Feature' &&
                        angular.isObject(marker.geometry) &&
                        marker.geometry.type === 'Point') {
                        allPointsInside =
                            turf.inside(marker, bbox) &&
                            (INITIALIZATION ? true : allPointsInside);
                    }
                });
            }

            return allPointsInside;
        }

        function pointMultiplePlacesOutsideFilter(params, inputToValidate) {
            var bounds = params[0];
            var somePointsOutside = false;

            var validParams = angular.isArray(bounds) &&
                bounds.length === 4;

            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.type === 'FeatureCollection' &&
                inputToValidate.features.length > 0;

            if (validInput && validParams) {
                var bbox = turf.bboxPolygon(bounds);
                var markersAsFeatures = inputToValidate.features;

                markersAsFeatures.forEach(function (marker) {
                    if (marker.type === 'Feature' &&
                        angular.isObject(marker.geometry) &&
                        marker.geometry.type === 'Point') {
                        somePointsOutside =
                            !turf.inside(marker, bbox) || somePointsOutside;
                    }
                });
            }

            return somePointsOutside;
        }

        function pointMultiplePlacesAllOutsideFilter(params, inputToValidate) {
            var bounds = params[0];
            var allPointsOutside = false;

            var validParams = angular.isArray(bounds) &&
                bounds.length === 4;

            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.type === 'FeatureCollection' &&
                inputToValidate.features.length > 0;

            if (validInput && validParams) {
                var bbox = turf.bboxPolygon(bounds);
                var markersAsFeatures = inputToValidate.features;

                markersAsFeatures.forEach(function (marker, i) {
                    var INITIALIZATION = (i === 0);

                    if (marker.type === 'Feature' &&
                        angular.isObject(marker.geometry) &&
                        marker.geometry.type === 'Point') {

                        allPointsOutside =
                            !turf.inside(marker, bbox) &&
                            (INITIALIZATION ? true : allPointsOutside);
                    }
                });
            }

            return allPointsOutside;
        }

        function pointMultiplePlacesMoreThanFilter(params, inputToValidate) {
            var n = params[0];

            var validParams = angular.isNumber(n) &&
                n >= 0;

            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.type === 'FeatureCollection' &&
                inputToValidate.features.length > 0;

            var nMarkers = inputToValidate.features.length;

            return validParams && validInput && nMarkers > n;
        }

        function pointMultiplePlacesLessThanFilter(params, inputToValidate) {
            var n = params[0];

            var validParams = angular.isNumber(n) &&
                n >= 0;

            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.type === 'FeatureCollection' &&
                inputToValidate.features.length > 0;

            var nMarkers = inputToValidate.features.length;

            return validParams && validInput && nMarkers < n;
        }

        function pointMultiplePlacesEqualToFilter(params, inputToValidate) {
            var n = params[0];

            var validParams = angular.isNumber(n) &&
                n >= 0;

            var validInput = angular.isObject(inputToValidate) &&
                inputToValidate.type === 'FeatureCollection' &&
                inputToValidate.features.length > 0;

            var nMarkers = inputToValidate.features.length;

            return validParams && validInput && nMarkers === n;
        }

        function drawAreaWholeDrawingsInsideFilter(params, inputToValidate) {
            var bounds = params[0];
            var validParams = angular.isArray(bounds) &&
                bounds.length === 4;

            var polygonsVertices = inputToValidate;
            var validInput = angular.isArray(polygonsVertices) &&
                polygonsVertices.length > 0;

            var inside = false;

            if (validInput && validParams) {
                var MINIMUM_VERTICES = 4, CONVEX = true,
                    ERROR = 10; //10 sqm of error

                var bbox = turf.bboxPolygon(bounds);

                for (var i = 0; i < polygonsVertices.length; i++) {
                    var polygonVertices = polygonsVertices[i];

                    if (polygonVertices.length < MINIMUM_VERTICES) {
                        continue;
                    }

                    try {
                        var polygonAsFeature = geometryHelper.polygonFeature(
                            polygonVertices, CONVEX);
                        var areaOfPolygon = turf.area(polygonAsFeature);

                        var intersection =
                            turf.intersect(bbox, polygonAsFeature);
                        var areaOfIntersection =
                            turf.area(intersection);

                        //if polygon is inside,
                        //then intersection has the same area as the polygon
                        inside = areaOfIntersection <= areaOfPolygon + ERROR &&
                            areaOfIntersection >= areaOfPolygon - ERROR;

                        if (!inside) {
                            break;
                        }
                    } catch (e) {
                        inside = false;
                    }
                }
            }

            return inside;
        }

        function drawAreaDrawingsIntersectFilter(params, inputToValidate) {
            var bounds = params[0];
            var validParams = angular.isArray(bounds) &&
                bounds.length === 4;

            var polygonsVertices = inputToValidate;
            var validInput = angular.isArray(polygonsVertices) &&
                polygonsVertices.length > 0;

            var inside = false;

            if (validInput && validParams) {
                var MINIMUM_VERTICES = 4, CONVEX = true,
                    ERROR = 10; //10 sqm of error

                var bbox = turf.bboxPolygon(bounds);

                for (var i = 0; i < polygonsVertices.length; i++) {
                    var polygonVertices = polygonsVertices[i];

                    if (polygonVertices.length < MINIMUM_VERTICES) {
                        continue;
                    }

                    try {
                        var polygonAsFeature = geometryHelper.polygonFeature(
                            polygonVertices, CONVEX);
                        var areaOfPolygon = turf.area(polygonAsFeature);

                        var intersection =
                            turf.intersect(bbox, polygonAsFeature);
                        var areaOfIntersection =
                            turf.area(intersection);

                        inside = areaOfIntersection > 0;

                        if (inside) {
                            break;
                        }
                    } catch (e) {
                        inside = false;
                    }
                }
            }

            return inside;
        }

        function drawAreaWholeDrawingsOutsideFilter(params, inputToValidate) {
            var bounds = params[0];
            var validParams = angular.isArray(bounds) &&
                bounds.length === 4;

            var polygonsVertices = inputToValidate;
            var validInput = angular.isArray(polygonsVertices) &&
                polygonsVertices.length > 0;

            var outside = false;

            if (validInput && validParams) {
                var MINIMUM_VERTICES = 4, CONVEX = true,
                    ERROR = 10; //10 sqm of error

                var bbox = turf.bboxPolygon(bounds);

                for (var i = 0; i < polygonsVertices.length; i++) {
                    var polygonVertices = polygonsVertices[i];

                    if (polygonVertices.length < MINIMUM_VERTICES) {
                        continue;
                    }

                    try {
                        var polygonAsFeature = geometryHelper.polygonFeature(
                            polygonVertices, CONVEX);
                        var areaOfPolygon = turf.area(polygonAsFeature);

                        var intersection =
                            turf.intersect(bbox, polygonAsFeature);

                        //if polygon is inside,
                        //then intersection has the same area as the polygon
                        outside = !intersection;

                        if (!outside) {
                            //if there's one polygon not outside of the bbox
                            break;
                        }
                    } catch (e) {
                        outside = false;
                    }
                }
            }

            return outside;
        }

        function drawMultipleAreasNumberOfAreasFilter(params, inputToValidate) {
            var n = params[0];

            var validParams = angular.isNumber(n) && n >= 0;

            var validInput = angular.isObject(inputToValidate);

            return validParams && validInput &&
                Object.keys(inputToValidate).length === n;
        }

        function drawMultipleAreasNumberOfAreasGreaterThanFilter(params,
                                                                 inputToValidate) {
            var n = params[0];

            var validParams = angular.isNumber(n) && n >= 0;

            var validInput = angular.isObject(inputToValidate);

            return validParams && validInput &&
                Object.keys(inputToValidate).length > n;
        }

        function drawMultipleAreasNumberOfAreasSmallerThanFilter(params,
                                                                 inputToValidate) {
            var n = params[0];

            var validParams = angular.isNumber(n) && n >= 0;

            var validInput = angular.isObject(inputToValidate);

            return validParams && validInput &&
                Object.keys(inputToValidate).length < n;
        }

        function drawMultipleAreasDrawnAreasFilter(params, inputToValidate) {
            //as parameter: an array with each element telling if the option
            //was selected (true) or not (false/undefined)
            var paramCheckedOptions = params[0];

            var validParam = angular.isArray(paramCheckedOptions);

            var validInput = angular.isObject(inputToValidate) &&
                Object.keys(inputToValidate).length > 0;

            if (validParam && validInput) {
                for (var i = 0; i < paramCheckedOptions.length; i++) {
                    if (paramCheckedOptions[i] &&
                        angular.isUndefined(inputToValidate['' + i])) {
                        //the participant did not check one of the desired options
                        return false;
                    }
                }
                return true;
            } else {
                return false;
            }
        }
    }
})();
