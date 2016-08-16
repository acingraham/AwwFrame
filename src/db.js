// Had to run mongod to start mongo

var pmongo = require('promised-mongo'),
    db     = pmongo('awwFrame', ['media']),
    fs     = require('fs'),
    fields = {
      _id      : 0,
      caption  : 1,
      duration : 1,
      filename : 1
    },
    LIMIT = 25;

function addMedia(media) {
  console.log('Inserting');
  media.ts = Date.now();
  return db.media.insert(media);
}

function exists(originalUrl) {
  return db.media.count({
    originalUrl : originalUrl
  })
  .then(function(count) {
    return count > 0;
  });
}

function getMedia() {
  return db.media.find({}, fields).sort({ts: -1}).limit(LIMIT);
}

function removeExcessMedia() {
  return db.media.find(
    {},
    {
      _id      : 0,
      filename : 1,
      ts       : 1
    }
  )
  .sort({
    ts : -1
  })
  .then(function(results) {
    var removeList = results.slice(LIMIT);

    console.log('Removing ' + removeList.length + ' docs');

    if (!removeList.length) {
      return;
    }

    removeList.forEach(function(doc) {
      var path = __dirname + '/public/img/' + doc.filename;
      console.log('Deleting ' + path);
      fs.unlinkSync(path);
    });

    var oldestTime = results.shift().ts;
    return db.media.remove({
      ts : {
        $lte : oldestTime
      }
    });
  });
}

function updateTimestamp(originalUrl) {
  return db.media.update(
    {
      originalUrl : originalUrl
    },
    {
      $set : {
        ts : Date.now()
      }
    }
  );
}

module.exports = {
  addMedia          : addMedia,
  exists            : exists,
  getMedia          : getMedia,
  removeExcessMedia : removeExcessMedia,
  updateTimestamp   : updateTimestamp
};
