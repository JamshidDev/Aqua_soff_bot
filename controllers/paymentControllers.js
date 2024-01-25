const customLogger = require("../config/customLogger");
const { PaymetHistory } = require("../models/paymentModels");


const add_payment_histry = async (data) => {
    try {
        await PaymetHistory.create(data)
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const payment_details = async (order_id) => {
    try {
        return await PaymetHistory.find({ order_id }).populate('order_id')
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

module.exports = {
    add_payment_histry,
    payment_details
}