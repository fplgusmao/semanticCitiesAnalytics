(function () {
    'use strict';

    angular
        .module('scaApp.analyzer')
        .directive('analysisBar', analysisBar);

    analysisBar.$inject = [];

    /* @ngInject */
    function analysisBar() {
        var directive = {
            bindToController: true,
            controller: analysisBarController,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            templateUrl: 'app/analyzer/analysis-bar/analysis-bar.html',
            transclude: true,
            scope: {}
        };
        return directive;

        function link(scope, element, attrs, controller, $transclude) {
            scope.noActions = false;
            scope.activeTab = 0;
            $transclude(function (clone) {
                if (!clone.length) {
                    scope.noActions = true;
                    scope.activeTab = 1;
                }
            });
        }
    }

    analysisBarController.$inject = ['reportService', '$scope'];

    /* @ngInject */
    function analysisBarController(reportService, $scope) {
        /*jshint -W040*/
        var vm = this;
        var editingSnapshot = false;

        vm.savedSnapshots = [];
        vm.deleteSnapshot = deleteSnapshot;

        vm.setSnapshotLabel = setSnapshotLabel;
        vm.editSnapshotLabel = editSnapshotLabel;
        vm.editingSnapshotLabel = editingSnapshotLabel;
        vm.refreshSnapshots = refreshSnapshots;

        activate();

        function activate() {
            $scope.$watchCollection(reportService.getSnapshots,
                                    function (newSnapshots, oldSnapshots) {
                vm.savedSnapshots = newSnapshots;
            });
        }

        function refreshSnapshots() {
            vm.savedSnapshots = reportService.getSnapshots();
        }

        function deleteSnapshot(snapshotIndex) {
            vm.savedSnapshots = reportService.deleteSnapshot(snapshotIndex);
        }

        function setSnapshotLabel(snapshotIndex, label) {
            if (snapshotIndex >= vm.savedSnapshots.length) {
                return;
            }

            if (angular.isString(label)) {
                vm.savedSnapshots[snapshotIndex].label = label;
                reportService.setSnapshot(snapshotIndex,
                                          vm.savedSnapshots[snapshotIndex]);
            }

            editingSnapshot = false;
        }

        function editSnapshotLabel(snapshotIndex) {
            if (snapshotIndex >= vm.savedSnapshots.length) {
                return;
            }

            editingSnapshot = snapshotIndex;
        }

        function editingSnapshotLabel(snapshotIndex) {
            if (snapshotIndex === editingSnapshot) {
                return true;
            } else {
                return false;
            }
        }
    }
})();
