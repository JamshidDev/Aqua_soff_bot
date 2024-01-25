const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema({
    client_id: {
        type: Number,
        required: true,
    },
    order_id: {
        type: mongoose.Schema.ObjectId,
        ref: "Order",
    },
    payment_amount: {
        type: Number,
        required: true,
    },
    payment_details:{
        type:Object,
        required:true,
    }
}, {
    timestamps: {
        createdAt: 'created_at', // Use `created_at` to store the created date
        updatedAt: 'updated_at' // and `updated_at` to store the last updated date
    }
})

const PaymetHistory = mongoose.model("PaymetHistory", paymentSchema);
module.exports = {PaymetHistory}