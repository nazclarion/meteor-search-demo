Package.describe({
  name: 'nazclarion:feedparser',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'Reads RSS feeds',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Npm.depends({
  request: "2.69.0",
  feedparser: "1.1.4"
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.addFiles('feedparser.js', 'server');
  api.export([
    'Feedparser',
    'request'
  ]);
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('feedparser');
  api.addFiles('feedparser-tests.js');
});