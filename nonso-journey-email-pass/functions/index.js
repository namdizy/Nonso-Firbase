const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const admin_firestore = admin.firestore();                  // Initialize Cloud Firestore through Firebase
const ourUsers = admin_firestore.collection('users');       //reference to collection
const ourJourneys = admin_firestore.collection('journeys'); //reference to collection
const outSteps = admin_firestore.collection('steps');

//CLOUD FUNCTION - CREATE USER
exports.createUser = functions.auth.user().onCreate((user) => {

  // //User Object Definition
  // let userDoc = {
  //   createdAt: user.metadata.creationTime,
  //   createdJourneys : {
  //     journeyId : []
  //   },
  //   email : user.email,
  //   followingJourneys: {},
  //   followingUsers : {},
  //   followersUsers: {},
  //   goal: '',
  //   imageUri: '',
  //   subscribedJourneys : {},
  //   userId: user.uid,
  //   userName : user.displayName,
  //   updatedAt: user.metadata.creationTime,
  //   flagUpdate: false
  // };
  //
  // // Add a new document in collection "USERS"
  // ourUsers.doc(user.uid).set(userDoc)
  // .then(function() {
  //     console.log("Document successfully written!");
  //     return true;
  // })
  // .catch(function(error) {
  //     console.error("Error writing document: ", error);
  //     return true;
  // });

  // admin_firestore.auth().currentUser.sendEmailVerification().then(function() {
  //   // Email sent.
  //   console.log("Verification Email Sent!");
  //   return true;
  // }).catch(function(error) {
  //   // An error happened.
  //   console.error("Email Verification Error - ", error);
  //   return true;
  // });

});

//CLOUD FUNCTION - UPDATE USER
//****Make sure flagUpdate is set to FALSE to write data in FIRESTORE *****
exports.updateUser = functions.firestore
    .document('users/{userId}')
    .onUpdate((change, context) => {
      const newValue = change.after.data();
      console.log('New value:' +  JSON.stringify(newValue));

      const previousValue = change.before.data();
      console.log('Previous Value: ' + JSON.stringify(previousValue));

      const userId = context.params.userId;

     // perform desired operations ...
     // Any time you write to the same document that triggered a function,
     // you are at risk of creating an infinite loop. Use caution and ensure that
     // you safely exit the function when no change is needed.
     //how efficient is this????
      if (newValue.imageUri == previousValue.imageUri) return null;

    //get list of Journey IDs
    // ourUsers.document(userId).collection('journeyIds')
    //Update ImageUri for those JourneyIds

     // Then return a promise of a set operation to update the doc
     return change.after.ref.update({
       updatedAt : admin.firestore.FieldValue.serverTimestamp(),
       imageUri : newValue.imageUri
     }, {merge: true});
    });


//CLOUD FUNCTION - CREATE JOURNEY
exports.createJourney = functions.firestore
    .document('journeys/{journeyId}')
    .onCreate((snap, context) => {
      const newValue = snap.data();
      const journeyId = context.params.journeyId;
      console.log("SNAP DATA: " + JSON.stringify(newValue));

      //TODO: Use SNAP.DATA() for userId instead of HARD-CODED ID.
      ourUsers.doc(newValue.createdBy.id)
      .collection('journeyIds')
      .add(
        {journeyId: journeyId}
      )
      .then(function(docRef) {
          console.log("JOURNEY CREATED - Document successfully written");
          return true;
      })
      .catch(function(error) {
          console.error("Error adding JOURNEY document: ", error);
          return true;
      });
});

exports.createStep = functions.firestore
  .document('steps/{stepId}')
  .onCreate((snap, context) => {
    const newValue = snap.data();
    const stepId = context.params.stepId;
    console.log("SNAP DATA: " + JSON.stringify(newValue));
    console.log("CONTEXT DATA: " + JSON.stringify(context.params));
    //get JourneyId from Front End

    //get snapId and update journeyId
    ourJourneys.doc(newValue.createdBy.id)
    .collection('stepIds')
    .add(
      { stepId : stepId }
    )
    .then(function(docRef) {
        console.log("STEP CREATED - Document successfully written");
        //Is it best practice to store journeyId with journeys doc??? Will journeyId be available when required based on Firestore APIs?
        //get journeyId and update userId
        //use docRef.id to update user object
        return true;
    })
    .catch(function(error) {
        console.error("Error adding STEP document: ", error);
        return true;
    });

  });


  exports.getJourneys = functions.https.onCall((data, context) =>{
        const journeyIds = data.ids;
        // const uid = context.auth.uid;


        //TODO: Check context.auth, if null return. Make sure caller is authenticated, else return 
        // if(uid == null){
        //   console.log("GETJOURNEYS: User not authenticated");
        //   throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
        //   'while authenticated.');
        // }

        return Promise.all(journeyIds.map(
          journeyId => {
            return ourJourneys.doc(journeyId).get().then(doc => {
              if (!doc.exists) {
                console.log('No such document!');
                throw new functions.https.HttpsError('not-found', 'Journey document not found ' +
                    'Journey with id '+ journeyId +' not found');
              } else {
                  let data = doc.data();
                  data["createdAt"] = data["createdAt"].toString();
                  return data;
              }
            })
        }));

    });

  exports.getSteps = functions.https.onCall((data, context) => {
    const stepIds = data.ids;

    //TODO: Check context.auth, if null return. Make sure caller is authenticated, else return 

    return Promise.all(stepIds.map(
        stepId => {
          return ourSteps.doc(stepId).get.then(doc => {
              if (!doc.exists) {
                  console.log('No such document!');
                  throw new functions.https.HttpsError('not-found', 'Step document not found ' +
                      'Step with id '+ stepId +' not found');
              } else {
                  let data = doc.data();
                  data["createdAt"] = data["createdAt"].toString();
                  return data;
              }
          })
        }));
  });


/*
* This function listens for changes in the post subcollection likes shard 
* When the shard count is updated the function will update parents likeCount variable
* @params: collectionId: the collection where change occured, this could be a post collection or likes shard collection
*                    id: the document being updated 
*/

exports.updateCounter = functions.firestore
  .document('journeys/{journeyId}/{collectionId}/{id}')
  .onWrite((change, context) => {

    var docRef = change.after.ref;

    if(context.params.collectionId == "likesCountShard"){
    
      //likesCountShard collection
      docRef.parent.get().then(doc =>{
        let total_count = 0;
        snapshot.forEach(doc => {
            total_count += doc.data().count;
        });

        //post docuument reference
        docRef.parent.parent.update({
            likesCount: total_count
        })
        .then(function() {
            console.log("Likes count updated to: " + total_count);
        })
        .catch(function(error) {
            // The document probably doesn't exist.
            console.error("Error updating likes count: ", error);
        });

      });
    }
  });

   // If we set `/users/marie/incoming_messages/134` to {body: "Hello"} then
      // context.params.userId == "marie";
      // context.params.messageCollectionId == "incoming_messages";
      // context.params.messageId == "134";
      // ... and ...
      // change.after.data() == {body: "Hello"}

//createdBy will only exits inside a journey and a step object - userId, name, imageUrl, createdType: [user, journey, step]
