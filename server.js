var http = require('http'),
    fs = require('fs');

var trace_requests = false;

function getDirectoryFiles(directory, callback) {
    fs.readdir(directory, function(err, files) {
        if (files && files.length>0) {
            files.forEach(function(file){
                fs.stat(directory + '/' + file, function(err, stats) {
                    if(stats.isFile()) {
                        callback(directory + '/' + file);
                    }
                    if(stats.isDirectory()) {
                        getDirectoryFiles(directory + '/' + file, callback);
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

var images = [];

getDirectoryFiles('viewer-images/thumbs', function(file_with_path) {
    images.push(file_with_path.replace(/viewer-images\//,''));
});

http.createServer(function (req, res) {
  var s = req.url.match(/(.*)\.(.{2,4})$/);
  var ext = (s && s[2]) ? s[2].toLowerCase() : null;
  if (trace_requests) {
      console.log(req.url + " [" + ext + "]");
  }
  if (req.url.indexOf('/service')>=0) {
	if (isAuthorized()) {
		// service
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end(JSON.stringify(images));
	} else {
		res.writeHead(401, {'Content-Type': 'text/html'});
		res.end('');
	}
  } else if (ext === 'jpg' || ext === 'jpeg') {
    sendFile(res, 'viewer-images'+req.url, 'image/jpg');
  } else if (ext === 'png') {
    sendFile(res, 'viewer-images'+req.url, 'image/png');
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

}).listen(80);