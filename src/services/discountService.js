const orders = require("../../api/orders.js")
const customers = require("../../api/customers.js")
const products = require("../../api/products.js")

const discountRules = {
    totalOver1000: {
        discount: "10% discount on the whole order if the customer's revenue is more than 1000€.",
        ruleCount: 1000,
        percentage: 10,
        category: null
    },
    fiveSwitches: {
        discount: "Buy five same product of Switch category, get one for free.",
        ruleCount: 5,
        percentage: null,
        category: "2"
    },
    twoTools: {
        discount: "Buy two or more products from Tools category, get a 20% discount on the cheapest product",
        ruleCount: 2,
        percentage: 20,
        category: "1"
    }
}

function calculateDiscount(order) {
    let total = order.total
    const finalBill = createBill(order)
    const { totalOver1000, fiveSwitches, twoTools } = discountRules

    // FIVE DISCOUNT
    const switchProducts = getProductsWithCorrectCategory(order, fiveSwitches.category)
    if (switchProducts) {
        switchProducts.forEach(product => {
            order.items.forEach((item, i) => {
                if (product === item["product-id"]) {
                    if (item.quantity % fiveSwitches.ruleCount === 0) {
                        //ADD QUANTITY
                        let freeItemCount = item.quantity / fiveSwitches.ruleCount
                        finalBill.newItems[i].quantity = (Number(item.quantity) + freeItemCount).toString()
                        finalBill.newItems[i].total = (Number(finalBill.newItems[i].quantity) * item["unit-price"]).toFixed(2)
                        finalBill.discounts = [{
                            explanation: `${fiveSwitches.discount} (product-id: ${product})`,
                            discountAmount: `-${(freeItemCount * Number(item["unit-price"])).toFixed(2)}`,
                        }, ...finalBill.discounts]
                        finalBill.newTotal = total
                    } else if (item.quantity > fiveSwitches.ruleCount) {
                        // GIVE DISCOUNT FOR EXTRAS
                        let freeItemCount = Math.floor(item.quantity / fiveSwitches.ruleCount)
                        finalBill.newItems[i].total = (Number(finalBill.oldItems[i].quantity) * item["unit-price"]).toFixed(2)
                        finalBill.discounts = [{
                            explanation: `${fiveSwitches.discount} (product-id: ${product})`,
                            discountAmount: `-${(freeItemCount * Number(item["unit-price"])).toFixed(2)}`,
                        }, ...finalBill.discounts]
                        let newTotal = (Number(total) - (Number((item["unit-price"])) * freeItemCount)).toFixed(2)
                        total = newTotal
                        finalBill.newTotal = newTotal
                    }
                }
            })
        })
    }

    // TWO DISCOUNT
    const toolProducts = getProductsWithCorrectCategory(order, twoTools.category)
    console.log(toolProducts)
    if (toolProducts) {
        if (toolProducts.length > 1) {
            let prices = []
            let lowestPrice;
            let lowestPricedProduct;
            order.items.forEach(item => {
                toolProducts.forEach(product => {
                    if (product === item["product-id"]) {
                        prices.push(Number(item["unit-price"]))
                    }
                })
            })
            lowestPrice = Math.min(...prices)
            let discountedPrice = percentageDiscount(twoTools.percentage, lowestPrice)
            finalBill.discounts = [{
                explanation: `${twoTools.discount}`,
                discountAmount: `${(discountedPrice - lowestPrice).toFixed(2)}`,
            }, ...finalBill.discounts]
            finalBill.newTotal = (Number(total) + Number(discountedPrice - lowestPrice)).toFixed(2)
            total = finalBill.newTotal
        } else {
            order.items.forEach(item => {
                toolProducts.forEach(product => {
                    if (product === item["product-id"] && item.quantity > 1) {
                        let discountedPrice = percentageDiscount(twoTools.percentage, item["unit-price"])
                        finalBill.discounts = [{
                            explanation: `${twoTools.discount} (product-id: ${product})`,
                            discountAmount: `${(discountedPrice - item["unit-price"]).toFixed(2)}`,
                        }, ...finalBill.discounts]
                        finalBill.newTotal = (Number(total) + Number(discountedPrice - item["unit-price"])).toFixed(2)
                        total = finalBill.newTotal
                    }
                })
            })
        }
    }

    // REVENUE DISCOUNT
    const revenue = getRevenue(order)
    if (revenue > totalOver1000.ruleCount) {
        finalBill.newTotal = percentageDiscount(totalOver1000.percentage, total)
        finalBill.discounts = [{
            explanation: totalOver1000.discount,
            discountAmount: (finalBill.newTotal - total).toFixed(2),
        }, ...finalBill.discounts]
    }
    console.log(finalBill)
    finalBill.discounts.reverse()
    return finalBill
}

function createBill(order) {
    const bill = {
        "order-id": order.id,
        "customer-id": order["customer-id"],
        oldItems: [...order.items],
        newItems: JSON.parse(JSON.stringify(order.items)),
        discounts: [],
        oldTotal: order.total,
        newTotal: null
    }
    return bill
}

function getRevenue(order) {
    let customer = getCustomer(order)
    return customer.revenue
}

function getCustomer(order) {
    let customer;
    customers.forEach(c => {
        if (order["customer-id"] === c.id) {
            customer = c
        }
    })
    return customer
}

function getProductsWithCorrectCategory(order, category) {
    let discountProducts = []
    order.items.forEach(item => {
        products.forEach(product => {
            if (item["product-id"] === product.id && product.category === category) {
                discountProducts.push(product.id)
            }
        })
    })
    return discountProducts
}

function percentageDiscount(percentage, total) {
    return (total - ((total * percentage) / 100)).toFixed(2)
}

module.exports = { calculateDiscount, orders }