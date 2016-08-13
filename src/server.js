var express = require('express'),
    app     = express(),
    db      = require('./db'),
    path    = require('path');
    // reddit  = require('./reddit');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/media', function(req, res) {
  db.getMedia()
    .then(function(data) {
      console.log('Received data from getMedia');
      console.log(data);
      res.send(data);
    })
    .catch(function(err) {
      console.error('An error occurred getting media');
      res.send(err);
    });
});

app.listen(8080, function() {
  console.log('Listening on port 8080');
});