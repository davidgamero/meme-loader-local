async function downloadRemoteMemes() {
  let newMemesData = await pullAllMemes(PHASE_1);
  fs.writeFile('memedump.json', newMemesData, 'utf8', () => console.log('done'));

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

module.exports = {
  downloadRemoteMemes
}