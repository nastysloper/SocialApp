const functions = require('firebase-functions');
const admin = require('firebase-admin');

var serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: 'https://socialapp-951f9.firebaseio.com/'
});
	
const express = require('express');
const app = express();

app.get('/screams', (req, res) => {
	admin
		.firestore()
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

app.post('/screams', (req, res) => {
	const newScream = {
		body: req.body.body,
		userHandle: req.body.userHandle,
		createdAt: admin.firestore.Timestamp.fromDate(new Date())
	};

	admin
		.firestore()
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

// you want a base url.
// then you want base_url/api for an api.
// This automatically turns into multiple routes.

exports.api = functions.https.onRequest(app);