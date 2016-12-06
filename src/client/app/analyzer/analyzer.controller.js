(function() {
    'use strict';

    angular
        .module('scaApp.analyzer')
        .controller('AnalyzerController', AnalyzerController);

    AnalyzerController.$inject = ['filtersService',
                                  'analysisService',
                                  'surveyDataService',
                                  '$uibModal'];

    /* @ngInject */
    function AnalyzerController (filtersService,
                                 analysisService,
                                 surveyDataService,
                                 $uibModal) {
        var vm = this;
        vm.phasesUnderAnalysis = [];
        vm.availableFilters = [];

        vm.selectedFilter = {};
        vm.filterGroups = [];
        //vm.activeFilters = [];

        vm.surveyPhases = [];

        vm.addFilter = addFilter;
        vm.addFilterGroup = addFilterGroup;
        vm.deleteFilter = deleteFilter;

        vm.applyFilters = applyFilters;

        vm.deleteAllFilters = deleteAllFilters;

        vm.moveFilterUp = moveFilterUp;
        vm.moveFilterDown = moveFilterDown;

        activate();

        ////////////////

        function activate() {
            vm.availableFilters = filtersService.getFilters();
            vm.surveyPhases = surveyDataService.getPhases();

            vm.phasesUnderAnalysis =
                analysisService.getPhasesUnderAnalysis();
            filtersService.setAllParticipationsAsValid();
        }

        function addFilter() {
            if (!angular.isObject(vm.selectedFilter.config)) {
                return;
            }

            if (vm.filterGroups.length === 0) {
                addFilterGroup();
                vm.activeGroup = vm.filterGroups[0];
            }

            openFilterConfigurationModal(vm.selectedFilter.config);
        }

        function addFilterGroup() {
            var nGroups = vm.filterGroups.push([]);
            var lastGroup = nGroups - 1;

            vm.activeGroup = vm.filterGroups[lastGroup];
        }

        function deleteFilter(groupIndex, filterIndex) {
            var removed = vm.filterGroups[groupIndex].splice(filterIndex, 1);

            var removedGroup;
            if (vm.filterGroups[groupIndex].length === 0) {
                removedGroup = vm.filterGroups.splice(groupIndex, 1);
            }
        }

        function applyFilters() {
            //for each OR group
            //  start with all participations as valid
            //  apply each filter
            //  save each result as the intersection with the previous result
            //save each partial result (within ORGroup) as the union with the
            // previous partial result
            var noActiveFilters = vm.filterGroups.length === 0 ||
                (vm.filterGroups.length === 1 && vm.filterGroups[0].length === 0);
            if (noActiveFilters) {
                //if no filters, consider every participation valid
                var ALL_PARTICIPATIONS = true;
                filtersService.setParticipations(ALL_PARTICIPATIONS);
                return;
            }

            var validParticipationsAmongGroups = [];

            vm.filterGroups.forEach(function (filterGroup) {
                var validParticipationsForGroup = [];

                filterGroup.forEach(function (filter, i) {
                    var thisFilter = filter.config,
                        withTheseParameters = filter.parametersValues,
                        basedOnThisPhase = filter.targetPhaseNumber,
                        andQuestion = filter.targetQuestionNumber;

                    var FIRST_ITERATION = (i === 0);
                    if (FIRST_ITERATION) {
                        validParticipationsForGroup = filtersService.applyFilter(
                            thisFilter, withTheseParameters,
                            basedOnThisPhase, andQuestion
                            //filters based on all participations
                        );
                    } else {
                        validParticipationsForGroup = filtersService.applyFilter(
                            thisFilter, withTheseParameters,
                            basedOnThisPhase, andQuestion,
                            validParticipationsForGroup //guarantees AND logic
                        );
                    }
                });

                validParticipationsAmongGroups =
                    filtersService.participationsUnion(
                        validParticipationsAmongGroups,
                        validParticipationsForGroup
                    ); //guarantees OR logic
            });
            filtersService.setParticipations(validParticipationsAmongGroups);
        }

        function deleteAllFilters() {
            vm.filterGroups = [];
            vm.activeFilter = {};
        }

        function moveFilterUp(groupIndex, filterIndex) {
            var isFirstGroup = (groupIndex === 0);
            if (isFirstGroup) {
                return;
            }

            var removed =
                vm.filterGroups[groupIndex].splice(filterIndex, 1);
            if (removed.length === 0) {
                return;
            }

            var targetFilter = removed[0];
            var targetGroup = vm.filterGroups[groupIndex - 1];
            targetGroup.push(targetFilter);
        }

        function moveFilterDown(groupIndex, filterIndex) {
            var isLastGroup = (groupIndex === vm.filterGroups.length - 1);
            if (isLastGroup) {
                return;
            }

            var removed =
                vm.filterGroups[groupIndex].splice(filterIndex, 1);
            if (removed.length === 0) {
                return;
            }

            var targetFilter = removed[0];
            var targetGroup = vm.filterGroups[groupIndex + 1];
            targetGroup.push(targetFilter);
        }

        //////////////// helpers

        function openFilterConfigurationModal(filterData) {
            var toResolve = {
                resolvedFilterData : function () {
                    return filterData;
                },
                resolvedPhasesData : function () {
                    return vm.surveyPhases;
                },
                resolvedFilterGroups : function () {
                    return vm.filterGroups;
                }
            };

            vm.filterConfigurationModal = $uibModal.open({
                templateUrl : 'app/analyzer/filters/' +
                    'filter-configuration-modal.html',
                controller : 'filterConfigurationModalController',
                controllerAs : 'vm',
                resolve : toResolve
            });

            vm.filterConfigurationModal.result.
            then(function (selected) {
                vm.selectedFilter.targetPhaseNumber = selected.phase;
                vm.selectedFilter.targetPhase =
                    vm.surveyPhases[vm.selectedFilter.targetPhaseNumber];

                if (angular.isDefined(selected.question)) {
                    vm.selectedFilter.targetQuestionNumber = selected.question;
                }

                vm.selectedFilter.parametersValues = [];

                vm.filterGroups[selected.filterGroup].push(vm.selectedFilter);
                //vm.activeGroup.push(vm.selectedFilter);

                vm.selectedFilter = {}; //reset selectedFilter
            });
        }
    }
})();
