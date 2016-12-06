(function() {
    'use strict';

    angular
        .module('scaApp.analyzer')
        .controller('filterConfigurationModalController',
                    filterConfigurationModalController);

    filterConfigurationModalController.$inject = ['$uibModalInstance',
                                                  'resolvedFilterData',
                                                  'resolvedPhasesData',
                                                  'resolvedFilterGroups',
                                                  'phraseNormalizer'];

    /* @ngInject */
    function filterConfigurationModalController ($uibModalInstance,
                                                 resolvedFilterData,
                                                 resolvedPhasesData,
                                                 resolvedFilterGroups,
                                                 phraseNormalizer) {
        /*jshint -W040*/
        var vm = this;

        vm.isCompatibleWithThisPhase = isCompatibleWithThisPhase;
        vm.isCompatibleWithThisQuestion = isCompatibleWithThisQuestion;
        vm.readable = phraseNormalizer.toHumanFromDashed;
        vm.confirm = confirmAndExit;
        vm.cancel = cancelAndExit;
        vm.canConfirm = canConfirm;

        activate();

        ////////////////

        function activate() {
            vm.filterTitle = resolvedFilterData.name;
            vm.filterDescription = resolvedFilterData.description;

            vm.phaseTypeForThisFilter = resolvedFilterData.intendedPhaseType;
            if (angular.isDefined(resolvedFilterData.intendedAnswerType)) {
                vm.answerTypeForThisFilter =
                    resolvedFilterData.intendedAnswerType;
            }
            /* TODO: support filters based on sub-phases
            if (angular.isDefined(resolvedFilterData.intendedSubPhaseType)) {
                vm.targetAreaForThisFilter =
                    resolvedFilterData.intendedSubPhaseType;
            }*/

            vm.filterGroups = resolvedFilterGroups;
            vm.selectedGroup = vm.filterGroups.length - 1;
            vm.surveyPhases = resolvedPhasesData;
        }

        function isCompatibleWithThisPhase(typeOfPhase) {
            return vm.phaseTypeForThisFilter === typeOfPhase;
        }

        function isCompatibleWithThisQuestion(typeOfAnswer) {
            return vm.answerTypeForThisFilter === typeOfAnswer;
        }

        function confirmAndExit(returnValue) {
            var selected = {};
            selected.phase = vm.selectedPhase;

            if (angular.isDefined(vm.selectedQuestion)) {
                selected.question = vm.selectedQuestion;
            }

            selected.filterGroup = vm.selectedGroup;

            $uibModalInstance.close(selected);
        }

        function cancelAndExit() {
            $uibModalInstance.dismiss('Canceled');
        }

        function canConfirm() {
            var choseAPhase = angular.isDefined(vm.selectedPhase) &&
                angular.isUndefined(resolvedFilterData.intendedAnswerType) &&
                angular.isUndefined(resolvedFilterData.intendedSubPhaseType);

            var choseAQuestion =
                angular.isDefined(resolvedFilterData.intendedAnswerType) &&
                angular.isDefined(vm.selectedQuestion);

            //For future support ?
            //var choseAnArea =
            //    angular.isDefined(resolvedFilterData.intendedSubPhaseType) &&
            //    angular.isDefined(vm.selectedArea);
            //return choseAPhase || choseAQuestion || choseAnArea;

            return (choseAPhase || choseAQuestion) &&
                (vm.selectedGroup >= 0 || vm.filterGroups.length <= 1);
        }
    }
})();
