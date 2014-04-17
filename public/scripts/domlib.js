// Converts a form to a key value pair using native JS (I GOT A NEED FOR SPEED!)
//
// @param  formCtl  {String}  The ID of the form you would like to create an object from
// @param  callback {Object}  Function that recieves err, object as params
//

function serializeForm(formCtl, callback) {
  var formDoc = document.getElementById(formCtl);
  if(formDoc.length === 0) {
    callback('No forms were found matching your stuff');
  } else if(formDoc.length > 1) {
    callback('Multiple elements matched your client ID, THIS IS ILLEGAL!');
  } else {
   //pass back forms key value pair
    callback(null, '');   
  }
}
