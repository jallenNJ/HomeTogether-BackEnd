var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  console.log("Get to household with session username: ");
  console.log(req.session.username);
  res.end();
  return;
});

module.exports = router;
