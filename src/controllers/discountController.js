const router = require('express').Router();
const discountService = require('../services/discountService')
const { calculateDiscount, orders } = discountService


router.get('/', (req, res) => {
    const finalBill = calculateDiscount(orders[0])
    res.send(finalBill)
})

module.exports = router;
