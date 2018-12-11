const functions = require('firebase-functions');
const request = require('request-promise');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const admin_firestore = admin.firestore();
const admin_storage = admin.storage();                  // Initialize Cloud Firestore through Firebase
const ourUsers = admin_firestore.collection('users');       //reference to collection
const ourJourneys = admin_firestore.collection('journeys'); //reference to collection
const ourSteps = admin_firestore.collection('steps');

//CLOUD FUNCTION - CREATE USER
// exports.createUser = functions.auth.user().onCreate((user) => {
//   //CREARE AN EMPTY JOURNEY SUB_COLLECTION
//
// });

exports.createUser = functions.firestore
  .document('users/{userId}')
  .onCreate((snap, context) => {
    const newValue = snap.data();

    // //Initialize JOURNEY SUB_COLLECTION
    // ourUsers.doc(context.params.userId)
    // .collection('journeyIds')
    // .doc('initialization')
    // .set(
    //   {init: true}
    // )
    // .then(function(docRef) {
    //     console.log("JOURNEY CREATED - Document successfully written");
    //     return true;
    // })
    // .catch(function(error) {
    //     console.error("Error adding JOURNEY document: ", error);
    //     return true;
    // });
});

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
      if (newValue.imageUri == previousValue.imageUri) {
        ourUsers.doc(userId).collection('journeyIds')
        .get().then(function(querySnapshot){
          querySnapshot.forEach(function(doc) {
        // doc.data() is never undefined for query doc snapshots
        //console.log(doc.id, " => ", doc.data());
        console.log(userId);
        console.log(doc.id);
            ourUsers.doc(userId)
            .collection('journeyIds').doc(doc.id)
            .update({
              updated : true
            })
            .then(function() {
                console.log("JOURNEY - Document successfully updated!");
            })
            .catch(function(error) {
                // The document probably doesn't exist.
                console.error("JOURNEY - Error updating document: ", error);
            });
          });
        });
        return null;
      }

    //get list of Journey IDs
    // ourUsers.document(userId).collection('journeyIds')
    //Update ImageUri for those JourneyIds

     // Then return a promise of a set operation to update the doc
     return change.after.ref.update({
       updatedAt : admin.firestore.FieldValue.serverTimestamp(),
       imageUri : newValue.imageUri
     }, {merge: true});
    });


