var Authing = require('../index.js');

var email = "xieyang@dodora.cn";
var password = "xieyang123!";
var secret = '52f6bf832c7a8e9aa2a467df91393a73';

var auth = new Authing({
	clientId: '5a0da5e81bc086000170a546',
	secret: secret
});

auth.then(function(auth) {

	auth.list().then(function(res) {
		console.log(res);
	}).catch(function(error) {
		console.log('list')
		console.log(error);
	});

	auth.register({
		email: email,
		password: password
	}).then(function(res) {
		console.log('注册成功')
		console.log(res);
	}).catch(function(error) {
		console.log('sss')
		console.log(error);
	});

	auth.login({
		email: email,
		password: password
	}).then(function(res) {
		console.log('登录成功')		
		console.log(res);
	}).catch(function(error) {
		console.log('login')
		console.log(error);
	});


	auth.update({
		_id: '5a11386528245a0001fdca83',
		nickname: 'fucku',
		username: 'fuckuuu'
	})
	.then(function(res) {
		console.log('修改成功')
		console.log(res);
	}).catch(function(error) {
		console.log('sss')
		console.log(error);
	});

});

