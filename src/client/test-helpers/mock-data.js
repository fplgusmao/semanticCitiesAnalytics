/* jshint -W079 */
var mockData = (function () {
    var mockPhases = [
        { //phase 0
            type : 'questionnaire',
            questions : [{
                questionBody : 'How old are you?',
                typeOfAnswer : 'number-input'
            }]
        },{ //phase 1
            type : 'questionnaire',
            questions : [{
                questionBody : 'How old are you, again?',
                typeOfAnswer : 'number-input'
            }]
        },{
            type : 'questionnaire',
            questions : [{
                questionBody : 'How old is your mom?',
                typeOfAnswer : 'number-input'
            }]
        }
    ];
    var mockResultsByParticipant = [
        [{
            user : 0,
            phase : 0,
            answers : [
                {number : 0}
            ]
        },{
            user : 0,
            phase : 1,
            answers : [
                {number : 1}
            ]
        },{
            user : 0,
            phase : 2,
            answers : [
                {number : 2}
            ]
        }],
        [{
            user : 1,
            phase : 0,
            answers : [
                {number : 0}
            ]
        },{
            user : 1,
            phase : 1,
            answers : [
                {number : 1}
            ]
        }],
        [{
            user : 2,
            phase : 0,
            answers : [
                {number : 0}
            ]
        },
        null, //phase 1
        {
            user : 2,
            phase : 2,
            answers : [
                {number : 1}
            ]
        }]
    ];

    ////////////////////

    return {
        getMockSurveyData : getMockSurveyData,
        getNumberOfMockParticipations : getNumberOfMockParticipations,
        getNumberOfMockParticipationsForPhase :
            getNumberOfMockParticipationsForPhase,
        getMockSurveyResults : getMockSurveyResults,
        getMockSurveyResultsAsJson : getMockSurveyResultsAsJson
    };

    ////////////////////

    function getMockSurveyData() {
        return mockPhases;
    }

    function getNumberOfMockParticipations() {
        return mockResultsByParticipant.length;
    }

    function getNumberOfMockParticipationsForPhase(n) {
        var participationOnPhase = 0;

        mockResultsByParticipant.forEach(function(p) {
            /* jshint -W116 */
            if (p[n] != undefined) {
                ++participationOnPhase;
            }
        });

        return participationOnPhase;
    }

    function getMockSurveyResults() {
        return mockResultsByParticipant;
    }

    function getMockSurveyResultsAsJson() {
        var arrayOfJsonStrings = [];

        mockResultsByParticipant.forEach(function(p, n) {
            arrayOfJsonStrings[n] = JSON.stringify(p);
        });

        return arrayOfJsonStrings;
    }
})();
