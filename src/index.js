var graphql = require('graphql.js');
var configs = require('./configs');

var Authing = function(opts) {

	if(!opts.clientId) {
		throw 'clientId is not provided';
	}

	if(!opts.email) {
		throw 'email is not provided';
	}

	if(!opts.password) {
		throw 'password is not provided';
	}

	this.opts = opts;
	this.authed = false;

	this.initUserService();

	this._login({
		email: this.opts.email,
		password: this.opts.password
	}).then(function(res) {

		
		
	}).catch(function(error) {

	})
}

Authing.prototype = {
	initUserService: function(headers) {

		if(headers) {
			this.UserService = graphql(configs.services.user.host, {
			  	method: "POST",
			  	headers: headers
			});
		}else {
			this.UserService = graphql(configs.services.user.host, {
			  	method: "POST",
			});
		}

	},

	_login: function(options) {

		if(!options) {
			throw 'options is not provided';
		}		

		return this.UserService(`
			mutation login($email: String!, $password: String, $lastIP: String) {
			    login(email: $email, password: $password, lastIP: $lastIP) {
				    _id
				    email
				    emailVerified
				    username
				    nickname
				    company
				    photo
				    browser
				    token
				    tokenExpiredAt
				    loginsCount
				    lastLogin
				    lastIP
				    signedUp
				    blocked
				    isDeleted
			    }
			}
		`, options).then(function(res) {
			return res.login;
		});

	},

	login: function(options) {
		return this._login(options);
	},

	register: function(options) {

		if(!options) {
			throw 'options is not provided';
		}

		options.registerInClient = this.opts.clientId;

		return this.UserService(`
			mutation register(
			    $email: String!, 
			    $password: String, 
			    $lastIP: String, 
			    $forceLogin: Boolean,
			    $registerInClient: String!
			) {
			    register(userInfo: {
			        email: $email,
			        password: $password,
			        lastIP: $lastIP,
			        forceLogin: $forceLogin,
			        registerInClient: $registerInClient
			    }) {
			        _id,
			        email,
			        emailVerified,
			        username,
			        nickname,
			        company,
			        photo,
			        browser,
			        password,
			        token,
			        group {
			            name
			        },
			        blocked
			    }
			}
		`, options).then(function(res) {
			return res.register;
		});
	},

	logout: function(_id) {

		if(!_id) {
			throw '_id is not provided';
		}

		return this.update({
			_id: _id,
			tokenExpiredAt: 0
		});

	},

	list: function(page, count) {

		page = page || 1;
		count = count || 10;

		var options = {
			registerInClient: this.opts.clientId,
			page: page,
			count: count
		}

		return this.UserService(`
			query users($registerInClient: String, $page: Int, $count: Int) {
			  users(registerInClient: $registerInClient, page: $page, count: $count) {
			    _id
			    email
			    emailVerified
			    username
			    nickname
			    company
			    photo
			    browser
			    token
			    tokenExpiredAt
			    loginsCount
			    lastLogin
			    lastIP
			    signedUp
			    blocked
			    isDeleted
			    userLocation {
			      _id
			      when
			      where
			    }
			    userLoginHistory {
			      _id
			      when
			      success
			      ip
			    }
			  }
			}
		`, options).then(function(res) {
			return res.users;
		});
	},

	remove: function(_id) {
		if(!_id) {
			throw '_id is not provided';
		}

		return this.UserService(`
			mutation removeUsers($ids: [String]){
			  removeUsers(ids: $ids) {
			    _id
			  }
			}
		`, {
			ids: [_id]
		}).then(function(res) {
			return res.removeUsers;
		});		

	},

	update: function(options) {
		if(!options) {
			throw 'options is not provided';
		}

		if(!options._id) {
			throw '_id in options is not provided';
		}

		var 
			_args = [],
			_argsString = '',

			_argsFiller = [],

			keyTypeList = {
				_id: 'String',
				email: 'String',
				emailVerified: 'Boolean',
				username: 'String',
				nickname: 'String',
				company: 'String',
				photo: 'String',
				browser: 'String',
				password: 'String',
				registerInClient: 'String',
				token: 'String',
				tokenExpiredAt: 'String',
				loginsCount: 'Int',
				lastLogin: 'String',
				lastIP: 'String',
				signedUp: 'String',
				blocked: 'Boolean',
				isDeleted: 'Boolean'
			};

		for(var key in options) {
			if(keyTypeList[key]) {
				_args.push('$' + key + ': ' + keyTypeList[key]);
				_argsFiller.push(key + ': $' + key);
			}
		}

		_argsString = _args.join(', ');

		return this.UserService(`
			mutation UpdateUser(${_argsString}){
			  updateUser(options: {
			  	${_argsFiller.join(', ')}
			  }) {
			    _id
			  }
			}
		`, options).then(function(res) {
			return res.updateUser;
		});		
	}
}

module.exports = Authing;
