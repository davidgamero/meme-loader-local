function getMemes10kFromLocal() {
  let raw = fs.readFileSync('memedump_10k.json', 'utf8');
  let memes10k = JSON.parse(raw);
  return memes10k;
}

module.exports = { getMemes10kFromLocal }