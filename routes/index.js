var express = require('express');
var router = express.Router();
var https = require('https');

/* GET home page. */
router.get('/', function(req, res) {
    res.render('index', {title: 'Chatter Box'});
});

var SECRET = "6LdvpwATAAAAALo_iHl-t5lI-_XS_Ox6Ci5acWFA";
 
// Helper function to make API call to recatpcha and check response
function verifyRecaptcha(key, callback) {
    https.get("https://www.google.com/recaptcha/api/siteverify?secret=" + SECRET + "&response=" + key, function(res) {
        var data = "";
        res.on('data', function (chunk) {
            data += chunk.toString();
        });
        res.on('end', function() {
            try {
	            var parsedData = JSON.parse(data);
	            callback(parsedData.success);
            } catch (e) {
                callback(false);
            }
        });
    });
};

module.exports = router;
