var AWS = require("aws-sdk");
const fs = require('fs');

const { getMemes10kFromLocal } = require("./localMemes");

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


loadMemes();
//phaseUpdateTest();

async function phaseUpdateTest() {
  let result = await pullMemes(PHASE_1, 100);
  let memes = result.Items;
  console.log(memes);

  await Promise.all(memes.map((m) => setMemePhase(m, PHASE_2)));
}

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


async function pullAllMemes(phase, lastEvalKey) {
  let params = {
    TableName: TABLE_NAME,
    IndexName: "phase-date-index",
    ExpressionAttributeValues: {
      ":phase0": phase,
    },
    KeyConditionExpression: 'phase = :phase0',
    Limit: MEMES_PER_PULL,
  };


  let allMemes = [];
  let continuePulling = true;

  while (continuePulling) {
    let p = ddb.query(params).promise();

    let result = await p;

    allMemes = allMemes.concat(result.Items);

    console.log(`${result.LastEvaluatedKey ? 'LastEvaluatedKey: ' + result.LastEvaluatedKey.date + ' ' : ''} ${'MemesQueried: ' + allMemes.length}`);

    if (!result.LastEvaluatedKey) {
      continuePulling = false;
    } else {
      params.ExclusiveStartKey = result.LastEvaluatedKey;
    }
  }

  return allMemes;
};

function pullMemes(phase, limit) {
  return new Promise((resolve, reject) => {
    let pullLimit = limit;
    let params = {
      TableName: TABLE_NAME,
      IndexName: "phase-date-index",
      // ExpressionAttributeNames: {
      //   "#n": "name",
      // },
      ExpressionAttributeValues: {
        ":phase0": phase,
      },
      KeyConditionExpression: 'phase = :phase0',
      Limit: pullLimit,
    };

    console.log('Running query');

    let p = ddb.query(params, function (err, data) {
      if (err) {
        console.log("Error", err);
        reject(err);
      } else {
        //console.log("Success", data);
        // data.Items.map(function (element) {
        //   console.log(element);
        // });
        resolve(data);
      }
    });
  });
}

/**
 * Update meme phase field in DynamoDB
 * @param {*} targetMeme 
 * @param {*} text 
 */
async function setMemePhase(targetMeme, phase) {
  let params = {
    TableName: TABLE_NAME,
    Key: {
      name: targetMeme.name,
      date: targetMeme.date
    },
    UpdateExpression: 'set #p = :p,lastPhaseUpdate = :lastPhaseUpdate',
    ExpressionAttributeValues: {
      ':p': phase,
      ':lastPhaseUpdate': Date.now(),
    },
    ExpressionAttributeNames: {
      '#p': 'phase',
    },
    ReturnValues: 'ALL_NEW',
  };

  console.log(params);

  let response = await ddb.update(params).promise();

  console.log('Updated phase for ' + targetMeme.name + ' to ' + phase);
  return response;
}