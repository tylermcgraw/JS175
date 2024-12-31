const HTTP = require('http');
const PORT = 3000;
const URL = require('url').URL;
const APR = 5;
const HTML_START = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Loan Calculator</title>
    <style type="text/css">
      body {
        background: rgba(250, 250, 250);
        font-family: sans-serif;
        color: rgb(50, 50, 50);
      }

      article {
        width: 100%;
        max-width: 40rem;
        margin: 0 auto;
        padding: 1rem 2rem;
      }

      h1 {
        font-size: 2.5rem;
        text-align: center;
      }

      table {
        font-size: 1.5rem;
      }
      th {
        text-align: right;
      }
      td {
        text-align: center;
      }
      th,
      td {
        padding: 0.5rem;
      }
    </style>
  </head>
  <body>
    <article>
      <h1>Loan Calculator</h1>
      <table>
        <tbody>
`;
const HTML_END = `
        </tbody>
      </table>
    </article>
  </body>
</html>`;

function getMonthlyPayment(amount, duration) {
  return (amount * ((APR / 1200) / (1 - Math.pow((1 + (APR / 1200)), (-(duration * 12)))))).toFixed(2);
}

function getTable(amount, duration) {
  return `
<tr>
  <th>Amount:</th>
  <td>
    <a href='/?amount=${Number(amount) - 100}&duration=${duration}'>- $100</a>
  </td>
  <td>$${amount}</td>
  <td>
    <a href='/?amount=${Number(amount) + 100}&duration=${duration}'>+ $100</a>
  </td>
</tr>
<tr>
  <th>Duration:</th>
  <td>
    <a href='/?amount=${amount}&duration=${Number(duration) - 1}'>- 1 year</a>
  </td>
  <td>${duration} years</td>
  <td>
    <a href='/?amount=${amount}&duration=${Number(duration) + 1}'>+ 1 year</a>
  </td>
</tr>
<tr>
<th>APR:</th>
<td>${APR}%</td>
</tr>
<tr>
  <th>Monthly payment:</th>
  <td>$${getMonthlyPayment(amount, duration)}</td>
</tr>`;
}

function getHTML(amount, duration) {
  return HTML_START + getTable(amount, duration) + HTML_END;
}

const SERVER = HTTP.createServer((req, res) => {
  let method = req.method;
  let path = req.url;
  const myURL = new URL(path, `http://localhost:${PORT}`);

  if (path === '/favicon.ico') {
    res.statusCode = 404;
    res.end();
  } else {
    let amount = myURL.searchParams.get("amount") || 5000;
    let duration = myURL.searchParams.get("duration") || 10;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.write(getHTML(amount, duration));
    res.end();
  }
});

SERVER.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});