"use strict";

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

let d = {};
let filePath = "./db.json";
const bytes = s => {
  return ~-encodeURI(JSON.stringify(s)).split(/%..|./).length;
};

function writeData(path = "./db.json", d = {}) {
  return new Promise(async (resolve, reject) => {
    await fsp
      .writeFile(path, JSON.stringify(d))
      .then(() => resolve())
      .catch(x => reject(x));
  });
}

async function defaultPath(value) {
  if (Object.entries(d).length === 0) {
    try {
      let data;
      if (value == "sync") {
        data = fs.readFileSync("./db.json");
      } else if (value == "async") {
        data = await fsp.readFile("./db.json");
      }
      if (data.length !== 0) {
        d = JSON.parse(data);
      }
      return true;
    } catch {
      return false;
    }
  }
}

let setpath = function (userPath = "./db.json") {
  let filePath = path.resolve(userPath);
  if (path.extname(filePath) === ".json") {
    try {
      let exists = fs.existsSync(path.dirname(filePath));
      if (!exists) {
        throw {
          code: "noDir"
        };
      }
      let data = fs.readFileSync(filePath);
      if (data.length !== 0) {
        d = JSON.parse(data);
      }
      return `${path.basename(filePath)} path set`;
    } catch (e) {
      if (e.code) {
        try {
          if (e.code === "noDir") {
            fs.mkdirSync(path.dirname(filePath), {
              recursive: true
            }); //errno: -4071,code: 'EINVAL',syscall: 'mkdir',
          }
          fs.writeFileSync(filePath, "");
          d = {};
          return `${path.basename(filePath)} path set`;
        } catch (e) {
          return {
            error: "given path is invalid"
          };
        }
      } else {
        return {
          error: "file contains invalid JSON data"
        };
      }
    }
  } else {
    return {
      error: "invalid file name: should be a json file"
    };
  }
};

function readkey(key) {
  if (defaultPath("sync") === false) {
    return {
      error: `createkey() to create new key value pair or use setpath() to set new path`
    };
  }
  if (d.hasOwnProperty(key)) {
    let fValue = d[key];
    if (
      fValue[1] == 0 ||
      Math.round(new Date().getTime() / 1000) <= fValue[1]
    ) {
      return JSON.stringify({
        [key]: fValue[0]
      });
    } else {
      return {
        error: `time-to-live of key: ${key} has expired`
      };
    }
  } else {
    return {
      error: "key does not exists"
    };
  }
}

function createkey(key1, value, timeout = 0) {
  if (defaultPath("sync") === false) {
    return {
      error: `createkey() to create new key value pair or use setpath() to set new path`
    };
  }
  let key = key1.trim();
  if (d.hasOwnProperty(key)) {
    return {
      error: "key already exist"
    };
  } else {
    let regex = /^[A-Za-z]+$/;
    if (regex.test(key.trim()) && key.length <= 32) {
      if (
        bytes(d) < Math.pow(1024, 3) &&
        bytes(value) < 16 * Math.pow(1024, 3)
      ) {
        let fval = [];
        timeout = parseInt(timeout);
        if (timeout === 0) {
          fval = [value, timeout];
        } else {
          let ftime = Math.round(new Date().getTime() / 1000) + timeout;
          fval = [value, ftime];
        }
        d[key] = fval;
        try {
          fs.writeFileSync((filePath = "./db.json"), JSON.stringify(d));
          return "key-value pair created";
        } catch (e) {
          delete d[key];
          return {
            error: "key-value not added to the file!"
          };
        }
      } else {
        return {
          error:
            "File size is capped at 1 GB and value of JSON is capped at 16KB"
        };
      }
    } else {
      return {
        error:
          "key must contain only alphabets and must not exceed 32 characters"
      };
    }
  }
}

function deletekey(key) {
  if (defaultPath("sync") === false) {
    return {
      error: `createkey() to create new key value pair or use setpath() to set new path`
    };
  }
  if (d.hasOwnProperty(key)) {
    let fValue = d[key];
    if (
      fValue[1] == 0 ||
      Math.round(new Date().getTime() / 1000) <= fValue[1]
    ) {
      return {
        error: `time-to-live of key: ${key} has not expired`
      };
    } else {
      let tempd = {
        ...d
      };
      delete d[key];
      try {
        fs.writeFileSync((filePath = "./db.json"), JSON.stringify(d));
        return "key deleted";
      } catch (e) {
        d = tempd;
        return {
          error: "key-value not deleted from the file!"
        };
      }
    }
  } else {
    return {
      error: "key does not exists"
    };
  }
}


exports.setpath = setpath;
exports.readkey = readkey;
exports.createkey = createkey;
exports.deletekey = deletekey;