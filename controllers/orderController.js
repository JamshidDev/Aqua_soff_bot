const { Order } = require("../models/orderModels");
const customLogger = require("../config/customLogger");


const add_order = async(data)=>{
    try{
        let order_number = await Order.find({})
        data.order_number = order_number.length +1;
       return await Order.create(data);
    }catch(error){
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}


const my_orders = async(user_id)=>{
    try{
        return await Order.find({
            client_id:user_id,
            is_deliveried:false,
            active:true,
        }).populate('category_id')
    }catch(error){
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const payment_message_id = async(data)=>{
    try{
        let order = await Order.findOne({_id:data.order_id});
        if(order){
            await Order.findByIdAndUpdate(order._id, {
                payment_msg_id: data.msg_id,
            });
        }else{
            console.log("Order not found for update message id....");
        }
    }catch(error){
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}








module.exports = {
    add_order,
    my_orders,
    payment_message_id,
}