#!/usr/bin/env node
var argv = require('optimist').argv,
    db = require('dirty')('db/images.db'),
    http = require('http'),
    fs = require('fs');

var trace_requests = false;
var initial_save = true;

var port = argv.port || 80;
var thumbsFolder = argv.thumbs || 'viewer-images/thumbs';
var fullFolder = argv.full || 'viewer-images/full';

var imagesMainFolder = getImagesMainFolder(thumbsFolder);
var images = [];

getDirectoryImages(thumbsFolder, function(file_with_path) {
    var regex = new RegExp(imagesMainFolder + '\/');
    images.push(getSImg(file_with_path.replace(regex,'')));
});

// setup data storage

db.on('load', function() {
    if (initial_save) {
        var d = new Date(2013, 1, 5);
        db.set('thumbs/Raspberry_Pi-595x446.jpg', {
            'id': 'thumbs/Raspberry_Pi-595x446.jpg',
            'title': 'A Raspberry Pi',
            'src': 'thumbs/Raspberry_Pi-595x446.jpg',
            'full': 'full/Raspberry_Pi-595x446.jpg',
            'imagedata': null,
            'info': 'Model B',
            'rotation': 0,
            'excludetime': null,
            'shottime': d.getTime(),
            'shotplace': null
        }, function() {
            console.log('Image meta data to Raspberry is now saved on disk.')
        });
        console.log('Added Raspberry meta data, it is a %s.', db.get('thumbs/Raspberry_Pi-595x446.jpg').info);
    }

    db.forEach(function(key, val) {
        console.log('Found key: %s, val: %j', key, val);
    });
});

db.on('drain', function() {
    console.log('All records are saved on disk now.');
});

// define server

http.createServer(function (req, res) {
  var s = req.url.match(/(.*)\.(.{2,4})$/);
  var ext = (s && s[2]) ? s[2].toLowerCase() : null;

  if (trace_requests) {
      console.log(req.url + " [" + ext + "]");
  }

  if (isAuthorized() && req.method == 'DELETE') {
      var id = req.url.replace(/\/service\/image\//,'');
      res.writeHead(200, {'Content-Type': 'application/json'});
      sendData = {task: 'delete', result: 'ok', id: id};
      res.end(JSON.stringify(sendData));
  } else if (isAuthorized() && req.method == 'POST') {
      var body = '';
      req.on('data', function (data) {
          body += data;
      });
      req.on('end', function () {
          req.body = parsePostBody(body);
          // service handling POST
          res.writeHead(200, {'Content-Type': 'application/json'});
          var sendData = { error: 'service not found' };
          if (req.url.indexOf('/service')>=0) {
              var id = req.url.replace(/\/service\/image\//,'');
              if (id === req.body.id) {
                  db.set(req.body.id, req.body, function() {
                      console.log('Image meta data for ' + req.body.id + ' is now saved on disk.')
                  });
                  sendData = req.body;
              } else {
                  sendData = { error: 'id not matched'};
              }
          }
          res.end(JSON.stringify(sendData));
      });
  } else { // GET
      if (req.url.indexOf('/service')>=0) {
          if (isAuthorized()) {
              // service handling GET
              res.writeHead(200, {'Content-Type': 'application/json'});
              var sendData = { error: 'service not found' };
              if (req.url === '/service/images') {
                  sendData = images;
              } else if (req.url.indexOf('/service/image/')>=0) {
                  var id = req.url.replace(/\/service\/image\//,'');
                  sendData = getSImg(id);
              }
              res.end(JSON.stringify(sendData));
          } else {
              res.writeHead(401, {'Content-Type': 'text/html'});
              res.end('');
          }
      } else if (ext === 'jpg' || ext === 'jpeg') {
          sendFile(res, imagesMainFolder+req.url, 'image/jpg');
      } else if (ext === 'png') {
          sendFile(res, imagesMainFolder+req.url, 'image/png');
      } else if (ext === 'js') {
          sendFile(res, 'static'+req.url, 'application/javascript');
      } else if (ext === 'less') {
          sendFile(res, 'static'+req.url, 'text/css');
      } else {
          res.writeHead(200, {'Content-Type': 'text/html'});
          res.write('<html>' +
              '<script src="//cdnjs.cloudflare.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>' +
              '<script src="//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.4/underscore-min.js"></script>' +
              '<script src="//cdnjs.cloudflare.com/ajax/libs/backbone.js/0.9.10/backbone-min.js"></script>' +
              '<script src="//cdnjs.cloudflare.com/ajax/libs/hammer.js/0.6.4/hammer.js"></script>'
          );
          if (isAuthorized()) {
              res.write('<link rel="stylesheet/less" type="text/css" href="styles/basic.less" />');
              res.write('<script src="//cdnjs.cloudflare.com/ajax/libs/less.js/1.3.3/less.min.js"></script>');
              res.write('<script src="js/jquery.simviewny.js"></script>');
              res.write('<body><div id="image-count" style="display:none;">' + images.length + '</div></body></html>\n');
          } else {
              res.write('<link rel="stylesheet/less" type="text/css" href="styles/start.less" />');
              res.write('<script src="//cdnjs.cloudflare.com/ajax/libs/less.js/1.3.3/less.min.js"></script>');
              res.write('<script src="js/jquery.start.js"></script>');
              res.write('<body></body></html>\n');
          }
          res.end('\n');
      }
  }

}).listen(port);

// some methods

function getDirectoryImages(directory, callback) {
    fs.readdir(directory, function(err, files) {
        if (files && files.length>0) {
            files.forEach(function(file){
                fs.stat(directory + '/' + file, function(err, stats) {
                    if(stats.isFile()) {
                        callback(directory + '/' + file);
                    }
                    if(stats.isDirectory()) {
                        getDirectoryImages(directory + '/' + file, callback);
                    }
                });
            });
        }
    });
}

function sendFile (res, filename, contentType) {
    fs.readFile(filename, function(err, data) {
        if (err) {
            throw err;
        }
        res.writeHead(200, {'Content-Type': contentType});
        res.end(data);
    });
}

function isAuthorized () {
    return true;
}

function parsePostBody (body) {
    var post = {};
    if (body.indexOf('{')==0) {
        post = JSON.parse(body);
    } else {
        var parts = body.split('\n');
        if (parts) {
            parts.forEach(function(part){
                var line = part.split('=');
                post[line[0]] = line[1];
            })
        }
    }
    return post;
}

function getImagesMainFolder (folder) {
    var t = folder.split('/');
    return t[0];
}

function getSImg (filename) {
    var meta = db.get(filename);
    return {
        'id': filename,
        'title': meta.title || null,
        'src': filename,
        'full': meta.full || null,
        'imagedata': meta.imagedata || null,
        'info': meta.info || null,
        'rotation': meta.rotation || 0,
        'excludetime': meta.excludetime || null,
        'shottime': meta.shottime || null,
        'shotplace': meta.shotplace || null
    }
}