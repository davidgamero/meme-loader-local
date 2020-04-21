const fs = require('fs');

function getMemesFromLocal() {
  let raw = fs.readFileSync('memedump.json', 'utf8');
  let memes10k = JSON.parse(raw);
  return memes10k;
}

function getMemes10kFromLocal() {
  let raw = fs.readFileSync('memedump_10k.json', 'utf8');
  let memes10k = JSON.parse(raw);
  return memes10k;
}



module.exports = {
  getMemesFromLocal,
  getMemes10kFromLocal
}