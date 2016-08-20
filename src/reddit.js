var uuid                 = require('uuid'),
    path                 = require('path'),
    rp                   = require('request-promise'),
    fsp                  = require('fs-promise'),
    through2             = require('through2'),
    db                   = require('./db'),
    gifyParse            = require('gify-parse'),
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

function getMedia() {
  return rp('https://www.reddit.com/r/aww.json')
    .then(function(res) {
      var children = JSON.parse(res).data.children;
      var media = children.reduce(function(agg, child) {
        var url = removeQueryString(child.data.url);
        url = convertGifvToGif(url);

        var ext = getExtension(url);

        if (SUPPORTED_EXTENSIONS[ext]) {
          agg.push({
            caption     : child.data.title,
            filename    : uuid.v4() + ext,
            extension   : ext,
            originalUrl : child.data.url,
            url         : url
          });
        }

        return agg;
      }, []);

      media.forEach(function(chunk) {
        db.exists(chunk.originalUrl)
        .then(function(exists) {
          console.log('exists: ' + exists);
          if (exists) {
            return db.updateTimestamp(chunk.originalUrl)
              .then(function() {
                console.log('Updated ' + chunk.url)
              });
          } else {
            var filepath = __dirname + '/public/img/' + chunk.filename;
            return rp(chunk.url, { encoding : null })
              .then(function(res) {
                return fsp.writeFile(filepath, res);
              })
              .then(function() {
                if (chunk.extension === '.gif') {
                  return fsp.readFile(filepath)
                    .then(function(buffer) {
                      chunk.duration = gifyParse.getInfo(buffer).duration;
                    });
                }
              })
              .then(function() {
                return db.addMedia(chunk);
              })
              .then(function() {
                console.log('Added ' + chunk.url)
              });
          }
        })
        .catch(function(err) {
          console.error('An error occurred with ' + chunk.originalUrl + ': ' + err);
        });
      });
    });
}

getMedia();
setInterval(getMedia, ONE_HOUR);
