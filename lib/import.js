const importTsv1_1 = (tsv) => {
  const table = tsv.split("\n").map((row) => row.split("\t"));

  const metadata = {
    title: table[2][1],
    author: { text: table[3][1], url: table[4][1] },
    shuffle: table[7][1] === "yes",
    limit: Number.parseInt(table[8][1]) || Infinity,
    ...(table[5][1] ? { description: table[5][1] } : {}),
    ...(table[6][1] ? { aftermessage: table[6][1] } : {}),
  };

  const problems = table.slice(13).filter((row) => (
    row[0].length > 0
  )).filter((row) => (
    !row[0].startsWith("##")
  )).map((row) => ({
    body: row[0],
    answers: row[1].split(",").map((str) => str.trim().toLowerCase()),
    displayAnswer: row[2],
    ...(row[3] ? { explanation: row[3] } : {}),
  }));

  return { ...metadata, problems };
};

const importTsv1_0 = (tsv) => {
  const table = tsv.split("\n").map((row) => row.split("\t"));

  const metadata = {
    title: table[3][1],
    author: { text: table[4][1], url: table[5][1] },
    shuffle: table[7][1] === "yes",
    ...(table[6][1] ? { description: table[6][1] } : {}),
  };

  const problems = table.slice(13).filter((row) => (
    row[0].length > 0
  )).map((row) => ({
    body: row[0],
    answers: row[1].split(",").map((str) => str.trim().toLowerCase()),
    displayAnswer: row[2],
    ...(row[3] ? { explanation: row[3] } : {}),
  }));

  return { ...metadata, problems };
};
