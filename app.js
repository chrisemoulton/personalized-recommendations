/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express');
var app = express();
var watson = require('watson-developer-cloud');
var extend = require('util')._extend;
var fs = require('fs');

// Bootstrap application settings
require('./config/express')(app);

var corpus = '/corpora/laret4ry9in5/locations';

var problem = JSON.parse(fs.readFileSync('data/problem.json', 'utf8'));
var places = JSON.parse(fs.readFileSync('data/places.json', 'utf8'));

// Concept Insights credentials
var conceptInsights = watson.concept_insights({
  version: 'v2',
  username: '<ci-username>',
  password: '<ci-password>'
});

// Tradeoff Analytics credentials
var tradeoffAnalytics = watson.tradeoff_analytics({
  version: 'v1',
  username: '<ta-username>',
  password: '<ta-password>',
});

app.get('/', function(req, res) {
  res.render('index');
});

// concept insights REST calls
app.get('/label_search', function(req, res, next) {
  var params = extend({
    corpus: corpus,
    concept_fields: JSON.stringify({ abstract: 1, type:1, }),
    prefix: true,
    limit: 4,
    concepts: true
  }, req.query);

  conceptInsights.corpora.searchByLabel(params, function(err, results) {
    if (err)
      return next(err);
    else {
      return res.json(results.matches.map(function(match){
        match.type = match.type ? 'concept' : 'document';
        return match;
      } ));
    }
  });
});

app.get('/conceptual_search', function(req, res, next) {
  var payload = extend({
    corpus: corpus,
  }, req.query);

  // ids needs to be stringify
  payload.ids = JSON.stringify(payload.ids);

  conceptInsights.corpora.getRelatedDocuments(payload, function(err, results) {
    if (err)
      return next(err);
    else
      return res.json(results ? results.results : []);
  });
});

// tradeoff analytics REST call - here
app.post('/dilemmas', function(req, res, next) {
  tradeoffAnalytics.dilemmas(req.body, function(err, dilemmas) {
    if (err)
      return next(err);
    else
      return res.json(dilemmas);
  });
});

app.get('/get_problem', function(req, res) {
  // locations resulting from concept insights
  var locations = req.query.locations;

  // filter to only the locations we want to analyze
  problem.options = places.filter(function(place) {
    return locations.indexOf(place.key) !== -1;
  });

  res.json(problem);
});

app.post('/destination', function(req, res) {
  res.render('destination', JSON.parse(req.body.place || {}) );
});

// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);
