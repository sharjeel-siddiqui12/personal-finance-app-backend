import { hash as _hash } from 'bcrypt';
const saltRounds = 10;

_hash('pass123', saltRounds, function(err, hash) {
  console.log(hash); // Use this hash in your database
});