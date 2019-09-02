const User = require('../models/user')

module.exports = {
	postRegister(req, res, next) {
		Account.register(new Account({username: req.body.username}), req.body.password, function(err) {
    if (err) {
      console.log('error while user register!', err);
      return next(err);
    }

    console.log('user registered!');

    res.redirect('/');
	}
}