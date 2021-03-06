var hashes = require('hashes');
var fs = require('fs'),
    path = require('path');
var readline = require('readline');
var logger = require('./../log');

var configbuilder = require("./../configbuilder");
var dbsets = [];

exports.load = function(){

    /*console.log("start")
    var filePath = '/home/user/spikes/stubmatic/spec/test_assets/dbsets/employee.txt';
    var rd = readline.createInterface({
        input: fs.createReadStream(filePath)
    });

    rd.on('line', function(line) {
        console.log(line);
    });
    console.log("end")*/

    var dirPath = configbuilder.getConfig().dbsets;
    dbsets = [];
    if(dirPath){
        try{
            var files = fs.readdirSync(dirPath);
            files.forEach(function (name) {
                logger.info("Loading DB from " + name);
                var hashtable = new hashes.HashTable();
                var filePath = path.join(dirPath, name);
                var stat = fs.statSync(filePath);
                if (stat.isFile()) {
                    var linecount = 0;
                    var headers;
                    var rd = readline.createInterface({
                        input: fs.createReadStream(filePath)
                        /*,output: process.stdout
                        ,terminal: false*/
                    });
                    rd.on('line', function(line) {
                        var columns = splitAndTrim(line);
                        if(linecount === 0){
                            headers= columns;
                        }else{
                            var row = {};
                            for(var i in headers){
                                row[headers[i]]=columns[i];
                            }
                            hashtable.add(columns[0], row);
                        }
                        linecount++;
                    });
                    dbsets[name] = hashtable;
                }
            });

        }catch(err){
            logger.error("Can not load db sets from" + dirPath + ", " + err);
            //throw new Error(err);
        }
    }
}

exports.getDBsets = function(){
    return dbsets;
}

function splitAndTrim(line){
    var columns = line.split("|");
    for(var i in columns){
        columns[i] = columns[i].trim();
    }
    return columns;
}