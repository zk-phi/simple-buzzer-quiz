var TICK_INTERVAL = 100; /* msec */
var INPUT_TIMER   = 50; /* ticks */

var STATES = {
    INTRO: 0,
    READING: 1,
    INPUT: 2,
    CORRECT: 3,
    ERROR: 4,
    RESULT: 5,
};

var vm = new Vue({
    el: "#app",
    data: {
        /* game */
        state: STATES.INTRO,
        correct: 0,
        error: 0,
        score: 0,
        scoreDiff: 0,
        problems: null,
        loadError: false,
        /* problem */
        problemId: null,
        displayedProblem: null,
        pendingProblem: null,
        /* input */
        kanaInput: null,
        alphaInput: null,
        pendingInput: null,
        alphaError: null,
        alphaCorrect: null,
        kanaError: null,
        kanaCorrect: null,
        inputTimer: null,
    },
    mounted: function () {
        this.keyListenerObj = function (e) { vm.keyDown(e.key) };
        this.timerObj = setInterval(this.tick, TICK_INTERVAL);
        window.addEventListener('keydown', this.keyListenerObj);
        // ---- load problems.json
        var match = location.href.match(/\?(.+)$/);
        var xhr   = new XMLHttpRequest();
        xhr.onload = function () { vm.problems = JSON.parse(xhr.responseText); };
        xhr.onerror = function () { vm.loadError = true; };
        xhr.open("GET", match ? match[1] : "problems.json", true);
        xhr.send(null);
    },
    methods: {
        initGame: function () {
            this.state = STATES.INTRO;
            this.correct = this.error = this.score = 0;
        },
        initProblem: function (problemId) {
            this.state = STATES.READING;
            this.problemId = problemId;
            this.displayedProblem = "";
            this.pendingProblem = this.problems.problems[problemId].body;
            this.kanaInput = this.alphaInput = this.pendingInput = "";
            this.alphaError = this.kanaError = this.alphaCorrect = this.kanaCorrect = false;
            this.inputTimer = INPUT_TIMER;
        },
        inputCorrect: function () {
            var total = this.problems.problems[this.problemId].body.length;
            var pending = this.pendingProblem.length;
            var diff = 100 + Math.floor(pending / total * 100);
            this.correct += 1;
            this.score += diff;
            this.scoreDiff = diff;
            this.displayedProblem += this.pendingProblem;
            this.state = STATES.CORRECT;
        },
        inputError: function () {
            this.error += 1;
            this.scoreDiff = 0;
            this.displayedProblem += this.pendingProblem;
            this.state = STATES.ERROR;
        },
        keyDown: function (key) {
            if (this.state === STATES.INTRO && key === " ") {
                this.initProblem(0);
                return;
            }
            if (this.state === STATES.READING && key === " ") {
                this.state = STATES.INPUT;
                if (this.pendingProblem) {
                    this.displayedProblem += "/";
                }
                return;
            }
            if (this.state === STATES.INPUT) {
                if (!this.kanaError && key.match(/^[a-z-]$/)) {
                    var v = ROMAJI[this.pendingInput.concat(key)];
                    if (v) {
                        this.kanaInput = this.kanaInput.concat(v[0]);
                        this.pendingInput = v[1];
                        this.inputTimer = INPUT_TIMER;
                        var kanaIsValid = this.problems.problems[this.problemId].answers.some(function (ans) {
                            return ans.match("^" + vm.kanaInput);
                        });
                        if (!kanaIsValid) {
                            this.kanaError = true;
                        }
                        var kanaIsCorrect = this.problems.problems[this.problemId].answers.some(function (ans) {
                            return ans === vm.kanaInput;
                        });
                        if (kanaIsCorrect) {
                            this.kanaCorrect = true;
                            this.inputCorrect();
                        }
                    } else {
                        this.pendingInput += key;
                        this.kanaError = true;
                    }
                }
                if (!this.alphaError && key.match(/^[0-9a-z]$/)) {
                    this.alphaInput = this.alphaInput.concat(key);
                    this.inputTimer = INPUT_TIMER;
                    var alphaIsValid = this.problems.problems[this.problemId].answers.some(function (ans) {
                        return ans.match("^" + vm.alphaInput);
                    });
                    if (!alphaIsValid) {
                        this.alphaError = true;
                    }
                    var alphaIsCorrect = this.problems.problems[this.problemId].answers.some(function (ans) {
                        return ans === vm.alphaInput;
                    });
                    if (alphaIsCorrect) {
                        this.alphaCorrect = true;
                        this.inputCorrect();
                    }
                }
                if (this.kanaError && this.alphaError) {
                    this.inputError();
                }
                return;
            }
            if ((this.state === STATES.ERROR || this.state === STATES.CORRECT) && key === " ") {
                this.scoreDiff = 0;
                if (this.problemId + 1 < this.problems.problems.length) {
                    this.initProblem(this.problemId + 1);
                } else {
                    this.state = STATES.RESULT;
                }
                return;
            }
            if (this.state === STATES.RESULT && key === " ") {
                this.initGame();
                return;
            }
        },
        tick: function () {
            if (this.state === STATES.READING) {
                if (this.pendingProblem) {
                    this.displayedProblem = this.displayedProblem + this.pendingProblem[0];
                    this.pendingProblem = this.pendingProblem.slice(1);
                } else {
                    this.state = STATES.INPUT;
                }
                return;
            }
            if (this.state === STATES.INPUT) {
                this.inputTimer -= 1;
                if (!this.inputTimer) {
                    this.inputError();
                }
                return;
            }
        }
    }
});
