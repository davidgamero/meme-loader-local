var AWS = require("aws-sdk");
const fs = require('fs');
const request = require('request');

const sharp = require("sharp");

const tf = require('@tensorflow/tfjs');
const tfnode = require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');

const { getMemes10kFromLocal } = require("./localMemes");
const { downloadRemoteMemes } = require("./remoteMemes");

console.log(getMemes10kFromLocal)

var credentials = new AWS.SharedIniFileCredentials({ profile: 'meme-loader' });
AWS.config.credentials = credentials;
AWS.config.region = 'us-east-1';

var ddb = new AWS.DynamoDB.DocumentClient();

let TABLE_NAME = "meme_engine";

let PHASE_0 = "00";
let PHASE_1 = "01";
let PHASE_2 = "02";

let MEMES_PER_PULL = 5000;

GOOGLE10K = [];

MEMES = [];

// Load the most common words list
let g10kRaw = fs.readFileSync('google-10000-english-usa.txt', 'utf-8', (err) => {
  if (err) throw err;
});

GOOGLE10K = g10kRaw.toString().split('\n');
console.log('Loaded Google10k wordlist');

MEMES = getMemes10kFromLocal();

let num_samples = 1000;
let memes_sample = MEMES.slice(1, num_samples + 1);

console.log(memes_sample);


var download = function (uri, filename, callback) {
  return new Promise(function (resolve, reject) {
    request.head(uri, function (err, res, body) {
      //console.log('content-type:', res.headers['content-type']);
      //console.log('content-length:', res.headers['content-length']);

      request(uri).pipe(fs.createWriteStream(filename)).on('close', resolve);
    });
  })
};
let localImageDir = 'img';

let num_downloaded = 0;
// memes_sample.forEach(async function (meme) {
//   let localPath = `${localImageDir}/${meme.name}.${meme.extension}`;
//   await download(meme.url, localPath);
//   num_downloaded += 1;

//   console.log(`Downloading ${num_samples} samples ${100 * num_downloaded / num_samples}%`);
// });

async function fileToTensor(filename) {
  const { data, info } = await sharp(filename)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return imageToTensor(data, info);
}

const imageToTensor = (pixelData, imageInfo) => {
  const outShape = [1, imageInfo.height, imageInfo.width, imageInfo.channels];

  return tf.tidy(() =>
    tf
      .tensor4d(pixelData, outShape, "int32")
      .toFloat()
      .resizeBilinear([224, 224])
      .div(tf.scalar(127))
      .sub(tf.scalar(1))
  );
};

async function recognize() {
  const modelCoco = await cocoSsd.load();

  let meme = memes_sample[0];
  const imageBuffer = fs.readFileSync(`${localImageDir}/${meme.name}.${meme.extension}`);
  const tfimage = tfnode.node.decodeImage(imageBuffer);
  let predictions = await modelCoco.detect(tfimage);
  console.log(predictions);
  return 1
}

recognize().catch(function (e) { console.log(e) })



function searchWord(searchWord, MEMES) {
  searchWord = searchWord.toLowerCase();

  let hits = MEMES.filter(m => {
    let meme_text = m.text.split(' ');
    for (i = 0; i < meme_text.length; i++) {
      if (meme_text[i].includes(searchWord)) {
        return true;
      }
    };
    return false;
  })
  console.log(`Found ${hits.length} matches for '${searchWord}'`);
}