const functions = require('firebase-functions');
const firebase = require('firebase');
const admin = require('firebase-admin');
const express = require('express');
const app = express();
const serviceAccount = require('./serviceAccountKey.json');
const firebaseConfig = require('./firebaseConfig.json');

firebase.initializeApp(firebaseConfig);

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: 'https://socialapp-951f9.firebaseio.com/'
});

const db = admin.firestore();

app.get('/screams', (req, res) => {
	db
		.collection('screams')
		.orderBy('createdAt', 'desc')
		.get()
		.then((data) => {
			let screams = [];
			data.forEach((doc) => {
				screams.push({
					screamId: doc.id,
					body: doc.data().body,
					userHandle: doc.data().userHandle,
					createdAt: doc.data().createdAt
				});
			});
			return res.json(screams);
		})
		.catch((err) => console.error(err));
});

app.post('/scream', (req, res) => {
	const newScream = {
		body: req.body.body,
		userHandle: req.body.userHandle,
		createdAt: new Date().toISOString()
	};

	db
		.collection('screams')
		.add(newScream)
		.then((doc) => {
			return res.json({ message: `document ${doc.id} created successfully`});
		})
		.catch((err) => {
			res.status(500).json({ error: 'something went wrong'});
			console.error(err);
		});
});

function isEmpty(string) {
	if (string.trim() === '') return true;
	else return false;
}

function isEmail(string) {
  const regEx = /.*/
  if (string.match(regEx)) {
  	console.log(`The new email is => ${string}`);
  	return true;
  } else {
  	return false;
  }
}

app.post('/signup', (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword,
		handle: req.body.handle
	};

	let errors = {};
	
	if (isEmpty(newUser.email)) {
		errors.email = 'Must not be empty';
	} else if (!isEmail(newUser.email)) {
		errors.email = 'Not a valid email address'
	}

	if (isEmpty(newUser.password)) {
		errors.password = 'Cannot be empty'
	} else if (newUser.password !== newUser.confirmPassword) {
		errors.confirmPassword = 'Passwords must match'
	}

	if (isEmpty(newUser.handle)) {
		errors.handle = 'Cannot be empty'
	}

	if (Object.keys(errors).length > 0) {
		return res.status(400).json(errors);
	}

	let token, userId;

	db.doc(`/users/${newUser.handle}`).get()
		.then(doc => {
			if (doc.exists) {
				return res.status(400).json({ handle: 'this handle is already taken' });
			} else {
				return firebase.auth()
					.createUserWithEmailAndPassword(newUser.email, newUser.password);
			}
		})
		.then(data => {
			userId = data.user.uid;
			return data.user.getIdToken();
		})
		.then(idToken => {
			token = idToken;
			const userCredentials = {
				handle: newUser.handle,
				email: newUser.email,
				createdAt: new Date().toISOString(),
				userId
			}
			return db.doc(`/users/${newUser.handle}`).set(userCredentials);
		})
		.then(() => {
			return res.status(201).json({ token });
		})
		.catch(err => {
			console.error(err);
			if (err.code === 'auth/email-already-in-use') {
				return res.status(400).json({ email: 'Email is already in use' });
			} else {
				return res.status(500).json({ error: err.code });
			}
		});
});

app.post('/login', (req, res) => {
	const user = {
		email: req.body.email,
		password: req.body.password
	}

	let errors = {};

	if (isEmpty(user.email)) errors.email = 'Must not be empty';
	if (isEmpty(user.password)) errors.password = 'Must not be empty';

	if (Object.keys(errors).length > 0) return res.status(400).json(errors);

	firebase.auth().signInWithEmailAndPassword(user.email, user.password)
		.then(data => {
			return data.user.getIdToken();
		})
		.then(token => {
			return res.json({token});
		})
		.catch(err => {
			console.error(err);
			if (err.code === 'auth/wrong-password'){
				return res.status(403).json({ general: "Wrong credentials. Please try again" })
			} else {
				return res.status(500).json({ error: err.code });
			}
		});
});


// you want a base url.
// then you want base_url/api for an api.
// This automatically turns into multiple routes.

exports.api = functions.https.onRequest(app);