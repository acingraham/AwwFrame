// Had to run mongod to start mongo

var pmongo = require('promised-mongo'),
    db     = pmongo('awwFrame', ['media']),
    fields = {
      _id      : 0,
      caption  : 1,
      duration : 1,
      filename : 1
    };

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
  return db.media.find({}, fields).sort({ts: -1}).limit(25);
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

updateTimestamp();

module.exports = {
  addMedia        : addMedia,
  exists          : exists,
  getMedia        : getMedia,
  updateTimestamp : updateTimestamp
};
