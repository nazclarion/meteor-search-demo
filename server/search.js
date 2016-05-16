Router.route('/time', function() {
	// for fun :)
	var response = this.response;
	var request = this.request;

	response.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		"Access-Control-Allow-Origin": "*"
	});
	// this.response.write(":" + Array(2049).join(" ") + "\n"); // 2kB padding for IE
	response.write("retry: 2000\n");

	var lastEventId = Number(request.headers["last-event-id"]) || 0;

	var timeoutId = 0;
	var i = lastEventId;
	var c = i + 100;
	var f = function() {
		if (++i < c) {
			var now = new Date();
			// response.write("id: " + i + "\n");
			response.write("data: " + now.toLocaleTimeString() + "\n\n");
			timeoutId = setTimeout(f, 1000);
		} else {
			response.end();
		}
	};

	f();

	response.on("close", function() {
		clearTimeout(timeoutId);
	});
}, {
	'where': 'server'
});

Meteor.startup(function() {
	var feeds = [
		// 'http://feeds.reuters.com/reuters/topNews?format=xml',
		// 'https://news.google.com/news?cf=all&hl=en&pz=1&ned=us&output=rss',
		// 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.atom',
		// 'https://www.nasa.gov/rss/dyn/earth.rss',
		// 'http://rss.nytimes.com/services/xml/rss/nyt/World.xml',
		// 'http://images.apple.com/main/rss/hotnews/hotnews.rss',
		// 'http://www.cnbc.com/id/100003114/device/rss/rss.html',
		// 'http://techcrunch.com/rssfeeds/',
		// 'http://www.ft.com/rss/world',
		// 'http://www.ft.com/rss/world/us',
		// 'http://www.ft.com/rss/world/uk',
		// 'http://www.eurekalert.org/rss.xml',
		// 'http://www.eurekalert.org/rss/cancer.xml',
		// 'http://www.eurekalert.org/rss/space_planetary.xml',
		// 'http://www.oreilly.com/feeds/',
		// 'http://feeds.feedburner.com/techcrunch', // GOOD content
		{
			'url': 'http://digg.com/rss/index.xml',
			'tags': ['news', 'technology', 'science']
		}, {
			'url': 'http://feeds.bbci.co.uk/news/rss.xml',
			'tags': ['news', 'world']
		}, {
			'url': 'http://earthquake.usgs.gov/earthquakes/shakemap/rss.xml',
			'tags': ['science', 'earthquake']
		}, {
			'url': 'http://www.emsc-csem.org/service/rss/rss.php?typ=emsc&map_epicenter=true&magmin=4',
			'tags': ['science', 'earthquake']
		}, {
			'url': 'https://www.nasa.gov/rss/dyn/lg_image_of_the_day.rss',
			'tags': ['space', 'astronomy', 'images']
		}, {
			'url': 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
			'tags': ['science', 'space', 'astronomy', 'news']
		}, {
			'url': 'http://feeds.sciencedaily.com/sciencedaily/matter_energy/engineering',
			'tags': ['science', 'engineering']
		}, {
			'url': 'http://feeds.sciencedaily.com/sciencedaily/space_time/astronomy',
			'tags': ['science', 'astronomy']
		}, {
			'url': 'http://feeds.sciencedaily.com/sciencedaily/computers_math/computer_science',
			'tags': ['computer', 'science']
		}, {
			'url': 'http://feeds.sciencedaily.com/sciencedaily/earth_climate/weather',
			'tags': ['weather', 'science']
		}, {
			'url': 'http://feeds.feedburner.com/oreilly/newbooks?format=xml',
			'tags': ['books']
		}, {
			'url': 'https://www.sciencenews.org/feeds/headlines.rss',
			'tags': ['science', 'news']
		}, {
			'url': 'http://feeds.feedburner.com/elise/simplyrecipes',
			'tags': ['recipe', 'food']
		}
	];

	console.log(' -------------- ');
	feeds.forEach(function(el) {
		var stream = new Meteor.EnvironmentVariable;
		var feedParser = new Feedparser();
		var req = request(el.url, {
			jar: false,
			timeout: 10000,
			pool: false
		});
		req.setMaxListeners(50);
		// Some feeds do not respond without user-agent and accept headers.
		req.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36');
		req.setHeader('accept', 'text/html,application/xhtml+xml');
		req.on('response', function(res) {
			var stream = this;

			if (res.statusCode != 200) {
				return this.emit('error', new Error('Bad status code'));
			}
			stream.pipe(feedParser);
		});
		stream.withValue(feedParser, function() {
			// var feed = stream.get();
			feedParser
				.on('error', Meteor.bindEnvironment(function(error) {
					console.log('Feedparser error: ', error);
				}))
				.on('response', Meteor.bindEnvironment(function(response) {
					console.log('Feedparser response: ', response);
				}))
				.on('article', Meteor.bindEnvironment(function() {
					console.log('Feedparser article: ');
				}))
				.on('readable', Meteor.bindEnvironment(function() {
					var readable = stream.get();
					while (item = readable.read()) {
						// console.log(item.meta.title + ' - ' + item.title);
						if (item && item.meta) {
							Feeds.upsert({
								'url': el.url,
								'title': item.meta.title
							}, {
								'url': el.url,
								'title': item.meta.title,
								'tags': el.tags
							});
						}
					}
				}))
		});
		console.log(el.url + ' - upserted');
	});

	Meteor.setInterval(function() {
		Feeds.find({}).forEach(function(feed) {
			var stream = new Meteor.EnvironmentVariable;
			var feedParser = new Feedparser();
			var req = request(feed.url, {
				jar: false,
				timeout: 10000,
				pool: false
			});
			req.setMaxListeners(50);
			// Some feeds do not respond without user-agent and accept headers.
			req.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36');
			req.setHeader('accept', 'text/html,application/xhtml+xml');
			req.on('response', function(res) {
				var stream = this;

				if (res.statusCode != 200) {
					return this.emit('error', new Error('Bad status code'));
				}
				stream.pipe(feedParser);
			});
			stream.withValue(feedParser, function() {
				// var feed = stream.get();
				feedParser
					.on('error', Meteor.bindEnvironment(function(error) {
						console.log('Feedparser error: ', error);
					}))
					.on('response', Meteor.bindEnvironment(function(response) {
						console.log('Feedparser response: ', response);
					}))
					.on('article', Meteor.bindEnvironment(function() {
						console.log('Feedparser article: ');
					}))
					.on('readable', Meteor.bindEnvironment(function() {
						var readable = stream.get();
						while (item = readable.read()) {
							if (item) {
								item.tags = feed.tags;
								// console.log(item.meta.title + ' - ' + item.title);
								Posts.upsert({
									'title': item.title,
									'pubDate': item.pubDate
								}, item);
							}
						}
					}))
			});
			// console.log(feed.url + ' - updated');
		});
		// console.log('======================');
	}, 60000);
});

Meteor.publish('posts', function(selector, options) {
	// check(query, String);

	return Posts.search(selector, options || {
		limit: 20,
		sort: {
			date: -1
		}
	});
});

Meteor.publish('feeds', function() {
	return Feeds.find({});
});

Meteor.methods({
	upvoteById: function(postId) {
		return Posts.update({
			_id: postId
		}, {
			$inc: {
				rating: 1
			}
		}, function(error, result) {
			if (error) {
				console.log('Error updating votes: ', error)
			} else {
				return result;
			}
		});
	},
	downvoteById: function(postId) {
		return Posts.update({
			_id: postId
		}, {
			$inc: {
				rating: -1
			}
		}, function(error, result) {
			if (error) {
				console.log('Error updating votes: ', error)
			} else {
				return result;
			}
		});
	}
});