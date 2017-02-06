var util = require('./util/util');
var fs = require('fs');

var RequestContext = require('./RequestContext');
var logger = require('./log');
var expEngine = require('./expressions/engine')
var reqResolver = require('./request_resolver');
var resFileResolver = require('./response_handler');
var color = require('./util/colors').color;


/**
1) Find matching mapping
2) Resolve response file/body
3) Process response data (resolve expressions and request captured part)
**/
exports.processRequest = function(request,onSuccess,onError){
	
	var rc = new RequestContext(request);
	logger.info(rc.getTransactionId() + " " + request.method+": "+request.url,'green');
	rc.requestBody = request.post;
	try{
		var matchedEntry = reqResolver.resolve(request);
		logger.debug(rc.getTransactionId() + " after resolving the request : " + rc.howLong() + " ms");
		rc.resolved = matchedEntry;

		if(!matchedEntry || matchedEntry === null){
			logger.debug(JSON.stringify(rc, null, "\t"));
			logger.error(rc.getTransactionId() + " Response served with Status Code 404 ");
			return onError("",{ status : 404});
		}else{
			var options = {};
			logger.detailInfo(rc.getTransactionId() + " Matching Config: " + JSON.stringify(rc.resolved,null,4));
		
			//Set Headers
			options.headers = matchedEntry.response.headers;
			options.status = matchedEntry.response.status;
			options.latency = calculateLatency(matchedEntry.response.latency);
			var data = "";

			//Read and Build Response body
			if(matchedEntry.response.body){
				data = matchedEntry.response.body;
				logger.debug(rc.getTransactionId() + " before processing data");
				data = handleDynamicResponseBody(data,rc);
				logger.debug(rc.getTransactionId() + " after processing response body : " + rc.howLong() + " ms");
			}else{
				var dataFile = resFileResolver.readResponse(matchedEntry);
				if(typeof dataFile  === 'object'){
					options.status =  dataFile.status;
					dataFile = dataFile.name;
				}
				
				logger.info('Reading from file: ' + dataFile);
				if(matchedEntry.response.sendas && matchedEntry.response.sendas === "file"){
					data = dataFile;
					options.sendasfile = true;
				}else{
					data = fs.readFileSync(dataFile, {encoding: 'utf-8'});
						logger.debug(rc.getTransactionId() + " after reading from file : " + rc.howLong() + " ms");
					data = handleDynamicResponseBody(data,rc);
						logger.debug(rc.getTransactionId() + " after processing response body File : " + rc.howLong() + " ms");
				}
			}

			logger.debug("RequestContext: " + JSON.stringify(rc, null, "\t"));
			onSuccess(data,options);
			var msgStr = rc.getTransactionId() + " Response served in " + rc.howLong() + " ms with Status Code " + options.status;
			options.status === 200 ? logger.info(msgStr,'green') : logger.error(msgStr) ;
		}
	}catch(e){
		logger.error(e);
		onError("",{ status : 500},e);
	}
}

function handleDynamicResponseBody(data,rc){
	//1. replace DbSet Place Holders
	data = require('./dbset_handler').handle(data,rc.resolved.dbset);
	//2. replace request matches
	data = util.applyMatches(data,rc.resolved.request.matches);
	//3. replace markers
	data = expEngine.process(data,expEngine.fetch(data),rc);
	//4. replace dumps
	data = require('./dumps_handler').handle(data);

	return data;
}

function calculateLatency(latency){
	if(Array.isArray(latency)){
		return util.getRandomInt(latency[0],latency[1])
	}
	return latency;
}

//module.exports = stubmatic;