exports.createJourney = functions.firestore
    .document('journeys/{journeyId}')
    .onCreate((snap, context) => {
      const newValue = snap.data();
      const journeyId = context.params.journeyId;
      console.log("SNAP DATA: " + JSON.stringify(newValue));

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

      // //Initialize STEP SUB_COLLECTION
      // ourJourneys.doc(journeyId)
      // .collection('stepIds')
      // .doc('initialization')
      // .set(
      //   {init: true}
      // )
      // .then(function(docRef) {
      //     console.log("JOURNEY CREATED - STEP INIT - Document successfully written");
      //     return true;
      // })
      // .catch(function(error) {
      //     console.error("Error adding JOURNEY - STEP INIT document: ", error);
      //     return true;
      // });
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
          return ourSteps.doc(stepId).get().then(doc => {
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

//createdBy will only exits inside a journey and a step object - userId, name, imageUrl, createdType: [user, journey, step]

exports.deleteUser = functions.firestore
    .document('users/{userId}')
    .onDelete((snap, context) => {
      // Get an object representing the document prior to deletion
      // e.g. {'name': 'Marie', 'age': 66}
      const deletedValue = snap.data();
      console.log("DELETE VALUE" + JSON.stringify(deletedValue));
      console.log("DELETE CONTEXT: " + JSON.stringify(context.params));


      // perform desired operations ...
    });

//STEP - DELETE
exports.deleteStep = functions.firestore
    .document('steps/{stepId}')
    .onDelete((snap, context) => {
      // Get an object representing the document prior to deletion
      const deletedValue = snap.data();
      const stepId = context.params.stepId;
      const journeyId = deletedValue.createdBy.id;
      //this is same as stepId above
      const stepId_docId = ourJourneys.doc(journeyId).collection("stepIds").where("stepId", "==", stepId);
      const stepImageRefs = [];

      //check for step type - [images, videos, text]
      //based on step stye delelte appropriate from storage
      //get all imageReferences for the delete step
      stepImageRefs = getStepImageReferences(deletedValue);

      //delete all step realated images
      deleteStepImages(stepImageRefs);

      //delete the step from StepIds collection
      deleteFromStepSubCollection(stepId_docId);

    });

//STEP - return all the imageReferences for the deleting step
function getStepImageReferences(deletedValue){
  let tempImgRefArray = [];
  for(let i=0; i< deletedValue.images.length; i++){
    tempImgRefArray.push(deletedValue.images[i].imageReference);
  }

  return tempImgRefArray;
}

//STEP - delete all Images for the Step from STORAGE
function deleteStepImages(stepImageRefs){
  for(let i=0; i < stepImageRefs.length; i++){
    // Create a reference to the file to delete
    var deleteImageRef = admin_storage.ref().child(stepImageRefs[i]);
    // Delete the file
    deleteImageRef.delete().then(function() {
      // File deleted successfully
      console.log("Step Image Deleted successfully");
    }).catch(function(error) {
      // Uh-oh, an error occurred!
      console.error("Error deleting step image - ", error);
    });
  }
}

//
//STEP - delete the step from StepIds Sub-Collection inside Journey Collection
function deleteFromStepSubCollection(stepId_docId){
  ourJourneys.collection("stepIds").doc(stepId_docId).delete().then(function() {
    console.log("Document successfully deleted!");
  }).catch(function(error) {
      console.error("Error removing document: ", error);
  });
}


//JOURNEY - DELETE
exports.deleteJourney = functions.firestore
    .document('journeys/{journeyId}')
    .onDelete((snap, context) => {
      // Get an object representing the document prior to deletion
      const deletedValue = snap.data();
      const journeyId = context.params.journeyId;
      const journeyImageRef = deletedValue.image.imageReference;

      //clean up image
      deleteJourneyImage(journeyImageRef);

      //clean up post and stepId sub-collection - ???
      //CONTINUE HERE!!!


    });

function deleteJourneyImage(journeyImageRef){
  // Create a reference to the file to delete
  var deleteImageRef = admin_storage.ref().child(journeyImageRef);
  // Delete the file
  deleteImageRef.delete().then(function() {
    // File deleted successfully
    console.log("Journey Image Deleted successfully");
  }).catch(function(error) {
    // Uh-oh, an error occurred!
    console.error("Error deleting Journey image - ", error);
  });
}

function deleteCollection(db, collectionPath, batchSize) {
  var collectionRef = db.collection(collectionPath);
  var query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, batchSize, resolve, reject);
  });
}

function deleteQueryBatch(db, query, batchSize, resolve, reject) {
  query.get()
      .then((snapshot) => {
        // When there are no documents left, we are done
        if (snapshot.size == 0) {
          return 0;
        }

        // Delete documents in a batch
        var batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        return batch.commit().then(() => {
          return snapshot.size;
        });
      }).then((numDeleted) => {
        if (numDeleted === 0) {
          resolve();
          return;
        }

        // Recurse on the next process tick, to avoid
        // exploding the stack.
        process.nextTick(() => {
          deleteQueryBatch(db, query, batchSize, resolve, reject);
        });
      })
      .catch(reject);
}



//ELASTIC SEARCH


exports.indexUsersToElastic = functions.firestore.document('/users/{userId}')
  .onWrite((change, context) => {
    let userData = change.after.data();
    let userId = context.params.userId;

    console.log('Indexing User: ', userData);

    let elasticSearchConfig = functions.config().elasticsearch;
    let elasticSearchUrl = elasticSearchConfig.url + 'users/' + userId;
    let elasticSearchMethod = userData ? 'POST' : 'DELETE';

    let elasticSearchRequest = {
      method: elasticSearchMethod,
      url: elasticSearchUrl,
      auth: {
        username: elasticSearchConfig.username,
        password: elasticSearchConfig.password,
      },
      body: userData,
      json: true
    };

    return request(elasticSearchRequest).then(response => {
      console.log('ElasticSearch response', response);
    });
  });


  exports.indexTagsToElasticSearch = functions.firestore.document('/categories/categories')
    .onWrite((change, context) => {


    });