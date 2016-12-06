(function() {
    'use strict';

    angular
        .module('scaApp.analyzer')
        .controller('QuestionnaireAnalyzerController',
                    QuestionnaireAnalyzerController);

    QuestionnaireAnalyzerController.$inject = ['$scope',
                                               'analysisService',
                                               'surveyDataService',
                                               'filtersService',
                                               'reportService'];

    /* @ngInject */
    function QuestionnaireAnalyzerController($scope,
                                              analysisService,
                                              surveyDataService,
                                              filtersService,
                                              reportService) {
        var vm = this;

        var fallbackChartData = [[]];
        var fallbackChartLabels = [];
        var fallbackChartConfig = {};

        var participationsUnderAnalysis = [];
        vm.phasesUnderAnalysis = [];

        vm.loadResults = loadResults;
        vm.loadChart = loadChart;

        vm.saveSnapshot = saveSnapshot;

        vm.questionsInPhase = questionsInPhase;

        vm.dataForChart = dataForChart;
        vm.labelsForChart = labelsForChart;
        vm.getChartConfiguration = getChartConfiguration;

        vm.createDistributionLevel = createDistributionLevel;
        vm.removeDistributionLevel = removeDistributionLevel;

        var answersDataForCharts = [];
        var chartConfiguration = [];

        var allAnswersByQuestion = [],
            answersUnderAnalysis;

        var surveyPhases = [],
            surveyParticipations = [];

        activate();

        ////////////////

        function activate() {
            vm.phasesUnderAnalysis = analysisService.getPhasesUnderAnalysis();
            surveyPhases = surveyDataService.getPhases();
            surveyParticipations =
                surveyDataService.getParticipations();

            allAnswersByQuestion =
                getAllAnswersByQuestion(vm.phasesUnderAnalysis);
            answersUnderAnalysis = allAnswersByQuestion;

            setupChartData();

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

            vm.loadedData = true;
        }

        function loadResults() {
            answersUnderAnalysis =
                getAnswersFromParticipations(participationsUnderAnalysis,
                                             vm.phasesUnderAnalysis);

            if (answersDataForCharts.length === 0) {
                setupChartData();
            }

            vm.phasesUnderAnalysis.forEach(function (phaseN) {
                var questions = surveyPhases[phaseN].questions;

                if (!angular.isArray(questions)) {
                    return; //incompatible phase, skip it
                }

                questions.forEach(function (question, questionN) {
                    loadChart(phaseN, questionN);
                });
            });
        }

        function loadChart(phaseN, questionN) {
            if (surveyPhases[phaseN].type !== 'questionnaire') {
                return;
            }

            var questionType = '';
            var targetQuestion = {};

            targetQuestion = surveyPhases[phaseN].questions[questionN];
            questionType = targetQuestion.answer.typeOfAnswer;

            var getAnswersData = getDataAnalyzerFor(questionType);

            if (angular.isArray(answersDataForCharts[phaseN])) {
                answersDataForCharts[phaseN][questionN] =
                    getAnswersData(targetQuestion, phaseN, questionN);
            }
        }

        function saveSnapshot(phaseN, questionN) {
            var snapshot = {};

            var snapshotPhases = [phaseN];
            snapshot.phases = snapshotPhases;

            var graphCanvasContainer = document.getElementsByClassName(
                'graph' + phaseN + '.' + questionN
            );
            var graphCanvas = graphCanvasContainer[0];

            var questionBody =
                surveyPhases[phaseN].questions[questionN].questionBody;
            var snapshotLabel = '"' + questionBody +
                '" (Phase ' + phaseN + ', ' + 'question ' + questionN + ')';

            snapshot.label = snapshotLabel;

            graphCanvas.toBlob(function (blob) {
                var urlManager = window.URL || window.webkitURL;
                var url = urlManager.createObjectURL(blob);

                snapshot.src = url;

                reportService.addSnapshot(snapshot);
            });
        }

        function questionsInPhase(phaseNumber) {
            if (!angular.isArray(surveyPhases)) {
                surveyPhases = surveyDataService.getPhases();
            }

            if (surveyPhases[phaseNumber] &&
                surveyPhases[phaseNumber].type === 'questionnaire' &&
                surveyPhases[phaseNumber].questions &&
                surveyPhases[phaseNumber].questions.length > 0) {
                return surveyPhases[phaseNumber].questions;
            } else {
                return [];
            }
        }

        function dataForChart(phaseNumber, questionNumber) {
            if (answersDataForCharts[phaseNumber] &&
                answersDataForCharts[phaseNumber][questionNumber] &&
                answersDataForCharts[phaseNumber][questionNumber].data &&
                answersDataForCharts[phaseNumber][questionNumber].data[0]) {
                return answersDataForCharts[phaseNumber][questionNumber].data;
            } else {
                return fallbackChartData;
            }
        }

        function labelsForChart(phaseNumber, questionNumber) {
            if (answersDataForCharts[phaseNumber] &&
                answersDataForCharts[phaseNumber][questionNumber] &&
                answersDataForCharts[phaseNumber][questionNumber].labels) {
                return answersDataForCharts[phaseNumber][questionNumber].labels;
            } else {
                return fallbackChartLabels;
            }
        }

        //////////////// configuration functions

        function getChartConfiguration(phaseNumber, questionNumber) {
            if (!angular.isNumber(phaseNumber) ||
                !angular.isNumber(questionNumber)) {
                return undefined;
            }
            chartConfiguration[phaseNumber] =
                chartConfiguration[phaseNumber] || [];
            chartConfiguration[phaseNumber][questionNumber] =
                chartConfiguration[phaseNumber][questionNumber] || {};

            return chartConfiguration[phaseNumber][questionNumber];
        }

        function createDistributionLevel(phaseNumber, questionNumber) {
            var targetConfig =
                getChartConfiguration(phaseNumber, questionNumber);
            var targetQuestionType = surveyPhases[phaseNumber]
                .questions[questionNumber]
                .answer.typeOfAnswer;

            var placeholders = {
                'number-input' : 11,
                'month-input' : {
                    month : 1,
                    year : 1990
                },
                'time-input' : {
                    number : 7,
                    timeUnit : 'days'
                }
            };

            targetConfig.distributionLevels =
                targetConfig.distributionLevels || [];

            targetConfig.distributionLevels.push(
                placeholders[targetQuestionType]
            );
        }

        function removeDistributionLevel(phaseNumber, questionNumber,
                                          levelNumber) {
            var distributionLevels =
                getChartConfiguration(phaseNumber, questionNumber)
                .distributionLevels;

            if (angular.isArray(distributionLevels) &&
                levelNumber < distributionLevels.length) {
                distributionLevels.splice(levelNumber, 1);
            }
        }

        //////////////// helpers

        function setupChartData() {
            vm.phasesUnderAnalysis.forEach(function (phaseN) {
                var questions = surveyPhases[phaseN].questions || [];
                var nQuestions = questions.length;

                if (nQuestions > 0) {
                    answersDataForCharts[phaseN] = [];
                    chartConfiguration[phaseN] = [];
                }

                questions.forEach(function (q, questionN) {
                    //answersDataForCharts[phaseN] =
                    //    answersDataForCharts[phaseN] || [];
                    //chartConfiguration[phaseN] =
                    //    chartConfiguration[phaseN] || [];

                    chartConfiguration[phaseN][questionN] = {};

                    var dataAnalyzer = getDataAnalyzerFor(q.answer.typeOfAnswer);
                    var dataForChart = dataAnalyzer(q, phaseN, questionN);

                    answersDataForCharts[phaseN][questionN] = dataForChart;
                });
            });
        }

        function getAllAnswersByQuestion(inThesePhases) {
            var allAnswers = [];

            surveyParticipations.forEach(function (participation,
                                                   participationNumber) {
                //O(P), probably long P (> 100)
                inThesePhases.forEach(function (phaseNumber) {
                    //O(P * Ph), probably short Ph (< 5)

                    // ---- array initialization ----
                    allAnswers[phaseNumber] =
                        allAnswers[phaseNumber] || [];
                    // ----

                    var participationInPhase = participation[phaseNumber];

                    if (angular.isObject(participationInPhase) &&
                        participationInPhase.answers &&
                        participationInPhase.answers.length > 0) {
                        //if participated
                        var questionsInThisPhase =
                            surveyPhases[phaseNumber].questions;
                        var answersInPhase =
                            participationInPhase.answers;

                        questionsInThisPhase.forEach(function (question,
                                                               questionNumber) {
                            //O(P * Ph * Q), probably medium to short Q (< 50)

                            // ---- array initialization ----
                            allAnswers[phaseNumber][questionNumber] =
                                allAnswers[phaseNumber][questionNumber] || [];
                            // ----
                            var answersToThisQuestion =
                                allAnswers[phaseNumber][questionNumber];

                            var answer = answersInPhase[questionNumber];

                            if (angular.isDefined(answer) &&
                                !angular.equals(answer, {}) &&
                                answer != null) {
                                answersToThisQuestion[participationNumber] =
                                    answer;
                            }
                        });
                    }
                });
            });

            return allAnswers;
        }

        function getAnswersFromParticipations(participations, inThesePhases) {
            var answersInParticipations = [];
            if (angular.isUndefined(allAnswersByQuestion) ||
                allAnswersByQuestion.length === 0) {
                allAnswersByQuestion =
                    getAllAnswersByQuestion(inThesePhases);
            }

            inThesePhases.forEach(function (phaseN) {
                var questions = surveyPhases[phaseN].questions;

                // ---- array initialization ----
                answersInParticipations[phaseN] =
                    answersInParticipations[phaseN] || [];
                // ----

                questions.forEach(function (q, questionN) {
                    // ---- array initialization ----
                    answersInParticipations[phaseN][questionN] =
                        answersInParticipations[phaseN][questionN] || [];
                    // ----

                    participations.forEach(function (participationN) {
                        var answersToTheQuestion =
                            allAnswersByQuestion[phaseN][questionN];

                        if (answersToTheQuestion &&
                            answersToTheQuestion[participationN]) {
                            answersInParticipations[phaseN][questionN].push(
                                answersToTheQuestion[participationN]
                            );
                        }
                    });
                });
            });

            return answersInParticipations;
        }

        function setChartConfiguration(phaseNumber, questionNumber, val, prop) {
            var targetConfig = getChartConfiguration(phaseNumber, questionNumber);
            if (angular.isString(prop)) {
                targetConfig[prop] = val;
            } else if (angular.isObject(val)) {
                targetConfig = val;
            }
        }

        function getDataAnalyzerFor(answerType) {
            var analyzerFor = {
                'choose-one' : chooseOneAnalyzer,
                'choose-multiple' : chooseMultipleAnalyzer,
                'select-dropdown' : selectDropdownAnalyzer,
                'time-input' : timeInputAnalyzer,
                'month-input' : monthInputAnalyzer,
                'number-input' : numberInputAnalyzer
            };

            return analyzerFor[answerType] || fallbackFunction;

            function fallbackFunction() {
                return {
                    data : [[]],
                    labels : []
                };
            }

            function chooseOneAnalyzer(questionInfo, phaseN, questionN) {
                var chartConfiguration =
                    getChartConfiguration(phaseN, questionN);
                var optionsToShow = chartConfiguration.optionsToShow;
                var didntConfigure = !angular.isArray(optionsToShow) ||
                    optionsToShow.length <= 0;

                if (!angular.isObject(questionInfo.answer) ||
                    questionInfo.answer.typeOfAnswer !== 'choose-one' ||
                    angular.isUndefined(answersUnderAnalysis[phaseN])) {
                    return {
                        data : [[]],
                        labels : []
                    };
                }

                var answerOptions = questionInfo.answer.answerOptions;
                var chosenOptionCount = new Array(answerOptions.length);
                chosenOptionCount.fill(0);

                var answers = answersUnderAnalysis[phaseN][questionN] || [];

                answers.forEach(function (answer) {
                    if (angular.isObject(answer) &&
                        angular.isNumber(answer.index)) {
                        var n = answer.index;
                        chosenOptionCount[n]++;
                    }
                });

                var labels = [];

                answerOptions.forEach(function (option) {
                    var MAX_LETTERS = 22;
                    var chartLabel =
                        option.answerBody.substring(0,MAX_LETTERS); //to avoid too lengthy labels

                    if (option.answerBody.length > MAX_LETTERS) {
                        chartLabel += '...';
                    }

                    labels.push(chartLabel);
                });

                if (didntConfigure) {
                    optionsToShow = new Array(answerOptions.length);
                    optionsToShow.fill(true);

                    setChartConfiguration(phaseN, questionN,
                                          optionsToShow,
                                          'optionsToShow');
                } else {
                    var auxCount = [],
                        auxLabels = [];

                    optionsToShow.forEach(function (showIt, optionIndex) {
                        if (showIt) {
                            auxCount.push(chosenOptionCount[optionIndex]);
                            auxLabels.push(labels[optionIndex]);
                        }
                    });

                    chosenOptionCount = auxCount;
                    labels = auxLabels;
                }

                return {
                    data : [chosenOptionCount],
                    labels : labels
                };
            }

            function chooseMultipleAnalyzer(questionInfo, phaseN, questionN) {
                var chartConfiguration =
                    getChartConfiguration(phaseN, questionN);
                var optionsToShow = chartConfiguration.optionsToShow;
                var didntConfigure = !angular.isArray(optionsToShow) ||
                    optionsToShow.length <= 0;

                if (!angular.isObject(questionInfo.answer) ||
                    questionInfo.answer.typeOfAnswer !== 'choose-multiple' ||
                    angular.isUndefined(answersUnderAnalysis[phaseN])) {
                    return {
                        data : [[]],
                        labels : []
                    };
                }

                var answerOptions = questionInfo.answer.answerOptions;
                var chosenOptionCount = new Array(answerOptions.length);
                chosenOptionCount.fill(0);

                var answers = answersUnderAnalysis[phaseN][questionN] || [];

                answers.forEach(function (answer) {
                    var checks = answer.checks;
                    if (angular.isUndefined(checks) ||
                        !angular.isObject(checks)) {
                        return; //invalid answer, skip it
                    }

                    angular.forEach(checks, function (checked, checkIndex) {
                        if (checked && checked != null) {
                            chosenOptionCount[checkIndex]++;
                        }
                    });
                });

                var labels = [];

                answerOptions.forEach(function (option) {
                    var MAX_LETTERS = 22;
                    var chartLabel =
                        option.answerBody.substring(0,MAX_LETTERS); //to avoid too lengthy labels

                    if (option.answerBody.length > MAX_LETTERS) {
                        chartLabel += '...';
                    }

                    labels.push(chartLabel);
                });

                if (didntConfigure) {
                    optionsToShow = new Array(answerOptions.length);
                    optionsToShow.fill(true);

                    setChartConfiguration(phaseN, questionN,
                                          optionsToShow,
                                          'optionsToShow');
                } else {
                    var auxCount = [],
                        auxLabels = [];

                    optionsToShow.forEach(function (showIt, optionIndex) {
                        if (showIt) {
                            auxCount.push(chosenOptionCount[optionIndex]);
                            auxLabels.push(labels[optionIndex]);
                        }
                    });

                    chosenOptionCount = auxCount;
                    labels = auxLabels;
                }

                return {
                    data : [chosenOptionCount],
                    labels : labels
                };
            }

            function selectDropdownAnalyzer(questionInfo, phaseN, questionN) {
                var config = getChartConfiguration(phaseN, questionN);
                var dropdownOptionsToShow = config.optionsToShow;
                var didntConfigure =
                    !angular.isArray(dropdownOptionsToShow) ||
                    dropdownOptionsToShow.length <= 0;

                if (!angular.isObject(questionInfo.answer) ||
                    questionInfo.answer.typeOfAnswer !== 'select-dropdown' ||
                    angular.isUndefined(answersUnderAnalysis[phaseN])) {
                    return {
                        data : [[]],
                        labels : []
                    };
                }

                var answers = answersUnderAnalysis[phaseN][questionN] || [];
                var selectedOptions = [];

                answers.forEach(function (answer) {
                    if (angular.isObject(answer) &&
                        angular.isString(answer.selected)) {
                        selectedOptions.push(answer.selected);
                    }
                });

                var selectedOptionCount = [],
                    selectedOptionsLabels = [];

                if (didntConfigure) {
                    dropdownOptionsToShow = [];
                }

                selectedOptions.forEach(function (selected) {
                    var i = selectedOptionsLabels.indexOf(selected);
                    var notSeenYet = i === -1;

                    if (notSeenYet) {
                        var l = selectedOptionsLabels.push(selected);
                        i = l - 1; //i = last index
                        selectedOptionCount[i] = 0; //initalizing
                    }

                    selectedOptionCount[i]++;
                });

                if (didntConfigure) {
                    dropdownOptionsToShow = [];
                    selectedOptionsLabels.forEach(function (optionLabel,
                                                            optionN) {
                        dropdownOptionsToShow[optionN] = {
                            optionName : optionLabel,
                            showOption : true
                        };
                    });

                    setChartConfiguration(phaseN, questionN,
                                          dropdownOptionsToShow,
                                          'optionsToShow');
                } else {
                    var auxCount = [],
                        auxLabels = [];

                    dropdownOptionsToShow.forEach(function (optionToShow,
                                                            optionN) {
                        if (optionToShow.showOption) {
                            auxCount.push(selectedOptionCount[optionN]);
                            auxLabels.push(selectedOptionsLabels[optionN]);
                        }
                    });

                    selectedOptionCount = auxCount;
                    selectedOptionsLabels = auxLabels;
                }

                //se ja configurou
                //apenas passa ao grafico as opcoes seleccionadas

                return {
                    data : [selectedOptionCount],
                    labels : selectedOptionsLabels
                };
            }

            function timeInputAnalyzer(questionInfo, phaseN, questionN) {
                var toDays = {
                    years : 365,
                    months : 30.5,
                    days : 1
                };

                var config = getChartConfiguration(phaseN, questionN);
                var distributionLevels = config.distributionLevels;
                var didntConfigure =
                    !angular.isArray(distributionLevels) ||
                    distributionLevels.length <= 0;

                if (!angular.isObject(questionInfo.answer) ||
                    questionInfo.answer.typeOfAnswer !== 'time-input' ||
                    angular.isUndefined(answersUnderAnalysis[phaseN])) {
                    return {
                        data : [[]],
                        labels : []
                    };
                }

                var answers = answersUnderAnalysis[phaseN][questionN] || [];
                var insertedValues = [];

                answers.forEach(function (answer) {
                    if (angular.isObject(answer) &&
                        answer.number > 0 &&
                        answer.timeUnit) {
                        insertedValues.push(answer);
                    }
                });

                insertedValues.sort(sortByTime);

                var nAnswers = insertedValues.length;
                var nValuesPerLevel = [],
                    levelLabels = [];

                if (didntConfigure) {
                    //auto generate levels
                    /*var percentiles = [],
                        N_LEVELS = Math.min(4, nAnswers),
                        levelIndex = 0;

                    for (var i = 0, j = 1; i < N_LEVELS; i++, j++) {
                        levelIndex =
                            Math.round(nAnswers * j / (N_LEVELS + 1));
                        levelIndex =
                            Math.max(0, Math.min(levelIndex, nAnswers));
                        percentiles[i] =
                            insertedValues[levelIndex];
                    }

                    distributionLevels = percentiles;*/
                    distributionLevels =
                        levelsGenerator(insertedValues, sameTime);

                    setChartConfiguration(phaseN, questionN,
                                          distributionLevels,
                                          'distributionLevels');
                }

                nValuesPerLevel = countValuesPerLevel(
                    insertedValues,
                    distributionLevels,
                    previousInTime,
                    sortByTime
                );

                var distributionLabels = [];
                var LAST_LEVEL = distributionLevels.length - 1;
                var LAST_LABEL = nValuesPerLevel.length - 1;
                //^^^^ includes "greater than last level"

                distributionLabels[0] =
                    getLabel(distributionLevels[0]);

                for (var l = 1; l < distributionLevels.length; l++) {
                    distributionLabels[l] = getLabel(distributionLevels[l - 1],
                                                     distributionLevels[l]);
                }

                distributionLabels[LAST_LABEL] =
                    getLabel(false, distributionLevels[LAST_LEVEL]);

                return {
                    data : [nValuesPerLevel],
                    labels : distributionLabels
                };

                /////

                function sameTime(t1, t2) {
                    var t1Alright = angular.isObject(t1) &&
                        angular.isNumber(t1.number) &&
                        angular.isString(t1.timeUnit);
                    var t2Alright = angular.isObject(t2) &&
                        angular.isNumber(t2.number) &&
                        angular.isString(t2.timeUnit);

                    if (t1Alright && t2Alright) {
                        var t1InDays = t1.number * toDays[t1.timeUnit],
                            t2InDays = t2.number * toDays[t2.timeUnit];

                        return Math.abs(t1InDays - t2InDays) < 1;
                    } else {
                        return false;
                    }
                }

                function sortByTime(a, b) {
                    return (a.number * toDays[a.timeUnit]) -
                        (b.number * toDays[b.timeUnit]);
                }

                function previousInTime(a, b) {
                    return sortByTime(a, b) < 0;
                }

                function getLabel(start, end) {
                    var firstLabel = start && !end;
                    var lastLabel = end && !start;

                    var startN, startU;
                    if (start) {
                        startN = start.number;
                        startU = start.timeUnit;
                    }

                    var endN, endU;
                    if (end) {
                        endN = end.number;
                        endU = end.timeUnit;
                    }

                    if (firstLabel) {
                        return 'Less than ' + startN +
                            ' ' + startU;
                    } else if (lastLabel) {
                        return endN + ' ' + endU + ' or more';
                    } else {
                        var sameUnit = startU === endU;

                        return startN +
                            (sameUnit ? '' : ' ' + startU) +
                            ' to ' + endN + ' ' + endU;
                    }
                }
            }

            function monthInputAnalyzer(questionInfo, phaseN, questionN) {
                var config = getChartConfiguration(phaseN, questionN);
                var distributionLevels = config.distributionLevels;
                var didntConfigure =
                    !angular.isArray(distributionLevels) ||
                    distributionLevels.length <= 0;

                if (!angular.isObject(questionInfo.answer) ||
                    questionInfo.answer.typeOfAnswer !== 'month-input' ||
                    angular.isUndefined(answersUnderAnalysis[phaseN])) {
                    return {
                        data : [[]],
                        labels : []
                    };
                }

                var answers = answersUnderAnalysis[phaseN][questionN] || [];
                var insertedValues = [];

                answers.forEach(function (answer) {
                    if (angular.isObject(answer) &&
                        angular.isNumber(answer.year) &&
                        answer.month >= 1 && answer.month <= 12) {
                        insertedValues.push(answer);
                    }
                });

                insertedValues.sort(sortByDate);

                var nAnswers = insertedValues.length;
                var nValuesPerLevel = [],
                    levelLabels = [];

                if (didntConfigure) {
                    //auto generate levels
                    /*var percentiles = [],
                        N_LEVELS = Math.min(4, nAnswers),
                        levelIndex = 0;

                    for (var i = 0, j = 1; i < N_LEVELS; i++, j++) {
                        levelIndex =
                            Math.round(nAnswers * j / (N_LEVELS + 1));
                        levelIndex =
                            Math.max(0, Math.min(levelIndex, nAnswers));
                        percentiles[i] =
                            insertedValues[levelIndex];
                    }

                    distributionLevels = percentiles;*/
                    distributionLevels =
                        levelsGenerator(insertedValues, sameDate);

                    setChartConfiguration(phaseN, questionN,
                                          distributionLevels,
                                          'distributionLevels');
                }

                nValuesPerLevel = countValuesPerLevel(
                    insertedValues,
                    distributionLevels,
                    previousToDate,
                    sortByDate
                );

                var distributionLabels = [];
                var LAST_LEVEL = distributionLevels.length - 1;
                var LAST_LABEL = nValuesPerLevel.length - 1;
                //^^^^ includes "greater than last level"

                distributionLabels[0] =
                    getLabel(distributionLevels[0]);

                for (var l = 1; l < distributionLevels.length; l++) {
                    distributionLabels[l] = getLabel(distributionLevels[l - 1],
                                                     distributionLevels[l]);
                }

                distributionLabels[LAST_LABEL] =
                    getLabel(false, distributionLevels[LAST_LEVEL]);

                return {
                    data : [nValuesPerLevel],
                    labels : distributionLabels
                };

                /////

                function sameDate(d1, d2) {
                    return angular.isObject(d1) &&
                        angular.isObject(d2) &&
                        d1.year === d2.year &&
                        d1.month === d2.month;
                }

                function sortByDate(a, b) {
                    if (a.year === b.year) {
                        return a.month - b.month;
                    } else {
                        return a.year - b.year;
                    }
                }

                function previousToDate(d1, d2) {
                    return sortByDate(d1, d2) < 0;
                }

                function getLabel(start, end) {
                    var firstLabel = start && !end;
                    var lastLabel = end && !start;

                    var startMonth, startYear;
                    if (start) {
                        startMonth = (start.month < 10 ?
                                      '0' + start.month : start.month);
                        startYear = start.year;
                    }

                    var endMonth, endYear;
                    if (end) {
                        endMonth = (end.month < 10 ?
                                    '0' + end.month : end.month);
                        endYear = end.year;
                    }

                    if (firstLabel) {
                        return 'Previous to ' + startMonth +
                            '.' + startYear;
                    } else if (lastLabel) {
                        return endMonth +
                            '.' + endYear + ' or after';
                    } else {
                        var m = parseInt(endMonth);
                        var y = parseInt(endYear);

                        if (m === 1) {
                            m = 12;
                            y = y - 1;
                        } else {
                            m--;
                        }

                        var sameYear = startYear === y;

                        return startMonth +
                            (sameYear ? '' : '.' + startYear) +
                            (startMonth === m ? '' :
                             ' to ' + m + '.' + y);
                    }
                }
            }

            function numberInputAnalyzer(questionInfo, phaseN, questionN) {
                var config =
                    getChartConfiguration(phaseN, questionN);
                var distributionLevels = config.distributionLevels;
                var didntConfigureDistributionLevels =
                    !angular.isArray(distributionLevels) ||
                    distributionLevels.length <= 0;

                if (!angular.isObject(questionInfo.answer) ||
                    questionInfo.answer.typeOfAnswer !== 'number-input' ||
                    angular.isUndefined(answersUnderAnalysis[phaseN])) {
                    return {
                        data : [[]],
                        labels : []
                    };
                }

                var answers = answersUnderAnalysis[phaseN][questionN] || [];
                var insertedValues = [];

                answers.forEach(function (answer) {
                    if (angular.isObject(answer) &&
                        angular.isNumber(answer.number)) {
                        var n = answer.number;
                        insertedValues.push(n);
                    }
                });

                insertedValues.sort(numberSorter);

                var nAnswers = insertedValues.length;
                var nValuesPerLevel = [],
                    distributionLabels = [];

                if (didntConfigureDistributionLevels) {
                    var percentiles = [];

                    distributionLevels = levelsGenerator(insertedValues);

                    setChartConfiguration(phaseN, questionN,
                                          distributionLevels,
                                          'distributionLevels');
                }

                nValuesPerLevel = countValuesPerLevel(
                    insertedValues,
                    distributionLevels,
                    smallerThan,
                    numberSorter
                );

                if (nValuesPerLevel.length === 0) {
                    return {
                        data : fallbackChartData,
                        labels : fallbackChartLabels
                    };
                }

                var LAST_LEVEL = distributionLevels.length - 1;
                var LAST_LABEL = nValuesPerLevel.length - 1;
                //^^^^ includes "grenater than last level"

                distributionLabels[0] = getLabel(distributionLevels[0]);

                var starting = 0,
                    upTo = 0;

                for (var l = 1; l < distributionLevels.length; l++) {
                    starting = distributionLevels[l - 1];
                    upTo = distributionLevels[l];

                    distributionLabels[l] = getLabel(starting, upTo);
                }

                distributionLabels[LAST_LABEL] =
                    getLabel(false, distributionLevels[LAST_LEVEL]);

                return {
                    data : [nValuesPerLevel],
                    labels : distributionLabels
                };

                function numberSorter(a, b) {
                    return a - b;
                }

                function smallerThan(a, b) {
                    return a < b;
                }

                function getLabel(start, end) {
                    var firstLabel = start && !end;
                    var lastLabel = end && !start;

                    if (firstLabel) {
                        return 'Less than ' + start;
                    } else if (lastLabel) {
                        return end + ' or more';
                    } else {
                        end = Math.max(end - 1, 1);

                        return start + (start === end ? '' : ' to ' + end);
                    }
                }
            }
        }

        function levelsGenerator(values, areTheSame) {
            var DEFAULT_N_LEVELS = 4;
            if (!angular.isFunction(areTheSame)) {
                areTheSame = defaultComparator;
            }

            var numberOfValues = values.length;
            var numberOfLevels = Math.min(numberOfValues, DEFAULT_N_LEVELS);
            var levels = [];

            var l = 0, i = 0;
            while (i < numberOfLevels) {
                var targetValueIndex = (i + 1) / (numberOfLevels + 1);
                targetValueIndex =
                    Math.round(numberOfValues * targetValueIndex);
                targetValueIndex =
                    Math.min(targetValueIndex, numberOfValues);

                var targetValue = values[targetValueIndex];
                var previousLevelValue = levels[Math.max(0, l - 1)];

                var test = !areTheSame(targetValue, previousLevelValue);

                if (angular.isDefined(targetValue) &&
                    (angular.isUndefined(previousLevelValue) ||
                     !areTheSame(targetValue, previousLevelValue))) {
                    levels[l] = targetValue;
                    l++;
                }

                //if (targetValue !== previousLevelValue &&
                //    angular.isNumber(targetValue)) {
                //    levels[l] = targetValue;
                //    l++;
                //}

                ++i;
            }

            return levels;

            function defaultComparator(v1, v2) {
                return angular.isDefined(v1) &&
                    angular.isDefined(v2) &&
                    angular.equals(v1, v2);
            }
        }

        function countValuesPerLevel(values, levels, levelComparator, levelSorter) {
            if (levels.length <= 0) {
                return [];
            }

            var LAST_LEVEL = levels.length - 1;
            var LEVEL_FOR_THE_REST = levels.length;

            levels = levelSorter ? levels.sort(levelSorter) : levels;

            var nValuesPerLevel = new Array(levels.length + 1);
            nValuesPerLevel.fill(0);

            var startLevel = 0;
            for (var valueIndex = 0;
                 valueIndex < values.length;
                 valueIndex++) {
                var value = values[valueIndex];

                for (var levelN = startLevel;
                     levelN < levels.length;
                     levelN++) {
                    var valueIsInCurrentLevel =
                        levelComparator(value, levels[levelN]);
                    nValuesPerLevel[levelN] =
                        nValuesPerLevel[levelN] || 0; //initialization

                    if (valueIsInCurrentLevel) {
                        nValuesPerLevel[levelN]++;
                        startLevel = levelN;

                        break; //end "level-cycle", go to next value
                    } else if (levelN === LAST_LEVEL) {
                        startLevel = LEVEL_FOR_THE_REST;

                        break;
                    } else {
                        //keep on finding the "ceiling" level
                        continue;
                    }
                }

                if (startLevel === LEVEL_FOR_THE_REST) {
                    //it cycled through all the levels but there are
                    //still more values to account for
                    nValuesPerLevel[LEVEL_FOR_THE_REST] =
                        values.length - valueIndex;

                    break;
                }
            }

            return nValuesPerLevel;
        }
    }
})();
