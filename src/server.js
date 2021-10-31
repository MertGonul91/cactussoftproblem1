const express = require('express')

const app = express()

app.use(express.json())

app.listen(3000)


app.get('/', (req, res) => {
    res.redirect("/api/discounts")
})


app.use('/api/discounts', require('./controllers/discountController'))