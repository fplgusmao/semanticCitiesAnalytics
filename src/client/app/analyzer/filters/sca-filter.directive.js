(function () {
    'use strict';

    angular
        .module('scaApp.analyzer')
        .directive('scaFilter', scaFilter);

    scaFilter.$inject = [];

    /* @ngInject */
    function scaFilter() {
        var directive = {
            bindToController: true,
            controller: FilterController,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                filterConfig : '=',
                targetPhase : '=',
                targetPhaseNumber : '=',
                targetQuestionNumber : '=',
                parametersValues : '='
            },
            transclude : {
                'actions': '?filterActions'
            },
            templateUrl: 'app/analyzer/filters/sca-filter.html'
        };
        return directive;

        function link(scope, element, attrs, controller) {

        }
    }

    FilterController.$inject = ['filtersService', '$uibModal'];

    /* @ngInject */
    function FilterController(filtersService, $uibModal) {
        var vm = this;
        vm.dataForParameters = [];
        vm.openBoundsModal = openBoundsModal;

        activate();

        ////////////////

        function activate() {
            if (vm.targetQuestionNumber >= 0) {
                vm.targetQuestion =
                    vm.targetPhase.questions[vm.targetQuestionNumber];
            }
            vm.filterConfig.parameters.forEach(getDataForParameter);
        }

        function getDataForParameter(parameter, parameterNumber) {
            if (angular.isUndefined(parameter.supportPropertyPath)) {
                return;
            }

            var dataForParameter = vm.targetQuestion || vm.targetPhase;
            parameter.supportPropertyPath.forEach(function(prop) {
                if (angular.isUndefined(dataForParameter) ||
                    !dataForParameter.hasOwnProperty(prop)) {
                    dataForParameter = undefined;
                    return; //skip this iteration
                }

                dataForParameter = dataForParameter[prop];
            });

            vm.dataForParameters[parameterNumber] = dataForParameter;
            return dataForParameter;
        }

        function openBoundsModal(parameterN, mapCenter) {
            var toResolve = {
                resolvedMapCenter : function () {
                    return mapCenter;
                }
            };

            vm.boundsModal = $uibModal.open({
                templateUrl : 'app/analyzer/filters/' +
                'bounds-modal.html',
                controller : 'boundsModalController',
                controllerAs : 'vm',
                resolve : toResolve
            });

            vm.boundsModal.result.
            then(function (bounds) {
                vm.parametersValues[parameterN] = bounds;
            });
        }
    }
})();
