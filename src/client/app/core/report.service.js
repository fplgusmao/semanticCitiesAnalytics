(function () {
    'use strict';
    angular
        .module('scaApp.core')
        .factory('reportService', reportService);

    reportService.$inject = [];

    /* @ngInject */
    function reportService() {
        var snapshots = [];

        var exports = {
            getSnapshots : getSnapshots,
            addSnapshot : addSnapshot,
            setSnapshot : setSnapshot,
            deleteSnapshot : deleteSnapshot,
            resultsAbleForCorrelation : resultsAbleForCorrelation
        };

        return exports;

        ////////////////

        function getSnapshots() {
            return snapshots;
        }

        function addSnapshot(snap) {
            snapshots.push(snap);
        }

        function setSnapshot(snapshotIndex, snapshot) {
            if (snapshotIndex >= snapshots.length) {
                return;
            }

            snapshots[snapshotIndex] = snapshot;
        }

        /**
         * Deletes snapshot with the provided index, and returns the
         * updated array of snapshots.
         * @param   {number} snapshotIndex Index of the snapshot
         * @returns {Array} Resulting array of snapshots
         */
        function deleteSnapshot(snapshotIndex) {
            if (snapshotIndex >= snapshots.length) {
                return;
            }

            var targetSnapshot = snapshots[snapshotIndex];

            if (targetSnapshot.src) {
                var urlManager = window.URL || window.webkitURL;
                urlManager.revokeObjectURL(targetSnapshot.src);
            }

            snapshots.splice(snapshotIndex, 1);

            return snapshots;
        }

        function resultsAbleForCorrelation(snapshot) {
            return angular.isDefined(snapshot) &&
                angular.isDefined(snapshot.correlatable) &&
                angular.isArray(snapshot.correlatable.participations) &&
                snapshot.correlatable.participations.length > 0 &&
                angular.isArray(snapshot.correlatable.phases) &&
                snapshot.correlatable.phases.length > 0;
        }
    }
})();
