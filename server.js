"use strict"
// Based on https://gist.github.com/ryanflorence/701407
var conf = require('./config.js'),
    http = require("http"),
    mime = require("mime"),
    url = require("url"),
    querystring = require("querystring"),
    path = require("path"),
    fs = require("fs"),
    port = conf.port,
    indexes = conf.indexes;
 
var ERRORS = {
    '404': {'message': 'Not Found '},
}

function HttpError(code, message) {
  this.name = 'HttpError';
  if ( typeof code == "object" ) {
    this.err = code;
    code = 500;
   }
  this.code = code;
  if ( ERRORS[code] ) message = ERRORS[code].message + message;
  this.message = message || 'Server Error';
  this.stack = (new Error()).stack;
}
HttpError.prototype = Object.create(Error.prototype);
HttpError.prototype.constructor = HttpError;


http.createServer(function(request, response) {
    function handleError(err) {
        var message = err.code + " " + err.message + "\n";
        response.writeHead(err.code, {"Content-Type": "text/plain"});
        response.write(message);
        response.end();
        console.error('---------------------------------------');
        console.error(message);
        if (err.err) {
            console.error(err.err.message);
        }
        console.error(err.stack);
        console.error('---------------------------------------');
    }
    
    function sendFile(filename) {
        try {
            fs.readFile(filename, "binary", function(err, file) {
                try {
                  if(err)
                       handleError(new HttpError(err));
                  else {
                      response.writeHead(200, {'Content-Type:': mime.lookup(filename)});
                      response.write(file, "binary");
                      response.end();
                  }
                } catch (e) {
                    handleError(e);
                }
            });
        } catch (e) {
            handleError(e);
        }
    }
    
    function sendDirectory(dirname) {
        for (var i = 0; i <= indexes.length; i++) {
            if ( fs.existsSync(dirname + "/" + indexes[i]) ) {
                sendFile(dirname + "/" + indexes[i]);
                return;
            }
        }
        
        var body = "<!doctype html><html><body><h1>" +  ( uri ? "Directory: " + uri : "Root Directory") + "</h1><hr>",
            files = fs.readdirSync(dirname).sort();
            
        if ( uri != '' ) {
            body += '<a href="..">..</a></br>';
        }
        
        for (var i in files) {
            var f = files[i];
            if ( f[0] == '.' ) continue;
            body += '<a href="' + uri + '/' + f + '">' + f + "</a></br>";
        }
        body += "<hr></body></html>";
        
        response.writeHead(200, {
                        'Content-Length': body.length,
                        'Content-Type': 'text/html' });
        response.write(body);
        response.end();
    }
    
    try {
      var uri = querystring.unescape(url.parse(request.url).pathname)
        , filename = path.join(process.cwd(), uri);
        
      if ( uri.length > 0 && uri[uri.length - 1] == '/' ) uri = uri.slice(0, uri.length-1);

      if ( ! fs.existsSync(filename) )
        throw new HttpError(404, uri);
      if (fs.statSync(filename).isDirectory()) {
         sendDirectory(filename);
      } else {
         sendFile(filename);
      }
    } catch (e) {
        if ( ! e instanceof HttpError )
            e = new HttpError(e);
        handleError(e);
    }
}).listen(parseInt(port), function() {
    console.log("Static file server running at\n  => http://localhost:" + port + " with config:\n");
    console.log(conf);
});

