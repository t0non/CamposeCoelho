const http = require('http');

http.get('http://localhost:3000/admin', (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
