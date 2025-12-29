const TICK_INTERVAL = 125; /* msec */
const INPUT_TIMER   = 5999; /* msec */
const BS_PENALTY    = 200; /* msec */
const PIE_DASHARRAY = 63;
const IS_TOUCH = "ontouchstart" in window;

/* DESTRUCTIVE: Shuffle an array. */
const shuffleArray = (array) => {
  for (var i = array.length - 1; i > 0; i--) {
    var r = Math.floor(Math.random() * (i + 1));
    var tmp = array[i];
    array[i] = array[r];
    array[r] = tmp;
  }
};

/* () => Promise<Problems> */
const loadProblems = () => (
  new Promise((resolve, reject) => {
    const match = location.href.match(/\?(.+)$/);
    const url = match ? `https://${match[1]}` : "problems.json";
    const cachebuster = (/\?/.test(url) ? "&" : "?") + (new Date()).getTime();
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      try {
        if (xhr.status >= 400) {
          return reject(new Error(`通信エラー：コード ${xhr.status}`));
        }
        if (xhr.responseText.startsWith("作問テンプレートv1.0")) {
          return resolve(importTsv1_0(xhr.responseText));
        } else if (xhr.responseText.startsWith("作問テンプレートv1.1")) {
          return resolve(importTsv1_1(xhr.responseText));
        } else {
          return resolve(importJson(xhr.responseText));
        }
      } catch (e) {
        return reject(new Error(e.message));
      }
    };
    xhr.onerror = () => {
      reject(new Error("URL が不正、またはオフライン？"));
    };
    xhr.open("GET", url + cachebuster, true);
    xhr.send(null);
  })
);

const STATES = {
  INTRO: 0,
  READING: 1,
  INPUT: 2,
  CORRECT: 3,
  ERROR: 4,
  RESULT: 5,
};

const SOUNDS = {
  ANSWER: loadAudio("./assets/answer.mp3"),
  CORRECT: loadAudio("./assets/correct.mp3"),
  PROBLEM: loadAudio("./assets/problem.mp3"),
  TIMER: loadAudio("./assets/timer.mp3"),
  WRONG: loadAudio("./assets/wrong.mp3"),
  COMPLETED: loadAudio("./assets/completed.mp3"),
  KEY: loadAudio("./assets/key.mp3"),
};

const data = {
  problems: null,
  problemsCount: 0,
  loadError: null,
  loadingStatus: "問題データを読み込み中 ...",
  enableSound: true,
  /* game */
  state: STATES.INTRO,
  score: 0,
  correctCount: 0,
  history: [],
  /* problem */
  problemId: 0,
  scoreDiff: 200,
  displayedProblem: "",
  pendingProblem: "",
  /* input */
  alphaInput: "",
  kanaInput: ["", ""],
  alphaCorrect: false,
  kanaCorrect: false,
  inputTimer: INPUT_TIMER,
  bsCount: 0,
  inputTimerHistory: [],
};

