const { Order } = require("../models/orderModels");
const customLogger = require("../config/customLogger");
const { User } = require("../models/userModels");
const { PaymetHistory } = require("../models/paymentModels");


const add_order = async (data) => {
    try {
        let order_number = await Order.find({})
        data.order_number = order_number.length + 1;
        return await Order.create(data);
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}


const my_orders = async (user_id) => {
    try {
        return await Order.find({
            client_id: user_id,
            is_deliveried: false,
            active: true,
        }).populate('category_id')
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const payment_message_id = async (data) => {
    try {
        let order = await Order.findOne({ _id: data.order_id });
        if (order) {
            await Order.findByIdAndUpdate(order._id, {
                payment_msg_id: data.msg_id,
            });
        } else {
            console.log("Order not found for update message id....");
        }
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const active_orders = async () => {
    try {
        return await Order.find({
            is_deliveried: false,
            active: true
        }).populate('category_id');

    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const delivered_orders = async () => {
    try {
        return await Order.find({
            is_deliveried: true,
            active: true
        }).populate('category_id');
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const rejected_order = async (order_id) => {
    try {
        let order = await Order.findOne({ _id: order_id, is_payment: false });
        if (order) {
            return await Order.findByIdAndUpdate(order_id, {
                active: false,
            });
        } else {
            console.log("Order not found for rejecting order....");
            return null
        }
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}
const check_delivered_order = async (order_id) => {
    try {
        let order = await Order.findOne({ _id: order_id, is_payment: true });
        if (order) {
            return await Order.findByIdAndUpdate(order_id, {
                is_deliveried: true,
            });
        } else {
            console.log("Order not found for check delivered order....");
            return null
        }
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const update_order_payment = async (_id) => {
    try {
        return await Order.findByIdAndUpdate(_id, {
            is_payment: true,
        });

    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const get_order_by_msgId = async (msg_id) => {
    try {
        return await Order.findOne({
            payment_msg_id: msg_id,
            is_payment: false,
            active: true
        }).populate('category_id');
    }
    catch (error) {

        customLogger.log({
            level: 'error',
            message: error
        });
        return []
    }
}

const check_payemt_order = async (_id) => {
    try {
        return await Order.findOne({
            _id, is_payment: false,
            active: true
        })
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const statistic_daily = async () => {
    try {
        let today = new Date().toLocaleDateString("sv-SE");
        const startDate = new Date(today);
        const endDate = new Date(today);
        endDate.setDate(startDate.getDate() + 1);
        let today_orders= await Order.find({
            created_at: {
                $gte: startDate,
                $lte: endDate,
            },
        })

        let deliveried_count =  today_orders.filter(item=>item.is_deliveried).length;
        let payment_count =  today_orders.filter(item=>item.is_payment).length;
        let reject_count =  today_orders.filter(item=>!item.active).length;
        let all_count = today_orders.length;

        return {
            deliveried_count,
            payment_count,
            reject_count,
            all_count,
        }

    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}


const general_statistic = async()=>{
    try{
        let orders = await Order.find({});
        let deliveried_count =  orders.filter(item=>item.is_deliveried).length;
        let payment_count =  orders.filter(item=>item.is_payment).length;
        let reject_count =  orders.filter(item=>!item.active).length;
        let all_count = orders.length;

        let users_count = await User.find({active_user:true}).countDocuments();

        let price_list = await PaymetHistory.find({})
        let total_price = price_list.reduce((accumulator, currentValue) => {
            return accumulator + currentValue.payment_amount;
          }, 0);

          return {
            deliveried_count,
            payment_count,
            reject_count,
            all_count,
            users_count,
            total_price
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
    active_orders,
    delivered_orders,
    rejected_order,
    check_delivered_order,
    get_order_by_msgId,
    check_payemt_order,
    update_order_payment,
    statistic_daily,
    general_statistic,
}