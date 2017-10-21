var Authing = require('../src/index.js');

var email = "xieyang@dodora.cn";
var password = 'xieyang123!';

var auth = new Authing({
	clientId: '59e374332023830871913ebf',
	email: 'xieyang@dodora.cn',
	password: 'xieyang123!'
});

auth.list().then(function(res) {
	// console.log(res);
}).catch(function(error) {
	console.log('sss')
	console.log(error);
});

auth.login({
	email: email,
	password: password
}).then(function(res) {
	// console.log(res);
}).catch(function(error) {
	console.log('sss')
	console.log(error);
});

auth.register({
	email: email,
	password: password
}).then(function(res) {
	console.log(res);
}).catch(function(error) {
	console.log('sss')
	console.log(error);
});