const vm = new Vue({
  el: "#app",
  data,
  mounted: function () {
    setInterval(this.tick, TICK_INTERVAL);
    window.addEventListener("keydown", (e) => vm.keyDown(e.key));
    this.loadProblems();
  },
  watch: {
    state: function () {
      /* fixme */
      setTimeout(() => window.scrollTo(0, 0), 30);
    },
  },
  computed: {
    shareUrl: function () {
      return "https://x.com/intent/tweet?text=" +
             this.problems.title + "で" + this.score + "点を獲得した！" +
             "（正答数" + this.correctCount + "/" + this.problemsCount + "）" +
             location.href + " %23publiQa";
    },
    progressBG: function () {
      const c = this.state === STATES.READING ? "#DA5019" : "#EDAD0B";
      const p = this.scoreDiff / 2;
      return (
        `linear-gradient(to right,#edad0b 0%,#edad0b 50%,${c} 50%,${c} ${p}%,#fff ${p}%)`
      );
    },
    pieStyle: function () {
      // https://zenn.dev/perokichi/articles/21df4852a9b25f
      const p = Math.max(0, this.inputTimer - 1000) / Math.max(INPUT_TIMER - 1000);
      return {
        strokeDasharray: PIE_DASHARRAY,
        strokeDashoffset: PIE_DASHARRAY + PIE_DASHARRAY * p,
      };
    },
  },
  filters: {
    toShareUrlCorrect: function (problem) {
      return "https://x.com/intent/tweet?text=" +
             "「" + problem + "」に正解した！" + location.href + " %23publiQa";
    },
    toShareUrlWrong: function (problem) {
      return "https://x.com/intent/tweet?text=" +
             "「" + problem + "」に正解できなかった😭" + location.href + " %23publiQa";
    },
  },
  methods: {
    playAudio: function (audio) {
      if (this.enableSound) {
        playAudio(audio);
      }
    },
    loadProblems: async function () {
      try {
        const problems = await loadProblems();
        vm.problems = problems;
        vm.problemsCount = Math.min(problems.limit ?? Infinity, problems.problems.length);
        document.title = problems.title;
      } catch (e) {
        vm.loadError = e.message;
      }
    },
    monitorLoadingStatus: function () {
      if (this.problems) {
        const audios = Object.values(SOUNDS);
        const loadingAudios = audios.filter((audio) => audio.loading).length;
        if (loadingAudios > 0) {
          this.loadingStatus = `効果音を読み込み中 (残り ${loadingAudios}) ...`;
        } else {
          this.loadingStatus = null;
        }
      }
    },
    initGame: function () {
      if (this.problems.shuffle) {
        shuffleArray(this.problems.problems);
      }
      this.score = 0;
      this.correctCount = 0;
      this.history = [];
      this.initProblem(0);
    },
    initProblem: function (problemId) {
      this.playAudio(SOUNDS.PROBLEM);
      this.problemId = problemId;
      this.scoreDiff = 200;
      this.displayedProblem = "";
      this.pendingProblem = "問題:  " + this.problems.problems[problemId].body;
      this.state = STATES.READING;
    },
    revealProblem: function () {
      if (this.pendingProblem) {
        this.displayedProblem = this.displayedProblem + this.pendingProblem[0];
        this.pendingProblem = this.pendingProblem.slice(1);
        const total = this.problems.problems[this.problemId].body.length;
        this.scoreDiff = 100 + Math.round(this.pendingProblem.length / total * 100);
      } else {
        this.startInput();
      }
    },
    stopProblem: function () {
      this.playAudio(SOUNDS.ANSWER);
      this.playAudio(SOUNDS.TIMER);
      this.inputTimer = INPUT_TIMER;
      this.alphaInput = "";
      this.kanaInput = ["", ""];
      this.alphaCorrect = this.kanaCorrect = false;
      this.inputTimerHistory = [];
      this.bsCount = 0;
      this.state = STATES.INPUT;
    },
    processInput: function (key) {
      stopAudio(SOUNDS.TIMER);
      this.playAudio(SOUNDS.KEY);
      this.inputTimerHistory = this.inputTimerHistory.concat(this.inputTimer);
      this.inputTimer = INPUT_TIMER;
      this.bsCount = Math.max(0, this.bsCount - 1);
      this.kanaInput = inputRomaji(this.kanaInput, key);
      this.alphaInput = this.alphaInput.concat(key);
      this.kanaCorrect = this.problems.problems[this.problemId].answers.some(
        (ans) => ans === vm.kanaInput[0]
      );
      this.alphaCorrect = this.problems.problems[this.problemId].answers.some(
        (ans) => ans === vm.alphaInput
      );
      if (this.kanaCorrect || this.alphaCorrect) {
        this.inputCorrect();
      }
    },
    processBackspace: function () {
      if (this.alphaInput === "") {
        return;
      }
      this.playAudio(SOUNDS.KEY);
      stopAudio(SOUNDS.TIMER);
      this.bsCount += 1;
      this.alphaInput = this.alphaInput.slice(0, -1);
      this.kanaInput = batchInputRomaji(this.alphaInput);
      const timeSpent = INPUT_TIMER - this.inputTimer;
      const penalty = this.bsCount * BS_PENALTY;
      this.inputTimer = Math.max(
        0,
        this.inputTimerHistory[this.inputTimerHistory.length - 1] - timeSpent - penalty
      );
      this.inputTimerHistory = this.inputTimerHistory.slice(0, -1);
    },
    inputCountDown: function () {
      this.inputTimer -= TICK_INTERVAL;
      if (this.inputTimer <= 0) {
        this.inputTimer = 0;
        this.inputError();
      }
    },
    inputCorrect: function () {
      this.playAudio(SOUNDS.CORRECT);
      this.history = this.history.concat([{
        problem: this.displayedProblem + (this.pendingProblem === "" ? "" : "/"),
        correct: true,
      }]);
      this.score += this.scoreDiff;
      this.correctCount += 1;
      this.state = STATES.CORRECT;
    },
    inputError: function () {
      if (this.kanaInput[0] !== "" || this.alphaInput !== "" || this.pendingProblem !== "") {
        this.playAudio(SOUNDS.WRONG);
      }
      this.history = this.history.concat([{
        problem: this.displayedProblem + (this.pendingProblem === "" ? "" : "/"),
        correct: false,
      }]);
      this.state = STATES.ERROR;
    },
    nextProblem: function () {
      if (this.problemId + 1 < this.problemsCount) {
        this.initProblem(this.problemId + 1);
      } else {
        this.playAudio(SOUNDS.COMPLETED);
        this.state = STATES.RESULT;
      }
    },
    backToIntro: function () {
      this.state = STATES.INTRO;
    },
    keyDown: function (key) {
      if (this.state === STATES.INTRO && !this.loadingStatus && key === " ") {
        this.initGame();
      } else if (this.state === STATES.READING && key === " ") {
        this.stopProblem();
      } else if (this.state === STATES.INPUT) {
        if (key.match(/^[a-z0-9-]$/)) {
          this.processInput(key);
        } else if (key === "Backspace") {
          this.processBackspace();
        }
      } else if ((this.state === STATES.ERROR || this.state === STATES.CORRECT) && key === " ") {
        this.nextProblem();
      } else if (this.state === STATES.RESULT && key === " ") {
        this.backToIntro();
      }
    },
    tick: function () {
      if (this.loadingStatus) {
        this.monitorLoadingStatus();
      } else if (this.state === STATES.READING) {
        this.revealProblem();
      } else if (this.state === STATES.INPUT) {
        this.inputCountDown();
      }
    },
  }
});
