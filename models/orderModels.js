const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
    order_number:{
        type:Number,
        required:true,
    },
    category_id: {
        type: mongoose.Schema.ObjectId,
        ref: "Category"
    },
    order_amount:{
        type:Number,
        required:true,
    },
    delivery_location:{
        type:Object,
        required:true,
    },
    client_id:{
        type:Number,
        required:true,
    },
    is_deliveried:{
        type:Boolean,
        default:false,
    },
    is_payment:{
        type:Boolean,
        default:false,
    },
    payment_msg_id:{
        type:Number,
        default:null,
    },
    active:{
        type:Boolean,
        default:true,
    }

}, {
    timestamps: {
        createdAt: 'created_at', // Use `created_at` to store the created date
        updatedAt: 'updated_at' // and `updated_at` to store the last updated date
    }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = {Order}