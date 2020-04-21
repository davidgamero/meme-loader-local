
async function loadMemes() {

  //let newMemesData = await pullAllMemes(PHASE_1);
  //fs.writeFile('memedump.json', newMemesData, 'utf8', () => console.log('done'));
  let raw = fs.readFileSync('memedump_10k.json', 'utf8');
  let newMemes = JSON.parse(raw);

  console.log('Queried ' + newMemes.length + ' memes with phase ' + PHASE_1);

  let noTextCount = 0;
  let filterFail10k = [];

  let newMemes_10k = newMemes.filter(e => {
    if (!e.text) {
      noTextCount++;
      return false;
    };

    e.text = e.text.toLowerCase();

    let meme_text = e.text.split(' ');
    for (i = 0; i < meme_text.length; i++) {
      if (GOOGLE10K.includes(meme_text[i])) {
        return true;
      }
    };
    filterFail10k.push(e.text);
    return false;
  })

  //fs.writeFile('memedump_10k.json', JSON.stringify(newMemes_10k), 'utf8', () => console.log('wrote 10k json file'));

  newMemes_10k;
  console.log(`Kept ${newMemes_10k.length} memes after 10k filtering`);

  //searchWord('poop', MEMES);
  return newMemes_10k;
}