$(function() {
  var $body    = $('body'),
      $caption = $('#caption'),
      $img     = $('#main-image');

  var getImage = (function() {
    var index     = 0,
        images    = [],
        lastCall  = Date.now(),
        WAIT_TIME = 1800000;  // 30 minutes
    
    function updateImages() {
      $.getJSON('media')
        .done(function(data) {
          index  = 0;
          images = data;
          lastCall = Date.now();
        })
        .fail(function(err) {
          console.log(err);
        });
    }

    updateImages();
    setInterval(updateImages, WAIT_TIME);

    return function getImage() {
      var image;

      if (images.length) {
        image = images[index];
        index = (index + 1) % images.length;
      }

      return image;
    };
  })();

  function changeImage() {
    var caption,
        duration = 5000,
        image    = getImage();

    if (image) {
      caption = image.caption || '';
      duration = image.duration || duration;

      $body.fadeOut(250, function() {
        $caption.text(caption);

        $('img').remove();

        var img = $('<img id="main-image" class="main-image">');
        img.attr('src', 'img/' + image.filename);
        img.one('load', function() {
          $body.fadeIn(250);
        });
        img.prependTo('body');

        /*
        $img.one('load', function() {
          $body.fadeIn(250);
        }).attr('src', 'img/' + image.filename);
        */
      });
    }

    setTimeout(changeImage, duration);
  }

  changeImage();
});