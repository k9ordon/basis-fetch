'use strict';

// external libs
var request = require('request');
var dateFormat = require('dateformat');
var moment = require('moment');

var requestUser = function (usr, psw, callback) {
	if(!usr || !psw) {
		console.log("error: missing username or password");
		return false;
	}

    request({
        uri: 'https://app.mybasis.com/login',
        method: 'POST',
        form: {
            username: usr,
            password: psw
        },
        followRedirect: true,
        maxRedirects: 10,
        jar: true
    }, function (err, response, data) {
        if (err) {
        	callback(err, null);
        }
        var token = getToken(response);
        callback(null, token);
    });
};

var getToken = function (response) {
    var access_token = response.headers['set-cookie'][0].match(/access_token=([0-9a-f]+)/);
    // refresh_token = response.headers['set-cookie'][0].match( /refresh_token=([0-9a-f]+)/ ),
    // expires = response.headers['set-cookie'][0].match(/expires=([0-9a-f]+)/);

    return access_token;
};

var getMetrics = function(access_token, date, dataType, callback) {
    var requestDate = dateFormat(date, 'yyyy-mm-dd');
    var metricURL = 'https://app.mybasis.com/api/v1/metricsday/me?day=' + requestDate +
                    '&padding=0' +
                    '&heartrate=true' +
                    '&steps=true' +
                    '&calories=true' +
                    '&gsr=true' +
                    '&skin_temp=true' +
                    '&air_temp=true';


    getData(metricURL, access_token, date, dataType, formatMetric, callback);
};

var getBodystates = function(access_token, date, dataType, callback) {
    var requestDate = dateFormat(date, 'yyyy-mm-dd');
    var metricURL = 'https://app.mybasis.com/api/v1/bodystatesday/me?day=' + requestDate +
                    '&padding=0';

    getData(metricURL, access_token, date, dataType, formatBodystates, callback);
};

var getData = function(url, access_token, date, dataType, formatter, callback) {

//    var url = "";
//    var sleep = 'https://app.mybasis.com/api/v2/users/me/days/' + requestDate + '/activities?type=sleep&expand=activities';
//    var activities = 'https://app.mybasis.com/api/v2/users/me/days/' + requestDate + '/activities?type=run,walk,bike&expand=activities';
//
//    console.log("url:", url);

    request.get({
            url: url,
            jar: access_token,
            json: true
        }, function (err, respone, data) {
            if (err) {
                console.log(err);
                callback(err, null);
            }

            var formattedData = formatter(data);

            callback(null, formattedData);

        }
    );
};

var formatMetric = function (data) {
    var metrics = data.metrics;
    var metricsCount = metrics.heartrate.values.length;

    var metricTime = new Date();
    var startTime = moment.unix(data.starttime);
    var metricArray = [];
    var metricItem = {
        "date"      : 0,
        "heartRate" : 0,
        "steps"     : 0,
        "calories"  : 0,
        "gsrs"      : 0,
        "skinTemp"  : 0,
        "airTemp"   : 0
    };

    for (var i = 0; i < metricsCount; i++) {
        metricTime = startTime.add(1, 'minutes');
        metricItem.date = metricTime.clone().toDate();
        metricItem.heartRate = metrics.heartrate.values[i];
        metricItem.steps = metrics.steps.values[i];
        metricItem.calories = metrics.calories.values[i];
        metricItem.gsrs = metrics.gsr.values[i];
        metricItem.skinTemp = metrics.skin_temp.values[i];
        metricItem.airTemp = metrics.air_temp.values[i];

        metricArray.push(metricItem);
        metricItem = {
            "date"      : 0,
            "heartRate" : 0,
            "steps"     : 0,
            "calories"  : 0,
            "gsrs"      : 0,
            "skinTemp"  : 0,
            "airTemp"   : 0
        };
    }

    return metricArray;
};

var formatBodystates = function (data) {
    var bodystates = data.bodystates;
    var bodystatesCount = bodystates.length;
	var bodystatesArray = [];

	console.log('bodystatesCount', bodystatesCount);

    for (var i = 0; i < bodystatesCount; i++) {
        bodystatesArray.push({
			start: new Date(bodystates[i][0] * 1000),
			end: new Date(bodystates[i][1] * 1000),
			activity: bodystates[i][2]
		});
    }

    return bodystatesArray;
};

var getLatest = function (data, callback) {
    var dataLen = data.length - 1;
    for (var i = dataLen; i > 0; i--) {
        var metric = data[i];
        if(metric.heartRate != null &&
            metric.steps != null &&
            metric.calories != null &&
            metric.gsrs != null &&
            metric.skinTemp != null &&
            metric.airTemp != null
        ) {
            callback(metric);
            break;
        }
    };
};

module.exports = {
    "requestUser": requestUser,
    "getMetrics": getMetrics,
	"getBodystates": getBodystates,
    "getLatest": getLatest
};
