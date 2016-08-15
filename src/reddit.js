var uuid      = require('uuid'),
    path      = require('path'),
    fs        = require('fs'),
    request   = require('request'),
    through2  = require('through2'),
    db        = require('./db'),
    Promise   = require('bluebird'),
    gifyParse = require('gify-parse'),
    ONE_HOUR  = 3600000;

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
  request
    .get('https://www.reddit.com/r/aww.json')
    .pipe(through2.obj(
      function(chunk, enc, done) {
        this.response = this.response || '';
        this.response += chunk;
        done();
      },
      function(done) {
        var outStream = this;
        JSON.parse(this.response).data.children.forEach(function(child) {
          outStream.push({
            caption : child.data.title,
            originalUrl: child.data.url
          });
        });
        done();
      }
    ))
    .pipe(through2.obj(function(chunk, enc, done) {
      var url = removeQueryString(chunk.originalUrl);
      url = convertGifvToGif(url);
      var ext = getExtension(url);

      chunk.extension = ext;

      if (ext === '.jpg' || ext === '.png' || ext === '.gif') {
        chunk.url = url;
        chunk.filename = uuid.v4() + ext;
        console.log('Adding ' + chunk.url);
        this.push(chunk);
      }

      done();
    }))
    .pipe(through2.obj(function(chunk, enc, done) {
      db.exists(chunk.originalUrl)
        .then(function(exists) {
          console.log('exists: ' + exists);
          if (exists) {
            db.updateTimestamp(chunk.originalUrl);
          } else {
            var filepath = __dirname + '/public/img/' + chunk.filename;
            var writeStream = fs.createWriteStream(filepath);
            writeStream.on('finish', function() {
              if (chunk.extension === '.gif') {
                // TODO - Make async
                var buffer = fs.readFileSync(filepath);
                chunk.duration = gifyParse.getInfo(buffer).duration; 
              }

              db.addMedia(chunk);
            });

            request.get(chunk.url)
              .pipe(writeStream);
          }
          done();
        });

    }));
}

getMedia();
setInterval(getMedia, ONE_HOUR);
