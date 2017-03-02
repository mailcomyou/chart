var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

  /* GET users listing. */
  router.get('/temp/:id', function(req, res, next) {


      let fs = require('fs');
      let variant = req.params.id;
      fs.readFile("public/jsons/" + variant + ".json", {encoding: 'utf-8'}, function(err,data){
          if (!err){

              res.writeHead(200, {'Content-Type': 'application/json'});
              res.write(data);

              res.end();
          }else{
              console.log(err);
          }
      });



  });

module.exports = router;
