var http      = require('http');
var httpProxy = require('http-proxy');
var exec = require('child_process').exec;
var request = require("request");
var heartbeats = require('heartbeats');
var heart = heartbeats.createHeart(1000);

var BLUE  = 'http://localhost:9090';
var GREEN = 'http://localhost:9060';

var TARGET = GREEN;

var options =
{
 url: "http://localhost:8082",
};

heart.createEvent(5, function(heartbeat, last){
  var req = request.get(options, function (error, res, body) {
  var code =  res.statusCode;
  if(code ==500)
  {
    console.log(code);
    console.log("error! Flipping server!")
    if(TARGET === BLUE){
      console.log("flipping to green");
      TARGET = GREEN;
  }
    else {
      console.log("flipping to blue");
      TARGET = BLUE;
    }
  }
  })
});


var infrastructure =
{
  setup: function()
  {
    // Proxy.
    var options = {};
    var proxy   = httpProxy.createProxyServer(options);

    var server  = http.createServer(function(req, res)
    {
      proxy.web( req, res, {target: TARGET } );
    });
    server.listen(8082);



    // Launch green slice
    exec('node_modules/forever/bin/forever --watch start deploy/blue-www/main.js 9090');
    console.log("blue slice");

    // Launch blue slice
    exec('node_modules/forever/bin/forever --watch start deploy/green-www/main.js 9060');
    console.log("green slice");

  },

  teardown: function()
  {
    exec('node_modules/forever/bin/forever stopall', function()
    {
      console.log("infrastructure shutdown");
      process.exit();
    });
  },
}

infrastructure.setup();

// Make sure to clean up.
process.on('exit', function(){infrastructure.teardown();} );
process.on('SIGINT', function(){infrastructure.teardown();} );
process.on('uncaughtException', function(err){
  console.log(err);
  infrastructure.teardown();} );
