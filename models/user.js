const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
	email: String,
	image: String,
	posts: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Post'
		}
	]
})

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);

/*Design models
User
-email - string
-password -string
-username -string
-profilePic - string
-posts - array of objects ref Post
-reviews - array of objects ref Review
*/