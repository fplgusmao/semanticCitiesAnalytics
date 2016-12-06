(function () {
    'use strict';
    angular
        .module('scaApp.core')
        .factory('surveyPreviewer', surveyPreviewer);

    surveyPreviewer.$inject = ['surveyDataService', 'phraseNormalizer'];

    /* @ngInject */
    function surveyPreviewer(surveyDataService, phraseNormalizer) {
        var exports = {
            getPhasePreview: getPhasePreview
        };

        return exports;

        ////////////////

        /**
         * Returns a human-readable summary of the data from the specified
         * phase
         */
        function getPhasePreview(phaseNumber) {
            var targetPhase = surveyDataService.getPhase(phaseNumber);
            var typeAsCamel = phraseNormalizer.toCamelCase(targetPhase.type);
            var phasePreview = printPhase(targetPhase);

            return phasePreview;
        }

        //////////////// helpers

        function printPhase(phase) {
            var phasePrinter = {
                surveyInformation : surveyInformationPrinter,
                questionnaire : questionnairePrinter,
                pointAPlace : mapInteractionPrinter,
                pointMultiplePlaces : mapInteractionPrinter,
                drawArea : mapInteractionPrinter,
                drawMultipleAreas : drawMultipleAreasPrinter
            };

            var typeAsCamel = phraseNormalizer.toCamelCase(phase.type);

            return phasePrinter[typeAsCamel](phase);
        }

        function surveyInformationPrinter(phaseData) {
            var phaseInfo = {};

            phaseInfo.phaseType = {
                description : 'Type of this phase',
                value : phraseNormalizer.toHumanFromDashed(
                    phaseData.type, true, true)
            };

            phaseInfo.phaseTitle = {};
            if (typeof(phaseData.title) !== 'undefined') {
                phaseInfo.phaseTitle.description = 'Title of this phase';
                phaseInfo.phaseTitle.value = phaseData.title;
            } else {
                phaseInfo.phaseTitle.description = 'This phase has no title';
            }

            phaseInfo.phaseContent = {
                description : 'Information on this phase',
                values : []
            };

            phaseData.description.forEach(function(paragraph) {
                phaseInfo.phaseContent.values.push(paragraph);
            });

            if (phaseData.nextSteps &&
                phaseData.nextSteps.length > 0) {
                phaseInfo.phaseContent.values.push(
                    'NEXT PHASES: ' + phaseData.nextSteps);
            }

            return phaseInfo;
        }

        function questionnairePrinter(phaseData) {
            var phaseInfo = {};

            phaseInfo.phaseType = {
                description : 'Type of this phase',
                value : phraseNormalizer.toHumanFromDashed(
                    phaseData.type, true, true)
            };

            phaseInfo.phaseTitle = {};
            if (typeof(phaseData.title) !== 'undefined') {
                phaseInfo.phaseTitle.description = 'Title of this phase';
                phaseInfo.phaseTitle.value = phaseData.title;
            } else {
                phaseInfo.phaseTitle.description = 'This phase has no title';
            }

            phaseInfo.phaseContent = {
                description : 'Questions in this phase',
                values : []
            };

            phaseData.questions.forEach(function (question, n) {
                var questionSummary = 'Question number ' + n;

                var typeOfAnswer = phraseNormalizer.toHumanFromDashed(
                    question.answer.typeOfAnswer, true, true);
                questionSummary += ' [Type of answer: ' +
                    typeOfAnswer + ']' + ': ';

                questionSummary += '"' + question.questionBody + '"';

                //TODO: deep summary, e.g: options for 'choose-one'

                phaseInfo.phaseContent.values.push(questionSummary);
            });

            return phaseInfo;
        }

        function mapInteractionPrinter(phaseData) {
            var phaseInfo = {};

            phaseInfo.phaseType = {
                description : 'Type of this phase',
                value : phraseNormalizer.toHumanFromDashed(
                    phaseData.type, true, true)
            };

            phaseInfo.phaseTitle = {};
            if (typeof(phaseData.title) !== 'undefined') {
                phaseInfo.phaseTitle.description = 'Title of this phase';
                phaseInfo.phaseTitle.value = phaseData.title;
            } else {
                phaseInfo.phaseTitle.description = 'This phase has no title';
            }

            phaseInfo.phaseContent = {
                description : 'Description and instructions on this phase',
                values : []
            };

            phaseInfo.phaseContent.values.push('[Phase Description]');
            phaseInfo.phaseContent.values =
                phaseInfo.phaseContent.values.concat(phaseData.description);

            phaseInfo.phaseContent.values.push(
                '[Instructions in this phase]');
            phaseInfo.phaseContent.values =
                phaseInfo.phaseContent.values.concat(phaseData.instructions);

            return phaseInfo;
        }

        function drawMultipleAreasPrinter(phaseData) {
            var phaseInfo = {};

            phaseInfo.phaseType = {
                description : 'Type of this phase',
                value : phraseNormalizer.toHumanFromDashed(
                    phaseData.type, true, true)
            };

            phaseInfo.phaseTitle = {};
            if (typeof(phaseData.title) !== 'undefined') {
                phaseInfo.phaseTitle.description = 'Title of this phase';
                phaseInfo.phaseTitle.value = phaseData.title;
            } else {
                phaseInfo.phaseTitle.description = 'This phase has no title';
            }

            phaseInfo.phaseContent = {
                description : 'Description, instructions, and areas to draw',
                values : []
            };

            phaseInfo.phaseContent.values.push('[Phase Description]');
            phaseInfo.phaseContent.values =
                phaseInfo.phaseContent.values.concat(phaseData.description);

            phaseInfo.phaseContent.values.push(
                '[Instructions in this phase]');
            phaseInfo.phaseContent.values =
                phaseInfo.phaseContent.values.concat(phaseData.instructions);

            var areasToDraw = '[Areas to draw]';
            phaseData.subPhases.forEach(function (area, i) {
                if (i !== 0) {
                    areasToDraw += ',';
                }
                areasToDraw += ' ' + area.name;
            });
            phaseInfo.phaseContent.values.push(areasToDraw);

            return phaseInfo;
        }
    }
})();
