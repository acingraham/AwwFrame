// Had to run mongod to start mongo

var pmongo = require('promised-mongo'),
    db     = pmongo('awwFrame', ['media']),
    fs     = require('graceful-fs'),
    fields = {
      _id      : 0,
      caption  : 1,
      duration : 1,
      filename : 1
    },
    LIMIT = require('./constants').LIMIT;

function addMedia(media) {
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

function removeExcessMedia(newMediaCount) {
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
    var removeList = results.slice(Math.max(0, LIMIT - newMediaCount));

    console.log('=== Removing ' + removeList.length + ' docs ===');

    if (!removeList.length) {
      return;
    }

    removeList.forEach(function(doc) {
      var path = __dirname + '/public/img/' + doc.filename;
      console.log(' - Deleting ' + path);
      fs.unlinkSync(path);
    });

    var docsToRemove = removeList.map(function(item) {
      return {
        filename : item.filename
      };
    });

    return db.media.remove({
      $or : docsToRemove
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
