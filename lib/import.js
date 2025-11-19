const URL_SCHEME = /^(https?:\/\/|mailto:)/;
const INVALID_CHAR = /[^ぁ-んa-z0-9ゔ-ー]/;
const ALL_KANA_OR_ALPHA = /^([ぁ-ん0-9ゔー]+|[a-z0-9-]+)$/;

const validate = (obj) => {
  if (!obj.title) {
    throw new Error("構文エラー：タイトルが未設定");
  }
  if (!obj.author) {
    throw new Error("構文エラー：作問者が未設定");
  }
  if (!obj.author.text) {
    throw new Error("構文エラー：作問者名が未設定");
  }
  if (!obj.author.url) {
    throw new Error("構文エラー：作問者 URL が未設定");
  }
  if (!obj.problems) {
    throw new Error("構文エラー：問題が未設定");
  }

  if (typeof obj.author.url !== "string") {
    throw new Error(`作問者 URL が文字列でない：${obj.author.url}`);
  }
  if (!Array.isArray(obj.problems)) {
    throw new Error(`problems が配列でない：${obj.problems}`);
  }
  if ("shuffle" in obj && typeof obj.shuffle !== "boolean") {
    throw new Error(`shuffle が真偽値でない：${obj.shuffle}`);
  }
  if ("limit" in obj && typeof obj.limit !== "number") {
    throw new Error(`出題数が数値でない：${obj.limit}`);
  }

  if (!URL_SCHEME.test(obj.author.url)) {
    throw new Error(`作問者 URL が URL でない：${obj.author.url}`);
  }
  if ("limit" in obj && obj.limit <= 0) {
    throw new Error(`出題数が０以下：${obj.limit}`);
  }
  if (obj.problems.length <= 0) {
    throw new Error("問題が空");
  }

  obj.problems.forEach((problem, i) => {
    if (!problem.body) {
      throw new Error(`構文エラー：${i + 1} 問目の問題文が未設定`);
    }
    if (!problem.answers || !problem.displayAnswer) {
      throw new Error(`構文エラー：${i + 1} 問目の解答が未設定`);
    }
    if (!Array.isArray(problem.answers)) {
      throw new Error(`${i + 1} 問目の解答が配列でない：${problem.answers}`);
    }
    if (problem.answers.length <= 0) {
      throw new Error(`${i + 1} 問目の解答が空`);
    }
    problem.answers.forEach((answer, j) => {
      if (typeof answer !== "string") {
        throw new Error(`${i + 1} 問目の解答 ${j + 1} が文字列でない：${answer}`);
      }
      if (INVALID_CHAR.test(answer)) {
        throw new Error(`${i + 1} 問目の解答 ${j + 1} がかな・英数字でない：${answer}`);
      }
      if (!ALL_KANA_OR_ALPHA.test(answer)) {
        throw new Error(`${i + 1} 問目の解答 ${j + 1} にかな・英数字が混在：${answer}`);
      }
    });
  });
};

const importJson = (json) => {
  let obj;
  try {
    obj = JSON.parse(json.normalize());
  } catch (e) {
    throw new Error(`構文エラー：${e.message}`);
  }
  validate(obj);
  return obj;
}

const importTsv1_1 = (tsv) => {
  const table = tsv.normalize().split("\n").map((row) => row.split("\t"));

  const metadata = {
    title: table[2][1],
    author: { text: table[3][1], url: table[4][1] },
    shuffle: table[7][1] === "yes",
    limit: Number.parseInt(table[8][1]) || Infinity,
    ...(table[5][1] ? { description: table[5][1] } : {}),
    ...(table[6][1] ? { aftermessage: table[6][1] } : {}),
  };

  const problems = table.slice(13).filter((row) => (
    row[0].length > 0 && !row[0].startsWith("##")
  )).map((row) => ({
    body: row[0],
    answers: row[1].split(",").map((str) => str.trim().toLowerCase()),
    displayAnswer: row[2],
    ...(row[3] ? { explanation: row[3] } : {}),
  }));

  const obj = { ...metadata, problems };
  validate(obj);
  return obj;
};

const importTsv1_0 = (tsv) => {
  const table = tsv.normalize().split("\n").map((row) => row.split("\t"));

  const metadata = {
    title: table[3][1],
    author: { text: table[4][1], url: table[5][1] },
    ...(table[6][1] ? { description: table[6][1] } : {}),
    shuffle: table[8][1] === "yes",
  };

  const problems = table.slice(13).filter((row) => (
    row[0].length > 0
  )).map((row) => ({
    body: row[0],
    answers: row[1].split(",").map((str) => str.trim().toLowerCase()),
    displayAnswer: row[2],
    ...(row[3] ? { explanation: row[3] } : {}),
  }));

  const obj = { ...metadata, problems };
  validate(obj);
  return obj;
};
