var uuid                 = require('uuid'),
    path                 = require('path'),
    rp                   = require('request-promise'),
    fsp                  = require('fs-promise'),
    through2             = require('through2'),
    db                   = require('./db'),
    gifyParse            = require('gify-parse'),
    Promise              = require('bluebird'),
    LIMIT                = require('./constants').LIMIT,
    ONE_HOUR             = 3600000,
    SUPPORTED_EXTENSIONS = {
      '.jpg' : true,
      '.png' : true,
      '.gif' : true
    };

function removeQueryString(url) {
  return url.split('?').shift();
}

function convertGifvToGif(url) {
  return url.slice(-5) === '.gifv' ? url.slice(0, -1) : url;
}

function getExtension(url) {
  var ext = path.extname(url).toLowerCase();
  ext = ext === '.jpeg' ? '.jpg' : ext;
  return ext;
}

function getMediaFromResponse(res) {
  var posts = JSON.parse(res).data.children;

  console.log('Found ' + posts.length + ' posts in Reddit response');
  return posts
    .reduce(function(agg, post) {
      var url = removeQueryString(post.data.url);
      url = convertGifvToGif(url);

      var ext = getExtension(url);

      if (SUPPORTED_EXTENSIONS[ext]) {
        agg.push({
          caption     : post.data.title,
          filename    : uuid.v4() + ext,
          extension   : ext,
          originalUrl : post.data.url,
          url         : url
        });
      }

      return agg;
    }, [])
    .slice(0, LIMIT);
}

function updateSingleExistingMedia(media) {
  console.log
  return db.exists(media.originalUrl)
    .then(function(exists) {
      if (exists) {
        return db.updateTimestamp(media.originalUrl)
          .then(function() {
            console.log(' - Updated ' + media.url)
          })
          .then(function() {
            return true;
          });
      }

      return false;
    });
}

function updateExistingMedia(media) {
  console.log('Using ' + media.length + ' posts from Reddit');
  return Promise.all(media.map(updateSingleExistingMedia))
    .then(function(exists) {
      var count = exists.reduce(function(sum, exist) {
        return exist ? sum + 1 : sum;
      }, 0);

      console.log('=== Updated ' + count + ' docs ===');

      return media.filter(function(m, i) {
        return !exists[i];
      })
    });
}

function removeOldMedia(newMedia) {
  return db.removeExcessMedia(newMedia.length)
    .then(function() {
      return newMedia;
    });
}

function addSingleNewMedia(newMedia) {
  var filepath = __dirname + '/public/img/' + newMedia.filename;

  return rp(newMedia.url, { encoding : null })
    .then(function(res) {
      return fsp.writeFile(filepath, res);
    })
    .then(function() {
      if (newMedia.extension === '.gif') {
        return fsp.readFile(filepath)
          .then(function(buffer) {
            newMedia.duration = gifyParse.getInfo(buffer).duration;
          });
      }
    })
    .then(function() {
      return db.addMedia(newMedia);
    })
    .then(function() {
      console.log(' - Added ' + newMedia.url)
    });
}

function addNewMedia(newMedia) {
  console.log('=== Adding ' + newMedia.length + ' new docs ===');
  return Promise.all(newMedia.map(addSingleNewMedia));
}

function getMedia() {
  return rp('https://www.reddit.com/r/aww.json')
    .then(getMediaFromResponse)
    .then(updateExistingMedia)
    .then(removeOldMedia)
    .then(addNewMedia)
    .finally(function() {
      console.log('Exiting');
      process.exit(0);
    });
}

getMedia();
