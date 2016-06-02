// This module exercises the high-level API interface to a DDServo
// Luni device driver running on a remote Arduino under Firmata.
//
// This program is strict-mode throughout.
//
// Doug Johnson, June 2016


const log4js = require("log4js");

const RDD = require("../lib/RemoteDeviceDriver");
const RDDAPI = require("../lib/ServoAPI");
const Sequencer = require("./Sequencer").Sequencer;

const path = require("path");
const thisModule = path.basename(module.filename,".js");
const log = log4js.getLogger(thisModule);
log.setLevel('TRACE');

const firmata = require("firmata");

const portName = "COM46";
const unitName = "Servo:0";
const exitAtEnd = true;

let firmataBoard;
let proxyRDD;
let api;

let seq;

let handle;
let pc;
let opts;

// Set up
//["open", "read", "write", "close", "read-continuous"]

const init = () => {
  opts = {};
  firmataBoard = new firmata.Board(portName,opts,() => {
    log.debug(`Board is ready.`);

    opts = {board: firmataBoard};
    proxyRDD = new RDD.RemoteDeviceDriver(opts);
    log.debug(`RemoteDeviceDriver is ready.`);

    api = new RDDAPI.ServoAPI({driver : proxyRDD});
    log.debug(`ServoAPI is created.`);

    seq = new Sequencer(api,["open", "read", "write", "close", "read-continuous"],{});
    log.debug(`Sequencer is created.`);

    seq.on("error", (apiError) => {
      log.error(`Error ${RDD.SC[apiError.status].sym} (${apiError.status}) ${RDD.SC[apiError.status].msg}.`);
    });

    seq.on("done", (apiResult) => {
          if (exitAtEnd) {
            log.info(`Goodbye.`);
            firmataBoard.transport.close();
          } else {
            log.info(`Steps completed.`);
          }
        }
    );

  seq.start(step);
  });
};

// Everything has been opened and we have a handle by the time this step
// sequence is started.  Assuming that each of the following step functions
// will result in one of the events captured above, we will progress through
// the following async steps in order.

let step = [

(apiResult) => {
  log.info(`Begin step processing.`);
  api.open(unitName,RDD.DAF.FORCE,0);
},

(apiResult) => {
  log.info(`Opened ${apiResult.unitName} with handle ${apiResult.handle}.`);
  handle = apiResult.handle;
  api.attach(handle,3,{});
},

(apiResult) => {
  log.info(`${unitName} attached to servo.`);
  api.to(handle,0);
},

(apiResult) => {
  log.info(`requested servo move to 0.`);
  setTimeout(() => {api.to(handle,180);},1000);
},

(apiResult) => {
  log.info(`requested servo move to 180.`);
  setTimeout(() => {api.to(handle,0);},1000);
},

(apiResult) => {
  log.info(`requested servo move to 0.`);
  setTimeout(() => {api.close(handle);},1000);
},

// (apiResult) => {
//   log.info(`${unitName} says ${apiResult.data}`);
//   api.setIntervals(handle,null,1000);
// },

// (apiResult) => {
//   log.info(`New intervals have been set.`);
//   api.getContinuousGreeting(handle);
// },

// (apiResult) => {
//   log.info(`Continuous greeting started.`);
//   if (exitAtEnd) {
//     api.close(handle);
//   } else {
//     api.on("read-continuous", (apiResult) => {
//       log.info(`${unitName} says ${apiResult.data}`);
//     });
//   }
// },

(apiResult) => {
  if (apiResult.eventType === "close") {
    log.info(`Closed handle ${apiResult.handle}.  Goodbye.`);
    firmataBoard.transport.close();
  }
}
];

// Start the engine running

init();
