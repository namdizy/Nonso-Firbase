const app = firebase.app();

// Initialize Cloud Firestore through Firebase
const firestore = firebase.firestore();
const settings = {/* your settings... */ timestampsInSnapshots: true};
firestore.settings(settings);

//reference to collection
const myUsers = firestore.collection('users');


//SIGNUP EVENT
btnSignUp.addEventListener('click', e => {
  e.preventDefault();
  //get email and password
  //email and password validation before going to FIREBASE
  const email = txtEmail.value;
  const password = txtPassword.value;
  const name = txtName.value;
  const auth = firebase.auth();

  //sign in
  const promise = auth.createUserWithEmailAndPassword(email, password);
  promise.catch(e => console.log(e));
});

//LOGIN EVENT
btnLogin.addEventListener('click', e => {
  e.preventDefault();
  console.log('Login Clicked');
  //get email and password
  const email = txtEmail.value;
  const password = txtPassword.value;
  const auth = firebase.auth();

  //sign in
  const promise = auth.signInWithEmailAndPassword(email, password);
  promise.catch(e => console.log(e));
});

//LOGOUT EVENT
btnLogout.addEventListener('click', e => {
  e.preventDefault();
  firebase.auth().signOut();
});

//AUTH-STATE CHANGE EVENT
firebase.auth().onAuthStateChanged(firebaseUser => {
  if(firebaseUser){
    var user = firebase.auth().currentUser;
    if(user == null){
      //User already signed in  and needs to be stored in firestore
      console.log("This is executing...");
      firestore.collection("users").add({
        email : firebaseUser.email
      })
      .then(function(docRef) {
          console.log("Document written with ID: ", docRef.id);
      })
      .catch(function(error) {
          console.error("Error adding document: ", error);
      });
    } else {
      //User in the DB
      console.log(firebaseUser.email + ' logged in');
    }
  } else {
    console.log('User Not Logged In');
  }
});
