// this file is used to run ffmpeg_asm.js!
// however, it is included in the HTML as "processInWebWorker" method instead of linking as a separate javascript file!

importScripts('ffmpeg.js');

var now = Date.now;

function print(text) {
  postMessage({
    'type' : 'stdout',
    'data' : text
  });
}

function printErr(text) {
  postMessage({
    'type' : 'stderr',
    'data' : text
  });
}

onmessage = function(event) {

  var message = event.data;

  if (message.type === "command") {

    var Module = {
      print: print,
      printErr: printErr,
      files: message.files || [],
      arguments: message.arguments || [],
      TOTAL_MEMORY: message.TOTAL_MEMORY || false
    };

    postMessage({
      'type' : 'start',
      'data' : Module.arguments.join(" ")
    });

    postMessage({
      'type' : 'stdout',
      'data' : 'Received command: ' +
                Module.arguments.join(" ") +
                ((Module.TOTAL_MEMORY) ? ".  Processing with " + Module.TOTAL_MEMORY + " bits." : "")
    });

    var time = now();
    var result = ffmpeg_run(Module);

    var totalTime = now() - time;
    postMessage({
      'type' : 'stdout',
      'data' : 'Finished processing (took ' + totalTime + 'ms)'
    });

    postMessage({
      'type' : 'done',
      'data' : result,
      'time' : totalTime
    });
  }
  else if(message.type === "ready?"){
    postMessage({
      'type' : 'ready'
    });
  }
};

postMessage({
  'type' : 'ready'
});

