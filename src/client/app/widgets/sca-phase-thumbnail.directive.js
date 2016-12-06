(function () {
    'use strict';

    angular
        .module('scaApp.widgets')
        .directive('scaPhaseThumbnail', scaPhaseThumbnail);

    scaPhaseThumbnail.$inject = [];

    /* @ngInject */
    function scaPhaseThumbnail() {
        var directive = {
            bindToController: true,
            controller: thumbnailController,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                phaseNumber: '=',
                phaseTitle: '=',
                phaseEligibility: '=',
                toogleAnalysis : '&',
                phaseAdded : '='
            },
            transclude: true,
            templateUrl: 'app/widgets/sca-phase-thumbnail.html'
        };
        return directive;

        function link(scope, element, attrs, controller) {

        }
    }

    thumbnailController.$inject = ['$uibModal',
                                   'statisticsService', 'surveyPreviewer'];

    /* @ngInject */
    function thumbnailController($uibModal, statisticsService, surveyPreviewer) {
        /*jshint validthis: true */
        var STATS_MODAL = 'stats',
            INFO_MODAL = 'info';

        var vm = this;

        vm.showPhaseInfo = showPhaseInfo;
        vm.showPhaseStats = showPhaseStats;
        vm.toogleAnalysisForThisPhase = toogleAnalysisForThisPhase;

        activate();

        ///////////

        function activate() {
            var statsDataObj = statisticsService
                .getGeneralStatisticsForPhase(vm.phaseNumber);
            vm.phaseStats = statsDataObj.stats;
        }

        function showPhaseInfo() {
            openModal(INFO_MODAL);
        }

        function getPhaseStats() {
            if (typeof(vm.phaseStats) !== 'undefined') {
                return vm.phaseStats;
            }

            var statsDataObj = statisticsService
                .getGeneralStatisticsForPhase(vm.phaseNumber);
            vm.phaseStats = statsDataObj.stats;

            return vm.phaseStats;
        }

        function showPhaseStats() {
            openModal(STATS_MODAL); //deprecated
        }

        function toogleAnalysisForThisPhase() {
            vm.toogleAnalysis()(vm.phaseNumber);
        }

        /////////// Helpers

        function openModal(modalContentType) {
            var modalTitle = 'Phase ' + vm.phaseNumber,
                dataGenerator;
            if (modalContentType === INFO_MODAL) {
                modalTitle += ' Information';
                dataGenerator = surveyPreviewer.getPhasePreview;
            } else if (modalContentType === STATS_MODAL) {
                modalTitle += ' Statistics';
                dataGenerator = statisticsService.getGeneralStatisticsForPhase;
            }

            var toResolve = {
                resolvedTitle : function () {
                    return modalTitle;
                },
                resolvedData : function () {
                    return dataGenerator(vm.phaseNumber);
                }
            };

            var pathToTemplate = 'app/widgets/sca-thumbnail-' +
                modalContentType + '-modal.html';

            vm.thumbnailModalWindow = $uibModal.open({
                templateUrl : pathToTemplate,
                controller : 'thumbnailModalController',
                controllerAs : 'vm',
                resolve : toResolve
            });
        }
    }
})();
