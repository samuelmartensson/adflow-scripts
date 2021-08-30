require('dotenv').config({ path: __dirname + '/.env' });
const fetch = require('node-fetch');
const express = require('express');
const app = express();
const port = 3001;

const DB_ROOT = process.env.FIREBASE_DB_URL;

app.get('/', async (req, res) => {
  fetch(`${DB_ROOT}/${req.query.orgId}.json`)
    .then((response) => response.json())
    .then((data) => {
      if (data) {
        res.send(
          Object.values(data).filter(
            (item) => item['render-status'] === 'ready'
          )
        );
      } else {
        res.send([]);
      }
    })
    .catch(() => {
      res.send({ error: { message: 'Something went wrong in proxy' } });
    });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
