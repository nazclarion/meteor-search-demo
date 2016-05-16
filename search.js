// Utils
RegExp.escape = function(s) {
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

Mongo.Collection.prototype.search = function(selector, options) {
	var defaultQueryOptions = {
			limit: 20,
			sort: {
				pubDate: -1
			}
		}

	var options = _.extend(options || {}, defaultQueryOptions);

	// console.log('selector: ', JSON.stringify(selector));
	// console.log('options: ', JSON.stringify(options));
	return this.find(selector || {}, options);
}

// Collections
Posts = new Mongo.Collection('posts');
Feeds = new Mongo.Collection('feeds');