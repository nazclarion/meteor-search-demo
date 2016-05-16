Router.configure({
	layoutTemplate: 'defaultLayout'
});

Router.route('/', {
	name: 'search.results'
});

Template.SearchResults.onCreated(function() {
	// Init
	var instance = this;
	var defaultQueryOptions = {
		limit: 20,
		sort: {
			pubDate: -1
		}
	}
	instance.searchQuery = new ReactiveVar('');
	instance.selector = new ReactiveVar({});
	instance.sources = new ReactiveVar([]);
	instance.tags = new ReactiveVar([]);
	Session.set('searchQuery', '');

	// Autorun
	instance.autorun(function() {
		instance.searchQuery.set(Session.get('searchQuery'));

		var searchQuery = instance.searchQuery.get(),
			sources = instance.sources.get(),
			tags = instance.tags.get(),
			selector = {};

		var searchQuery = searchQuery ? {
			$regex: RegExp.escape(searchQuery),
			$options: 'i'
		} : null

		if (searchQuery) {
			selector['$or'] = [{
				'title': searchQuery
			}, {
				'description': searchQuery
			}]
		}

		if (sources && sources.length) {
			selector['meta.title'] = {
				$in: sources
			};
		}

		if (tags && tags.length) {
			selector['tags'] = {
				$in: tags
			};
		}

		// console.log('searchQuery: ', JSON.stringify(searchQuery));
		// console.log('selector: ', JSON.stringify(selector));
		instance.selector.set(selector);

		instance.subscribe('feeds');
		instance.subscribe('posts', instance.selector.get(), defaultQueryOptions);
	});

	// Cursor
	instance.posts = function() {
		// console.log('Search query: ', instance.searchQuery.get());
		// console.log('Filters: ', instance.sources.get());
		return Posts.search(instance.selector.get(), defaultQueryOptions);
	}

	instance.getTags = function() {
		var uniqueTags = new Set();
		Post.find().forEach(function(feed) {
			feed.tags.forEach(function(el, index) {
				uniqueTags.add(el)
			});
		});
		return Array.from(uniqueTags);
	}
})

Template.SearchResults.helpers({
	posts: function() {
		return Template.instance().posts();
	},
	feeds: function() {
		return Feeds.find({}, {
			sort: {
				'title': 1
			}
		});
	},
	nTagsSelected: function() {
		return Template.instance().tags.get().length;
	},
	nSourcesSelected: function() {
		return Template.instance().sources.get().length;
	},
	tags: function() {
		var uniqueTags = new Set();
		Feeds.find().forEach(function(feed) {
			feed.tags.forEach(function(el, index) {
				uniqueTags.add(el)
			});
		});
		return Array.from(uniqueTags);
		// return Template.instance().getTags();
	},
	Enclosures: function(_id) {
		var post = Posts.findOne({
			'_id': _id
		});
		return post.enclosures.length ? post.enclosures : false;
	}
});

Template.SearchResults.onRendered(function() {
	$('.fixed').on('mouseenter', function(event) {
		$(event.currentTarget).css({
			'overflow-y': 'auto'
		});
	}).on('mouseleave', function(event) {
		$(event.currentTarget).css({
			'overflow-y': 'hidden'
		});
	});
	// $('.fixed').css({'height': '100%'}).css({'overflow-y': 'auto'});
	// $('.filter-container').css({'width': '101%'}).css({'overflow-y': 'auto'});
});

Template.SearchResults.events({
	"click .js-upvote": function(event) {
		var post_id = this._id;

		Meteor.call('upvoteById', post_id, function(error, result) {
			if (error) {
				console.log('Error upvoting: ', error)
			} else {
				// console.log("Up voting post with id " + post_id);
				// updateSearch();
			}
		});
		return false; // prevent the button from reloading the page
	},

	"click .js-downvote": function(event) {
		var post_id = this._id;

		Meteor.call('downvoteById', post_id, function(error, result) {
			if (error) {
				console.log('Error downvoting: ', error)
			} else {
				// console.log("Down voting post with id " + post_id);
				// updateSearch();
			}
		});
		return false; // prevent the button from reloading the page
	},
	'change label#source-filter > input[type=checkbox]': _.throttle(function(event, template) {
		$(event.currentTarget).parents('.checkbox#source-filter').toggleClass('selected');
		template.sources.set($.makeArray($('form#source-filters').find(':checked').map(function() {
			return $(this).val()
		})));
	}, 200),
	'change label#tag-filter > input[type=checkbox]': _.throttle(function(event, template) {
		$(event.currentTarget).parents('.checkbox#tag-filter').toggleClass('selected');
		template.tags.set($.makeArray($('form#tag-filters').find(':checked').map(function() {
			return $(this).val()
		})));
	}, 200),
	'click #reset-feed-source-filters': function(event, template) {
		event.stopPropagation();
		event.preventDefault();
		$('form#source-filters').find(':checked').removeAttr('checked');
		$('.selected#source-filter').toggleClass('selected', false);
		template.sources.set([]);
	},
	'click #reset-tags-filters': function(event, template) {
		event.stopPropagation();
		event.preventDefault();
		$('form#tag-filters').find(':checked').removeAttr('checked');
		$('.selected#tag-filter').toggleClass('selected', false);
		template.tags.set([]);
	},
});

Template.header.events({
	'input #search-input': _.debounce(function(event, template) {
		// event.preventDefault();
		Session.set('searchQuery', event.target.value);
	}, 300),
	'submit form': function(event) {
		event.preventDefault();
		$('input#search-input').blur();
	}
});

Template.footer.onCreated(function() {
	// Init
	var instance = this;
	var evtSource = new EventSource("/time");
	instance.time = new ReactiveVar(0);
	evtSource.onmessage = function(e) {
		instance.time.set(e.data);
	};
});

Template.footer.helpers({
	year: function() {
		return new Date().getFullYear();
	},
	time: function() {
		return Template.instance().time.get();
	},
	status: function() {
		return Meteor.status().status;
	}
});