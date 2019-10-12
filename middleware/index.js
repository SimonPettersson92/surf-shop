const Review = require('../models/review');
const User = require('../models/user');
const Post = require('../models/post');
const { cloudinary } = require('../cloudinary');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapBoxToken });

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

const middleware = {
	asyncErrorHandler: (fn) => 
		(req, res, next) => {
			Promise.resolve(fn(req, res, next))
				.catch(next);
		},
	isReviewAuthor: async (req, res, next) => {
		let review = await Review.findById(req.params.review_id);
		if (review.author.equals(req.user._id)) {
			return next();
		}
		req.session.error = 'Bye bye';
		return res.redirect('/');
	},
	isLoggedIn: (req, res, next) => {
		if (req.isAuthenticated()) {
			return next();
		}
		req.session.error = 'You need to be logged in to do that!';
		req.session.redirectTo = req.originalUrl;
		res.redirect('/login');
	},
	isAuthor: async (req, res, next) => {
		const post = await Post.findById(req.params.id);
		if (post.author.equals(req.user._id)) {
			res.locals.post = post;
			return next();
		}
		req.session.error = 'Access Denied';
		res.redirect('back');
	},
	isValidPassword: async (req, res, next) => {
		const { user } = await User.authenticate()(req.user.username, req.body.currentPassword);
		if (user) {
			// add user to res.locals
			res.locals.user = user;
			next();
		} else {
			middleware.deleteProfileImage(req);
			req.session.error = 'Incorrect current password!';
			return res.redirect('/profile');
		}
	},
	changePassword: async (req, res, next) => {
		const {
			newPassword,
			passwordConfirmation
		} = req.body;
		if (newPassword && !passwordConfirmation) {
			middleware.deleteProfileImage(req);
			req.session.error = 'Missing password confirmation!';
			return res.redirect('/profile');
		} else if (newPassword && passwordConfirmation) {
			const { user } = res.locals;
			if (newPassword === passwordConfirmation) {
				await user.setPassword(newPassword);
				next();
			} else {
				middleware.deleteProfileImage(req);				
				req.session.error = 'New passwords must match!';
				return res.redirect('/profile');
			}
		} else {
			next();
		}
	},
	deleteProfileImage: async req => {
		if (req.file) await cloudinary.v2.uploader.destroy(req.file.public_id);
	},
	// create an async middleware method named searchAndFilterPosts
	async searchAndFilterPosts(req, res, next) {
		// pull keys from req.query (if there are any) and assign them
		// to queryKeys variable as an array of string values
		const queryKeys = Object.keys(req.query);
		/*
			check if queryKeys array has any values in it
			if true then we know that req.query has properties
			which means the user:
			a) clicked the paginate button
			b) submitted the search/filter form
			c) both a and b
		*/
		if (queryKeys.length) {
			const dbQueries = [];
			// destructure all potential properties from req.query
			let { search, price, avgRating, location, distance } = req.query;
			// check if search exists, if it does then we know that the user
			// submitted the search/filter form with a search query
			if (search) {
				// convert search to a regular expression and
				// escape any special characters
				search = new RegExp(escapeRegExp(search), 'gi');
				// create a db query object and push it into the dbQueries array
				// now the database will know to search the title, description and location
				// fields, using the search regular expression
				dbQueries.push({ $or: [
						{ title: search },
						{ description: search },
						{ location: search }
					]});
			}
			// check if location exists, if it does then we know that the user
			// submitted the search/filter form with a location query
			if (location) {
				let coordinates;
				try {
					if (typeof JSON.parse(location) === 'number') {
						throw new Error;
					}
					location = JSON.parse(location);
					console.log(location);
					coordinates = location;
				} catch(err) {
					// geocode the location to extract geo-coordinates (lat, lng)
					const response = await geocodingClient
					  .forwardGeocode({
						query: location,
						limit: 1
					})
					.send();
					// destructure coordinates [ <longitude>, <latitude> ]
					coordinates = response.body.features[0].geometry.coordinates;
				}
				
				// get the max distance or set it to 25 km
				let maxDistance = distance || 25;
				// convert the distance to meters
				maxDistance *= 1000;
				// create a db query object for proximity searching via location (geometry)
				// and push it into the dbQueries array
				dbQueries.push({
					geometry: {
						$near: {
							$geometry: {
								type: 'Point',
								coordinates
							},
							$maxDistance: maxDistance	
						}
					}
				});
			}
			// check if price exists, if it does then we know that the user
			// submitted the search/filter form with a price query (min, max or both)
			if (price) {
				/*
					check individual min/max values and create db query object for each
					then push the object into the dbQueries array
					min will search for all post documents with price
					greater than or equal to ($gte) the min value
					max will search for all post documents with price
					less than or equal to ($lte) the max value
				*/
				if (price.min) dbQueries.push({ price: { $gte: price.min } });
				if (price.max) { 
					dbQueries.push({ price: { $lte: price.max } })
				};
			}
			// check if avgRating exists, if it does then we know that the user
			// submitted the search/filter form with an avgRating query (0-5 stars)
			if (avgRating) {
				// create a db query object that finds any post documents where the avgRating
				// value is included in the avgRating array (e.g. [0, 1, 2, 3, 4, 5])
				dbQueries.push({ avgRating: { $in: avgRating } });
			}
			// pass database query to next middleware in route's middleware chain
			// which is the postIndex method from /controllers/postsController.js
			res.locals.dbQuery = dbQueries.length ? { $and: dbQueries } : {};
		}
		// pass req.query to the view as a local variable to be used in the searchAndFilter.ejs partial
		// this allows us to maintain the state of the searchAndFilter form
		res.locals.query = req.query;

		// build the paginateUrl for paginatePosts partial
		// first remove 'page' string value from queryKeys array, if it exists
		queryKeys.splice(queryKeys.indexOf('page'), 1);
		/*
			Now check if queryKeys has any other values. If it does, we know the user submitted the
			search/filter form. If it doesn't, they are just showing /posts or e.g. /posts?page=2.
			We assign the delimiter based on whether or not the user submitted the search/filter form.
		*/
		const delimiter = queryKeys.length ? '&' : '?';
		// build the paginateUrl local variable to be used in paginatePosts.ejs partial.
		// Do this by taking the originalUrl and replacing any occurrence of ?page=N or &page=N with an empty string
		// Then append the proper delimiter and page= to the end
		// The actual page number gets assigned in paginatePosts.ejs
		res.locals.paginateUrl = req.originalUrl.replace(/(\?|\&)page=\d+/g, '') + `${delimiter}page=`
		// move to the next middleware (postIndex method)
		next();
	}
};

module.exports = middleware;